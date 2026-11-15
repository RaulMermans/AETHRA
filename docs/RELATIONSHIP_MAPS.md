# Relationship maps (multi-variable)

Status: **R1 renders a recorded result. R2 and R3 are EXPLORATORY.**
Design fixed on 15 Nov 2026 **before** any R2/R3 number was computed (DECISIONS D74). One variant per
map; no thresholds, variables, periods or tests are changed after seeing results. If a variant is
added later it is listed here with its date and reported next to this one, never instead of it.

Generator: `scripts/build_relationship_maps.py` → `apps/web/public/data/relationship-maps.json`.
Kernel: `packages/science/trends.py::detrended_rank_correlation` (tested in `test_trends.py`).
The browser renders the values; it computes no statistic and applies no threshold.

## Why detrend

Two series that both trend over 2000–2025 (warming, drying) correlate even when their year-to-year
variations are unrelated. R2 and R3 therefore correlate **residuals from each series' own Theil–Sen
line** (same trend estimator as the rest of the project). The question they answer is about
**interannual co-variability**, not about shared trends and not about cause.

## R1 — Reanalysis vs station agreement (MERRA-2 × NOAA)

- Source: `data/results/noaa_validation/analysis_bundle.json` (P0-S5, D52). No new statistic.
- Map: the 64 paired stations. Two views:
  - **Year-to-year agreement:** Pearson r of annual means (station vs containing MERRA-2 cell).
  - **Trend difference:** MERRA-2 cell slope − station slope, °C/decade.
- Status inherited from the source: EXPLORATORY until second-person review (P0-S5).

## R2 — Do warm years coincide with dry years? (MERRA-2 T2M × GPM IMERG precipitation)

- Spatial support: MERRA-2 cells (0.5° × 0.625°) with finite T2M. GPM IMERG V07 monthly accumulation
  (0.1°) summed to calendar-year totals, then averaged over the GPM cells whose centres fall inside
  the MERRA-2 cell. A MERRA-2 cell needs ≥ 50 % of those GPM cells finite.
- Period: **2000–2024** (complete years in both; GPM 2025 ends in September). n = 25.
- Variables: annual mean T2M (°C); annual precipitation total (mm).
- Method: each series detrended by its own Theil–Sen line; **Spearman ρ** of the residuals;
  two-sided **permutation p** (9 999 permutations, seed 0); Benjamini–Hochberg across cells.
- Label: `robust` when q < 0.05; otherwise `not-robust`. Cells failing coverage: `insufficient`.
- Expected sign (stated before computing): negative (warm years drier) over most of Iberia.
- Do not conclude: causation, a trend, or anything about future years.

## R3 — Compound heat and drought at stations (NOAA GHCN-Daily)

- Stations: every station in `climate-bundle.json` `noaa.stations`.
- Variables (pipeline values): `hot_days_35` (days with Tmax > 35 °C) and `max_dry_spell` (longest run of
  days < 1 mm), per complete station-year (≥ 330 valid days, as in the bundle).
- Years: those where **both** variables are present; a station needs **n ≥ 15** such years.
- Method: identical to R2 (Theil–Sen detrend, Spearman ρ, 9 999-permutation p, seed 0); BH across the
  stations that qualify. A station where either detrended series is constant gets `insufficient`.
- Label: `robust` when q < 0.05; `not-robust` otherwise; `insufficient` when n < 15 or constant.
- Expected sign: positive (years with longer dry spells have more hot days) in the south and interior.
- Do not conclude: causation, drought impacts, or anything about future years. Stations are not
  homogenized (D31).
