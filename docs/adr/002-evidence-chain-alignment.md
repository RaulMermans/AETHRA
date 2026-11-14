# ADR-002 — Evidence-chain alignment (validated outputs only, two gates, energy research track)

- **Status:** PROPOSED, 14 Nov 2026. **Not approved.** Needs agreement from the authors of D3, D18,
  D23, D24. Recorded as D33–D39 in `DECISIONS.md`.
- **Does not change:** ADR-001 (CesiumJS), the static-bundle delivery model, the datasets on disk.

## 1. Scientific computation moves fully into Python

- **Prior decision:** D3 ("quick computations can live in the API or browser") and D23 (browser
  computes Sen/MK, 2027–2030 cones, Decision Matrix).
- **Proposed change:** All statistics (slopes, CIs, p-values, significance labels, regional
  aggregates) are produced by tested Python in `packages/science`. `build_climate_bundle.py` writes them
  into a versioned AnalysisBundle (static JSON is fine, so there is still no backend to run). The browser only
  renders. Map colour scaling and formatting stay in the browser.
- **Rationale:** `apps/web/lib/globe/climate.ts` recomputes Theil–Sen/MK for scopes and
  `averageStats` **averages p-values and CI bounds across stations**. That is not a valid test,
  and two implementations of the same statistics can drift apart.
- **Alternatives:** (a) keep the TS statistics and port the tests to TS. Rejected: two sources of truth.
  (b) FastAPI on demand. Optional later; adds a failure mode for the demo.
- **Risks:** UI regions without precomputed results lose their statistics. Mitigation: precompute
  Spain + 19 CCAA, and show "not computed" for others.
- **Validation impact:** raises *Validity* directly. Enables the screen == bundle test (Gate 4).
- **Scope/deadline:** ~3–5 person-hours (P0-S2, P0-B1/B2, P0-F1).

## 2. Two gates (D33)

- **Prior:** a single MVP with the variable OPEN (D7–D9).
- **Proposed:** Gate A (one validated variable, mandatory) plus Gate B (energy, conditional with a hard
  cut at Sun 12:00).
- **Rationale:** the energy variables aren't ingested yet. Gate A data are already on disk.
- **Alternatives:** energy-only (too risky to finish on time) · temperature-only (complete but less
  original).
- **Risks:** Gate B pulls people off Gate A. Mitigation: staffing rule and hard cut in `ROADMAP.md`.

## 3. Remove extrapolation and policy cards from the demo path (D38)

- **Prior:** D23/D24, with 2030 cones and CRITICAL/HIGH Decision Matrix cards for AGE/CCAA/Provincia.
- **Proposed:** hide them from the default path, and keep the code behind a flag labelled
  EXPLORATORY EXTRAPOLATION.
- **Rationale:** a historical linear trend is not a forecast. The policy recommendations aren't backed by
  any analysis. Both run into the brief's prohibited conclusions and would hurt *Validity* with the judges.
- **Risks:** we lose visual drama. Mitigation: the verified finding and the EvidenceCard carry the story.

## 4. Energy research track (D34, D35)

- **Proposed:** a pre-registered solar–wind joint low-resource study (`ENERGY_RESEARCH.md`) using
  NASA POWER daily data.
- **Risks:** low statistical power (n ≈ 24) means the likely outcome is "insufficient evidence".
  That is acceptable if presented honestly.

## 5. Workflow (D39)

- **Prior:** D18 and `TEAM_WORKFLOW.md`, direct pushes to `main`.
- **Proposed:** branches + PR review for demo-path files now; protected `main` after the event.
- **Not done:** no GitHub settings changed, nothing pushed.

## 6. Implementation record — scientific hardening (14 Nov 2026, evening)

§1 and §3 were implemented on request (D46, D47). Defect list:

| # | Defect (where) | Impact | Repair | Validation |
|---|---|---|---|---|
| 1 | p-values and CI bounds averaged across stations for region/national station metrics (`climate.ts` `averageStats`) | Invalid tests shown as "statistically clear" | Removed. Station metrics show per-station results only; area results only where precomputed | Guard test `test_frontend_does_not_compute_statistics` |
| 2 | Browser Theil–Sen/MK on a browser-averaged SPI series (`senFromSeries`) | Second, untested implementation; unweighted mean | Removed. Scope series + stats precomputed in Python | Same guard, `test_every_ui_scope_has_precomputed_series` |
| 3 | Region view silently switched temperature from MERRA-2 to a NOAA station average | Change of dataset with the click of a picker | Region view uses MERRA-2 area-weighted series. Stations only when a station is picked | Code review |
| 4 | −0.85 °C added to the partial 2026 MERRA-2 year | Fabricated annual value on the map | Only complete years. 2026 excluded | `test_only_complete_years` |
| 5 | GPM 2025 = 9 months × 1.38; GLDAS 2026 × 12/7; NOAA counts × 365/n from 60 days | Imputed values shown as observed | Removed. Incomplete years excluded (NOAA ≥ 330 valid days) | Same test |
| 6 | Maps filled missing years with Sen extrapolation (value mode, stations, basins) | Extrapolation shown as observation | Missing = blank | Code review |
| 7 | "Decision Matrix" with invented defaults (34 tropical nights, 19 hot days, 52 days, "−3.0 %/decade") and 2030 cones | Unsupported, partly fabricated claims | Removed from the climate path (D38) | Guard test |
| 8 | "Spain" mean unweighted, all cells touching Spain incl. Canarias; GLDAS from a bbox incl. Portugal/France | Wrong spatial support | R0 cos φ × fraction weights; Canarias separate; GLDAS grid | `test_region_weights_partial_cells`, `test_headline_matches_independent_gate_a_analysis` |
| 9 | MK without ties correction or autocorrelation check; "significant" = p only | Over-confident labels | `packages/science/trends.py`; significant = p < 0.05 and CI excludes 0 | 14 kernel tests incl. exact-permutation variance |
| 10 | Per-cell and per-station p-values without multiplicity control | Expected false positives (~5 % of ~250 cells / ~150 stations) | BH q stored; catalog ● uses q < 0.05 | `cell_q_value`, `significant_fdr` |
| 11 | Basin runoff/ET = national GLDAS × (basin rain ratio)^1.25; unsourced reservoir/MW numbers | Formula presented as data | Removed; basins = GPM bbox mean (labelled "box") | Code review |
| 12 | "SPI-12" was a z-score of annual totals | Mislabelled index | Renamed "standardized annual precipitation anomaly" | UI copy |
| 13 | Synthetic `modis`/`wind` blocks in the bundle | Risk of display as data | Removed from bundle | `test_no_synthetic_layers_or_projection_horizon` |
| 14 | Hand-rolled NetCDF reader (zlib scan, "last chunk of right size") | Could silently read the wrong variable | xarray by variable name (old reader verified identical first) | Byte-equal check 14 Nov |
| 15 | Dry-spell counter treated missing days as dry | Inflated spells | Missing days break a run | Code review |
| 16 | Snow days from sparse SNWD | Undefined metric | No station-year passes 330 days → snow tab hidden | Bundle check |

Result changes after repair: R0 temperature +0.596 °C/decade (95 % CI +0.307 to +0.868; was +0.559, unweighted, incl. Canarias). Canarias separately +0.26. GPM rain still not significant. GLDAS total runoff becomes borderline (−30 mm/decade, CI −66 to −0.5, p = 0.043; was p = 0.09 on the bbox CSV): fragile, not a headline.

## Approval

| Item | Approved by | Date |
|---|---|---|
| §1 | | |
| §2 | | |
| §3 | | |
| §4 | | |
| §5 | | |
