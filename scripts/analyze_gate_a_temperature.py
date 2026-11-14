#!/usr/bin/env python3
"""Gate A fallback (D36, proposed): MERRA-2 2 m air temperature trend, Peninsula + Balearics.

Estimand: Theil–Sen trend (°C/decade) of the annual mean of MERRA-2 M2TMNXSLV 5.12.4 T2M,
weighted by cos(lat) × fraction of each 0.5° × 0.625° cell inside the Peninsula + Balearics
polygon (same polygons and statistics code as the energy analysis), complete years 2000–2025.
Window sensitivity reported. Reanalysis, not observation. Says nothing about energy.

Output: data/results/gate_a_temperature/analysis_bundle.json, annual_series.csv, t2m.svg
"""
from __future__ import annotations

import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd
import xarray as xr

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
sys.path.insert(0, str(ROOT / "packages/science"))
import analyze_energy_gap as A  # noqa: E402  (shared polygons, weights, SVG, provenance helpers)
import trends as T  # noqa: E402

SRC = ROOT / "data/processed/spain/merra2"
OUT = ROOT / "data/results/gate_a_temperature"
YEARS = list(range(2000, 2026))
WINDOWS = [(2000, 2025), (2001, 2025), (2005, 2025), (2000, 2020), (2000, 2022), (2003, 2023)]


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    poly = A.region_polygons()["R0"]
    annual, files = {}, {}
    weights = None
    for y in YEARS:
        f = SRC / f"M2TMNXSLV_5.12.4_spain_{y}.nc"
        ds = xr.open_dataset(f)
        da = ds["T2M_celsius"]
        if weights is None:
            cells = [(float(lo), float(la)) for la in da.lat.values for lo in da.lon.values]
            w = A.cell_weights(cells, 0.625, 0.5, poly)
            weights = xr.DataArray(
                np.array([[w.get((float(lo), float(la)), 0.0) for lo in da.lon.values] for la in da.lat.values]),
                coords={"lat": da.lat, "lon": da.lon}, dims=("lat", "lon"),
            )
        monthly = (da * weights).sum(("lat", "lon")) / weights.where(da.notnull()).sum(("lat", "lon"))
        n_months = int(np.isfinite(monthly.values).sum())
        annual[y] = float(monthly.mean()) if n_months == 12 else np.nan
        files[f.name] = A.sha(f)
    s = pd.Series(annual)
    t = np.array(YEARS, float)
    main_res = T.trend(t, s.values).to_dict()
    sens = {}
    for a, b in WINDOWS:
        m = (t >= a) & (t <= b)
        sens[f"{a}-{b}"] = T.trend(t[m], s.values[m]).to_dict()
    slopes = [v["slope_per_decade"] for v in sens.values()]
    pd.DataFrame({"year": YEARS, "t2m_annual_mean_c": s.round(3).values}).to_csv(OUT / "annual_series.csv", index=False)
    g = A.svg_panel(t, s.values, [True] * len(t), main_res["slope_per_decade"], main_res["intercept"],
                    f"Peninsula + Balearics · {main_res['slope_per_decade']:+.2f} °C/decade", "°C (annual mean, 2 m)")
    A.svg_figure(OUT / "t2m.svg", [g], "MERRA-2 M2TMNXSLV 5.12.4 T2M, area-weighted, 2000–2025. Reanalysis.", cols=1)
    supported = main_res["p"] < 0.05 and main_res["ci_low_per_decade"] > 0 and all(x > 0 for x in slopes)
    bundle = {
        "bundle_version": "gate_a_temperature/v1",
        "generated_utc": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "status": "EXPLORATORY until reviewed (Gate 2); D36 still PROPOSED",
        "analysis_spec": {
            "variable": "T2M (2 m air temperature), °C",
            "product": "NASA MERRA-2 M2TMNXSLV 5.12.4, DOI 10.5067/AP1B0BA5PD2K",
            "type": "reanalysis (model with data assimilation)",
            "native_grid": "0.5° × 0.625°, monthly",
            "region": "Peninsula + Balearics (GISCO NUTS 2021; excludes Canarias, Ceuta, Melilla)",
            "weighting": "cos(lat) × cell-area fraction inside polygon",
            "period": "2000–2025 complete calendar years (12/12 months)",
            "method": main_res["method"],
            "outcome_rule": "supported if p < 0.05, CI excludes 0, and positive in every sensitivity window",
        },
        "result": main_res,
        "window_sensitivity": sens,
        "slope_range_per_decade": [min(slopes), max(slopes)],
        "outcome": ("supported_increase" if supported else "no_robust_trend"),
        "not_measured": "energy production, causes of warming, future temperature",
        "provenance": {"input_files_sha256": files, "code": {"scripts/analyze_gate_a_temperature.py": A.sha(Path(__file__)), "packages/science/trends.py": A.sha(ROOT / "packages/science/trends.py"), "git": A.git_rev()}},
    }
    (OUT / "analysis_bundle.json").write_text(json.dumps(bundle, indent=1, ensure_ascii=False))
    print(json.dumps({"result": {k: main_res[k] for k in ("slope_per_decade", "ci_low_per_decade", "ci_high_per_decade", "p", "lag1_autocorr", "hamed_rao_applied")}, "range": [min(slopes), max(slopes)], "outcome": bundle["outcome"]}, indent=1))


if __name__ == "__main__":
    main()
