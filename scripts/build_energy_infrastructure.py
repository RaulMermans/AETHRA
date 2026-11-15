#!/usr/bin/env python3
"""Build the Energy Infrastructure context file for /explore (D49, P1, opt-in).

Source  Junta de Castilla y León open data, layer `energia_cyl_renov_instal_polig`:
        perimeters of wind farms and PV plants *in operation* in Castilla y León, compiled from
        the RD 413/2014 production-installation register (PRETOR) and DG Energía y Minas.
        ©Junta de Castilla y León — IGCYL licence (attribution required; free at www.jcyl.es).
Reads   data/raw/energy_infrastructure/jcyl/energia_cyl_renov_instal_polig_gpkg.zip
        apps/web/public/data/spain-admin.json        (province polygons, INE codes)
        apps/web/public/data/climate-bundle.json     (MERRA-2 grid centres, province scopes)
Writes  apps/web/public/data/energy-infrastructure.json

What this file is: registered installations with factual metadata, plus the spatial supports
needed to compare a facility location with NASA data (MERRA-2 cell, province scope).
What it is NOT: generation, capacity factor, performance, ranking or suitability. Nothing here is
derived from climate values. No statistics are computed.

Run:  .venv/bin/python scripts/build_energy_infrastructure.py [--download]
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
import subprocess
import sys
import tempfile
import zipfile
from collections import Counter
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import geopandas as gpd
import requests
import shapely
from shapely.geometry import MultiPolygon, Point, Polygon

ROOT = Path(__file__).resolve().parents[1]
RAW_DIR = ROOT / "data/raw/energy_infrastructure/jcyl"
RAW_ZIP = RAW_DIR / "energia_cyl_renov_instal_polig_gpkg.zip"
RAW_MANIFEST = RAW_DIR / "manifest.json"
ADMIN = ROOT / "apps/web/public/data/spain-admin.json"
CLIMATE = ROOT / "apps/web/public/data/climate-bundle.json"
OUT = ROOT / "apps/web/public/data/energy-infrastructure.json"

SOURCE_URL = "https://opendata.jcyl.es/ficheros/carto/industria/energia/energia_cyl_renov_instal_polig_gpkg.zip"
METADATA_URL = "https://idecyl.jcyl.es/geonetwork/srv/api/records/spagobcyltemenerenipepol"
SOURCE_CRS = "EPSG:25830"  # ETRS89 / UTM 30N, as declared by the source
CYL_CCAA_ID = "ES41"

# Source vocabulary → output vocabulary. Unknown values are excluded, never guessed.
TECHNOLOGY = {"Eólica": "wind_onshore", "Solar fotovoltaica": "solar_pv"}
AUTHORITY = {"Administración Autonómica": "regional", "Administración General del Estado": "state"}

KM_PER_DEG_LAT = 111.32  # spherical approximation; only used to describe cell size in km
MERRA2_DLAT = 0.5
MERRA2_DLON = 0.625


@dataclass(frozen=True)
class CellSupport:
    """The MERRA-2 grid cell whose area contains a point (cell centres from the climate bundle)."""

    row: int
    col: int
    lat_center: float
    lon_center: float
    bounds: tuple[float, float, float, float]  # west, south, east, north (degrees)
    width_km: float
    height_km: float


def exclusion_reason(rec: dict[str, Any]) -> str | None:
    """Inclusion rule fixed before display (D49). Returns why a record is excluded, or None."""
    if not str(rec.get("c_reg_adm") or "").strip():
        return "no_register_code"
    if not str(rec.get("n_inst_ener") or "").strip():
        return "no_name"
    kw = rec.get("v_kw_tot")
    if kw is None or (isinstance(kw, float) and math.isnan(kw)) or int(kw) <= 0:
        return "no_registered_capacity"
    if rec.get("n_tip_inst") not in TECHNOLOGY:
        return "unknown_technology"
    return None


def merra2_cell(lat: float, lon: float, lats: list[float], lons: list[float]) -> CellSupport | None:
    """Locate the regular 0.5° × 0.625° MERRA-2 cell containing (lat, lon). None if off-grid."""
    row = round((lat - lats[0]) / MERRA2_DLAT)
    col = round((lon - lons[0]) / MERRA2_DLON)
    if not (0 <= row < len(lats) and 0 <= col < len(lons)):
        return None
    lc, oc = lats[row], lons[col]
    if abs(lat - lc) > MERRA2_DLAT / 2 + 1e-9 or abs(lon - oc) > MERRA2_DLON / 2 + 1e-9:
        return None
    return CellSupport(
        row=row,
        col=col,
        lat_center=lc,
        lon_center=oc,
        bounds=(oc - MERRA2_DLON / 2, lc - MERRA2_DLAT / 2, oc + MERRA2_DLON / 2, lc + MERRA2_DLAT / 2),
        width_km=round(MERRA2_DLON * KM_PER_DEG_LAT * math.cos(math.radians(lc)), 1),
        height_km=round(MERRA2_DLAT * KM_PER_DEG_LAT, 1),
    )


def _iso(value: Any) -> str | None:
    if value is None:
        return None
    try:
        if value != value:  # NaT / NaN
            return None
    except TypeError:
        pass
    return str(value)[:10]


def _sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def download() -> None:
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    try:
        resp = requests.get(SOURCE_URL, headers={"User-Agent": "trend-detective-data-build"}, timeout=120)
        resp.raise_for_status()
        RAW_ZIP.write_bytes(resp.content)
    except requests.exceptions.SSLError:
        # opendata.jcyl.es omits an intermediate certificate; certifi cannot complete the chain.
        # curl uses the OS trust store (which can) and still verifies TLS. Never disable verification.
        subprocess.run(["curl", "--fail", "-sSL", "-m", "120", "-o", str(RAW_ZIP), SOURCE_URL], check=True)
    RAW_MANIFEST.write_text(
        json.dumps(
            {
                "source_url": SOURCE_URL,
                "metadata_url": METADATA_URL,
                "retrieved_utc": datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ"),
                "sha256": _sha(RAW_ZIP),
                "licence": "IGCYL (Decreto 27/2012, BOCYL 25/07/2012); attribution «©Junta de Castilla y León»",
            },
            indent=2,
            ensure_ascii=False,
        )
        + "\n", encoding="utf-8", newline="\n"
    )


def _read_layer(zip_path: Path) -> gpd.GeoDataFrame:
    with tempfile.TemporaryDirectory() as tmp, zipfile.ZipFile(zip_path) as zf:
        names = [n for n in zf.namelist() if n.endswith(".gpkg")]
        if len(names) != 1:
            raise RuntimeError(f"expected one .gpkg in {zip_path}, found {names}")
        zf.extract(names[0], tmp)
        gdf = gpd.read_file(Path(tmp) / names[0])
    if gdf.crs is None or gdf.crs.to_string() != SOURCE_CRS:
        raise RuntimeError(f"unexpected CRS {gdf.crs}; expected {SOURCE_CRS}")
    return gdf


def _province_shapes(admin: dict[str, Any]) -> dict[str, MultiPolygon]:
    out: dict[str, MultiPolygon] = {}
    for p in admin["provinces"]:
        polys = [Polygon(poly[0], poly[1:]) for poly in p["coordinates"] if poly]
        out[p["id"]] = MultiPolygon(polys)
    return out


def build() -> dict[str, Any]:
    manifest = json.loads(RAW_MANIFEST.read_text(encoding="utf-8"))
    if manifest["sha256"] != _sha(RAW_ZIP):
        raise RuntimeError("raw zip does not match its manifest checksum; re-run with --download")
    admin = json.loads(ADMIN.read_text(encoding="utf-8"))
    climate = json.loads(CLIMATE.read_text(encoding="utf-8"))
    lats, lons = climate["merra2"]["lats"], climate["merra2"]["lons"]
    provinces = {p["id"]: p for p in admin["provinces"]}
    shapes = _province_shapes(admin)

    gdf = _read_layer(RAW_ZIP)
    # Some source perimeters are self-intersecting; repair the shape only (attributes untouched).
    invalid = ~gdf.geometry.is_valid
    repaired = int(invalid.sum())
    gdf.loc[invalid, "geometry"] = shapely.make_valid(gdf.loc[invalid, "geometry"].values)
    excluded: Counter[str] = Counter()
    keep_rows = []
    for idx, rec in gdf.drop(columns="geometry").iterrows():
        reason = exclusion_reason(rec.to_dict())
        if reason:
            excluded[reason] += 1
        else:
            keep_rows.append(idx)
    kept = gdf.loc[keep_rows]

    installations: list[dict[str, Any]] = []
    attrs = ["n_inst_ener", "n_tip_inst", "v_kw_tot", "f_ini_exp", "c_mun", "n_aut_adm"]
    for code, group in kept.groupby("c_reg_adm", sort=True):
        # Several polygons may share one register code; they must agree on every reported field.
        if any(group[a].astype(str).nunique() > 1 for a in attrs):
            excluded["inconsistent_duplicate_polygons"] += len(group)
            continue
        first = group.iloc[0]
        prov_id = str(first["c_mun"])[:2]
        if prov_id not in provinces or provinces[prov_id]["ccaaId"] != CYL_CCAA_ID:
            excluded["province_not_resolved"] += len(group)
            continue
        scope_key = f"provincia:{prov_id}"
        if "temperature" not in climate["scopes"].get(scope_key, {}):
            excluded["no_nasa_scope_result"] += len(group)
            continue

        shape = group.geometry.union_all()
        point_utm = shape.representative_point()
        ll = gpd.GeoSeries([point_utm, shape], crs=SOURCE_CRS).to_crs("EPSG:4326")
        pt, shape_ll = ll.iloc[0], ll.iloc[1]
        lat, lon = round(pt.y, 5), round(pt.x, 5)
        cell = merra2_cell(lat, lon, lats, lons)
        if cell is None:
            excluded["outside_merra2_grid"] += len(group)
            continue
        w, s, e, n = shape_ll.bounds
        end = _iso(first["f_fin_exp"])
        installations.append(
            {
                "id": str(code),
                "name": str(first["n_inst_ener"]).strip(),
                "technology": TECHNOLOGY[first["n_tip_inst"]],
                "category_code": str(first["c_categ_inst"]),
                "capacity_mw": round(int(first["v_kw_tot"]) / 1000, 3),
                "status": "operation_end_recorded" if end else "in_operation",
                "operation_start": _iso(first["f_ini_exp"]),
                "operation_end": end,
                "authority": AUTHORITY.get(str(first["n_aut_adm"]), "unknown"),
                "municipality": str(first["n_mun"]),
                "province_id": prov_id,
                "province_name": provinces[prov_id]["name"],
                "point_in_province_boundary": bool(shapes[prov_id].covers(Point(lon, lat))),
                "info_date": _iso(group["f_act_info"].max()),
                "lat": lat,
                "lon": lon,
                "perimeter_bbox": [round(w, 5), round(s, 5), round(e, 5), round(n, 5)],
                "perimeter_area_km2": round(shape.area / 1e6, 3),
                "polygons": len(group),
                "merra2_cell": {
                    "row": cell.row,
                    "col": cell.col,
                    "lat_center": cell.lat_center,
                    "lon_center": cell.lon_center,
                    "bounds": list(cell.bounds),
                    "width_km": cell.width_km,
                    "height_km": cell.height_km,
                },
                "evidence_scope": scope_key,
            }
        )

    by_tech = Counter(i["technology"] for i in installations)
    info_dates = sorted(i["info_date"] for i in installations if i["info_date"])
    return {
        "schema": "energy-infrastructure/v1",
        "status": "INGESTED, NOT VALIDATED (D49) — context layer, opt-in, off the demo path",
        "coverage": "Castilla y León only (ES41). Not a national inventory.",
        "source": {
            "name": "Junta de Castilla y León — Instalaciones de energías renovables en funcionamiento (perímetros)",
            "layer": "energia_cyl_renov_instal_polig",
            "register": "Registro administrativo de instalaciones de producción de energía eléctrica (PRETOR), RD 413/2014",
            "url": SOURCE_URL,
            "metadata_url": METADATA_URL,
            "retrieved_utc": manifest["retrieved_utc"],
            "sha256": manifest["sha256"],
            "licence": manifest["licence"],
            "attribution": "©Junta de Castilla y León. Information freely available at www.jcyl.es",
            "info_date_range": [info_dates[0], info_dates[-1]] if info_dates else None,
        },
        "definitions": {
            "capacity_mw": "Registered installed capacity (v_kw_tot / 1000). Not generation, not output.",
            "status": "in_operation = listed in the source layer of installations in operation, no end date recorded.",
            "point": "Representative point inside the official perimeter (ETRS89/UTM30N → WGS84). Not a turbine or meter location.",
            "merra2_cell": "The 0.5° × 0.625° MERRA-2 cell containing the point. Width/height in km are approximate (spherical).",
            "evidence_scope": "Province (INE code from the register's municipality code) whose precomputed area-weighted MERRA-2 T2M result is shown.",
        },
        "inclusion_rule": "register code, name and registered capacity > 0 kW present; known technology; duplicate polygons consistent; province in ES41 with a precomputed NASA scope; point on the MERRA-2 grid",
        "counts": {
            "source_polygons": len(gdf),
            "installations": len(installations),
            "by_technology": dict(sorted(by_tech.items())),
            "excluded_polygons": dict(sorted(excluded.items())),
            "geometries_repaired_make_valid": repaired,
            "points_outside_simplified_province_boundary": sum(not i["point_in_province_boundary"] for i in installations),
        },
        "not_included": "Generation (MWh), capacity factors, performance, rankings, suitability scores and forecasts are not in this file and must not be derived from it.",
        "provenance": {
            "generator": "scripts/build_energy_infrastructure.py",
            "code_sha256": _sha(Path(__file__)),
            "inputs_sha256": {
                str(RAW_ZIP.relative_to(ROOT)): manifest["sha256"],
                str(ADMIN.relative_to(ROOT)): _sha(ADMIN),
                str(CLIMATE.relative_to(ROOT)): _sha(CLIMATE),
            },
        },
        "installations": installations,
    }


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--download", action="store_true", help="fetch the source zip again (changes the snapshot)")
    args = ap.parse_args()
    if args.download or not RAW_ZIP.exists():
        download()
    out = build()
    OUT.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8", newline="\n")
    c = out["counts"]
    print(f"wrote {OUT.relative_to(ROOT)}: {c['installations']} installations {c['by_technology']}; excluded {c['excluded_polygons']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
