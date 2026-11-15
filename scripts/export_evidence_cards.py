#!/usr/bin/env python3
"""Export frozen AnalysisBundles as EvidenceCards for /explore (render-only, ADR-002).

Reads  data/results/energy_gap/analysis_bundle.json + annual_series.csv
       data/results/gate_a_temperature/analysis_bundle.json + annual_series.csv
Writes apps/web/public/data/evidence-cards.json

Every number is copied from the bundles; the browser must not recompute anything.
"""
from __future__ import annotations

import hashlib
import json
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
EG = ROOT / "data/results/energy_gap"
GA = ROOT / "data/results/gate_a_temperature"
NOAA = ROOT / "data/results/noaa_validation/analysis_bundle.json"
OUT = ROOT / "apps/web/public/data/evidence-cards.json"
INDEP = EG / "independence_check.json"  # scripts/check_energy_gap_independence.py
WEIGHTS = ROOT / "data/processed/spain/power/region_weights.json"
# Pre-registered Gate B regions (ENERGY_RESEARCH.md §0) → /explore scope keys. R0 = the "age" scope.
ENERGY_REGIONS = ["R0", "ES11", "ES41", "ES24", "ES61"]


def scope_key(rid: str) -> str:
    return "age" if rid == "R0" else f"ccaa:{rid}"

OUTCOME_LABEL = {
    "supported_increase": "Supported increase",
    "supported_decrease": "Supported decrease",
    "no_robust_trend": "No robustly supported trend",
    "insufficient_evidence": "Insufficient evidence",
}


def sha(p: Path) -> str:
    return hashlib.sha256(p.read_bytes()).hexdigest()


def r(x, d=2):
    return None if x is None else round(float(x), d)


def energy_card(bundle_path: Path, rid: str) -> dict:
    b = json.loads(bundle_path.read_text(encoding="utf-8"))
    res = b["results"][rid]
    e1 = res["E1_joint_low_days_P20"]
    a = pd.read_csv(EG / "annual_series.csv")
    a = a[a.region == rid]
    sens = res["E1_sensitivity"]
    ind = json.loads(INDEP.read_text(encoding="utf-8"))["regions"][rid]
    eff = json.loads(WEIGHTS.read_text(encoding="utf-8"))[rid]
    return {
        "id": f"energy-gap-{rid}",
        "topic": "joint_low",
        "headline": rid == "R0",
        "region": {"scope": scope_key(rid), "name": res["region"]},
        "status": b["status"],
        "question": f"Have days with jointly low solar and wind resources become more or less frequent in {res['region']} since 2001?",
        "outcome": res["E1_outcome"],
        "outcome_label": OUTCOME_LABEL[res["E1_outcome"]],
        "what": "Days per year when BOTH daily solar insolation and daily mean 50 m wind speed fall below their own monthly 20th percentile (reference 2001–2020)",
        "where": f"{res['region']} — regional mean of NASA POWER cells (solar 1° × 1°, wind 0.5° × 0.625°)",
        "when": "2001–2025, calendar years, daily data in local solar time",
        "how_much": {
            "slope_per_decade": r(e1["slope_per_decade"]),
            "ci95_per_decade": [r(e1["ci_low_per_decade"]), r(e1["ci_high_per_decade"])],
            "units": "days per decade",
            "median_per_year": r(res["median_joint_low_days"], 1),
        },
        "evidence": {
            "method": e1["method"],
            "n_years": e1["n"],
            "p": r(e1["p"], 3),
            "p_adjusted_bh": r(res["E1_p_BH"], 3),
            "lag1_autocorr": r(e1["lag1_autocorr"], 2),
            "min_detectable_trend_per_decade": r(res["E1_minimum_detectable_trend_per_decade"]),
            "sensitivity": {k: r(v["slope_per_decade"]) for k, v in sens.items()},
        },
        "context": {
            "solar_mean_trend": f"{e1_fmt(res['E0_annual_mean_solar'])} kWh m⁻² day⁻¹ per decade",
            "wind_mean_trend": f"{e1_fmt(res['E0_annual_mean_wind'])} m s⁻¹ per decade",
            "solar_wind_rank_correlation_median": res["E3_median_annual_tau"],
        },
        "complementarity": {
            "observed_2001_2025": ind["year_shift"]["observed_without_feb29"],
            "expected_if_independent_mean": ind["year_shift"]["surrogate_mean"],
            "expected_range_95": ind["year_shift"]["surrogate_range_2_5_97_5"],
            "ratio": ind["ratio_observed_to_expected"]["year_shift"],
            "null_model": "year-shift surrogates (solar of one year vs wind of another; keeps seasonality and persistence)",
            "source": str(INDEP.relative_to(ROOT)),
        },
        "do_not_conclude": "Not electricity generation, not grid reliability or outage risk, not site suitability, not a forecast.",
        "limitations": [
            "Solar is a 1° satellite-derived product (CERES SYN1deg); wind is MERRA-2 reanalysis with known biases (underestimates Mediterranean wind power).",
            "Daily totals and means; sub-daily lulls are not resolved.",
            "25 annual values: limited power to detect small trends.",
            "Pre-registered single definition (P20); sensitivity to P10/P30 shown above.",
            f"Regional support: ≈{eff['solar']['effective_cells']} effective 1° solar cells and ≈{eff['wind']['effective_cells']} effective wind cells.",
            "Confirmatory family: 5 pre-registered regions, Benjamini–Hochberg adjusted.",
        ],
        "series": {
            "label": "Joint-low days",
            "units": "days per year",
            "years": a.year.tolist(),
            "values": a.joint_low_days_P20.tolist(),
            "complete": a.complete.tolist(),
        },
        "trend_line": {"intercept": e1["intercept"], "slope_per_decade": e1["slope_per_decade"]},
        "sources": [
            {"name": "NASA POWER ALLSKY_SFC_SW_DWN (CERES SYN1deg Ed4.2)", "role": "daily solar insolation", "url": "https://power.larc.nasa.gov/docs/"},
            {"name": "NASA POWER WS50M (GMAO MERRA-2)", "role": "daily 50 m wind speed", "url": "https://power.larc.nasa.gov/docs/"},
        ],
        "provenance": {"bundle": str(bundle_path.relative_to(ROOT)), "bundle_sha256": sha(bundle_path), "git": b["provenance"]["code"]["git"]},
    }


def e1_fmt(t: dict) -> str:
    return f"{t['slope_per_decade']:+.3f} (95% CI {t['ci_low_per_decade']:+.3f} to {t['ci_high_per_decade']:+.3f}; p = {t['p']:.2f})"


def noaa_check() -> dict:
    v = json.loads(NOAA.read_text(encoding="utf-8"))
    s = v["summary"]
    return {
        "name": "NOAA GHCN-Daily external station comparison",
        "n_stations": s["n_stations"],
        "stations_warming": s["stations_positive"],
        "within_0_2_per_decade": s["abs_slope_diff_le_0_2"],
        "slope_diff_median_per_decade": s["slope_diff_median"],
        "pearson_r_median": s["pearson_r_median"],
        "period": v["inclusion"]["period"],
        "status": v["status"],
        "independence_note": "Not claimed independent: MERRA-2 assimilates some land surface observations and the variables are not confirmed (SCIENTIFIC_REVIEW.md §3).",
        "bundle": str(NOAA.relative_to(ROOT)),
        "bundle_sha256": sha(NOAA),
    }


def temperature_card(bundle_path: Path) -> dict:
    b = json.loads(bundle_path.read_text(encoding="utf-8"))
    res = b["result"]
    a = pd.read_csv(GA / "annual_series.csv")
    lo, hi = b["slope_range_per_decade"]
    return {
        "id": "gate-a-temperature-R0",
        "topic": "temperature",
        "headline": True,
        "region": {"scope": "age", "name": "Peninsula + Balearics"},
        "status": b["status"],
        "question": "Has near-surface air temperature changed over Peninsular Spain and the Balearics since 2000?",
        "outcome": b["outcome"],
        "outcome_label": OUTCOME_LABEL[b["outcome"]],
        "what": "Annual mean 2 m air temperature (MERRA-2 reanalysis)",
        "where": "Peninsula + Balearics — area-weighted mean of 0.5° × 0.625° cells",
        "when": "2000–2025, complete calendar years",
        "how_much": {
            "slope_per_decade": r(res["slope_per_decade"]),
            "ci95_per_decade": [r(res["ci_low_per_decade"]), r(res["ci_high_per_decade"])],
            "units": "°C per decade",
            "window_range_per_decade": [r(lo), r(hi)],
        },
        "evidence": {
            "method": res["method"],
            "n_years": res["n"],
            "p": r(res["p"], 4),
            "lag1_autocorr": r(res["lag1_autocorr"], 2),
            "sensitivity": {k: r(v["slope_per_decade"]) for k, v in b["window_sensitivity"].items()},
        },
        "do_not_conclude": "Not a cause of warming, not a forecast, not evidence about energy production.",
        "limitations": [
            "Reanalysis (model + data assimilation), ~50 km cells: not a station measurement.",
            "26 years; magnitude depends on the window (range shown), the sign does not.",
        ],
        # External station comparison (P0-S5, D52); wording per D75: not claimed independent of MERRA-2.
        "external_check": noaa_check(),
        "series": {"label": "Annual mean T2M", "units": "°C", "years": a.year.tolist(), "values": a.t2m_annual_mean_c.tolist(), "complete": [True] * len(a)},
        "trend_line": {"intercept": res["intercept"], "slope_per_decade": res["slope_per_decade"]},
        "sources": [{"name": "NASA MERRA-2 M2TMNXSLV 5.12.4 (DOI 10.5067/AP1B0BA5PD2K)", "role": "monthly 2 m air temperature", "url": "https://doi.org/10.5067/AP1B0BA5PD2K"}],
        "provenance": {"bundle": str(bundle_path.relative_to(ROOT)), "bundle_sha256": sha(bundle_path), "git": b["provenance"]["code"]["git"]},
    }


def main() -> None:
    cards = [temperature_card(GA / "analysis_bundle.json")] + [energy_card(EG / "analysis_bundle.json", r) for r in ENERGY_REGIONS]
    OUT.write_text(json.dumps({"generated_by": "scripts/export_evidence_cards.py", "cards": cards}, indent=1, ensure_ascii=False), encoding="utf-8", newline="\n")
    for c in cards:
        print(c["id"], c["region"]["scope"], c["outcome_label"], c["how_much"]["slope_per_decade"], c["how_much"]["ci95_per_decade"])


if __name__ == "__main__":
    main()
