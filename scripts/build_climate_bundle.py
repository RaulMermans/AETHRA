#!/usr/bin/env python3
"""Build the static climate bundle for /explore (apps/web/public/data/climate-bundle.json).

Analysis contract (docs/adr/002-evidence-chain-alignment.md, ROADMAP P0-S*):
- All statistics are computed here with the tested kernels in packages/science (trends.py,
  regions.py). The browser renders them and never recomputes significance.
- Only complete calendar years enter annual values and trends: MERRA-2 2000–2025 (12/12 months),
  GPM IMERG 2000–2024 (2025 ends in September), GLDAS 2000–2025, NOAA station-years with
  >= 330 valid days of the variable. Nothing is scaled up, prorated or adjusted.
- Spatial support: "Spain" headline values = Peninsula + Balearics (R0), cos(lat) x cell-area
  fraction weighting (packages/science/regions.py). Canarias is reported separately. Every
  Comunidad Autónoma and province gets its own precomputed series + trend ("scopes").
- Trend method: Theil–Sen (Gilbert 95 % CI) + Mann–Kendall with ties correction; Hamed–Rao
  variance inflation when lag-1 autocorrelation is outside ±1.96/√n. "significant" = p < 0.05
  AND CI excludes 0; per-cell maps and the station network also carry Benjamini–Hochberg q.
- No extrapolation beyond the last complete year, no synthetic layers.

EXPLORATORY additions (Energy Tech Lab, DECISIONS D44; not on the demo path):
- "admin_profiles": per-province / per-CCAA annual series + trends of every variable above, same
  kernels and region weights as "scopes". Missing years stay null; nothing is filled or modelled.
- "swot_reservoirs": NASA SWOT L2 LakeSP (Hydrocron) reservoir area / WSE passes 2023–2026, matched
  to names, provinces and basins, plus local MERRA-2 / GLDAS / GPM context. "fpv_score" is an
  EXPLORATORY heuristic (weights chosen by hand), not a validated suitability result.

Inputs : data/processed/spain/{merra2,gpm,gldas}/*.nc, data/noaa_ghcnd_spain_daily/*.csv,
         data/processed/spain/swot/{pld_lakes_spain.geojson,hydrocron_lakes_spain.csv},
         apps/web/public/data/spain-hydrography.geojson (reservoir names only),
         apps/web/public/data/spain-admin.json (GISCO NUTS 2021 + INE provinces)
Outputs: apps/web/public/data/climate-bundle.json, apps/web/public/data/spain-rivers.geojson
"""
from __future__ import annotations

import glob
import hashlib
import json
import math
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd
import xarray as xr

ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "apps/web/public/data"
sys.path.insert(0, str(ROOT / "packages/science"))
import regions as R  # noqa: E402
import trends as T  # noqa: E402

MIN_TREND_YEARS = 15
MIN_STATION_DAYS = 330
MERRA2_YEARS = list(range(2000, 2026))
GPM_YEARS = list(range(2000, 2025))
GLDAS_YEARS = list(range(2000, 2026))
INPUTS: dict[str, str] = {}


def sha(p: Path) -> str:
    return hashlib.sha256(p.read_bytes()).hexdigest()


def read_var(path: Path, var: str) -> xr.DataArray:
    INPUTS[str(path.relative_to(ROOT))] = sha(path)
    with xr.open_dataset(path) as ds:
        return ds[var].load()


# ---------------------------------------------------------------------------
# Statistics (thin adapter over packages/science/trends.py, keeps the bundle's field names)
# ---------------------------------------------------------------------------
def sen_mann_kendall(years, values, min_n: int = MIN_TREND_YEARS) -> dict | None:
    t = np.asarray(years, float)
    y = np.asarray(values, float)
    m = np.isfinite(t) & np.isfinite(y)
    if m.sum() < min_n:
        return None
    r = T.trend(t[m], y[m])
    ci_excl = r.ci_low_per_decade > 0 or r.ci_high_per_decade < 0
    sig = bool(r.p < 0.05 and ci_excl)
    outcome = ("supported_increase" if r.slope_per_decade > 0 else "supported_decrease") if sig else "not_significant"
    return {
        "slope_decade": round(r.slope_per_decade, 3),
        "ci_low_decade": round(r.ci_low_per_decade, 3),
        "ci_high_decade": round(r.ci_high_per_decade, 3),
        "intercept_2000": round(r.intercept + r.slope_per_decade / 10 * 2000, 3),
        "p_value": round(r.p, 4),
        "significant": sig,
        "outcome": outcome,
        "n": r.n,
        "first_year": int(t[m].min()),
        "last_year": int(t[m].max()),
        "lag1_autocorr": round(r.lag1_autocorr, 3),
        "hamed_rao_applied": r.hamed_rao_applied,
    }


def add_bh(stats_list: list[dict | None], alpha: float = 0.05) -> float:
    """Attach BH q-values to a family of results; returns the share with q < alpha."""
    idx = [i for i, s in enumerate(stats_list) if s]
    if not idx:
        return 0.0
    q = T.benjamini_hochberg([stats_list[i]["p_value"] for i in idx])
    for i, qi in zip(idx, q):
        stats_list[i]["q_value_bh"] = round(float(qi), 4)
    return float(np.mean(q < alpha))


def significant_fdr(s: dict | None, alpha: float = 0.05) -> bool:
    """Robust after multiple testing: `significant` (p < 0.05, CI excludes 0) AND BH q < alpha.

    Same rule for map cells and the station network, so the map stippling and station symbols
    in /explore read one pipeline label instead of thresholding q in the browser.
    """
    return bool(s and s["significant"] and s.get("q_value_bh", 1.0) < alpha)


def series_dict(years, values, nd=2) -> dict:
    return {str(y): (round(float(v), nd) if np.isfinite(v) else None) for y, v in zip(years, values)}


def scope_block(years, stack: np.ndarray, lats, lons, nd=2) -> dict:
    """Weighted series + trend for every scope key (R0, CCAA, provinces)."""
    out = {}
    for key, sc in R.scopes().items():
        w = R.grid_weights(lats, lons, sc["geom"])
        if w.sum() == 0:
            continue
        s = R.weighted_mean(stack, w)
        out[key] = {"series": series_dict(years, s, nd), "stats": sen_mann_kendall(years, s)}
    return out


# ---------------------------------------------------------------------------
# 1. MERRA-2 2 m air temperature (reanalysis), 0.5° x 0.625°
# ---------------------------------------------------------------------------
def build_merra2() -> tuple[dict, dict, tuple]:
    print("MERRA-2 T2M 2000–2025 ...")
    monthly, annual, summer = [], [], []
    for yr in MERRA2_YEARS:
        da = read_var(ROOT / f"data/processed/spain/merra2/M2TMNXSLV_5.12.4_spain_{yr}.nc", "T2M_celsius")
        if da.sizes["time"] != 12:
            raise SystemExit(f"MERRA-2 {yr} has {da.sizes['time']} months; contract needs complete years")
        arr = da.values.astype(float)
        monthly.append(arr)
        annual.append(arr.mean(axis=0))
        summer.append(arr[5:8].mean(axis=0))
    lats, lons = da.lat.values, da.lon.values
    stack = np.stack(annual)
    valid = np.isfinite(stack[0])
    valid_indices = [int(i) for i in np.flatnonzero(valid)]
    n_lon = len(lons)
    t = np.array(MERRA2_YEARS, float)
    cell = [sen_mann_kendall(t, stack[:, i // n_lon, i % n_lon]) for i in valid_indices]
    share = add_bh(cell)

    sc = R.scopes()
    w_r0 = R.grid_weights(lats, lons, sc["age"]["geom"])
    w_can = R.grid_weights(lats, lons, sc["ccaa:ES70"]["geom"])
    r0 = R.weighted_mean(stack, w_r0)
    can = R.weighted_mean(stack, w_can)
    mon = np.concatenate(monthly)  # (312, lat, lon)
    r0_month = R.weighted_mean(mon, w_r0)
    yrs_m = np.repeat(t, 12)
    mons = np.tile(np.arange(1, 13), len(MERRA2_YEARS))
    windows = {f"{a}-{b}": sen_mann_kendall(t[(t >= a) & (t <= b)], r0[(t >= a) & (t <= b)])
               for a, b in [(2000, 2025), (2001, 2025), (2005, 2025), (2000, 2020), (2000, 2022), (2003, 2023)]}
    out = {
        "dataset": "NASA MERRA-2 M2TMNXSLV v5.12.4",
        "doi": "10.5067/AP1B0BA5PD2K",
        "variable": "T2M_celsius",
        "units": "°C",
        "resolution": "0.5° × 0.625° (~50 km)",
        "note": "Reanalysis (model with data assimilation), not a direct observation",
        "n_lat": len(lats),
        "n_lon": n_lon,
        "lats": [round(float(v), 3) for v in lats],
        "lons": [round(float(v), 3) for v in lons],
        "years": MERRA2_YEARS,
        "valid_indices": valid_indices,
        "annual_by_year": {str(y): [round(float(stack[k].ravel()[i]), 2) for i in valid_indices] for k, y in enumerate(MERRA2_YEARS)},
        "summer_by_year": {str(y): [round(float(np.stack(summer)[k].ravel()[i]), 2) for i in valid_indices] for k, y in enumerate(MERRA2_YEARS)},
        "cell_slope_decade": [c["slope_decade"] for c in cell],
        "cell_ci_low_decade": [c["ci_low_decade"] for c in cell],
        "cell_ci_high_decade": [c["ci_high_decade"] for c in cell],
        "cell_p_value": [c["p_value"] for c in cell],
        "cell_q_value": [c["q_value_bh"] for c in cell],
        "cell_significant_fdr": [significant_fdr(c) for c in cell],
        "cell_intercept_2000": [c["intercept_2000"] for c in cell],
        "cell_share_q_lt_0_05": round(share, 3),
        "spain_region": R.R0_LABEL,
        "spain_annual": series_dict(MERRA2_YEARS, r0),
        "spain_stats": sen_mann_kendall(t, r0),
        "canarias_annual": series_dict(MERRA2_YEARS, can),
        "canarias_stats": sen_mann_kendall(t, can),
        "diagnostics": {
            "seasonal_mann_kendall_monthly": {k: (round(v, 6) if isinstance(v, float) else v) for k, v in T.seasonal_trend(yrs_m, mons, r0_month).items()},
            "window_sensitivity": windows,
        },
    }
    return out, scope_block(MERRA2_YEARS, stack, lats, lons), (stack, np.stack(summer), lats, lons)


# ---------------------------------------------------------------------------
# 2. GPM IMERG Final V07 precipitation, 0.1° (web grid subsampled to 0.2°)
# ---------------------------------------------------------------------------
def build_gpm() -> tuple[dict, dict, dict, np.ndarray]:
    print("GPM IMERG 2000–2024 (2025 incomplete, excluded) ...")
    annual, mx = [], []
    for yr in GPM_YEARS:
        da = read_var(ROOT / f"data/processed/spain/gpm/GPM_3IMERGM_07_spain_{yr}.nc", "precipitation_monthly_accumulation")
        if da.sizes["time"] != 12:
            raise SystemExit(f"GPM {yr} has {da.sizes['time']} months")
        arr = da.values.astype(float)
        arr[arr < 0] = np.nan
        tot = arr.sum(axis=0)  # NaN if any month missing in a cell
        annual.append(tot)
        mx.append(arr.max(axis=0))
    lats, lons = da.lat.values, da.lon.values
    full = np.stack(annual)
    clim_mean = full.mean(axis=0)
    clim_std = full.std(axis=0)
    z = (full - clim_mean) / np.where(clim_std > 0, clim_std, np.nan)
    step = 2
    sub, sub_z, sub_mx = full[:, ::step, ::step], z[:, ::step, ::step], np.stack(mx)[:, ::step, ::step]
    s_lon = sub.shape[2]
    valid_indices = [int(i) for i in np.flatnonzero(np.isfinite(sub[0]))]
    t = np.array(GPM_YEARS, float)
    cell = [sen_mann_kendall(t, sub[:, i // s_lon, i % s_lon]) for i in valid_indices]
    cell_mx = [sen_mann_kendall(t, sub_mx[:, i // s_lon, i % s_lon]) for i in valid_indices]
    share = add_bh(cell)
    w_r0 = R.grid_weights(lats, lons, R.scopes()["age"]["geom"])
    r0 = R.weighted_mean(full, w_r0)
    r0_z = R.weighted_mean(z, w_r0)
    flat = lambda a, k: [round(float(a[k].ravel()[i]), 1) for i in valid_indices]  # noqa: E731
    out = {
        "dataset": "NASA GPM IMERG Final V07 (GPM_3IMERGM)",
        "doi": "10.5067/GPM/IMERG/3B-MONTH/07",
        "variable": "precipitation_monthly_accumulation (calendar-year sum)",
        "units": "mm",
        "resolution": "0.1° native (0.2° web grid, ~20 km)",
        "note": "Satellite–gauge merged estimate. 2025 excluded (data end 2025-09)",
        "n_lat": sub.shape[1],
        "n_lon": s_lon,
        "lats": [round(float(v), 2) for v in lats[::step]],
        "lons": [round(float(v), 2) for v in lons[::step]],
        "years": GPM_YEARS,
        "valid_indices": valid_indices,
        "annual_by_year": {str(y): [round(float(sub[k].ravel()[i]), 0) for i in valid_indices] for k, y in enumerate(GPM_YEARS)},
        "spi_definition": "Standardized annual precipitation anomaly: (annual total − 2000–2024 cell mean) / cell SD. A z-score, NOT the gamma-fitted SPI",
        "spi_by_year": {str(y): [round(float(sub_z[k].ravel()[i]), 2) for i in valid_indices] for k, y in enumerate(GPM_YEARS)},
        "max_month_by_year": {str(y): flat(sub_mx, k) for k, y in enumerate(GPM_YEARS)},
        "cell_mean": [round(float(clim_mean[::step, ::step].ravel()[i]), 1) for i in valid_indices],
        "cell_std": [round(float(clim_std[::step, ::step].ravel()[i]), 1) for i in valid_indices],
        "cell_slope_decade": [c["slope_decade"] for c in cell],
        "cell_p_value": [c["p_value"] for c in cell],
        "cell_q_value": [c["q_value_bh"] for c in cell],
        "cell_significant_fdr": [significant_fdr(c) for c in cell],
        # Precipitation slope in units of the cell's 2000–2024 SD (σ/decade) for the dry/wet
        # anomaly trend map. Dividing by a per-cell constant leaves p, q and the label unchanged.
        "cell_anomaly_slope_decade": [
            round(c["slope_decade"] / float(clim_std[::step, ::step].ravel()[i]), 3)
            if float(clim_std[::step, ::step].ravel()[i]) > 0
            else None
            for c, i in zip(cell, valid_indices)
        ],
        "cell_intercept_2000": [c["intercept_2000"] for c in cell],
        "cell_max_slope_decade": [c["slope_decade"] for c in cell_mx],
        "cell_max_intercept_2000": [c["intercept_2000"] for c in cell_mx],
        "cell_share_q_lt_0_05": round(share, 3),
        "spain_region": R.R0_LABEL,
        "spain_annual": series_dict(GPM_YEARS, r0, 1),
        "spain_stats": sen_mann_kendall(t, r0),
        "anomaly_spain_annual": series_dict(GPM_YEARS, r0_z),
        "anomaly_spain_stats": sen_mann_kendall(t, r0_z),
    }
    return out, scope_block(GPM_YEARS, full, lats, lons, 1), scope_block(GPM_YEARS, z, lats, lons), (full, lats, lons)


# ---------------------------------------------------------------------------
# 3. GLDAS Noah v2.1 water balance (land-surface MODEL), 0.25°
# ---------------------------------------------------------------------------
GLDAS_SUM = ["evapotranspiration_mm", "surface_runoff_mm", "groundwater_runoff_mm", "total_runoff_mm"]
GLDAS_MEAN = ["snow_water_equivalent_mm", "soil_moisture_0_10cm_mm"]


def build_gldas() -> tuple[dict, dict, tuple]:
    print("GLDAS 2000–2025 (grid, R0-weighted) ...")
    fields = {v: [] for v in GLDAS_SUM + GLDAS_MEAN}
    for yr in GLDAS_YEARS:
        p = ROOT / f"data/processed/spain/gldas/GLDAS_NOAH025_M_2.1_spain_{yr}.nc"
        INPUTS[str(p.relative_to(ROOT))] = sha(p)
        with xr.open_dataset(p) as ds:
            if ds.sizes["time"] != 12:
                raise SystemExit(f"GLDAS {yr} has {ds.sizes['time']} months")
            for v in GLDAS_SUM:
                fields[v].append(ds[v].values.astype(float).sum(axis=0))
            for v in GLDAS_MEAN:
                fields[v].append(ds[v].values.astype(float).mean(axis=0))
            lats, lons = ds.lat.values, ds.lon.values
    w = R.grid_weights(lats, lons, R.scopes()["age"]["geom"])
    t = np.array(GLDAS_YEARS, float)
    series = {v: R.weighted_mean(np.stack(fields[v]), w) for v in fields}
    annual = {str(y): {v: round(float(series[v][k]), 2) for v in fields} for k, y in enumerate(GLDAS_YEARS)}
    out = {
        "dataset": "NASA GLDAS Noah Land Surface Model L4 monthly 0.25° v2.1",
        "doi": "10.5067/SXAVCZFAQLNO",
        "coverage": "2000–2025 complete years, Peninsula + Balearics area-weighted mean of the 0.25° grid",
        "note": "Land-surface model output. Runoff is modelled water leaving the soil column, not measured river discharge",
        "units": "mm",
        "years": GLDAS_YEARS,
        "annual": annual,
        "stats": {v: sen_mann_kendall(t, series[v]) for v in fields},
    }
    runoff = np.stack(fields["total_runoff_mm"])
    stacks = {v: np.stack(fields[v]) for v in fields}
    return out, scope_block(GLDAS_YEARS, runoff, lats, lons, 1), (stacks, lats, lons)


# ---------------------------------------------------------------------------
# 4. NOAA GHCN-Daily stations (partner observations, not NASA; not homogenized)
# ---------------------------------------------------------------------------
STATION_METRICS = ["tavg", "tmax", "dtr", "tropical_nights", "hot_days_35", "prcp", "wettest_day", "max_dry_spell", "snow_days"]


def longest_dry_spell(prcp_vals: np.ndarray) -> int:
    """Longest run of consecutive days with PRCP < 1.0 mm. Missing days break a run
    (they are never counted as dry)."""
    best = run = 0
    for v in prcp_vals:
        if np.isfinite(v) and v < 1.0:
            run += 1
            best = max(best, run)
        else:
            run = 0
    return best


def build_noaa_stations() -> dict:
    print("NOAA GHCN-Daily stations 2001–2025 (station-years need >= 330 valid days) ...")
    files = sorted(glob.glob(str(ROOT / "data/noaa_ghcnd_spain_daily/ghcnd_spain_daily_*_metric.csv")))
    base_cols = [
        "STATION", "NAME", "LATITUDE", "LONGITUDE", "ELEVATION", "DATE",
        "PRCP", "PRCP_ATTRIBUTES", "SNWD", "SNWD_ATTRIBUTES",
        "TAVG", "TAVG_ATTRIBUTES", "TMAX", "TMAX_ATTRIBUTES", "TMIN", "TMIN_ATTRIBUTES", "AWND",
    ]
    dfs = []
    for f in files:
        INPUTS[str(Path(f).relative_to(ROOT))] = sha(Path(f))
        avail = pd.read_csv(f, nrows=1).columns.tolist()
        dfs.append(pd.read_csv(f, usecols=[c for c in base_cols if c in avail], low_memory=False))
    df = pd.concat(dfs, ignore_index=True)
    # Quality rule (docs/DATASETS.md): a non-empty middle (quality) flag drops the value
    for var in ["PRCP", "SNWD", "TAVG", "TMAX", "TMIN"]:
        attr = f"{var}_ATTRIBUTES"
        if attr in df.columns:
            q_flag = df[attr].fillna(",,").astype(str).str.split(",").str[1].fillna("")
            df.loc[q_flag != "", var] = np.nan
    df["TAVG_EFF"] = df["TAVG"].where(df["TAVG"].notna(), (df["TMAX"] + df["TMIN"]) / 2.0)
    df["YEAR"] = df["DATE"].str.slice(0, 4).astype(int)
    df = df[(df.YEAR >= 2001) & (df.YEAR <= 2025)].drop_duplicates(["STATION", "DATE"])

    stations = []
    for st_id, st_df in df.groupby("STATION"):
        first = st_df.iloc[0]
        by_year = {}
        for yr, y in st_df.sort_values("DATE").groupby("YEAR"):
            ok = lambda c: y[c].count() >= MIN_STATION_DAYS  # noqa: E731
            # Diurnal range: days with both TMAX and TMIN; 0 < DTR < 35 °C plausibility filter
            dtr = (y.TMAX - y.TMIN).dropna()
            dtr = dtr[(dtr > 0) & (dtr < 35)]
            rec = {
                "tavg": round(float(y.TAVG_EFF.mean()), 2) if ok("TAVG_EFF") else None,
                "tmax": round(float(y.TMAX.mean()), 2) if ok("TMAX") else None,
                "dtr": round(float(dtr.mean()), 2) if len(dtr) >= MIN_STATION_DAYS else None,
                "tropical_nights": int((y.TMIN >= 20.0).sum()) if ok("TMIN") else None,
                "hot_days_35": int((y.TMAX > 35.0).sum()) if ok("TMAX") else None,
                "prcp": round(float(y.PRCP.sum()), 1) if ok("PRCP") else None,
                "wettest_day": round(float(y.PRCP.max()), 1) if ok("PRCP") else None,
                "max_dry_spell": longest_dry_spell(y.PRCP.to_numpy(float)) if ok("PRCP") else None,
                "snow_days": int((y.SNWD > 0).sum()) if ok("SNWD") else None,
                "max_snwd": round(float(y.SNWD.max()), 1) if ok("SNWD") else None,
            }
            if any(v is not None for v in rec.values()):
                by_year[str(yr)] = rec
        if not by_year:
            continue
        stats = {}
        for m in STATION_METRICS:
            ys = [int(k) for k, v in by_year.items() if v[m] is not None]
            vs = [by_year[str(k)][m] for k in ys]
            s = sen_mann_kendall(ys, vs)
            if s:
                stats[m] = s
        awnd = st_df["AWND"].dropna() if "AWND" in st_df.columns else pd.Series(dtype=float)
        stations.append({
            "id": str(st_id),
            "name": str(first["NAME"]).replace(", SP", "").title(),
            "lat": round(float(first["LATITUDE"]), 4),
            "lon": round(float(first["LONGITUDE"]), 4),
            "elevation": round(float(first["ELEVATION"]), 1) if pd.notna(first["ELEVATION"]) else 0.0,
            "wind_mean_ms": round(float(awnd.mean()), 2) if len(awnd) > 10 else None,
            "wind_source": "NOAA observed AWND" if len(awnd) > 10 else "No observed wind at this station",
            "has_snow": any((v["snow_days"] or 0) > 0 for v in by_year.values()),
            "years": by_year,
            "stats": stats,
        })
    # Multiple testing across the station network, per metric
    fdr = {}
    for m in STATION_METRICS:
        fam = [s["stats"].get(m) for s in stations]
        fdr[m] = round(add_bh(fam), 3)
        for s in fam:
            if s:
                s["significant_fdr"] = significant_fdr(s)
    print(f"  {len(stations)} stations with at least one complete year")
    return {
        "dataset": "NOAA GHCN-Daily (Global Historical Climatology Network)",
        "coverage": "2001–2025, station-years with >= 330 valid days per variable; not homogenized",
        "count": len(stations),
        "trend_rule": f"station trend needs >= {MIN_TREND_YEARS} complete years; q = Benjamini–Hochberg across stations per metric",
        "share_q_lt_0_05": fdr,
        "stations": stations,
    }


# ---------------------------------------------------------------------------
# 5. River basins: GPM rain over each basin's bounding box (boxes, not watershed polygons)
# ---------------------------------------------------------------------------
RIVER_BASINS = [
    {
        "id": "ebro",
        "name": "Cuenca del Ebro",
        "river": "Río Ebro (930 km)",
        "bbox": [-4.0, 40.3, 1.0, 43.1],
        "coords": [[-3.95, 43.00], [-2.90, 42.68], [-1.64, 42.15], [-0.88, 41.65], [-0.05, 41.25], [0.52, 40.81], [0.85, 40.72]],
    },
    {
        "id": "duero",
        "name": "Cuenca del Duero",
        "river": "Río Duero (897 km)",
        "bbox": [-7.0, 40.4, -1.8, 42.9],
        "coords": [[-2.85, 41.98], [-3.68, 41.65], [-4.72, 41.55], [-5.39, 41.50], [-5.75, 41.51], [-6.58, 41.28], [-6.93, 41.03]],
    },
    {
        "id": "tajo",
        "name": "Cuenca del Tajo",
        "river": "Río Tajo (1,007 km)",
        "bbox": [-7.5, 39.2, -1.6, 41.2],
        "coords": [[-1.70, 40.32], [-2.78, 40.28], [-3.60, 40.03], [-4.03, 39.86], [-4.83, 39.96], [-5.68, 39.78], [-6.88, 39.66], [-7.45, 39.65]],
    },
    {
        "id": "guadiana",
        "name": "Cuenca del Guadiana",
        "river": "Río Guadiana (818 km)",
        "bbox": [-7.4, 37.2, -2.5, 39.6],
        "coords": [[-2.85, 38.92], [-3.88, 39.02], [-4.95, 39.15], [-5.86, 38.96], [-6.34, 38.91], [-6.97, 38.88], [-7.18, 38.25], [-7.40, 37.20]],
    },
    {
        "id": "guadalquivir",
        "name": "Cuenca del Guadalquivir",
        "river": "Río Guadalquivir (657 km)",
        "bbox": [-6.6, 36.7, -2.6, 38.5],
        "coords": [[-2.92, 37.88], [-3.78, 37.98], [-4.77, 37.88], [-5.52, 37.62], [-5.99, 37.38], [-6.24, 36.98], [-6.35, 36.79]],
    },
    {
        "id": "mino_sil",
        "name": "Cuenca del Miño-Sil",
        "river": "Río Miño-Sil (350 km)",
        "bbox": [-8.9, 41.8, -6.2, 43.4],
        "coords": [[-6.35, 42.95], [-6.98, 42.45], [-7.55, 42.48], [-7.86, 42.34], [-8.25, 42.18], [-8.87, 41.87]],
    },
    {
        "id": "jucar",
        "name": "Cuenca del Júcar",
        "river": "Río Júcar (509 km)",
        "bbox": [-2.2, 38.7, 0.2, 40.5],
        "coords": [[-1.85, 40.32], [-2.12, 39.65], [-1.52, 39.22], [-1.05, 39.21], [-0.55, 39.12], [-0.24, 39.16]],
    },
    {
        "id": "segura",
        "name": "Cuenca del Segura",
        "river": "Río Segura (325 km)",
        "bbox": [-2.6, 37.6, -0.6, 38.7],
        "coords": [[-2.52, 38.18], [-1.92, 38.30], [-1.42, 38.18], [-1.13, 37.98], [-0.82, 38.06], [-0.65, 38.11]],
    },
]


def build_rivers_and_basins(gpm_full, gldas_grid) -> tuple[list, dict]:
    full, lats, lons = gpm_full
    g_stacks, g_lats, g_lons = gldas_grid
    tg = np.array(GLDAS_YEARS, float)
    from shapely.geometry import box

    t = np.array(GPM_YEARS, float)
    basins, features = [], []
    for b in RIVER_BASINS:
        w = R.grid_weights(lats, lons, box(*b["bbox"]))
        rain = R.weighted_mean(full, w)
        wg = R.grid_weights(g_lats, g_lons, box(*b["bbox"]))
        g = {k: R.weighted_mean(g_stacks[v], wg) for k, v in
             [("runoff", "total_runoff_mm"), ("evap", "evapotranspiration_mm"), ("soil", "soil_moisture_0_10cm_mm")]}
        basins.append({
            "id": b["id"],
            "name": b["name"],
            "river": b["river"],
            "lat": round(sum(c[1] for c in b["coords"]) / len(b["coords"]), 3),
            "lon": round(sum(c[0] for c in b["coords"]) / len(b["coords"]), 3),
            "bbox": b["bbox"],
            "coords": b["coords"],
            "support": "GPM IMERG and GLDAS means over the basin's bounding box (approximate, not the watershed)",
            "rain_mm": series_dict(GPM_YEARS, rain, 1),
            "rain_stats": sen_mann_kendall(t, rain),
            # GLDAS Noah = land-surface MODEL; runoff is modelled, not gauged discharge
            "runoff_mm": series_dict(GLDAS_YEARS, g["runoff"], 1),
            "runoff_stats": sen_mann_kendall(tg, g["runoff"]),
            "evap_mm": series_dict(GLDAS_YEARS, g["evap"], 1),
            "evap_stats": sen_mann_kendall(tg, g["evap"]),
            "soil_mm": series_dict(GLDAS_YEARS, g["soil"], 2),
            "soil_stats": sen_mann_kendall(tg, g["soil"]),
        })
        features.append({
            "type": "Feature",
            "properties": {"id": b["id"], "name": b["name"], "river": b["river"], "geometry_note": "schematic river line"},
            "geometry": {"type": "LineString", "coordinates": b["coords"]},
        })
    return basins, {"type": "FeatureCollection", "features": features}


# ---------------------------------------------------------------------------
# 6. EXPLORATORY: NASA SWOT reservoirs (Energy Tech Lab, D44)
# ---------------------------------------------------------------------------
def _point_in_rings(lon: float, lat: float, multi_poly: list) -> bool:
    for poly in multi_poly:
        if not poly:
            continue
        ring, inside, j = poly[0], False, len(poly[0]) - 1
        for i in range(len(ring)):
            xi, yi = ring[i][0], ring[i][1]
            xj, yj = ring[j][0], ring[j][1]
            if (yi > lat) != (yj > lat) and lon < (xj - xi) * (lat - yi) / ((yj - yi) or 1e-12) + xi:
                inside = not inside
            j = i
        if inside:
            return True
    return False


def _geom_points(geom: dict) -> list:
    t, c = geom.get("type"), geom.get("coordinates")
    if t == "Polygon" and c:
        return c[0]
    if t == "MultiPolygon" and c:
        return [pt for poly in c if poly for pt in poly[0]]
    if t == "LineString" and c:
        return c
    if t == "GeometryCollection":
        return [pt for g in geom.get("geometries", []) for pt in _geom_points(g)]
    return []


def _nearest_series(lats, lons, stack, lat, lon) -> np.ndarray:
    i = int(np.argmin(np.abs(np.asarray(lats) - lat)))
    j = int(np.argmin(np.abs(np.asarray(lons) - lon)))
    return stack[:, i, j]


def build_swot_reservoirs(merra2_grid, gpm_full, gldas_grid) -> list[dict]:
    pld_path = ROOT / "data/processed/spain/swot/pld_lakes_spain.geojson"
    csv_path = ROOT / "data/processed/spain/swot/hydrocron_lakes_spain.csv"
    hydro_path = ROOT / "apps/web/public/data/spain-hydrography.geojson"
    admin_path = ROOT / "apps/web/public/data/spain-admin.json"
    if not pld_path.exists() or not csv_path.exists():
        print("SWOT inputs missing; swot_reservoirs = []")
        return []
    print("EXPLORATORY: NASA SWOT LakeSP reservoirs 2023–2026 ...")
    for q in (pld_path, csv_path, hydro_path):
        if q.exists():
            INPUTS[str(q.relative_to(ROOT))] = sha(q)
    pld = json.loads(pld_path.read_text())
    hydro = json.loads(hydro_path.read_text()) if hydro_path.exists() else {"features": []}
    admin = json.loads(admin_path.read_text())

    names = []
    for f in hydro.get("features", []):
        pr = f.get("properties", {})
        if not pr.get("name") or pr.get("kind") not in ("reservoir", "lake", "lagoon"):
            continue
        ring = _geom_points(f.get("geometry", {}))
        if ring:
            names.append({"name": str(pr["name"]), "lat": sum(p[1] for p in ring) / len(ring), "lon": sum(p[0] for p in ring) / len(ring)})

    pld_info = {}
    for f in pld.get("features", []):
        lid = str(f["properties"].get("lake_id"))
        pts = _geom_points(f.get("geometry") or {})
        if not pts and isinstance(f["properties"].get("simplified_geom"), dict):
            pts = _geom_points(f["properties"]["simplified_geom"])
        if pts:
            pld_info[lid] = (sum(p[1] for p in pts) / len(pts), sum(p[0] for p in pts) / len(pts), pts)

    df = pd.read_csv(csv_path)
    df["lake_id"] = df["lake_id"].astype(str)
    valid = df[(df["wse"] > -1000) & (df["area_total"] > 0) & (df["area_total"] < 350)].copy()

    m_stack, _, m_lats, m_lons = merra2_grid
    p_full, p_lats, p_lons = gpm_full
    g_stacks, g_lats, g_lons = gldas_grid
    e_stack = g_stacks["evapotranspiration_mm"]
    tm, tp, tg = (np.array(y, float) for y in (MERRA2_YEARS, GPM_YEARS, GLDAS_YEARS))

    known = {  # PLD lake_id -> name where the automatic Wikidata match is ambiguous
        "2310028773": "Embalse de Alcántara",
        "2310000123": "Embalse de Alqueva (Guadiana)",
        "2310028513": "Embalse de Entrepeñas",
        "2160000792": "L'Albufera de València",
        "2160008833": "Embalse de Ullibarri-Gamboa",
        "2310018403": "Embalse de Bornos",
    }
    out, seen = [], set()
    for lid, g in valid.groupby("lake_id"):
        if len(g) < 12 or lid not in pld_info:
            continue
        lat, lon, pts = pld_info[lid]
        area_mean = float(g["area_total"].mean())
        if area_mean < 1.8:
            continue
        best, best_d = None, 999.0
        sample = pts[:: max(1, len(pts) // 25)] + [(lon, lat)]
        for w in names:
            for px, py in sample:
                d = math.hypot((py - w["lat"]) * 111.0, (px - w["lon"]) * 85.0)
                if d < best_d:
                    best, best_d = w, d
        if lid in known:
            name = known[lid]
        elif best and best_d <= 8.5:
            n = best["name"].strip()
            name = n[0].upper() + n[1:]
            if not name.lower().startswith(("embalse", "pantano", "lago", "laguna", "mar ", "albufera")):
                name = f"Embalse de {name}"
        else:
            continue  # unnamed water bodies are skipped, never given a made-up name
        if name.lower() in seen:
            continue
        seen.add(name.lower())

        prov = next((p for p in admin["provinces"]
                     if p["bbox"][0] - 0.1 <= lon <= p["bbox"][2] + 0.1 and p["bbox"][1] - 0.1 <= lat <= p["bbox"][3] + 0.1
                     and _point_in_rings(lon, lat, p["coordinates"])), None)
        if prov is None:  # outside every province polygon (border / coast): nearest centre, flagged
            prov = min(admin["provinces"], key=lambda p: math.hypot(lat - p["center"][0], lon - p["center"][1]))
            prov_match = "nearest_centre"
        else:
            prov_match = "inside_polygon"
        basin = next((b for b in RIVER_BASINS if b["bbox"][0] <= lon <= b["bbox"][2] and b["bbox"][1] <= lat <= b["bbox"][3]), None)

        area_cv = round(min(1.5, float(g["area_total"].std()) / max(area_mean, 0.1)), 3)
        gs = g.sort_values("time_str").assign(ym=lambda d: d["time_str"].str.slice(0, 7))
        series = [{"ym": str(ym), "area_km2": round(float(d["area_total"].mean()), 2), "wse_m": round(float(d["wse"].mean()), 2)}
                  for ym, d in gs.groupby("ym") if ym >= "2023-03"]

        t_ser = _nearest_series(m_lats, m_lons, m_stack, lat, lon)
        e_ser = _nearest_series(g_lats, g_lons, e_stack, lat, lon)
        p_ser = _nearest_series(p_lats, p_lons, p_full, lat, lon)
        t_st, e_st, p_st = sen_mann_kendall(tm, t_ser), sen_mann_kendall(tg, e_ser), sen_mann_kendall(tp, p_ser)
        evap = float(np.nanmean(e_ser)) if np.isfinite(e_ser).any() else None

        # EXPLORATORY heuristic (hand-picked weights): 50 % surface stability, 25 % size, 25 % ET pressure
        stab = max(0.0, min(100.0, (1.0 - min(area_cv, 0.95) / 0.95) * 100.0))
        size = min(100.0, math.log1p(area_mean) / math.log1p(45.0) * 100.0)
        fpv = round(0.50 * stab + 0.25 * size + 0.25 * max(20.0, min(100.0, (evap - 320.0) / 350.0 * 100.0)), 1) if evap is not None else None

        nn = lambda a, nd: round(float(np.nanmean(a)), nd) if np.isfinite(a).any() else None  # noqa: E731
        out.append({
            "id": lid,
            "name": name,
            "lat": round(lat, 4),
            "lon": round(lon, 4),
            "provinceId": prov["id"],
            "provinceName": prov["name"],
            "ccaaId": prov["ccaaId"],
            "province_match": prov_match,
            "basinId": basin["id"] if basin else None,
            "basinName": basin["name"] if basin else None,
            "n_obs": int(len(g)),
            "area_mean_km2": round(area_mean, 2),
            "area_min_km2": round(float(g["area_total"].min()), 2),
            "area_max_km2": round(float(g["area_total"].max()), 2),
            "area_cv": area_cv,
            "wse_mean_m": round(float(g["wse"].mean()), 1),
            "wse_std_m": round(float(g["wse"].std()), 2),
            "temp_mean_c": nn(t_ser, 1),
            "temp_slope_decade": t_st["slope_decade"] if t_st else None,
            "evap_mean_mm": round(evap) if evap is not None else None,
            "evap_slope_decade": e_st["slope_decade"] if e_st else None,
            "rain_mean_mm": nn(p_ser, 0),
            "rain_slope_decade": p_st["slope_decade"] if p_st else None,
            "fpv_score": fpv,
            "swot_series": series[-18:],
        })
    out.sort(key=lambda x: (-(x["fpv_score"] or 0), -x["area_mean_km2"]))
    print(f"  {len(out[:48])} named SWOT reservoirs kept")
    return out[:48]


# ---------------------------------------------------------------------------
# 7. EXPLORATORY: per-province / per-CCAA profiles (Energy Tech Lab, D44)
# ---------------------------------------------------------------------------
PROFILE_YEARS = list(range(2000, 2026))


def _on_years(src_years, values, nd) -> list:
    m = dict(zip(src_years, values))
    return [round(float(m[y]), nd) if y in m and np.isfinite(m[y]) else None for y in PROFILE_YEARS]


def build_admin_profiles(merra2_grid, gpm_full, gldas_grid, noaa: dict, swot: list[dict]) -> dict:
    print("EXPLORATORY: province / CCAA profiles ...")
    admin = json.loads((ROOT / "apps/web/public/data/spain-admin.json").read_text())
    m_stack, m_summer, m_lats, m_lons = merra2_grid
    p_full, p_lats, p_lons = gpm_full
    g_stacks, g_lats, g_lons = gldas_grid
    sc = R.scopes()
    ty = np.array(PROFILE_YEARS, float)

    def unit(entry: dict, key: str, is_ccaa: bool) -> dict:
        geom = sc[key]["geom"]
        wm, wp, wg = (R.grid_weights(a, b, geom) for a, b in ((m_lats, m_lons), (p_lats, p_lons), (g_lats, g_lons)))
        series = {
            "temp_c": _on_years(MERRA2_YEARS, R.weighted_mean(m_stack, wm), 2) if wm.sum() else [None] * len(PROFILE_YEARS),
            "summer_temp_c": _on_years(MERRA2_YEARS, R.weighted_mean(m_summer, wm), 2) if wm.sum() else [None] * len(PROFILE_YEARS),
            "rain_mm": _on_years(GPM_YEARS, R.weighted_mean(p_full, wp), 1) if wp.sum() else [None] * len(PROFILE_YEARS),
        }
        for k, v, nd in [("runoff_mm", "total_runoff_mm", 1), ("evap_mm", "evapotranspiration_mm", 1),
                         ("soil_mm", "soil_moisture_0_10cm_mm", 2), ("swe_mm", "snow_water_equivalent_mm", 2)]:
            series[k] = _on_years(GLDAS_YEARS, R.weighted_mean(g_stacks[v], wg), nd) if wg.sum() else [None] * len(PROFILE_YEARS)

        # NOAA: mean over stations inside the unit's polygon; years without data stay null
        sts = [s for s in noaa["stations"] if _point_in_rings(s["lon"], s["lat"], entry["coordinates"])] if "coordinates" in entry else []
        for metric, k in [("hot_days_35", "hot_days_35"), ("tropical_nights", "tropical_nights"),
                          ("max_dry_spell", "max_dry_spell"), ("dtr", "dtr_c")]:
            row = []
            for y in PROFILE_YEARS:
                vals = [s["years"].get(str(y), {}).get(metric) for s in sts]
                vals = [float(v) for v in vals if v is not None]
                row.append(round(sum(vals) / len(vals), 2) if vals else None)
            series[k] = row
        stats = {k: sen_mann_kendall(ty, np.array([np.nan if v is None else v for v in vals], float)) for k, vals in series.items()}

        awnd = [s["wind_mean_ms"] for s in sts if s.get("wind_mean_ms") is not None]
        if is_ccaa:
            res = [r for r in swot if r["ccaaId"] == entry["id"]]
        else:
            res = [r for r in swot if r["provinceId"] == entry["id"]]
        fpv = [r["fpv_score"] for r in res if r["fpv_score"] is not None]
        return {
            "id": entry["id"],
            "name": entry["name"],
            "lat": round(entry["center"][0], 3),
            "lon": round(entry["center"][1], 3),
            "ccaaId": entry["id"] if is_ccaa else entry.get("ccaaId", ""),
            "ccaaName": entry["name"] if is_ccaa else entry.get("ccaaName", ""),
            "series": series,
            "stats": stats,
            "noaa_station_count": len(sts),
            # Observed NOAA AWND mean of stations in the unit (no gridded wind product in this bundle, D29)
            "wind_mean_ms": round(float(np.mean(awnd)), 2) if awnd else None,
            "wind_slope_decade": None,
            "wind_source": f"NOAA AWND, {len(awnd)} station(s)" if awnd else "No observed wind data",
            # No MODIS NDVI time series in this bundle (D29)
            "ndvi_mean": None,
            "ndvi_slope_decade": None,
            "swot_count": len(res),
            "swot_area_km2": round(sum(r["area_mean_km2"] for r in res), 2),
            "swot_cv": round(float(np.mean([r["area_cv"] for r in res])), 3) if res else None,
            "swot_fpv_score": round(float(np.mean(fpv)), 1) if fpv else None,
        }

    provinces = {p["id"]: unit(p, f"provincia:{p['id']}", False) for p in admin["provinces"] if f"provincia:{p['id']}" in sc}
    ccaa = {c["id"]: unit(c, f"ccaa:{c['id']}", True) for c in admin["ccaa"] if f"ccaa:{c['id']}" in sc}
    return {
        "status": "EXPLORATORY",
        "note": "Energy Tech Lab inputs (D44). Same kernels and region weights as 'scopes'; null = no data. Not validated results.",
        "years": PROFILE_YEARS,
        "provinces": provinces,
        "ccaa": ccaa,
    }


def git_rev() -> str:
    try:
        rev = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ROOT, text=True).strip()
        dirty = subprocess.call(["git", "diff", "--quiet", "--", "scripts", "packages"], cwd=ROOT) != 0
        return rev + ("+uncommitted" if dirty else "")
    except Exception:
        return "unknown"


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    merra2, sc_temp, merra2_grid = build_merra2()
    gpm, sc_rain, sc_anom, gpm_full = build_gpm()
    gldas, sc_runoff, gldas_grid = build_gldas()
    noaa = build_noaa_stations()
    basins, rivers_geojson = build_rivers_and_basins(gpm_full, gldas_grid)
    swot_reservoirs = build_swot_reservoirs(merra2_grid, gpm_full, gldas_grid)
    admin_profiles = build_admin_profiles(merra2_grid, gpm_full, gldas_grid, noaa, swot_reservoirs)

    scopes = {}
    for key, sc in R.scopes().items():
        scopes[key] = {"name": sc["name"]}
        for dim, block in [("temperature", sc_temp), ("precipitation", sc_rain), ("drought", sc_anom), ("water_rivers", sc_runoff)]:
            if key in block:
                scopes[key][dim] = block[key]

    bundle = {
        "bundle_version": "climate/v2",
        "scope": "Spain. Headline 'Spain' values = Peninsula + Balearics (area-weighted); Canarias separate",
        "last_complete_year": {"merra2": MERRA2_YEARS[-1], "gpm": GPM_YEARS[-1], "gldas": GLDAS_YEARS[-1], "noaa": 2025},
        "method": "Theil–Sen slope (Gilbert 95% CI) + Mann–Kendall (ties-corrected; Hamed–Rao if lag-1 autocorrelation is significant). significant = p < 0.05 and CI excludes 0. Maps show slopes; per-cell q (Benjamini–Hochberg) in cell_q_value. No extrapolation.",
        "merra2": merra2,
        "gpm": gpm,
        "gldas": gldas,
        "noaa": noaa,
        "rivers": basins,
        "scopes": scopes,
        "swot_reservoirs": swot_reservoirs,
        "admin_profiles": admin_profiles,
        "provenance": {
            "generator": "scripts/build_climate_bundle.py",
            "code_sha256": {
                "scripts/build_climate_bundle.py": sha(Path(__file__)),
                "packages/science/trends.py": sha(ROOT / "packages/science/trends.py"),
                "packages/science/regions.py": sha(ROOT / "packages/science/regions.py"),
            },
            "git": git_rev(),
            "boundaries": "apps/web/public/data/spain-admin.json",
            "boundaries_sha256": sha(ROOT / "apps/web/public/data/spain-admin.json"),
            "inputs_sha256": dict(sorted(INPUTS.items())),
            "generated_utc": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        },
    }
    path = OUT_DIR / "climate-bundle.json"
    path.write_text(json.dumps(bundle, separators=(",", ":"), ensure_ascii=False))
    (OUT_DIR / "spain-rivers.geojson").write_text(json.dumps(rivers_geojson, separators=(",", ":"), ensure_ascii=False))
    print(f"Wrote {path.relative_to(ROOT)}: {path.stat().st_size / 1024:.0f} KiB")
    s = merra2["spain_stats"]
    print(f"Spain (R0) T2M: {s['slope_decade']:+.3f} °C/decade [{s['ci_low_decade']:+.3f}, {s['ci_high_decade']:+.3f}] p={s['p_value']} n={s['n']}")


if __name__ == "__main__":
    main()
