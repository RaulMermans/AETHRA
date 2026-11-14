#!/usr/bin/env python3
"""P0-S5 independent check: MERRA-2 T2M vs NOAA GHCN-Daily station air temperature.

Design fixed before running (14 Nov 2026), not tuned afterwards:
- Variable match: air temperature vs air temperature. Station value = annual mean of daily
  (TMAX + TMIN) / 2 — ONE definition for every day (the bundle's `tavg` mixes reported TAVG and
  (TMAX+TMIN)/2 day by day, which can create spurious steps, so it is not used here). GHCN-D
  quality flags drop values (same rule as build_climate_bundle.py). A station-year counts only
  with >= 330 days having both TMAX and TMIN.
- MERRA-2: annual mean of the 12 monthly T2M means (M2TMNXSLV 5.12.4) of the 0.5° × 0.625° cell
  that contains the station. Same complete-year rule as Gate A.
- Stations: inside the Peninsula + Balearics polygon used by Gate A (Canarias, Ceuta, Melilla
  excluded), with >= 23 valid years in 2001–2025. Each station is compared only on its own valid
  years, with its own cell (paired), so changes in network composition cannot bias a pair.
- Per pair: Theil–Sen slope (°C/decade, packages/science) for station and cell on identical years,
  slope difference (cell − station), Pearson r of annual values, mean offset (cell − station).
- Summary: sign agreement, median and IQR of slope difference, median r, median offset.

Expected and NOT errors: a point vs a ~50 km cell (elevation, coast, land use, urban heat),
unhomogenized stations, (TMAX+TMIN)/2 vs a 24-hour mean. NOAA is an independent check, not exact
ground truth for any MERRA-2 cell.

Writes data/results/noaa_validation/{analysis_bundle.json, station_pairs.csv, slopes.svg}
"""
from __future__ import annotations

import glob
import hashlib
import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd
import xarray as xr
from shapely.geometry import Point

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
sys.path.insert(0, str(ROOT / "packages/science"))
import analyze_energy_gap as A  # noqa: E402  (same R0 polygon as Gate A)
import trends as T  # noqa: E402

NOAA_GLOB = str(ROOT / "data/noaa_ghcnd_spain_daily/ghcnd_spain_daily_*_metric.csv")
MERRA = ROOT / "data/processed/spain/merra2"
OUT = ROOT / "data/results/noaa_validation"
YEARS = list(range(2001, 2026))
MIN_DAYS = 330
MIN_YEARS = 23
DLAT, DLON = 0.5, 0.625


def sha(p: Path) -> str:
    return hashlib.sha256(p.read_bytes()).hexdigest()


def station_annual() -> tuple[pd.DataFrame, pd.DataFrame, dict[str, str]]:
    cols = ["STATION", "NAME", "LATITUDE", "LONGITUDE", "ELEVATION", "DATE", "TMAX", "TMAX_ATTRIBUTES", "TMIN", "TMIN_ATTRIBUTES"]
    frames, hashes = [], {}
    for f in sorted(glob.glob(NOAA_GLOB)):
        hashes[str(Path(f).relative_to(ROOT))] = sha(Path(f))
        avail = pd.read_csv(f, nrows=1).columns
        frames.append(pd.read_csv(f, usecols=[c for c in cols if c in avail], low_memory=False))
    df = pd.concat(frames, ignore_index=True).drop_duplicates(["STATION", "DATE"])
    for var in ("TMAX", "TMIN"):
        q = df[f"{var}_ATTRIBUTES"].fillna(",,").astype(str).str.split(",").str[1].fillna("")
        df.loc[q != "", var] = np.nan
    df["YEAR"] = df["DATE"].str.slice(0, 4).astype(int)
    df = df[(df.YEAR >= YEARS[0]) & (df.YEAR <= YEARS[-1])]
    df["TMID"] = (df["TMAX"] + df["TMIN"]) / 2.0  # NaN unless both present
    g = df.groupby(["STATION", "YEAR"])["TMID"]
    ann = pd.DataFrame({"n": g.count(), "mean": g.mean()}).reset_index()
    ann = ann[ann.n >= MIN_DAYS]
    meta = df.groupby("STATION")[["NAME", "LATITUDE", "LONGITUDE", "ELEVATION"]].first()
    return ann, meta, hashes


def merra_annual() -> tuple[xr.DataArray, dict[str, str]]:
    years, hashes = [], {}
    for y in YEARS:
        f = MERRA / f"M2TMNXSLV_5.12.4_spain_{y}.nc"
        hashes[str(f.relative_to(ROOT))] = sha(f)
        da = xr.open_dataset(f)["T2M_celsius"]
        if da.sizes["time"] != 12:
            raise SystemExit(f"{f.name}: expected 12 months")
        years.append(da.mean("time").expand_dims(year=[y]))
    return xr.concat(years, "year"), hashes


def svg_scatter(rows: list[dict], path: Path) -> None:
    w, h, pad = 360, 340, 46
    xs = [r["station_slope"] for r in rows]
    ys = [r["merra2_slope"] for r in rows]
    lo = min(min(xs), min(ys), 0.0) - 0.1
    hi = max(max(xs), max(ys)) + 0.1
    f = lambda v: pad + (v - lo) / (hi - lo) * (w - pad - 12)  # noqa: E731
    g = lambda v: h - pad - (v - lo) / (hi - lo) * (h - pad - 30)  # noqa: E731
    el = [f'<line x1="{f(lo)}" y1="{g(lo)}" x2="{f(hi)}" y2="{g(hi)}" stroke="#999" stroke-dasharray="4 3"/>',
          f'<line x1="{f(0)}" y1="{g(lo)}" x2="{f(0)}" y2="{g(hi)}" stroke="#ddd"/>',
          f'<line x1="{f(lo)}" y1="{g(0)}" x2="{f(hi)}" y2="{g(0)}" stroke="#ddd"/>']
    for k in np.linspace(lo, hi, 5):
        el.append(f'<text x="{f(k):.1f}" y="{h - pad + 14}" font-size="9" text-anchor="middle">{k:.1f}</text>')
        el.append(f'<text x="{pad - 4}" y="{g(k) + 3:.1f}" font-size="9" text-anchor="end">{k:.1f}</text>')
    for x, y in zip(xs, ys):
        el.append(f'<circle cx="{f(x):.1f}" cy="{g(y):.1f}" r="3" fill="#2b6cb0" fill-opacity="0.7"/>')
    el.append(f'<text x="{pad}" y="16" font-size="11" font-weight="600">Trend 2001–2025 (°C/decade): {len(rows)} paired stations</text>')
    el.append(f'<text x="{w / 2}" y="{h - 8}" font-size="10" text-anchor="middle">NOAA GHCN-D station, (Tmax+Tmin)/2</text>')
    el.append(f'<text x="12" y="{h / 2}" font-size="10" text-anchor="middle" transform="rotate(-90 12 {h / 2})">MERRA-2 T2M, containing cell</text>')
    path.write_text(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}" font-family="Helvetica,Arial,sans-serif"><rect width="100%" height="100%" fill="#fff"/>{"".join(el)}</svg>')


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    ann, meta, noaa_hash = station_annual()
    merra, merra_hash = merra_annual()
    lats, lons = merra.lat.values, merra.lon.values
    r0 = A.region_polygons()["R0"]

    rows = []
    for sid, grp in ann.groupby("STATION"):
        m = meta.loc[sid]
        if len(grp) < MIN_YEARS or not r0.covers(Point(float(m.LONGITUDE), float(m.LATITUDE))):
            continue
        i = int(np.argmin(np.abs(lats - m.LATITUDE)))
        j = int(np.argmin(np.abs(lons - m.LONGITUDE)))
        if abs(lats[i] - m.LATITUDE) > DLAT / 2 + 1e-9 or abs(lons[j] - m.LONGITUDE) > DLON / 2 + 1e-9:
            continue
        yrs = grp.YEAR.to_numpy()
        st = grp["mean"].to_numpy()
        cell = merra.sel(year=yrs).isel(lat=i, lon=j).values
        ok = np.isfinite(cell)
        yrs, st, cell = yrs[ok], st[ok], cell[ok]
        if len(yrs) < MIN_YEARS:
            continue
        ts, tc = T.trend(yrs, st), T.trend(yrs, cell)
        rows.append({
            "station": sid, "name": str(m.NAME), "lat": float(m.LATITUDE), "lon": float(m.LONGITUDE),
            "elevation_m": float(m.ELEVATION), "n_years": int(len(yrs)),
            "cell_lat": float(lats[i]), "cell_lon": float(lons[j]),
            "station_slope": round(ts.slope_per_decade, 3), "station_ci": [round(ts.ci_low_per_decade, 3), round(ts.ci_high_per_decade, 3)],
            "station_p": round(ts.p, 4),
            "merra2_slope": round(tc.slope_per_decade, 3), "merra2_ci": [round(tc.ci_low_per_decade, 3), round(tc.ci_high_per_decade, 3)],
            "merra2_p": round(tc.p, 4),
            "slope_diff_cell_minus_station": round(tc.slope_per_decade - ts.slope_per_decade, 3),
            "pearson_r_annual": round(float(np.corrcoef(st, cell)[0, 1]), 3),
            "mean_offset_cell_minus_station": round(float(np.mean(cell - st)), 2),
        })
    if not rows:
        raise SystemExit("no station passed the inclusion rule")
    df = pd.DataFrame(rows)
    df.drop(columns=["station_ci", "merra2_ci"]).to_csv(OUT / "station_pairs.csv", index=False)
    d = df.slope_diff_cell_minus_station
    same_sign = int((np.sign(df.station_slope) == np.sign(df.merra2_slope)).sum())
    summary = {
        "n_stations": len(df),
        "station_slope_median": round(float(df.station_slope.median()), 3),
        "merra2_slope_median": round(float(df.merra2_slope.median()), 3),
        "stations_positive": int((df.station_slope > 0).sum()),
        "cells_positive": int((df.merra2_slope > 0).sum()),
        "sign_agreement": same_sign,
        "slope_diff_median": round(float(d.median()), 3),
        "slope_diff_iqr": [round(float(d.quantile(0.25)), 3), round(float(d.quantile(0.75)), 3)],
        "abs_slope_diff_le_0_2": int((d.abs() <= 0.2).sum()),
        "pearson_r_median": round(float(df.pearson_r_annual.median()), 3),
        "pearson_r_min": round(float(df.pearson_r_annual.min()), 3),
        "mean_offset_median": round(float(df.mean_offset_cell_minus_station.median()), 2),
        "largest_disagreements": df.reindex(d.abs().sort_values(ascending=False).index)[["name", "station_slope", "merra2_slope", "elevation_m"]].head(5).to_dict("records"),
    }
    svg_scatter(rows, OUT / "slopes.svg")
    bundle = {
        "bundle_version": "noaa_validation/v1",
        "status": "EXPLORATORY until reviewed by a second team member (P0-S5)",
        "design": __doc__.split("Writes")[0].strip(),
        "inclusion": {"min_valid_days_per_year": MIN_DAYS, "min_years": MIN_YEARS, "period": "2001–2025", "region": "Peninsula + Balearics (Gate A polygon)"},
        "summary": summary,
        "pairs": rows,
        "provenance": {
            "noaa_files_sha256": noaa_hash, "merra2_files_sha256": merra_hash,
            "code": {"scripts/validate_merra2_vs_noaa.py": sha(Path(__file__)), "packages/science/trends.py": sha(ROOT / "packages/science/trends.py")},
        },
    }
    (OUT / "analysis_bundle.json").write_text(json.dumps(bundle, indent=1, ensure_ascii=False) + "\n")
    print(json.dumps(summary, indent=1, ensure_ascii=False))


if __name__ == "__main__":
    main()
