# Scientific review record (14 Nov 2026, evening)

**What this is:** an AI-assisted technical review (Claude) of the live code, data and outputs, with
independent re-computation where possible. **It is not the independent human review.** Every
sign-off box below stays **PENDING** until a named team member does the check and signs.
Automated tests are not scientific review.

## 1. Gate A — MERRA-2 2 m air temperature, Peninsula + Balearics, 2000–2025

| # | Check | Finding | Status |
|---|---|---|---|
| A1 | Source, collection, version, units | `M2TMNXSLV` 5.12.4 (DOI 10.5067/AP1B0BA5PD2K), monthly `T2M`. Raw files in K; processed `T2M_celsius` = raw − 273.15 (checked at one cell, Jan 2010: 4.5796 °C both) | Passed (technical) |
| A2 | Geographic mask | Union of NUTS-2 polygons minus ES70 Canarias, ES63 Ceuta, ES64 Melilla. Polygons come from the **simplified** `spain-admin.json`, not the full-resolution NUTS file the bundle names. Re-computed with the full-resolution GISCO 1:1M file: annual means differ by ≤ 0.001 °C | Passed; wording fix: bundle says "GISCO NUTS 2021", actual input is the simplified derivative |
| A3 | Area weighting | cos φ × fraction of cell area inside polygon. Independent re-implementation by 24 × 24 sub-cell point sampling gives the same series | Passed |
| A4 | Incomplete periods | 12/12 months required; 2026 excluded | Passed |
| A5 | Sen slope + test | Independent brute-force Theil–Sen and Kendall S (no shared code): slope +0.596 °C/decade, S = 161, p = 0.00042 — identical. Gilbert CI 0.305–0.869 vs pipeline 0.307–0.868 (rank interpolation) | Passed |
| A6 | Dependence, seasonality | Annual means remove seasonality. Lag-1 r of detrended series −0.05 (bound ±0.38): no correction needed. Hamed–Rao would apply only if significant, floored at 1 (A3 amendment) | Passed |
| A7 | Spatial multiplicity | The headline is one regional series (no spatial claim). Per-cell maps show slope only; BH q stored | Passed |
| A8 | CI interpretation | 95 % CI excludes 0; card shows slope + CI before p | Passed |
| A9 | Window sensitivity | 6 windows, all positive, +0.41 to +0.83 °C/decade. Card states the range | Passed |
| A10 | Bundle ↔ display | Card, `climate-bundle.json` R0 scope and AnalysisBundle agree (tests `test_temperature_card_matches_gate_a_and_national_scope`, `test_headline_matches_independent_gate_a_analysis`); seen in browser 3× | Passed |
| A11 | Independent observations (P0-S5) | See §3 | Passed with documented discrepancies |

**Caveats to keep in every use:** reanalysis (model + assimilation), ~50 km cells; 26 years; the
magnitude depends on the window, the sign does not; says nothing about causes, the future or energy.

## 2. Gate B — NASA POWER solar + 50 m wind, joint low-resource days, 2001–2025

| # | Check | Finding | Status |
|---|---|---|---|
| B1 | Lineage | API headers per request: SYN1DEG (solar) and MERRA2 (wind) only; FLASHFlux/GEOS-IT excluded (2026 dropped) | Passed (from manifest; not re-downloaded) |
| B2 | Coverage / consistency | 25/25 complete years per region; zero fill values | Passed |
| B3 | Indicator | Joint-low = both daily values below their own **monthly** 20th percentile (reference 2001–2020), as frozen in `ENERGY_RESEARCH.md` §0. Re-implemented independently: identical annual totals (R0 183, ES11 177, ES41 160, ES24 295, ES61 191) | Passed |
| B4 | Thresholds / reference | Monthly P20, ref 2001–2020; sensitivity P10, P30, ref 2001–2010 pre-specified | Passed |
| B5 | Missing values, aggregation | Day missing if > 5 % of weight missing; area-fraction weights (amendment A2, recorded before data) | Passed |
| B6 | Trend + dependence | Theil–Sen + MK; lag-1 bound check; Hamed–Rao floored at 1 (A3, disclosed post-hoc, conservative) | Passed |
| B7 | Independence benchmark | The README's "half the chance rate" number was **not produced by any script** (bundle only had the naive 0.2 × 0.2 × 365.25 = 14.6/yr). Now reproducible: `scripts/check_energy_gap_independence.py`. Three nulls — annual pooling, month-stratified, and **year-shift surrogates** (keep seasonality and persistence, break same-day coupling) — all give a ratio ≈ 0.5 (Aragón ≈ 0.8). R0: 183 observed vs 370 expected, surrogate 95 % range 343–405. Robust to seasonality and persistence | Passed as a **descriptive** statement only |
| B8 | Resource ≠ generation | Horizontal-plane irradiance and 50 m reanalysis wind; no power curves, PV model, capacity, curtailment or grid. Stated on every card | Passed |
| B9 | Multiplicity | E1 confirmatory family = 5 pre-registered regions, BH q = 0.10. All "insufficient evidence". E2 low-wind-days result (p = 0.017 unadjusted) is outside the family: exploratory, not presentable | Passed |
| B10 | Results ↔ docs ↔ cards | Cards now carry exact region; all 5 regional cards copy their own bundle values (test). Complementarity numbers come from the review artifact (test) | Passed |

**What Gate B does NOT show:** a growing or shrinking energy gap; improving reliability; anything about
generation, capacity factors, grid adequacy or investment. "Below the independence benchmark" means
solar and wind lows rarely coincide **in these resource datasets**; it is not a trend.

## 3. NASA vs NOAA (P0-S5) — `scripts/validate_merra2_vs_noaa.py`

Design fixed before running (see script docstring): station (TMAX+TMIN)/2 with one definition throughout
(the bundle's `tavg` mixes TAVG and (TMAX+TMIN)/2 day by day and was **not** used); ≥ 330 valid days per
year; ≥ 23 of 25 years; inside the Gate A polygon; each station paired with its own MERRA-2 cell on
identical years.

| Result (2001–2025) | Value |
|---|---|
| Stations | 64 |
| Sign | 64/64 stations and 64/64 cells warming |
| Median slope | station +0.55, cell +0.59 °C/decade |
| Slope difference (cell − station) | median +0.004, IQR −0.07 to +0.10 °C/decade; 53/64 within ±0.2 |
| Year-to-year agreement | median Pearson r 0.93 (min 0.52) |
| Mean offset | cell 1.05 °C cooler than station (median): expected from elevation/support/definition |
| Largest disagreements | Sevilla San Pablo, Ibiza, Menorca Mahón, Daroca, Córdoba Aeropuerto: stations warm 0.4–0.6 °C/decade less than their cells. Not explained here (possible station changes, coastal/island cells); stations are not homogenized |

Reading: MERRA-2 and NOAA stations agree on direction everywhere and on magnitude for most
pairs. This supports, but does not prove, the Gate A result. NOAA is a check, not exact ground truth
for a 50 km cell. **Call it an external station comparison, not an independent check (D75).** The
primary GMAO input-observation report (McCarty et al. 2016, NASA/TM–2016-104606 Vol. 46, §2.1) lists
"land surface (e.g. meteorological aviation reports, or METAR)" observations among MERRA-2's
conventional inputs without stating which variables are assimilated. Secondary descriptions say only
surface pressure from land stations is used and that 2 m temperature is not, but that was not
confirmed from a primary source on 15 Nov. GMAO Office Note No. 9 (MERRA-2 File Specification) also
states that MERRA-2 forces its land surface with observation-based precipitation. Until a reviewer
confirms the variable list, the station comparison may share some observational input with MERRA-2.
Figure: `data/results/noaa_validation/slopes.svg`.

## 4. Regional labels in the Trend panel — `scripts/check_scope_multiplicity.py`

The Trend panel tests each of ~72 regions separately (p < 0.05 and CI excludes 0). With BH across regions:

| Variable | Regions | "Supported" now | After BH |
|---|---|---|---|
| Temperature (MERRA-2) | 72 | 72 | 72 |
| Rain (GPM) | 72 | 6 | 0 |
| Rain anomaly (GPM) | 72 | 6 | 0 |
| Modelled runoff (GLDAS) | 54 | 17 | 1 |

Re-run on the D64 bundle (15 Nov): temperature 72/72/72; rain 72/6/0; rain anomaly 72/**7**/0;
runoff 52/17/**0** (`scope_bh.json`; pre-D64 file kept in `data/results/scope_multiplicity/history/`).

Python labels are **unchanged**. **D53 is closed** (15 Nov, D75): the judge build never shows a
non-temperature regional label as "Supported"; it renders "EXPLORATORY — multiplicity unadjusted".

## 5. Human sign-off — all PENDING

Reviewer must not be the person who ran the analysis. Tick only after doing the check yourself.

- [ ] **PENDING** Re-run `packages/science/test_trends.py`, `tests/test_evidence_chain.py`, `tests/test_scope_and_demo_safety.py` and see them pass
- [ ] **PENDING** Gate A: read `scripts/analyze_gate_a_temperature.py` and `data/results/gate_a_temperature/analysis_bundle.json`; agree with the estimand (D36) and the claim wording in `DEMO_AND_SUBMISSION.md` §Approved claims
- [ ] **PENDING** Gate A: confirm in GMAO docs that MERRA-2 does not assimilate land 2 m air temperature (independence of the NOAA check)
- [ ] **PENDING** Gate B: read `ENERGY_RESEARCH.md` §0 + §11 (amendments A1–A3) and the bundle; agree that "insufficient evidence" is the right outcome and that nothing else was tried
- [ ] **PENDING** Gate B: read `independence_check.json`; agree the complementarity sentence is descriptive and correctly worded
- [ ] **PENDING** NOAA: look at `slopes.svg` and the five largest disagreements; agree with the reading in §3
- [x] **DECIDED (owner authorization, D53/D75)** D53: temperature-only "Supported" in the judge view; rain/runoff regional labels EXPLORATORY. A reviewer may still disagree and reopen it
- [ ] **PENDING** Click through `/explore` once yourself (judge build)

Reviewer: ________ Date/time: ________

## 6. Spatial experience (D54 / D55) — prototype exists; not independently reviewed

A 14 Nov evening prototype landed destinations, five Gate B research-case sheets, and optional
illustrative 3D at registered Buniel. **That is not additional scientific evidence.** Landmark
fly-tos are navigation. Plant geometry is illustrative. 2032–2040 copy is a planning horizon, not a
projection.

The reviewer, if asked later, only confirms that cases **quote** `energy-gap-*` cards and
independence ratios without new statistics or a CyL-vs-Aragón significance claim. 3D geometry is
not a scientific product. Judge mode (D61) hides plant overlay and 3D.

## 7. Automated technical review (15 Nov 2026) — not a human sign-off

Performed by a coding agent during the recovery sprint. **It does not replace §5**: the reviewer must
not be the person (or tool) that ran the analysis, and no box in §5 except D53 is ticked by this.

| Item (§5) | What was executed / checked | Result |
|---|---|---|
| Tests | `.venv/bin/python -m pytest -q packages/science tests` | 68 passed (incl. new `test_release_guards.py`, `test_relationship_maps.py`) |
| Gate A estimand + numbers | `analyze_gate_a_temperature.py` re-run to a scratch dir with current code | Every analysis field identical; `annual_series.csv` byte-identical (`reproduction_2026-11-15.json`) |
| Gate A independence | GMAO TM-2016-104606 Vol. 46 §2.1; GMAO Office Note 9 | **Not confirmed** from primary docs → wording changed to "external station comparison" |
| Gate B | Raw manifest SHA-256 and `analyze_energy_gap.py` hash match the bundle; CCAA polygons identical to the pre-D64 file | Not re-executed unless the POWER re-download matches (see `FINAL_RELEASE_VALIDATION.md`) |
| Complementarity | Cards and Study findings say "descriptive", "not a trend", "not grid reliability" | Wording consistent with `independence_check.json` |
| NOAA disagreements | Values in §3 match `noaa_validation/analysis_bundle.json` (test `test_noaa_validation_summary_matches_pairs`) | Consistent; physical explanation still open |
| Judge build | Browser e2e `scripts/e2e_judge_path.py` (3 full runs, URL attacks, 3 viewports, data-down) | See `FINAL_RELEASE_VALIDATION.md` |

**Still requires an independent human:** the Gate A estimand and claim wording, the GMAO variable
list for land stations, the Gate B "insufficient evidence" reading and A1–A3 amendments, the
complementarity sentence, the NOAA disagreement reading, and one click-through on the judge build.
Until then every finding stays **EXPLORATORY** in UI, slides and project page.


## 8. Second automated re-verification (15 Nov 2026, Windows) — not a human sign-off

Run by a second Claude Code session on a clean Windows machine (fresh venv, Python 3.13, `PYTHONUTF8=1`)
to give the human reviewer evidence for each §5 box. Like §7, it ticks nothing in §5: it is the same
kind of tool that ran the analysis.

| §5 item | What was executed | Result |
|---|---|---|
| Tests | `python -m pytest -q packages/science tests` | **70 passed**. On Windows it needs `PYTHONUTF8=1` (several tests read JSON without `encoding="utf-8"`) |
| Gate A numbers | `analyze_gate_a_temperature.py` re-run into a scratch dir; independent check with `pymannkendall` + `scipy.stats.theilslopes` (no repo code) | All analysis fields identical; `annual_series.csv` identical. Independent: S = 161, p = 0.00042, Sen +0.596 °C/decade, CI 0.306–0.870; six windows 0.405–0.828. OLS +0.60 (p = 4e-5) agrees. Provenance: the bundle's `trends.py` hash matches no committed version (it was generated from an uncommitted state); the later commit only **adds** functions, so numbers are unaffected |
| Gate A estimand / claim | D36 vs `DEMO_AND_SUBMISSION.md` claim 1 | Consistent. Wording nit: "95 % CI 0.31–0.87 °C" should read "°C per decade" |
| GMAO independence | McCarty et al. 2016 (TM-2016-104606 Vol. 46) text extracted: §2.1 and the observation table list only "Surface land observations … NCEP" with no variable. UCAR Climate Data Guide, Expert Developer Guidance: MERRA-2 "does not directly assimilate observed 2m air temperature" and uses "observation corrected precipitation forcing for the land surface" | Primary GMAO source still silent on the variable; secondary expert source says T2m is **not** assimilated. Keep "external station comparison" (D75); the risk of shared input is low for T2m but not zero (radiosondes, surface pressure) |
| Gate B full re-run | NASA POWER re-downloaded (100 files, API v2.10.3, no FLASHFLUX/GEOSIT/SRB), then `analyze_energy_gap.py` + `check_energy_gap_independence.py` into scratch | Raw bytes differ from the manifest in 97/100 files (API response serialisation), but **every result field is identical** (0 differences in `analysis_bundle.results` and `independence_check.regions`; `annual_series.csv` identical) |
| Gate B outcome rule | Independent MK/Theil–Sen + BH from `annual_series.csv` | p identical; BH q = 0.794 for all 5; MDT (2.0–3.2 days/decade) > 2 × \|slope\| everywhere → "insufficient evidence" is the correct pre-registered outcome. Git history holds a single version of the bundle with P20/2001–2020 (consistent with "nothing else tried"; work outside git cannot be audited). Note: the test can only detect changes of ~2–3 days/decade on a base of 7–11 days/yr, so this is a weak null — the claim "no detectable change" is correct, "no change" would not be |
| Complementarity | Annual-pooled expectation recomputed from annual counts | Identical (R0 183 vs 369.6, ratio 0.50; Aragón 0.79). Consistent with literature on Iberian solar–wind complementarity (Polo 2025, *Energies* 18(15):3966; López de la Franca et al. 2026, AEMET). Sentence is descriptive and correctly worded |
| NOAA | Summary recomputed from `pairs` | §3 numbers reproduced. Two nuances for wording: (a) slope > 0 at 64/64 stations but **significant (p < 0.05) at 57/64** — "all 64 … also warmed" should become "all 64 show a positive trend (significant at 57)"; (b) station and cell slopes barely correlate across stations (Spearman ρ = 0.2): MERRA-2 matches the network median, not station-to-station differences. Low-elevation/coastal-island pairs disagree more (mean cell − station +0.10 vs +0.02 inland), consistent with mixed land–sea cells. Sevilla San Pablo also has low year-to-year r (0.57), pointing to a station issue; unverified |
| Judge path | `npm run typecheck` (pass), `npm run lint` (0 errors, 2 warnings); `scripts/e2e_judge_path.py` against the **dev** server, Chrome | Scenarios A–C ran and screenshots show values matching the bundles (CyL: 160 vs ≈ 367.9, ratio 0.43, 0.00 days/decade CI −1.55…+1.67). Scenario D timed out waiting for a navigation on the dev server; a run against `next build && next start` is still needed |

**Verdict of this pass:** no number in the approved claims is wrong. The two wording fixes above
(CI units; "warmed" → "positive trend, significant at 57/64") are recommended. §5 still needs a named
human to do the checks and sign.
