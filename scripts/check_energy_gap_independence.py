#!/usr/bin/env python3
"""Review check for the Gate B *descriptive* complementarity statement (not a new hypothesis).

The results README states that joint-low days occur at about half the rate expected if solar and
wind were independent. This script makes that number reproducible and checks it against three
independence null models, for all 5 pre-registered regions (none selected by result):

  annual   — expected = Σ_years solar_low_y × wind_low_y / valid_days_y   (the README's wording)
  monthly  — same, stratified by calendar month within each year (removes seasonal co-variation)
  shift    — year-shift surrogates: solar of year y paired with wind of year y+k (k = 1..24, by
             day of year, 29 Feb dropped). Keeps seasonality and day-to-day persistence of each
             series and breaks only the same-day coupling. Reports mean and 2.5–97.5 % range.

Indicator definition is identical to analyze_energy_gap.py (monthly P20, reference 2001–2020).
It is a statement about NASA POWER resource data. It is NOT evidence about generation, grid
reliability, or whether conditions are improving.

Reads  data/processed/spain/power/power_regional_daily_2001-2025.csv
Writes data/results/energy_gap/independence_check.json
"""
from __future__ import annotations

import hashlib
import json
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
DAILY = ROOT / "data/processed/spain/power/power_regional_daily_2001-2025.csv"
OUT = ROOT / "data/results/energy_gap/independence_check.json"
YEARS = list(range(2001, 2026))
REF = (2001, 2020)
Q = 0.20


def low_days(s: pd.Series) -> pd.Series:
    ref = s[(s.index.year >= REF[0]) & (s.index.year <= REF[1])]
    thr = ref.groupby(ref.index.month).quantile(Q)
    return s < thr.reindex(s.index.month).to_numpy()


def expected_annual(sl: pd.Series, wl: pd.Series) -> float:
    y = sl.index.year
    return float(sum(sl[y == k].sum() * wl[y == k].sum() / (y == k).sum() for k in YEARS))


def expected_monthly(sl: pd.Series, wl: pd.Series) -> float:
    y, m = sl.index.year, sl.index.month
    total = 0.0
    for k in YEARS:
        for mm in range(1, 13):
            sel = (y == k) & (m == mm)
            total += sl[sel].sum() * wl[sel].sum() / sel.sum()
    return total


def year_shift(sl: pd.Series, wl: pd.Series) -> tuple[int, list[int]]:
    keep = ~((sl.index.month == 2) & (sl.index.day == 29))
    s = sl[keep].to_numpy().reshape(len(YEARS), 365)
    w = wl[keep].to_numpy().reshape(len(YEARS), 365)
    return int((s & w).sum()), [int((s & np.roll(w, k, axis=0)).sum()) for k in range(1, len(YEARS))]


def main() -> None:
    d = pd.read_csv(DAILY, parse_dates=["date"])
    out: dict[str, dict] = {}
    for rid, g in d.groupby("region", sort=True):
        g = g.set_index("date").sort_index()
        if g[["solar_kwh_m2_day", "ws50m_m_s"]].isna().any().any():
            raise SystemExit(f"{rid}: missing daily values; this check assumes complete series (bundle: 25/25 complete years)")
        sl, wl = low_days(g.solar_kwh_m2_day), low_days(g.ws50m_m_s)
        observed = int((sl & wl).sum())
        obs365, sur = year_shift(sl, wl)
        lo, hi = np.percentile(sur, [2.5, 97.5])
        e_ann, e_mon = expected_annual(sl, wl), expected_monthly(sl, wl)
        out[rid] = {
            "observed_joint_low_days_2001_2025": observed,
            "expected_annual_pooled": round(e_ann, 1),
            "expected_month_stratified": round(e_mon, 1),
            "year_shift": {
                "observed_without_feb29": obs365,
                "surrogate_mean": round(float(np.mean(sur)), 1),
                "surrogate_range_2_5_97_5": [round(float(lo), 1), round(float(hi), 1)],
                "n_surrogates": len(sur),
                "observed_below_all_surrogates": bool(obs365 < min(sur)),
            },
            "ratio_observed_to_expected": {
                "annual_pooled": round(observed / e_ann, 2),
                "month_stratified": round(observed / e_mon, 2),
                "year_shift": round(obs365 / float(np.mean(sur)), 2),
            },
        }
    OUT.write_text(
        json.dumps(
            {
                "status": "Review check of a DESCRIPTIVE statement (not confirmatory, not a new hypothesis). Pending second-person review.",
                "indicator": "joint-low day = daily ALLSKY_SFC_SW_DWN and daily WS50M both below their monthly 20th percentile (reference 2001–2020)",
                "null_models": {
                    "annual_pooled": "independence given each year's own low-day counts",
                    "month_stratified": "independence within each calendar month of each year",
                    "year_shift": "solar year y vs wind year y+k (k=1..24): keeps seasonality and persistence, breaks same-day coupling",
                },
                "interpretation_limit": "Describes NASA POWER resource data (satellite-derived irradiance, reanalysis wind). Not generation, not grid reliability, not a trend, not evidence that conditions are improving.",
                "input_sha256": hashlib.sha256(DAILY.read_bytes()).hexdigest(),
                "code_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
                "regions": out,
            },
            indent=1,
            ensure_ascii=False,
        )
        + "\n"
    )
    for rid, v in out.items():
        print(rid, v["observed_joint_low_days_2001_2025"], v["year_shift"]["surrogate_mean"], v["year_shift"]["surrogate_range_2_5_97_5"], v["ratio_observed_to_expected"])


if __name__ == "__main__":
    main()
