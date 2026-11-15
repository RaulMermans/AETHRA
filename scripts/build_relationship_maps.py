#!/usr/bin/env python3
"""Build the relationship maps for /explore (apps/web/public/data/relationship-maps.json).

Design fixed in docs/RELATIONSHIP_MAPS.md before any R2/R3 value was computed (DECISIONS D74).
- R1: MERRA-2 vs NOAA agreement, copied from data/results/noaa_validation (no new statistic).
- R2 (EXPLORATORY): per MERRA-2 cell, detrended Spearman rho of annual T2M vs annual GPM IMERG
  precipitation, 2000–2024, permutation p, Benjamini–Hochberg across cells.
- R3 (EXPLORATORY): per NOAA station, detrended Spearman rho of hot_days_35 vs max_dry_spell,
  >= 15 paired years, permutation p, Benjamini–Hochberg across stations.

Inputs : data/processed/spain/{merra2,gpm}/*.nc, apps/web/public/data/climate-bundle.json,
         data/results/noaa_validation/analysis_bundle.json
Output : apps/web/public/data/relationship-maps.json
Run    : .venv/bin/python scripts/build_relationship_maps.py
"""
from __future__ import annotations

import hashlib
import json
import subprocess
import sys
from datetime import UTC, datetime
from pathlib import Path
from typing import Literal

import numpy as np
import xarray as xr

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "packages/science"))
import trends as T

OUT = ROOT / "apps/web/public/data/relationship-maps.json"
BUNDLE = ROOT / "apps/web/public/data/climate-bundle.json"
VALIDATION = ROOT / "data/results/noaa_validation/analysis_bundle.json"

YEARS_R2 = list(range(2000, 2025))  # complete in both MERRA-2 and GPM (GPM 2025 ends in September)
MIN_GPM_COVERAGE = 0.5  # share of GPM 0.1° cells inside a MERRA-2 cell that must be finite
MIN_PAIRED_YEARS_R3 = 15
N_PERMUTATIONS = 9999
SEED = 0
ALPHA_Q = 0.05

Label = Literal["robust", "not-robust", "insufficient"]
INPUTS: dict[str, str] = {}


def sha(path: Path) -> str:
    digest = hashlib.sha256(path.read_bytes()).hexdigest()
    INPUTS[str(path.relative_to(ROOT))] = digest
    return digest


def read_var(path: Path, var: str) -> xr.DataArray:
    sha(path)
    with xr.open_dataset(path) as ds:
        return ds[var].load()


def correlate_family(series: list[tuple[np.ndarray, np.ndarray, np.ndarray] | None]) -> list[dict]:
    """Detrended Spearman + permutation p for each member, then BH q across the computed members."""
    results: list[T.RankCorrelationResult | None] = [
        T.detrended_rank_correlation(*s, n_permutations=N_PERMUTATIONS, seed=SEED) if s is not None else None
        for s in series
    ]
    tested = [(i, r) for i, r in enumerate(results) if r is not None]
    q = T.benjamini_hochberg([r.p_value for _, r in tested]) if tested else np.empty(0)
    q_by = {i: float(qi) for (i, _), qi in zip(tested, q, strict=True)}
    out: list[dict] = []
    for i, r in enumerate(results):
        if r is None:
            out.append({"rho": None, "p_value": None, "q_value_bh": None, "n": None, "label": "insufficient"})
            continue
        qi = q_by[i]
        label: Label = "robust" if qi < ALPHA_Q else "not-robust"
        out.append({"rho": round(r.rho, 3), "p_value": round(r.p_value, 4), "q_value_bh": round(qi, 4), "n": r.n, "label": label})
    return out


def build_r1() -> dict:
    sha(VALIDATION)
    v = json.loads(VALIDATION.read_text(encoding="utf-8"))
    pairs = [
        {
            "id": p["station"],
            "name": p["name"].replace(", SP", "").title(),
            "lat": p["lat"],
            "lon": p["lon"],
            "elevation_m": p["elevation_m"],
            "n_years": p["n_years"],
            "pearson_r_annual": p["pearson_r_annual"],
            "slope_diff_cell_minus_station": p["slope_diff_cell_minus_station"],
            "station_slope": p["station_slope"],
            "merra2_slope": p["merra2_slope"],
            "mean_offset_cell_minus_station": p["mean_offset_cell_minus_station"],
        }
        for p in v["pairs"]
    ]
    return {
        "id": "R1",
        "status": v["status"],
        "source": "data/results/noaa_validation/analysis_bundle.json (P0-S5, D52); values copied, not recomputed",
        "datasets": "NASA MERRA-2 M2TMNXSLV v5.12.4 T2M × NOAA GHCN-Daily (TMAX+TMIN)/2",
        "period": v["inclusion"]["period"],
        "units": {"pearson_r_annual": "dimensionless", "slope_diff_cell_minus_station": "°C/decade"},
        "summary": v["summary"],
        "pairs": pairs,
    }


def build_r2() -> dict:
    print("R2: MERRA-2 T2M × GPM IMERG precipitation, 2000–2024 ...")
    t_annual, p_annual = [], []
    for yr in YEARS_R2:
        tm = read_var(ROOT / f"data/processed/spain/merra2/M2TMNXSLV_5.12.4_spain_{yr}.nc", "T2M_celsius")
        gp = read_var(ROOT / f"data/processed/spain/gpm/GPM_3IMERGM_07_spain_{yr}.nc", "precipitation_monthly_accumulation")
        if tm.sizes["time"] != 12 or gp.sizes["time"] != 12:
            raise SystemExit(f"{yr}: incomplete year (MERRA-2 {tm.sizes['time']}, GPM {gp.sizes['time']} months)")
        t_annual.append(tm.values.astype(float).mean(axis=0))
        g = gp.values.astype(float)
        g[g < 0] = np.nan
        p_annual.append(g.sum(axis=0))  # NaN when any month is missing in a cell
    m_lats, m_lons = tm.lat.values.astype(float), tm.lon.values.astype(float)
    g_lats, g_lons = gp.lat.values.astype(float), gp.lon.values.astype(float)
    t_stack, p_stack = np.stack(t_annual), np.stack(p_annual)
    half_lat = abs(m_lats[1] - m_lats[0]) / 2
    half_lon = abs(m_lons[1] - m_lons[0]) / 2
    years = np.array(YEARS_R2, float)

    cells: list[dict] = []
    series: list[tuple[np.ndarray, np.ndarray, np.ndarray] | None] = []
    for r, lat in enumerate(m_lats):
        rows = np.flatnonzero((g_lats >= lat - half_lat) & (g_lats < lat + half_lat))
        for c, lon in enumerate(m_lons):
            if not np.isfinite(t_stack[0, r, c]):
                continue
            cols = np.flatnonzero((g_lons >= lon - half_lon) & (g_lons < lon + half_lon))
            if len(rows) == 0 or len(cols) == 0:
                continue
            block = p_stack[:, rows][:, :, cols]
            finite_share = float(np.isfinite(block).all(axis=0).mean())
            cells.append({"lat": round(float(lat), 3), "lon": round(float(lon), 3), "gpm_coverage": round(finite_share, 2)})
            if finite_share < MIN_GPM_COVERAGE:
                series.append(None)
                continue
            precip = np.nanmean(block.reshape(len(YEARS_R2), -1), axis=1)
            series.append((years, t_stack[:, r, c], precip))
    stats = correlate_family(series)
    for cell, st in zip(cells, stats, strict=True):
        cell.update(st)
    n_robust = sum(c["label"] == "robust" for c in cells)
    print(f"  {len(cells)} cells, {sum(c['label'] != 'insufficient' for c in cells)} tested, {n_robust} robust (q < {ALPHA_Q})")
    return {
        "id": "R2",
        "status": "EXPLORATORY (design pre-registered in docs/RELATIONSHIP_MAPS.md, 15 Nov 2026)",
        "datasets": "NASA MERRA-2 M2TMNXSLV v5.12.4 T2M (DOI 10.5067/AP1B0BA5PD2K) × NASA GPM IMERG Final V07 monthly (DOI 10.5067/GPM/IMERG/3B-MONTH/07)",
        "variables": "annual mean T2M (°C) × annual precipitation total (mm), GPM averaged over each MERRA-2 cell",
        "spatial_support": "MERRA-2 0.5° × 0.625° cells",
        "cell_size_deg": [round(2 * half_lat, 3), round(2 * half_lon, 3)],
        "period": "2000–2024",
        "method": f"Theil–Sen detrend per series; Spearman rho of residuals; two-sided permutation p ({N_PERMUTATIONS}, seed {SEED}); BH across tested cells; robust = q < {ALPHA_Q}",
        "summary": {
            "n_cells": len(cells),
            "n_tested": sum(c["label"] != "insufficient" for c in cells),
            "n_robust": n_robust,
            "n_robust_negative": sum(c["label"] == "robust" and c["rho"] < 0 for c in cells),
            "n_robust_positive": sum(c["label"] == "robust" and c["rho"] > 0 for c in cells),
            "rho_median": round(float(np.median([c["rho"] for c in cells if c["rho"] is not None])), 3),
            # Descriptive only: neighbouring cells are not independent, so a sign count is not a test.
            "n_tested_negative": sum(c["rho"] is not None and c["rho"] < 0 for c in cells),
            "n_tested_positive": sum(c["rho"] is not None and c["rho"] > 0 for c in cells),
            "q_min": min(c["q_value_bh"] for c in cells if c["q_value_bh"] is not None),
        },
        "cells": cells,
    }


def build_r3() -> dict:
    print("R3: NOAA hot_days_35 × max_dry_spell per station ...")
    sha(BUNDLE)
    stations = json.loads(BUNDLE.read_text(encoding="utf-8"))["noaa"]["stations"]
    rows: list[dict] = []
    series: list[tuple[np.ndarray, np.ndarray, np.ndarray] | None] = []
    for st in stations:
        yrs, hot, dry = [], [], []
        for y, rec in sorted(st["years"].items()):
            if rec.get("hot_days_35") is not None and rec.get("max_dry_spell") is not None:
                yrs.append(float(y))
                hot.append(float(rec["hot_days_35"]))
                dry.append(float(rec["max_dry_spell"]))
        rows.append({"id": st["id"], "name": st["name"], "lat": st["lat"], "lon": st["lon"], "elevation_m": st["elevation"], "paired_years": len(yrs)})
        series.append((np.array(yrs), np.array(hot), np.array(dry)) if len(yrs) >= MIN_PAIRED_YEARS_R3 else None)
    stats = correlate_family(series)
    for row, st in zip(rows, stats, strict=True):
        row.update(st)
    n_robust = sum(r["label"] == "robust" for r in rows)
    print(f"  {len(rows)} stations, {sum(r['label'] != 'insufficient' for r in rows)} tested, {n_robust} robust")
    return {
        "id": "R3",
        "status": "EXPLORATORY (design pre-registered in docs/RELATIONSHIP_MAPS.md, 15 Nov 2026)",
        "datasets": "NOAA GHCN-Daily (not homogenized), station-years with >= 330 valid days per variable",
        "variables": "hot_days_35 (days Tmax > 35 °C) × max_dry_spell (longest run of days < 1 mm)",
        "spatial_support": "Point stations",
        "period": "2001–2025, years where both variables are complete",
        "method": f"Theil–Sen detrend per series; Spearman rho of residuals; two-sided permutation p ({N_PERMUTATIONS}, seed {SEED}); BH across stations with >= {MIN_PAIRED_YEARS_R3} paired years; robust = q < {ALPHA_Q}",
        "summary": {
            "n_stations": len(rows),
            "n_tested": sum(r["label"] != "insufficient" for r in rows),
            "n_robust": n_robust,
            "n_robust_positive": sum(r["label"] == "robust" and r["rho"] > 0 for r in rows),
            "n_robust_negative": sum(r["label"] == "robust" and r["rho"] < 0 for r in rows),
            "rho_median": round(float(np.median([r["rho"] for r in rows if r["rho"] is not None])), 3),
            "n_tested_positive": sum(r["rho"] is not None and r["rho"] > 0 for r in rows),
            "n_tested_negative": sum(r["rho"] is not None and r["rho"] < 0 for r in rows),
            "q_min": min(r["q_value_bh"] for r in rows if r["q_value_bh"] is not None),
        },
        "stations": rows,
    }


def git_rev() -> str:
    try:
        rev = subprocess.run(["git", "rev-parse", "HEAD"], cwd=ROOT, capture_output=True, text=True, check=True).stdout.strip()
        dirty = subprocess.run(["git", "status", "--porcelain"], cwd=ROOT, capture_output=True, text=True, check=True).stdout.strip()
    except (OSError, subprocess.CalledProcessError):
        return "unknown"
    return f"{rev}+uncommitted" if dirty else rev


def main() -> None:
    out = {
        "bundle_version": "relationships/v1",
        "design": "docs/RELATIONSHIP_MAPS.md",
        "do_not_conclude": "Interannual co-variability only: not causation, not a trend, not a forecast.",
        "r1_validation": build_r1(),
        "r2_temp_precip": build_r2(),
        "r3_heat_drought": build_r3(),
        "provenance": {
            "generator": "scripts/build_relationship_maps.py",
            "generated_utc": datetime.now(UTC).isoformat(timespec="seconds"),
            "git": git_rev(),
            "code_sha256": {
                "scripts/build_relationship_maps.py": hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
                "packages/science/trends.py": hashlib.sha256((ROOT / "packages/science/trends.py").read_bytes()).hexdigest(),
            },
            "inputs_sha256": INPUTS,
        },
    }
    OUT.write_text(json.dumps(out, separators=(",", ":"), ensure_ascii=False), encoding="utf-8", newline="\n")
    print(f"Wrote {OUT.relative_to(ROOT)}: {OUT.stat().st_size // 1024} KiB")


if __name__ == "__main__":
    main()
