#!/usr/bin/env python3
"""Build tiled, display-only HydroSHEDS context layers (rivers, lakes, basins) for the globe.

Geographic CONTEXT layers, not NASA observations and not analysis inputs. Geometry is
simplified for rendering; attributes are copied unchanged from the source tables. A basin
selected on the globe is passed on as a reference (product, version, level, HYBAS_ID) so the
backend can resolve the full-resolution source polygon; the simplified outline is never an AOI.

Sources (all WGS84 geographic, lon/lat, per each product's .prj and technical documentation):
  - HydroRIVERS v1.0  (Lehner & Grill 2013, doi:10.1002/hyp.9740)
  - HydroLAKES v1.0   (Messager et al. 2016, doi:10.1038/ncomms13603)
  - HydroBASINS v1c   (Lehner & Grill 2013, doi:10.1002/hyp.9740), standard format, no lakes
Licence: HydroSHEDS License Agreement (https://www.hydrosheds.org); free for commercial and
non-commercial use with attribution.

Output tree (apps/web/public/data/geo/hydrosheds/):
  manifest.json                    provenance, tiers, tile index, tolerances
  rivers/overview.json             world, ORD_FLOW <= 3 (>= 1,000 m3/s modelled), one merged
                                   feature per river system (MAIN_RIV)
  rivers/regional/{ix}_{iy}.json   region boxes, Strahler order >= 4, 4 deg tiles
  rivers/detail/{ix}_{iy}.json     region boxes, every reach, 1 deg tiles
  lakes/overview.json              world, Lake_area >= 500 km2
  lakes/detail/{ix}_{iy}.json      region boxes, every lake (>= 10 ha in HydroLAKES), 2 deg tiles
  basins/lev{NN}.json              region boxes, Pfafstetter levels 3-8 (Europe tile set)

Usage:
  python scripts/build_hydrosheds_layers.py --download   # fetch archives into data/cache/
  python scripts/build_hydrosheds_layers.py              # build from data/cache/hydrosheds/
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import shutil
import urllib.request
import zipfile
from collections.abc import Iterable, Iterator
from dataclasses import dataclass
from datetime import date
from pathlib import Path
from typing import Any

import shapefile  # pyshp
from shapely.geometry import LineString, MultiLineString, MultiPolygon, Polygon, mapping
from shapely.geometry.base import BaseGeometry
from shapely.ops import linemerge

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / "data" / "cache" / "hydrosheds"
OUT = ROOT / "apps" / "web" / "public" / "data" / "geo" / "hydrosheds"

BASE_URL = "https://data.hydrosheds.org/file"
ARCHIVES: dict[str, tuple[str, str]] = {
    # key: (url, archive path relative to CACHE)
    "rivers_eu": (f"{BASE_URL}/HydroRIVERS/HydroRIVERS_v10_eu_shp.zip", "rivers_eu/HydroRIVERS_v10_eu_shp.zip"),
    "rivers_global": (f"{BASE_URL}/HydroRIVERS/HydroRIVERS_v10_shp.zip", "rivers_global/HydroRIVERS_v10_shp.zip"),
    "lakes": (f"{BASE_URL}/hydrolakes/HydroLAKES_polys_v10_shp.zip", "lakes/HydroLAKES_polys_v10_shp.zip"),
    **{
        f"basins_lev{lv:02d}": (
            f"{BASE_URL}/HydroBASINS/standard/hybas_eu_lev{lv:02d}_v1c.zip",
            f"basins/hybas_eu_lev{lv:02d}_v1c.zip",
        )
        for lv in range(3, 9)
    },
}
SHAPEFILES: dict[str, str] = {
    "rivers_eu": "rivers_eu/HydroRIVERS_v10_eu_shp/HydroRIVERS_v10_eu.shp",
    "rivers_global": "rivers_global/HydroRIVERS_v10_shp/HydroRIVERS_v10.shp",
    "lakes": "lakes/HydroLAKES_polys_v10_shp/HydroLAKES_polys_v10.shp",
    **{f"basins_lev{lv:02d}": f"basins/hybas_eu_lev{lv:02d}_v1c.shp" for lv in range(3, 9)},
}


@dataclass(frozen=True)
class Box:
    """WGS84 bounding box in decimal degrees."""

    id: str
    west: float
    south: float
    east: float
    north: float

    def intersects(self, bbox: tuple[float, float, float, float]) -> bool:
        w, s, e, n = bbox
        return not (e < self.west or w > self.east or n < self.south or s > self.north)


# Regions that get detail tiles. Spain first (Peninsula + Balearics + Ceuta/Melilla with the
# Portuguese / French parts of shared basins, and Canarias). Add boxes here to cover more of
# Europe; the client only requests tiles listed in the manifest.
REGIONS: tuple[Box, ...] = (
    Box("iberia", -10.0, 35.0, 4.6, 44.2),
    Box("canarias", -18.5, 27.4, -13.2, 29.5),
)

# Level-of-detail selection (documented source fields, no derived values).
OVERVIEW_MAX_ORD_FLOW = 3  # ORD_FLOW 3 = long-term modelled discharge >= 1,000 m3/s
REGIONAL_MIN_ORD_STRA = 4  # Strahler order >= 4
LAKE_OVERVIEW_MIN_AREA_KM2 = 500.0  # also the size above which HydroLAKES fills Lake_name
BASIN_LEVELS = (3, 4, 5, 6, 7, 8)

# Tile sizes (degrees). Tile index: ix = floor((lon + 180) / size), iy = floor((lat + 90) / size).
TILE_DEG = {"rivers/regional": 4.0, "rivers/detail": 1.0, "lakes/detail": 2.0}

# Display simplification tolerances in degrees (Douglas-Peucker, topology preserving).
# HydroSHEDS cells are 15 arc-seconds (~0.0042 deg, ~460 m at 37 N), so DETAIL tolerances stay
# below one source cell. Only rendering geometry is simplified; attributes are untouched.
SIMPLIFY_DEG = {
    "rivers/overview": 0.05,
    "rivers/regional": 0.006,
    "rivers/detail": 0.002,
    "lakes/overview": 0.05,
    "lakes/detail": 0.0008,
    "basins": 0.003,
}
COORD_DECIMALS = 4  # <= 5.5 m rounding; far finer than the 15 arc-second (~460 m) source grid

RIVER_FIELDS = (
    "HYRIV_ID", "NEXT_DOWN", "MAIN_RIV", "LENGTH_KM", "DIST_DN_KM", "DIST_UP_KM", "CATCH_SKM",
    "UPLAND_SKM", "ENDORHEIC", "DIS_AV_CMS", "ORD_STRA", "ORD_CLAS", "ORD_FLOW", "HYBAS_L12",
)  # fmt: skip
LAKE_FIELDS = (
    "Hylak_id", "Lake_name", "Country", "Poly_src", "Lake_type", "Grand_id", "Lake_area",
    "Shore_len", "Vol_total", "Vol_res", "Vol_src", "Depth_avg", "Dis_avg", "Res_time",
    "Elevation", "Wshd_area", "Pour_long", "Pour_lat",
)  # fmt: skip
BASIN_FIELDS = (
    "HYBAS_ID", "NEXT_DOWN", "NEXT_SINK", "MAIN_BAS", "DIST_SINK", "DIST_MAIN", "SUB_AREA",
    "UP_AREA", "PFAF_ID", "ENDO", "COAST", "ORDER", "SORT",
)  # fmt: skip

PRODUCTS: dict[str, dict[str, str]] = {
    "hydrorivers": {
        "name": "HydroRIVERS",
        "version": "1.0",
        "citation": "Lehner, B., Grill, G. (2013). Hydrological Processes 27(15): 2171-2186.",
        "doi": "10.1002/hyp.9740",
        "url": "https://www.hydrosheds.org/products/hydrorivers",
    },
    "hydrolakes": {
        "name": "HydroLAKES",
        "version": "1.0",
        "citation": "Messager, M.L. et al. (2016). Nature Communications 7: 13603.",
        "doi": "10.1038/ncomms13603",
        "url": "https://www.hydrosheds.org/products/hydrolakes",
    },
    "hydrobasins": {
        "name": "HydroBASINS",
        "version": "1c (standard, without lakes)",
        "citation": "Lehner, B., Grill, G. (2013). Hydrological Processes 27(15): 2171-2186.",
        "doi": "10.1002/hyp.9740",
        "url": "https://www.hydrosheds.org/products/hydrobasins",
    },
}


def log(msg: str) -> None:
    print(msg, flush=True)


def download(keys: Iterable[str]) -> None:
    """Fetch and unzip the source archives into CACHE (skips files already present)."""
    for key in keys:
        url, rel = ARCHIVES[key]
        dest = CACHE / rel
        dest.parent.mkdir(parents=True, exist_ok=True)
        if not dest.exists():
            log(f"download {url}")
            with urllib.request.urlopen(url, timeout=600) as resp, dest.open("wb") as fh:
                shutil.copyfileobj(resp, fh)
        if not (CACHE / SHAPEFILES[key]).exists():
            with zipfile.ZipFile(dest) as zf:
                zf.extractall(dest.parent)


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 22), b""):
            h.update(chunk)
    return h.hexdigest()


def round_coords(obj: Any) -> Any:
    """Round nested coordinate arrays to COORD_DECIMALS (lon, lat order is preserved)."""
    if isinstance(obj, (list, tuple)):
        if obj and isinstance(obj[0], (int, float)):
            return [round(float(v), COORD_DECIMALS) for v in obj[:2]]
        return [round_coords(o) for o in obj]
    return obj


def clean_value(v: Any) -> Any:
    if isinstance(v, bytes):
        return v.decode("utf-8", errors="replace").strip()
    if isinstance(v, str):
        return v.strip()
    if isinstance(v, float):
        return round(v, 6)
    return v


def tile_key(lon: float, lat: float, size: float) -> str:
    return f"{math.floor((lon + 180.0) / size)}_{math.floor((lat + 90.0) / size)}"


def bbox_centre(bbox: tuple[float, float, float, float]) -> tuple[float, float]:
    return ((bbox[0] + bbox[2]) / 2.0, (bbox[1] + bbox[3]) / 2.0)


def in_regions(bbox: tuple[float, float, float, float]) -> bool:
    return any(r.intersects(bbox) for r in REGIONS)


def polygon_from_parts(points: list[tuple[float, float]], parts: list[int]) -> BaseGeometry:
    """Shapefile rings -> (Multi)Polygon. Outer rings are clockwise, holes counter-clockwise."""
    bounds = [*parts, len(points)]
    rings = [points[bounds[i] : bounds[i + 1]] for i in range(len(parts))]
    polys: list[Polygon] = []
    for ring in rings:
        if len(ring) < 4:
            continue
        lr = LineString(ring)
        # Signed area < 0 = clockwise = outer ring in the ESRI shapefile convention.
        signed = sum(x0 * y1 - x1 * y0 for (x0, y0), (x1, y1) in zip(ring, ring[1:], strict=False))
        if signed <= 0 or not polys:
            polys.append(Polygon(lr.coords))
        else:
            outer = polys[-1]
            polys[-1] = Polygon(outer.exterior.coords, [*(list(i.coords) for i in outer.interiors), ring])
    if len(polys) == 1:
        return polys[0]
    return MultiPolygon(polys)


def feature(geom: BaseGeometry, props: dict[str, Any]) -> dict[str, Any] | None:
    if geom.is_empty:
        return None
    gj = mapping(geom)
    return {
        "type": "Feature",
        "geometry": {"type": gj["type"], "coordinates": round_coords(gj["coordinates"])},
        "properties": props,
    }


def write_json(path: Path, payload: dict[str, Any]) -> int:
    path.parent.mkdir(parents=True, exist_ok=True)
    text = json.dumps(payload, separators=(",", ":"), ensure_ascii=False, sort_keys=True)
    path.write_text(text, encoding="utf-8")
    return len(text.encode("utf-8"))


def collection(features: list[dict[str, Any]], product: str, tier: str, id_field: str) -> dict[str, Any]:
    features.sort(key=lambda f: f["properties"][id_field])
    tolerance = SIMPLIFY_DEG["basins" if tier.startswith("basins") else tier]
    return {
        "type": "FeatureCollection",
        "product": product,
        "tier": tier,
        "crs": "EPSG:4326 (lon, lat)",
        "geometry": f"display only, simplified with a {tolerance} deg tolerance",
        "features": features,
    }


# No .cpg files ship with the archives; HydroLAKES names contain Windows-1252 bytes (e.g. 0x92).
DBF_ENCODING = "cp1252"


def iter_records(shp: Path, fields: tuple[str, ...]) -> Iterator[tuple[Any, dict[str, Any]]]:
    reader = shapefile.Reader(str(shp), encoding=DBF_ENCODING)
    for sr in reader.iterShapeRecords(fields=list(fields)):
        rec = sr.record.as_dict()
        yield sr.shape, {k: clean_value(rec[k]) for k in fields}


@dataclass
class TileSet:
    tier: str
    product: str
    id_field: str
    tiles: dict[str, list[dict[str, Any]]]

    def write(self) -> dict[str, dict[str, int]]:
        index: dict[str, dict[str, int]] = {}
        for key, feats in sorted(self.tiles.items()):
            size = write_json(OUT / self.tier / f"{key}.json", collection(feats, self.product, self.tier, self.id_field))
            index[key] = {"features": len(feats), "bytes": size}
        return index


def build_rivers() -> dict[str, Any]:
    # Overview: reaches of one river system (same MAIN_RIV) merged into one display feature.
    # Its properties are the unchanged record of the system's most downstream selected reach
    # (smallest DIST_DN_KM), plus how many reaches were merged. Nothing is aggregated.
    systems: dict[int, tuple[list[LineString], dict[str, Any]]] = {}
    for shape, props in iter_records(CACHE / SHAPEFILES["rivers_global"], RIVER_FIELDS):
        if props["ORD_FLOW"] > OVERVIEW_MAX_ORD_FLOW:
            continue
        lines, rep = systems.setdefault(props["MAIN_RIV"], ([], props))
        lines.append(LineString(shape.points))
        if props["DIST_DN_KM"] < rep["DIST_DN_KM"]:
            systems[props["MAIN_RIV"]] = (lines, props)
    overview: list[dict[str, Any]] = []
    for lines, rep in systems.values():
        merged = linemerge(MultiLineString(lines)).simplify(SIMPLIFY_DEG["rivers/overview"])
        f = feature(merged, {**rep, "overview_reaches": len(lines)})
        if f:
            overview.append(f)
    log(f"rivers overview: {len(overview)} river systems")
    size = write_json(OUT / "rivers" / "overview.json", collection(overview, "hydrorivers", "rivers/overview", "HYRIV_ID"))

    regional = TileSet("rivers/regional", "hydrorivers", "HYRIV_ID", {})
    detail = TileSet("rivers/detail", "hydrorivers", "HYRIV_ID", {})
    for shape, props in iter_records(CACHE / SHAPEFILES["rivers_eu"], RIVER_FIELDS):
        bbox = tuple(shape.bbox)
        if not in_regions(bbox):  # type: ignore[arg-type]
            continue
        line = LineString(shape.points)
        cx, cy = bbox_centre(bbox)  # type: ignore[arg-type]
        for tiles, tier in ((detail, "rivers/detail"), (regional, "rivers/regional")):
            if tier == "rivers/regional" and props["ORD_STRA"] < REGIONAL_MIN_ORD_STRA:
                continue
            f = feature(line.simplify(SIMPLIFY_DEG[tier]), props)
            if f:
                tiles.tiles.setdefault(tile_key(cx, cy, TILE_DEG[tier]), []).append(f)
    return {
        "overview": {"path": "rivers/overview.json", "features": len(overview), "bytes": size},
        "regional": {"tileDeg": TILE_DEG["rivers/regional"], "tiles": regional.write()},
        "detail": {"tileDeg": TILE_DEG["rivers/detail"], "tiles": detail.write()},
    }


def build_lakes() -> dict[str, Any]:
    overview: list[dict[str, Any]] = []
    detail = TileSet("lakes/detail", "hydrolakes", "Hylak_id", {})
    for shape, props in iter_records(CACHE / SHAPEFILES["lakes"], LAKE_FIELDS):
        bbox = tuple(shape.bbox)
        big = props["Lake_area"] >= LAKE_OVERVIEW_MIN_AREA_KM2
        regional = in_regions(bbox)  # type: ignore[arg-type]
        if not big and not regional:
            continue
        poly = polygon_from_parts([tuple(p) for p in shape.points], list(shape.parts))
        if big:
            f = feature(poly.simplify(SIMPLIFY_DEG["lakes/overview"], preserve_topology=True), props)
            if f:
                overview.append(f)
        if regional:
            f = feature(poly.simplify(SIMPLIFY_DEG["lakes/detail"], preserve_topology=True), props)
            if f:
                cx, cy = bbox_centre(bbox)  # type: ignore[arg-type]
                detail.tiles.setdefault(tile_key(cx, cy, TILE_DEG["lakes/detail"]), []).append(f)
    log(f"lakes overview: {len(overview)}")
    size = write_json(OUT / "lakes" / "overview.json", collection(overview, "hydrolakes", "lakes/overview", "Hylak_id"))
    return {
        "overview": {"path": "lakes/overview.json", "features": len(overview), "bytes": size},
        "detail": {"tileDeg": TILE_DEG["lakes/detail"], "tiles": detail.write()},
    }


def build_basins() -> dict[str, Any]:
    levels: dict[str, Any] = {}
    for lv in BASIN_LEVELS:
        feats: list[dict[str, Any]] = []
        for shape, props in iter_records(CACHE / SHAPEFILES[f"basins_lev{lv:02d}"], BASIN_FIELDS):
            if not in_regions(tuple(shape.bbox)):  # type: ignore[arg-type]
                continue
            poly = polygon_from_parts([tuple(p) for p in shape.points], list(shape.parts))
            f = feature(poly.simplify(SIMPLIFY_DEG["basins"], preserve_topology=True), {**props, "LEVEL": lv})
            if f:
                feats.append(f)
        rel = f"basins/lev{lv:02d}.json"
        size = write_json(OUT / rel, collection(feats, "hydrobasins", f"basins/lev{lv:02d}", "HYBAS_ID"))
        log(f"basins level {lv}: {len(feats)}")
        levels[str(lv)] = {"path": rel, "features": len(feats), "bytes": size}
    return levels


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--download", action="store_true", help="fetch source archives into data/cache/hydrosheds")
    args = parser.parse_args()
    if args.download:
        download(ARCHIVES)
    missing = [k for k, rel in SHAPEFILES.items() if not (CACHE / rel).exists()]
    if missing:
        log(f"missing source shapefiles: {', '.join(missing)} (run with --download)")
        return 1
    if OUT.exists():
        shutil.rmtree(OUT)

    rivers = build_rivers()
    lakes = build_lakes()
    basins = build_basins()
    manifest = {
        "schema_version": 1,
        "built": date.today().isoformat(),
        "builder": "scripts/build_hydrosheds_layers.py",
        "role": "geographic context (display only); not NASA observations, not analysis input",
        "crs": "EPSG:4326, coordinates [lon, lat]",
        "licence": "HydroSHEDS License Agreement, https://www.hydrosheds.org (free use with attribution)",
        "products": PRODUCTS,
        "regions": [r.__dict__ for r in REGIONS],
        "selection": {
            "rivers/overview": f"ORD_FLOW <= {OVERVIEW_MAX_ORD_FLOW} (modelled long-term discharge >= 1,000 m3/s), world",
            "rivers/regional": f"ORD_STRA >= {REGIONAL_MIN_ORD_STRA}, regions",
            "rivers/detail": "all reaches, regions",
            "lakes/overview": f"Lake_area >= {LAKE_OVERVIEW_MIN_AREA_KM2:g} km2, world",
            "lakes/detail": "all lakes (HydroLAKES minimum 10 ha), regions",
            "basins": f"Pfafstetter levels {BASIN_LEVELS[0]}-{BASIN_LEVELS[-1]}, Europe tile set, regions",
        },
        "simplify_deg": SIMPLIFY_DEG,
        "sources": {k: {"url": ARCHIVES[k][0], "sha256": sha256(CACHE / ARCHIVES[k][1])} for k in sorted(ARCHIVES)},
        "rivers": rivers,
        "lakes": lakes,
        "basins": basins,
    }
    write_json(OUT / "manifest.json", manifest)
    total = sum(p.stat().st_size for p in OUT.rglob("*.json"))
    log(f"wrote {OUT.relative_to(ROOT)} ({total / 1e6:.1f} MB)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
