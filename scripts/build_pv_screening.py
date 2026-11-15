#!/usr/bin/env python3
"""Evidence-based solar PV screening per MERRA-2 cell (contract pv-screening/v1).

Contract and pre-registered verdict rule: ../research/2026-11-15_pv-screening-contrato.md
(team workspace). Plan: docs/EVIDENCE_SCREENING_PLAN.md.

Per 0.5 x 0.625 deg MERRA-2 cell with land_fraction >= 0.2 (eligible "land cells"):
- irradiance: annual mean of M2TMNXRAD SWGDN (W m-2 -> kWh m-2 day-1, x 0.024), complete
  years 2000-2025; Theil-Sen trend in %/decade (slope per decade / 2000-2025 mean x 100),
  Gilbert 95 % CI, Mann-Kendall p (Hamed-Rao when lag-1 autocorrelation is significant,
  packages/science/trends.py), BH-FDR across eligible cells, significant = p_bh < 0.05.
- summer heat: JJA mean of MERRA-2 M2TMNXSLV T2M, same statistics (deg C/decade).
- heat_penalty = -0.4 x t_trend (%/decade); net = irr_trend + heat_penalty (indicative).
- MITECO PV environmental-sensitivity class shares from the 0.01 deg rasters.
- GEM operating plants (count, MW) per cell; resource percentile among eligible cells.
- verdict: pre-registered rule (VERDICT_RULE below; never tuned after seeing results).

Outputs (apps/web/public/data/): pv-screening.json, solar-plants.json,
miteco-pv-sensitivity.json, miteco-pv-sensitivity-peninsula.png, -canarias.png.
Reanalysis, not observation. Screening, not siting or investment advice.
"""
from __future__ import annotations

import json
import math
import sys
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd
import rasterio
import xarray as xr
from PIL import Image
from rasterio.features import rasterize
from rasterio.transform import from_origin

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
sys.path.insert(0, str(ROOT / "packages/science"))
import trends as T  # noqa: E402

SWGDN_DIR = ROOT / "data/nasa_merra2_solar_spain_monthly/SWGDN"
SWGDN_VAR = "M2TMNXRAD_5_12_4_SWGDN"
T2M_DIR = ROOT / "data/processed/spain/merra2"
MITECO_DIR = ROOT / "data/miteco_pv_sensitivity_2024"
GEM_CSV = ROOT / "data/gem_solar_spain/gem_solar_spain_utility_2026-02.csv"
BOUNDARY = ROOT / "data/processed/spain/spain_boundary_nuts2021_01m.geojson"
POWER_CSV = ROOT / "data/results/energy_gap/annual_series.csv"
ADMIN = ROOT / "apps/web/public/data/spain-admin.json"  # same NUTS2 polygons as analyze_energy_gap.py
POWER_REGIONS = {"R0": "Peninsula + Balearics", "ES11": "Galicia", "ES41": "Castilla y León", "ES24": "Aragón", "ES61": "Andalucía"}
R0_EXCLUDE = {"ES70", "ES63", "ES64"}
SUB = 25  # sub-pixels per cell side for polygon area fractions (no shapely in this env)
OUT = ROOT / "apps/web/public/data"

YEARS = list(range(2000, 2026))
POWER_YEARS = list(range(2001, 2026))  # NASA POWER regional series span
W_TO_KWH_DAY = 0.024
TEMP_COEFF = 0.4  # % PV output lost per deg C (crystalline silicon, typical)
ALPHA = 0.05
MIN_LAND = 0.2
DLAT, DLON = 0.5, 0.625
GEM_LABEL = "GEM Global Solar Power Tracker, Feb 2026"

VERDICT_RULE = (
    "no_data: land_fraction < 0.2 or no data. "
    "avoid: irr_resource_percentile < 25 OR miteco_low_moderate_pct < 30. "
    "good: irr_resource_percentile >= 50 AND miteco_low_moderate_pct >= 50 AND the irradiance "
    "trend is NOT significantly negative (BH-FDR q < 0.05). "
    "mixed: the rest. Heat penalty is informative only and never changes the verdict."
)

SOURCES = [
    {"id": "merra2-swgdn", "label": "NASA GMAO MERRA-2 M2TMNXRAD v5.12.4, surface incoming shortwave flux (SWGDN), monthly, via Giovanni", "doi": "10.5067/OU3HJDS973O0"},
    {"id": "merra2-t2m", "label": "NASA GMAO MERRA-2 M2TMNXSLV v5.12.4, 2 m air temperature (T2M), monthly", "doi": "10.5067/AP1B0BA5PD2K"},
    {"id": "nasa-power", "label": "NASA POWER daily ALLSKY_SFC_SW_DWN (regional validation)", "doi": None},
    {"id": "miteco-ftv-2024", "label": "MITECO, Zonificación ambiental para la implantación de energías renovables: fotovoltaica (2024), resampled to 0.01°", "doi": None},
    {"id": "gem-gspt-2026-02", "label": "Global Energy Monitor, Global Solar Power Tracker, February 2026 (CC BY 4.0)", "doi": None},
    {"id": "nuts2021", "label": "Eurostat GISCO NUTS 2021 1:1M (Spain land boundary)", "doi": None},
]

MITECO_CLASSES = [
    {"value": 0, "label": "Maximum (not recommended)", "color": "#d7301f"},
    {"value": 1, "label": "Very high", "color": "#fc8d59"},
    {"value": 2, "label": "High", "color": "#fee08b"},
    {"value": 3, "label": "Moderate", "color": "#a6d96a"},
    {"value": 4, "label": "Low", "color": "#1a9641"},
]

# label, project_name substrings (operating phases are summed), tech
LANDMARKS = [
    ("Cifuentes-Trillo", ["Cifuentes-Trillo solar farm"], "pv"),
    ("Francisco Pizarro", ["Francisco Pizarro solar farm"], "pv"),
    ("Núñez de Balboa", ["Núñez De Balboa solar farm"], "pv"),
    ("Mula", ["Mula Solar Photovoltaic Power Plant"], "pv"),
    ("Talasol", ["Talasol solar farm"], "pv"),
    ("Olmedilla", ["Olmedilla solar farm", "Olmedilla Hive solar farm"], "pv"),
    ("Andasol 1-3", ["Andasol 1 solar farm", "Andasol 2 solar farm", "Andasol 3 solar farm"], "csp"),
    ("Gemasolar", ["Gemasolar CSP solar farm"], "csp"),
    ("PS10", ["PS-10 CSP solar farm"], "csp"),
    ("PS20", ["PS-20 CSP solar farm"], "csp"),
    ("Solnova", ["Solnova solar farm"], "csp"),
    ("Extresol", ["Extresol CSP solar farm"], "csp"),
]


def r(x, nd=2):
    if x is None or (isinstance(x, float) and not math.isfinite(x)):
        return None
    return round(float(x), nd)


# ----------------------------------------------------------------------------- loading
def load_swgdn() -> xr.DataArray:
    files = sorted(SWGDN_DIR.glob("*.nc"))
    parts = []
    for f in files:
        with xr.open_dataset(f) as ds:
            parts.append(ds[SWGDN_VAR].load())
    da = xr.concat(parts, dim="time").sortby("time")
    return da


def annual_complete(da: xr.DataArray, months=None) -> np.ndarray:
    """(year, lat, lon) mean over the given months; NaN unless every month is present."""
    out = []
    for y in YEARS:
        sel = da.sel(time=da.time.dt.year == y)
        want = list(range(1, 13)) if months is None else months
        sel = sel.sel(time=sel.time.dt.month.isin(want))
        vals = sel.values
        if sel.sizes["time"] != len(want):
            out.append(np.full(da.shape[1:], np.nan))
            continue
        ok = np.isfinite(vals).all(axis=0)
        out.append(np.where(ok, vals.mean(axis=0), np.nan))
    return np.array(out)


def load_t2m_jja(lats, lons) -> np.ndarray:
    parts = []
    for y in YEARS:
        with xr.open_dataset(T2M_DIR / f"M2TMNXSLV_5.12.4_spain_{y}.nc") as ds:
            parts.append(ds["T2M_celsius"].load())
    da = xr.concat(parts, dim="time").sortby("time")
    assert np.allclose(da.lat.values, lats) and np.allclose(da.lon.values, lons), "T2M grid differs"
    return annual_complete(da, months=[6, 7, 8])


def cover_fraction(lats, lons, geoms) -> np.ndarray:
    """(n_lat, n_lon) fraction of each cell inside the union of GeoJSON geometries ([lon, lat]),
    from a SUB x SUB sub-pixel rasterization (pixel centre inside polygon)."""
    tr = from_origin(lons[0] - DLON / 2, lats[-1] + DLAT / 2, DLON / SUB, DLAT / SUB)
    m = rasterize([(g, 1) for g in geoms], out_shape=(len(lats) * SUB, len(lons) * SUB), transform=tr, fill=0, dtype="uint8")
    m = m[::-1]  # north-up raster -> rows follow ascending lats
    return m.reshape(len(lats), SUB, len(lons), SUB).mean(axis=(1, 3))


def spain_geoms() -> list[dict]:
    g = json.loads(BOUNDARY.read_text(encoding="utf-8"))
    return [f["geometry"] for f in g["features"]]


def admin_geoms() -> dict[str, dict]:
    admin = json.loads(ADMIN.read_text(encoding="utf-8"))
    out = {}
    for c in admin["ccaa"]:
        coords = json.loads(c["coordinates"]) if isinstance(c["coordinates"], str) else c["coordinates"]
        x0 = coords[0][0][0]
        if not (-20 < x0[0] < 6 and 27 < x0[1] < 45):  # stored as [lat, lon] -> swap
            coords = [[[[q[1], q[0]] for q in ring] for ring in poly] for poly in coords]
        out[c["id"]] = {"type": "MultiPolygon", "coordinates": coords}
    return out


def cell_index(lat, lon, lats, lons):
    i = np.rint((np.asarray(lat) - lats[0]) / DLAT).astype(int)
    j = np.rint((np.asarray(lon) - lons[0]) / DLON).astype(int)
    ok = (i >= 0) & (i < len(lats)) & (j >= 0) & (j < len(lons))
    return i, j, ok


def miteco_counts(lats, lons) -> np.ndarray:
    """(n_lat, n_lon, 5) counts of 0.01 deg MITECO pixels per class whose centre is in the cell."""
    counts = np.zeros((len(lats), len(lons), 5), dtype=np.int64)
    for name in ("peninsula_baleares", "canarias"):
        with rasterio.open(MITECO_DIR / f"miteco_pv_sensitivity_{name}_0p01deg.tif") as src:
            a = src.read(1)
            tr = src.transform
        rows, cols = np.nonzero(a != 255)
        cls = a[rows, cols].astype(int)
        x = tr.c + (cols + 0.5) * tr.a
        y = tr.f + (rows + 0.5) * tr.e
        i, j, ok = cell_index(y, x, lats, lons)
        np.add.at(counts, (i[ok], j[ok], cls[ok]), 1)
    return counts


def load_gem() -> pd.DataFrame:
    d = pd.read_csv(GEM_CSV, encoding="utf-8")
    d["tech"] = np.where(d["technology_type"] == "Solar Thermal", "csp", "pv")
    return d


# ----------------------------------------------------------------------------- stats
def pct_trend(series: np.ndarray, mean: float):
    t = np.array(YEARS, float)
    if np.isfinite(series).sum() < 20 or not np.isfinite(mean) or mean == 0:
        return None
    res = T.trend(t, series)
    k = 100.0 / mean
    return {"trend": res.slope_per_decade * k, "ci": [res.ci_low_per_decade * k, res.ci_high_per_decade * k], "p": res.p}


def abs_trend(series: np.ndarray):
    t = np.array(YEARS, float)
    if np.isfinite(series).sum() < 20:
        return None
    res = T.trend(t, series)
    return {"trend": res.slope_per_decade, "ci": [res.ci_low_per_decade, res.ci_high_per_decade], "p": res.p}


def resource_percentile(values: np.ndarray) -> np.ndarray:
    """Percent of eligible cells with a strictly lower mean, plus half the ties (0..100)."""
    v = np.asarray(values, float)
    out = np.empty(len(v))
    for k, x in enumerate(v):
        out[k] = 100.0 * (np.sum(v < x) + 0.5 * (np.sum(v == x) - 1)) / max(len(v) - 1, 1)
    return out


def verdict(c: dict) -> tuple[str, list[str]]:
    """Pre-registered rule (contract v1). Returns (verdict, reasons)."""
    pct, lowmod = c.get("irr_resource_percentile"), c.get("miteco_low_moderate_pct")
    if c["land_fraction"] < MIN_LAND or pct is None or lowmod is None or c.get("irr_trend_pct_decade") is None:
        return "no_data", []
    reasons = []
    if pct >= 50:
        reasons.append("high_resource")
    elif pct < 25:
        reasons.append("low_resource")
    if lowmod >= 50:
        reasons.append("low_sensitivity")
    elif lowmod < 30:
        reasons.append("high_sensitivity")
    tr, sig = c["irr_trend_pct_decade"], c["irr_significant"]
    if sig and tr < 0:
        reasons.append("irr_falling_significant")
    elif sig and tr > 0:
        reasons.append("irr_rising_significant")
    elif tr > 0:
        reasons.append("irr_rising_not_proven")
    hp = c.get("heat_penalty_pct_decade")
    if hp is not None:
        reasons.append("heat_penalty_large" if abs(hp) > 0.3 else "heat_penalty_small")
    falling = bool(sig and tr < 0)
    if pct < 25 or lowmod < 30:
        return "avoid", reasons
    if pct >= 50 and lowmod >= 50 and not falling:
        return "good", reasons
    return "mixed", reasons


# ----------------------------------------------------------------------------- outputs
def write_miteco_overlays() -> dict:
    cols = np.zeros((256, 4), dtype=np.uint8)
    for c in MITECO_CLASSES:
        h = c["color"].lstrip("#")
        cols[c["value"]] = [int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), 255]
    images = []
    for name, tag in (("peninsula_baleares", "peninsula"), ("canarias", "canarias")):
        with rasterio.open(MITECO_DIR / f"miteco_pv_sensitivity_{name}_0p01deg.tif") as src:
            a = src.read(1)
            b = src.bounds
        rgba = cols[a]
        fn = f"miteco-pv-sensitivity-{tag}.png"
        Image.fromarray(rgba, "RGBA").save(OUT / fn, optimize=True)
        images.append({"file": fn, "bounds": [r(b.left, 4), r(b.bottom, 4), r(b.right, 4), r(b.top, 4)],
                       "width": int(a.shape[1]), "height": int(a.shape[0])})
    meta = {
        "schema": "miteco-pv-sensitivity/v1",
        "source": "MITECO, Zonificación ambiental para la implantación de energías renovables: fotovoltaica (2024), majority-resampled to 0.01° WGS84",
        "crs": "EPSG:4326",
        "images": images,
        "classes": MITECO_CLASSES,
        "caveat": "Orientation tool; does not replace each project's environmental assessment. ~1 km resampling smooths small protected areas.",
    }
    (OUT / "miteco-pv-sensitivity.json").write_text(json.dumps(meta, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    return meta


def write_plants(gem: pd.DataFrame) -> int:
    d = gem[gem["status"].isin(["operating", "construction"])].copy()
    plants = []
    for _, p in d.iterrows():
        name = p["project_name"]
        if isinstance(p["phase_name"], str) and p["phase_name"].strip() not in ("", "--"):
            name = f"{name} (phase {p['phase_name']})"
        mc = p["miteco_pv_sensitivity_class"]
        plants.append({
            "name": name, "mw": r(p["capacity_mw"], 1), "tech": p["tech"], "status": p["status"],
            "lat": r(p["latitude"], 4), "lon": r(p["longitude"], 4), "accuracy": p["location_accuracy"],
            "miteco_class": int(mc) if pd.notna(mc) and int(mc) != 255 else None,
        })
    plants.sort(key=lambda q: -(q["mw"] or 0))
    out = {"schema": "solar-plants/v1", "source": f"{GEM_LABEL} (CC BY 4.0); utility-scale >= 1 MW; operating + construction",
           "n": len(plants), "plants": plants}
    (OUT / "solar-plants.json").write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    return len(plants)


def regional_validation(ann_swgdn: np.ndarray, lats, lons) -> list[dict]:
    power = pd.read_csv(POWER_CSV)
    adm = admin_geoms()
    cos = np.cos(np.radians(lats))[:, None]
    t = np.array(POWER_YEARS, float)
    yidx = [YEARS.index(y) for y in POWER_YEARS]
    out = []
    for code, label in POWER_REGIONS.items():
        ps = power[(power.region == code) & power.complete].set_index("year")["solar_mean_kwh_m2_day"].reindex(POWER_YEARS).values
        geoms = [g for k, g in adm.items() if k not in R0_EXCLUDE] if code == "R0" else [adm[code]]
        w = cover_fraction(lats, lons, geoms) * cos  # cos(lat) x area fraction, as packages/science/regions.py
        f = ann_swgdn[yidx] * W_TO_KWH_DAY
        ok = np.isfinite(f)
        ms = np.nansum(np.where(ok, f, 0) * w, axis=(1, 2)) / np.sum(ok * w, axis=(1, 2))
        pr, mr = T.trend(t, ps), T.trend(t, ms)
        pm, mm = float(np.nanmean(ps)), float(np.nanmean(ms))
        out.append({
            "region": label, "code": code, "period": [POWER_YEARS[0], POWER_YEARS[-1]],
            "power_mean_kwh_m2_day": r(pm), "merra2_mean_kwh_m2_day": r(mm),
            "power_trend_pct_decade": r(pr.slope_per_decade / pm * 100), "power_p": r(pr.p, 3),
            "merra2_trend_pct_decade": r(mr.slope_per_decade / mm * 100), "merra2_p": r(mr.p, 3),
            "interannual_pearson_r": r(float(np.corrcoef(ps, ms)[0, 1])),
        })
    return out


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    sw = load_swgdn()
    lats, lons = sw.lat.values.astype(float), sw.lon.values.astype(float)
    ann = annual_complete(sw)  # W m-2
    tjja = load_t2m_jja(lats, lons)
    lf = cover_fraction(lats, lons, spain_geoms())
    mit = miteco_counts(lats, lons)
    gem = load_gem()

    op = gem[gem["status"] == "operating"]
    pi, pj, pok = cell_index(op["latitude"].values, op["longitude"].values, lats, lons)
    pn = np.zeros(lf.shape, int)
    pmw = np.zeros(lf.shape)
    np.add.at(pn, (pi[pok], pj[pok]), 1)
    np.add.at(pmw, (pi[pok], pj[pok]), op["capacity_mw"].values[pok])

    # cells to report: any land; eligible (stats families): land_fraction >= MIN_LAND
    report = [(i, j) for i in range(len(lats)) for j in range(len(lons)) if lf[i, j] > 0]
    cells = []
    for i, j in report:
        a = ann[:, i, j]
        mean_w = float(np.nanmean(a)) if np.isfinite(a).sum() >= 20 else np.nan
        ir = pct_trend(a, mean_w)
        tser = tjja[:, i, j]
        tr = abs_trend(tser)
        cnt = mit[i, j]
        tot = int(cnt.sum())
        share = {str(k): r(100.0 * cnt[k] / tot, 1) for k in range(5)} if tot > 0 else None
        c = {
            "id": f"r{i}c{j}", "lat": r(lats[i], 3), "lon": r(lons[j], 4),
            "bounds": [r(lons[j] - DLON / 2, 4), r(lats[i] - DLAT / 2, 3), r(lons[j] + DLON / 2, 4), r(lats[i] + DLAT / 2, 3)],
            "land_fraction": r(lf[i, j], 3),
            "irr_mean_kwh_m2_day": r(mean_w * W_TO_KWH_DAY, 3) if math.isfinite(mean_w) else None,
            "irr_resource_percentile": None,
            "irr_trend_pct_decade": r(ir["trend"]) if ir else None,
            "irr_ci_pct_decade": [r(x) for x in ir["ci"]] if ir else None,
            "irr_p": r(ir["p"], 4) if ir else None, "irr_p_bh": None, "irr_significant": None,
            "t_summer_mean_c": r(np.nanmean(tser), 2) if tr else None,
            "t_trend_c_decade": r(tr["trend"]) if tr else None,
            "t_ci_c_decade": [r(x) for x in tr["ci"]] if tr else None,
            "t_p": r(tr["p"], 4) if tr else None, "t_p_bh": None, "t_significant": None,
            "heat_penalty_pct_decade": None, "net_pv_trend_pct_decade": None,
            "miteco_share_pct": share,
            "miteco_low_moderate_pct": r(100.0 * (cnt[3] + cnt[4]) / tot, 1) if tot > 0 else None,
            "plants_operating_n": int(pn[i, j]), "plants_operating_mw": r(pmw[i, j], 1),
            "_ir_p": ir["p"] if ir else None, "_t_p": tr["p"] if tr else None, "_mean": mean_w,
        }
        if tr:
            c["heat_penalty_pct_decade"] = r(-TEMP_COEFF * c["t_trend_c_decade"])
            if c["irr_trend_pct_decade"] is not None:
                c["net_pv_trend_pct_decade"] = r(c["irr_trend_pct_decade"] + c["heat_penalty_pct_decade"])
        cells.append(c)

    elig = [c for c in cells if c["land_fraction"] >= MIN_LAND]
    e_irr = [c for c in elig if c["_ir_p"] is not None]
    for c, q in zip(e_irr, T.benjamini_hochberg([c["_ir_p"] for c in e_irr])):
        c["irr_p_bh"], c["irr_significant"] = r(q, 4), bool(q < ALPHA)
    for c, pc in zip(e_irr, resource_percentile([c["_mean"] for c in e_irr])):
        c["irr_resource_percentile"] = int(round(pc))
    e_t = [c for c in elig if c["_t_p"] is not None]
    for c, q in zip(e_t, T.benjamini_hochberg([c["_t_p"] for c in e_t])):
        c["t_p_bh"], c["t_significant"] = r(q, 4), bool(q < ALPHA)
    for c in cells:
        c["verdict"], c["verdict_reasons"] = verdict(c)
        for k in ("_ir_p", "_t_p", "_mean"):
            c.pop(k)

    by_id = {c["id"]: c for c in cells}
    landmarks = []
    for label, names, tech in LANDMARKS:
        m = gem[gem["project_name"].isin(names) & (gem["status"] == "operating")]
        if m.empty:
            continue
        lat, lon = float(m["latitude"].mean()), float(m["longitude"].mean())
        i, j, ok = cell_index(lat, lon, lats, lons)
        cid = f"r{int(i)}c{int(j)}" if ok else None
        mc = m["miteco_pv_sensitivity_class"].mode()
        landmarks.append({
            "name": label, "mw": r(m["capacity_mw"].sum(), 1), "tech": tech, "lat": r(lat, 4), "lon": r(lon, 4),
            "cell_id": cid if cid in by_id else None,
            "verdict": by_id[cid]["verdict"] if cid in by_id else None,
            "miteco_class": int(mc.iloc[0]) if len(mc) and int(mc.iloc[0]) != 255 else None,
            "accuracy": "exact" if (m["location_accuracy"] == "exact").all() else "approximate",
            "source": GEM_LABEL,
        })

    total_mw = float(op["capacity_mw"].sum())
    mw_by = {v: sum(c["plants_operating_mw"] for c in cells if c["verdict"] == v) for v in ("good", "mixed", "avoid", "no_data")}
    mw_unassigned = total_mw - sum(mw_by.values())
    ev = [c for c in cells if c["verdict"] != "no_data"]
    tv = [c for c in ev if c["t_trend_c_decade"] is not None]
    summary = {
        "cells_good": sum(c["verdict"] == "good" for c in cells),
        "cells_mixed": sum(c["verdict"] == "mixed" for c in cells),
        "cells_avoid": sum(c["verdict"] == "avoid" for c in cells),
        "cells_no_data": sum(c["verdict"] == "no_data" for c in cells),
        "operating_mw_total": r(total_mw, 0),
        "operating_mw_in_good_pct": r(100 * mw_by["good"] / total_mw, 1),
        "operating_mw_in_mixed_pct": r(100 * mw_by["mixed"] / total_mw, 1),
        "operating_mw_in_avoid_pct": r(100 * mw_by["avoid"] / total_mw, 1),
        "operating_mw_in_no_data_pct": r(100 * (mw_by["no_data"] + mw_unassigned) / total_mw, 1),
        "irr_cells_tested": len(e_irr),
        "irr_cells_significant_up": sum(bool(c["irr_significant"]) and c["irr_trend_pct_decade"] > 0 for c in ev),
        "irr_cells_significant_down": sum(bool(c["irr_significant"]) and c["irr_trend_pct_decade"] < 0 for c in ev),
        "irr_trend_pct_decade_median": r(np.median([c["irr_trend_pct_decade"] for c in ev])),
        "t_cells_significant_up": sum(bool(c["t_significant"]) and c["t_trend_c_decade"] > 0 for c in tv),
        "t_trend_c_decade_median": r(np.median([c["t_trend_c_decade"] for c in tv])) if tv else None,
        "heat_penalty_pct_decade_median": r(np.median([c["heat_penalty_pct_decade"] for c in tv])) if tv else None,
    }

    bundle = {
        "schema": "pv-screening/v1",
        "generated_utc": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "status": "EXPLORATORY",
        "period": [YEARS[0], YEARS[-1]],
        "temp_coefficient_pct_per_c": TEMP_COEFF,
        "method": "Theil-Sen + Mann-Kendall (Hamed-Rao si autocorrelación), BH-FDR entre celdas, alpha 0.05",
        "method_notes": [
            "Trends in %/decade = Theil-Sen slope per decade / 2000-2025 cell mean x 100; 95 % CI from Gilbert (1987).",
            "Summer temperature = mean of June-August MERRA-2 T2M; t2m is clipped to Spain, so cells whose centre lies outside Spain may lack temperature (null).",
            "BH-FDR families and resource percentile use cells with land_fraction >= 0.2; others are reported as no_data with p_bh null.",
            "MITECO shares count 0.01° pixels whose centre lies in the cell; GEM plants are assigned to the cell containing their point.",
            "net_pv_trend is indicative: it ignores dust, soiling, wind cooling and technology changes.",
        ],
        "verdict_rule": VERDICT_RULE,
        "sources": SOURCES,
        "grid": {"cell_deg": [DLAT, DLON], "lats": [r(x, 3) for x in lats], "lons": [r(x, 4) for x in lons]},
        "cells": cells,
        "regions_validation": regional_validation(ann, lats, lons),
        "landmarks": landmarks,
        "summary": summary,
    }
    (OUT / "pv-screening.json").write_text(json.dumps(bundle, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    n_pl = write_plants(gem)
    write_miteco_overlays()
    print(json.dumps(summary, indent=1))
    print("regions:", json.dumps(bundle["regions_validation"], ensure_ascii=False, indent=1))
    print("cells:", len(cells), "plants file:", n_pl)


if __name__ == "__main__":
    main()
