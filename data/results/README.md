# Results (generated, do not edit by hand)

Status: **EXPLORATORY until a second team member reviews them** (Gate 2 / Gate 3 sign-off). All
values below are copied from the AnalysisBundles in this folder, generated 14 Nov 2026.

## Reproduce

```bash
.venv/bin/python scripts/fetch_power_spain.py          # NASA POWER raw → data/raw/power + manifest (~19 MB, ~3 min)
.venv/bin/python packages/science/test_trends.py       # statistics tests (10 pass)
.venv/bin/python scripts/analyze_energy_gap.py         # → energy_gap/
.venv/bin/python scripts/analyze_gate_a_temperature.py # → gate_a_temperature/
.venv/bin/python scripts/export_evidence_cards.py      # → apps/web/public/data/evidence-cards.json
```

Two consecutive runs produced byte-identical `results`.

## 1. Hidden Energy Gap (Gate B), `energy_gap/`

Pre-registered in `docs/ENERGY_RESEARCH.md` §0 (amendments A1–A3, A3 disclosed as post-hoc and
conservative). Inputs: NASA POWER daily `ALLSKY_SFC_SW_DWN` (CERES SYN1deg Ed4.2, 1°) and `WS50M`
(MERRA-2, 0.5° × 0.625°), 2001–2025, LST. The API header confirms that every one of the 100 requests
lists only SYN1DEG (solar) or MERRA2 (wind), with no FLASHFlux/GEOS-IT and zero fill values.

**Joint-low day:** daily insolation **and** daily mean 50 m wind both below their own monthly 20th
percentile (reference 2001–2020).

### Primary result (E1, confirmatory, BH across 5 regions)

| Region | Median joint-low days/yr | Trend (days/decade) | 95 % CI | p | p (BH) | Min. detectable trend | Outcome |
|---|---|---|---|---|---|---|---|
| Peninsula + Balearics | 8 | 0.0 | −1.8 to +2.2 | 0.76 | 0.79 | 2.6 | Insufficient evidence |
| Galicia | 7 | −0.9 | −2.9 to +1.3 | 0.44 | 0.79 | 3.0 | Insufficient evidence |
| Castilla y León | 7 | 0.0 | −1.5 to +1.7 | 0.79 | 0.79 | 2.0 | Insufficient evidence |
| Aragón | 11 | +0.5 | −1.9 to +2.5 | 0.64 | 0.79 | 3.2 | Insufficient evidence |
| Andalucía | 7 | −1.1 | −3.3 to +0.8 | 0.23 | 0.79 | 2.8 | Insufficient evidence |

Sensitivity (P10, P30, reference 2001–2010): no variant shows a significant trend in any region.

**Reading:** no change is detected in how often solar and wind are low together. The frozen rule
labels this "insufficient evidence" rather than "no trend": with 25 annual values, the test can only
detect trends of ≈ 2–3 days/decade. For the national aggregate, the 95 % CI excludes changes larger
than about +2.2 or below −1.8 days per decade, around a typical 8 days/yr.

### Descriptive context (not confirmatory)

- **Complementarity holds every year.** Joint-low days occur at about **half** the rate expected if
  solar and wind were independent, given each year's own low-day rates: Peninsula 183 vs 370 expected
  over 25 years (ratio 0.50). The ratio is 0.44–0.53 in Galicia, Castilla y León and Andalucía and
  **0.79 in Aragón**. Daily solar and wind anomalies are negatively rank-correlated in **25 of 25
  years** (median Kendall τ ≈ −0.2). Aragón is the weakest case (τ ≈ −0.07, 23/25 years).
- **Marginal resources (E0):** no significant trend in annual mean insolation (Peninsula +0.03 kWh m⁻²
  day⁻¹ per decade, p = 0.13) or annual mean 50 m wind (−0.04 m s⁻¹ per decade, p = 0.34). Aragón and
  Andalucía show weak negative wind slopes (p ≈ 0.09–0.10).
- **Low-wind days (E2):** Peninsula +9.3 days/decade (95 % CI +1.3 to +15.8, p = 0.017, unadjusted).
  Low-solar days −5.0 days/decade (p = 0.17). These are **exploratory and hypothesis-generating
  only**. They are outside the confirmatory family, and reanalysis wind trends can reflect changes in the
  observing system assimilated by MERRA-2. Before any claim, check them against station wind (NOAA
  AWND is nearly empty for Spain) or another reanalysis.

Figures: `e1_joint_low_days.svg`, `e0_solar.svg`, `e0_wind.svg`. Daily regional series:
`data/processed/spain/power/power_regional_daily_2001-2025.csv`. Cell weights and effective cell
counts: `data/processed/spain/power/region_weights.json`. Galicia has only ~3.3 effective 1° solar cells.

## 2. Gate A fallback, `gate_a_temperature/`

MERRA-2 M2TMNXSLV 5.12.4 `T2M`, annual mean, Peninsula + Balearics, area-weighted, 2000–2025:
**+0.60 °C/decade (95 % CI +0.31 to +0.87), p = 0.0004**, lag-1 r = −0.05 (no correction needed).
The sign is positive in all 6 windows tested. Magnitude ranges **+0.41 to +0.83 °C/decade** with the
window. Outcome: **supported increase**. This is a reanalysis result. It says nothing about energy.

## What these results do NOT show

Electricity generation, capacity factors, storage needs, grid reliability or outage risk, site
suitability, causes, or anything about the future.
