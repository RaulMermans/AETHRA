# MVP Alignment Audit (15 Nov 2026, 01:00–02:00 local)

**What this is:** an AI-assisted (Claude) audit of the repository *as it is on disk*, against the
original MVP thesis (`PROJECT.md` §2, `ROADMAP.md` P0, ADR-002). Source code, data artifacts and
tests were inspected and run. Markdown claims were not taken on trust. **It is not the independent
human scientific review** (`SCIENTIFIC_REVIEW.md` §5 stays PENDING).

The knowledge-base files `01_CHALLENGE_AND_PROJECT_BRIEF`, `02_PRODUCT_AND_SUCCESS_CRITERIA` and
`25_TECHNICAL_DECISIONS_AND_ROADMAP` are **not in this repository or on this machine's Desktop**.
This audit therefore uses `PROJECT.md`, `ROADMAP.md`, `DECISIONS.md` and the brief as the requirement source.

## 1. Verdict in one paragraph

The science and the evidence chain are in better shape than the story. Both headline results
reproduce, are exported unchanged into the EvidenceCards, and are guarded by tests. The principal gap
was **legibility**: a first-time visitor saw a globe and a temperature heatmap, with no question,
no answer and no outcome state until they found the Trend button and then a second tab. That gap is
now closed with copy and default-state changes only (§6). What still blocks submission is human, not
technical: the second-person scientific sign-off, the D53 decision, a public deployment link, and
rehearsal.

## 2. Evidence path, stage by stage

`Question → NASA data → AnalysisBundle → Insight/EvidenceCard → Map/chart → User interpretation`

| Stage | Implemented component | Artifact | Visible to a judge? | Notes |
|---|---|---|---|---|
| Question | Card `question` field; CyL case `researchQuestion`; **new** Study-findings header | `evidence-cards.json`, `energy-research-cases.ts`, `messages.ts` | **Now yes, on first load** (≥ 1200 px wide) | Before this audit: only inside a card, 2–3 clicks deep |
| NASA data | MERRA-2 M2TMNXSLV 5.12.4; NASA POWER `ALLSKY_SFC_SW_DWN` (CERES SYN1deg Ed4.2) + `WS50M` (MERRA-2) | `data/processed/spain/merra2/*.nc`; POWER manifest `data/metadata/power_manifest.json` | Yes, in card "Sources" and finding labels | POWER raw data are **not on this machine** (gitignored, `fetch_power_spain.py` regenerates) |
| AnalysisBundle | `scripts/analyze_gate_a_temperature.py`, `scripts/analyze_energy_gap.py`, `packages/science/trends.py` | `data/results/*/analysis_bundle.json` | No (not meant to be) | Precomputed. Nothing is computed in the browser (tests enforce it) |
| EvidenceCard | `scripts/export_evidence_cards.py` → `EvidenceCardPanel.tsx` | `apps/web/public/data/evidence-cards.json` (7 cards) | Yes: Map tools → Evidence cards, or "Open Evidence cards" from Study findings | Scope-exact (D50). Slope + CI first, then method/n/p, "Do not conclude", limitations, sources |
| Map / chart | Cesium globe + `EvidencePanel.tsx` (series + trend), `EnergyCasePanel.tsx` (joint-low series) | `climate-bundle.json`, `evidence-cards.json` | Yes | Map is a temperature heatmap. It is context, not the finding |
| Interpretation | "Do not conclude" lines, card limitations, Study-findings notes | Cards, `messages.ts` | Yes | Research next steps are in docs, not in UI (deliberately: no new claims) |

**Precomputed vs interactive:** every result is precomputed by Python and rendered. Nothing in the UI
says "computing" or "analysing", so the UI itself does not imply live computation. **TARO's
"Investigating…" status line** could suggest live analysis; TARO only quotes cards (D65/D71). The
pitch and judge docs now say "precomputed, curated investigations" explicitly.

## 3. Traceability matrix (MVP requirement → reality)

Severity: **S1** blocks submission or a claim · **S2** weakens a criterion · **S3** polish.

| # | Original requirement | Implemented component | Scientific artifact | UX exposure | What a user can do | Missing | Sev. | New science needed? | Minimal action |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Identify NASA variables (challenge task 1) | Curated dimensions + 2 investigations | `DATASETS.md`, bundles | Dimension dock, card "What" | Pick from a curated list | General variable search | S3 | No | Say "curated" in pitch (done in `PITCH_FINAL.md`) |
| 2 | Obtain data for a region (task 2) | Download + clip scripts, 72 precomputed scopes | `climate-bundle.json` `scopes` | Region/Province picker | Switch Spain / CCAA / province | On-demand regions | S3 | No | — |
| 3 | Time series over a meaningful period (task 3) | `EvidencePanel`, case series | Gate A 2000–2025, Gate B 2001–2025 | Trend panel "This place", case sheet | See observed points + fitted line | — | — | No | — |
| 4 | Direction and magnitude (task 4) | Theil–Sen + Gilbert CI | Both bundles | Card + Trend panel | Read slope ± CI per decade | — | — | No | — |
| 5 | Statistical significance (task 5) | Mann–Kendall, Hamed–Rao (floored), BH for Gate B family | Both bundles; `scope_bh.json` | Outcome badge (text + glyph) | Read outcome state | — | — | No | — |
| 6 | Evidence-Backed Insight as unit of value | EvidenceCard | `evidence-cards.json` | Map tools → Evidence cards | Inspect WHAT/WHERE/WHEN/HOW MUCH/EVIDENCE/TRUST | Was not reachable from the first view | S2 → **fixed** | No | Study findings opens by default and links to the cards |
| 7 | Honest outcome states | `EvidenceOutcome` union, exhaustive switch | Card `outcome` | Badges | Distinguish supported / insufficient / no data / exploratory | — | — | No | — |
| 8 | Provenance on every number | Card `sources`, bundle `provenance` | Hashes in bundles | "Sources & provenance" disclosure | See product, DOI, role | Gate A bundle records **no boundary hash**; Gate A/B bundles record an older `trends.py` hash; climate bundle + Gate B record a **pre-D64** `spain-admin.json` hash | **S2** | No (re-run only) | See §4, P3 |
| 9 | Independent check | `validate_merra2_vs_noaa.py` | `noaa_validation/analysis_bundle.json` | Station catalog; not on a card | Browse stations | Not shown next to the temperature card | S3 | No | Say it in the pitch (approved claim 2) |
| 10 | Render, don't compute (ADR-002) | Guard tests | `test_frontend_does_not_compute_statistics` etc. | — | — | — | — | No | — |
| 11 | Judge mode hides exploratory work (D51/D61) | `EXPLORATORY_FEATURES_ENABLED` | `test_judge_mode_is_default_…` | Energy Lab, infrastructure, Buniel 3D hidden | — | — | — | No | Deploy without `NEXT_PUBLIC_ENABLE_EXPLORATORY` |
| 12 | Gate B: joint-low investigation | `analyze_energy_gap.py`, 5 cards, 5 case sheets | `energy_gap/*` | Study findings, Explore Spain → Research cases | See 5 regional nulls + complementarity | — | — | No | — |
| 13 | Contrast supported vs not supported (M2 differentiator) | `FindingsBriefPanel.tsx` (D70) | Cards | Was 2 clicks deep | **Now the first view**: question → answer (insufficient evidence) → contrast (supported increase) | — | S1 → **fixed** | No | Done (§6) |
| 14 | Research interpretation / next step | Docs | `ENERGY_RESEARCH.md` §10b | Card "Do not conclude" | Read limits | Explicit "what further study" not in UI | S3 | No | Carried by the pitch, slide 7 |
| 15 | Second-person scientific review | — | `SCIENTIFIC_REVIEW.md` §5 | — | — | **All 8 boxes PENDING** | **S1** | No | A named teammate does §5 before 14:00 |
| 16 | Multiplicity for regional labels (D53) | D60 presentation guard | `scope_bh.json` | Non-temperature labels show EXPLORATORY | — | **Decision OPEN** | **S1** (process) | No | Team decides; recommendation in §4 |
| 17 | Public link, submission checklist | — | — | — | — | **No deployed URL recorded anywhere in the repo** | **S1** | No | Deploy judge build; record URL in `DEMO_AND_SUBMISSION.md` |
| 18 | Demo ≤ 2:00, rehearsed 3×, fallback recording | Script in `JUDGE_EXPERIENCE.md` | — | — | — | Not rehearsed since today's UI change | S1 | No | Rehearse on the presenting machine |

## 4. Scientific blockers (mandatory checks from the brief)

### 4.1 Independent human scientific review — **PENDING (blocks slide 5)**
`SCIENTIFIC_REVIEW.md` §5: 0 of 8 boxes ticked, reviewer line blank. This audit does **not** tick
them and must not be read as a review. Non-negotiable 17: slide 5 carries only a gate-checked finding
reviewed by a second person. **Fallback if review does not happen by 14:00:** present both results
with the visible label "EXPLORATORY — pending independent review" (the cards already say so).

### 4.2 D53 regional multiple-testing — **OPEN**
State on disk: Python `significant` fields unchanged; D60 guard in the judge build shows
non-temperature regional "Supported" labels as **EXPLORATORY — multiplicity unadjusted**
(`lib/globe/scope-multiplicity.ts`, test passes). Temperature: 72/72 labels survive BH.
**Recommendation for the team (not taken by this audit):** record option **(c)-equivalent for the
judge build**: keep D60 and present only temperature and the Gate B family as findings. This needs
no pipeline change and matches what the demo shows. Option (b) re-exports the bundle 13 h before
freeze and should not be chosen silently.

### 4.3 Province boundaries and bundle provenance after D64 — **RESOLVED 15 Nov (D75)**

> **Update 15 Nov (recovery sprint, D75):** `build_climate_bundle.py` was re-run on the NUTS-3 file.
> National and all 19 CCAA scope values are identical; 41/52 provinces changed (max |Δ| temperature
> slope 0.035 °C/decade, no outcome flips). The bundle now records `spain-admin.json` `12bdd074…`.
> CCAA polygons in the pre-D64 file (`15d7893`) and the current file were compared: identical, so the
> Gate B regions are unaffected. Details: `docs/FINAL_RELEASE_VALIDATION.md`. The text below is the
> original 02:00 finding, kept for the record.
- `climate-bundle.json` and `energy_gap/analysis_bundle.json` record `spain-admin.json`
  SHA-256 `88fe72de…`. The file on disk is `12bdd074…` (NUTS-3 provinces, D64).
- **Consequence for provinces:** the 52 province-scope results in `climate-bundle.json` were
  computed on the *pre-D64* province polygons while the globe now draws NUTS-3 outlines. D64 itself
  says these "must be rebuilt". **Do not present any province-level number** until
  `scripts/build_climate_bundle.py` is re-run and the tests pass. The demo script uses no
  province-level result.
- **Headline check (run in this audit, scratchpad only, `data/results` untouched):** Gate A
  re-run with the *current* `spain-admin.json` and *current* `trends.py` reproduces the recorded
  result exactly: slope 0.595752 °C/decade, CI 0.306516–0.867717, p 0.000421, n 26, and all six
  window slopes identical. So the Peninsula + Balearics polygon did not change.
- **Gate B CCAA regions:** could not be re-run here (NASA POWER raw files are not on this machine).
  D64 states CCAA polygons are unchanged and the R0 union is verified unchanged, but per-CCAA
  equality is **not independently verified**. Action: on a machine with `data/raw/power`, re-run
  `analyze_energy_gap.py` and confirm byte-identical `results`.
- Gate A bundle records **no boundary hash**, and both Gate A and Gate B bundles record
  `trends.py` `c43f59…` while the current file is `30e79c…`. The re-run above shows the change does
  not affect Gate A values. Re-running both scripts would refresh the provenance; that regenerates
  `data/results` and should be done by the analysis owner, not silently.

### 4.4 Judge-mode presentation safeguards — **pass**
`test_judge_mode_is_default_and_gates_every_exploratory_entry_point`,
`test_judge_path_has_no_forecast_or_2030_wording` pass. Production build ran without
`NEXT_PUBLIC_ENABLE_EXPLORATORY`; first view screenshot shows no Energy Lab tab.
**Residual risk, not changed by this audit:** the research-case chart extends its x-axis to 2040
with a hatched "No validated projection" band (D55, PROPOSED). It is labelled correctly, but it puts
"2040" on screen in front of judges and conflicts with the spirit of non-negotiable 10. Recommend
the team decide whether to stop the axis at 2025 in judge mode. That is a UI change to a
human-requested feature, so it is left for a human.

### 4.5 Source and geographic support consistency across EvidenceCards — **pass**
7 cards; `test_every_card_names_a_real_ui_scope_with_matching_name`, `test_cards_copy_bundle_values`,
`test_quoted_e1_numbers_match_energy_bundle_and_cards` and
`test_quoted_complementarity_matches_independence_check` pass. CyL card: 0.0 days/decade, CI
−1.55 to +1.67, p 0.794 (BH 0.794), n 25, MDT 2.0, ratio 0.43 — all equal to
`energy_gap/analysis_bundle.json` and `independence_check.json`.

### 4.6 Principal claims vs artifacts — **pass, with one wording note**

| Claim (as in `DEMO_AND_SUBMISSION.md` approved wording) | Artifact value | Match |
|---|---|---|
| +0.6 °C/decade, CI 0.31–0.87, p < 0.001, 26 yrs, windows 0.41–0.83 | 0.595752; 0.306516–0.867717; p 0.000421; n 26; windows 0.405–0.828 | Yes |
| 64 stations warmed; 53 within 0.2 °C/decade | `n_stations` 64, `stations_positive` 64, `abs_slope_diff_le_0_2` 53 | Yes |
| R0 joint-low 0.0 days/decade, CI −1.8 to +2.2; insufficient evidence 5/5 | 0.0; −1.846594 to 2.158387; all `E1_outcome` = insufficient_evidence | Yes |
| 183 vs about 370 over 25 years ("about half") | observed 183; annual-pooled 369.6, surrogate mean 369.6; ratio 0.50 | Yes |

Wording note: the README sentence "joint lows occur at ~½ the chance rate **every year**" is not a
direct output of `independence_check.json` (which reports 25-year totals). The "every year" part
rests on the per-year Kendall τ statement in the README (negative in 25/25 years). Use the approved
claim 4 wording (25-year totals), not "every year".

**UI copy overclaim found and fixed:** the Evidence-cards tool hint said "Verified trend results"
while every card's own `status` says "EXPLORATORY until reviewed". Now: "Trend results with method,
uncertainty, sources and limits".

## 5. UX audit of the first-time `/explore` experience (before this audit's changes)

| Brief's question | Before | After (§6) |
|---|---|---|
| 1. A clear question? | No. Globe + temperature heatmap; question only inside cards | Yes: "Are days when solar and wind resources are both low becoming more frequent in Spain (2001–2025)?" at top of the open panel |
| 2. An obvious investigation path? | No. Trend button closed; Study findings was a second tab | Yes: answer → regional rows (click → case sheet) → contrast → "Open Evidence cards" |
| 3. A meaningful conclusion? | Only after 2–3 clicks | Visible on load: "Insufficient evidence (5/5 regions)" and "Supported increase +0.60 °C per decade (95 % CI +0.31 to +0.87; n = 26)" |
| 4. Visible evidence status? | Inside panels | Glyph + text badges on first view, plus EXPLORATORY banner |
| 5. Direct route to evidence? | Map tools icon (unlabelled until hover) | "Open Evidence cards" button at the bottom of the first panel; region rows open the case sheet whose "Open evidence" opens the scope-exact card |
| 6. What it does / does not imply? | On the card | First view: "Not detecting a change is not proof of stability … Not generation"; contrast card "Not a cause of warming, not a forecast, not evidence about energy production" |

Remaining UX gaps (not fixed; would need new UI or a human decision):
- Below 1200 px wide the panel does **not** auto-open (it would hide the left controls). Judges on a
  phone see the old first view. The presenting laptop must be ≥ 1200 px wide (CSS px).
- The globe heatmap shows *temperature* while the opening question is about *solar + wind*. That is
  honest (no joint-low map exists, and inventing one is out of scope), but the presenter should say
  "the map is context; the answer is on the right".
- Province labels in the Trend panel are pre-D64 (§4.3). Avoid provinces in the demo.

## 6. Changes made in this audit (UI copy and default state only)

| File | Change | Science affected? |
|---|---|---|
| `apps/web/components/explore/ExploreView.tsx` | Trend panel opens on **Study findings** at load on screens ≥ 1200 px; selecting a region or clicking the map switches to **This place** | No |
| `apps/web/components/explore/FindingsBriefPanel.tsx` | Research question shown at the top; order changed to answer (joint lows) → contrast (temperature) → complementarity → diagram | No: same values, same sources |
| `apps/web/lib/i18n/messages.ts` (EN + ES) | Question text; banner in plain words; "Gate A/B" labels replaced by "Answer · … (NASA POWER)" / "Contrast · … (NASA MERRA-2)"; added "Not detecting a change is not proof of stability … about 2–3 days per decade" (source: `data/results/README.md`, MDT 2.0–3.2 in `energy_gap/analysis_bundle.json`); removed "D53"/"judge-presentable" jargon; fixed "Verified" overclaim | No |
| `tests/test_scope_and_demo_safety.py` | 3 tests were failing because copy had moved into `messages.ts` and JSX was reformatted. Assertions re-pointed; **intent unchanged** (runoff number still read from `scope_bh.json`) | No |

## 7. Minimal corrective actions, in priority order

1. **P0 human:** second-person review (`SCIENTIFIC_REVIEW.md` §5). Owner: a teammate who did not run the analysis.
2. **P0 human:** record D53 decision (recommend: keep D60, judge findings = temperature + Gate B).
3. **P0:** deploy the judge build; record the public URL; check it in a private window.
4. **P0:** rehearse `JUDGE_EXPERIENCE.md` 3× on the presenting machine; record the fallback video.
5. **P1 analysis owner:** re-run `build_climate_bundle.py` (D64 province weights) and, where POWER
   data exist, `analyze_energy_gap.py` + `analyze_gate_a_temperature.py` to refresh provenance hashes.
   Run all tests after. Until then, no province-level number in any material.
6. **P1 human:** decide whether the case-sheet x-axis should stop at 2025 in judge mode (§4.4).

## 8. Verification report (what was actually run, 15 Nov 2026 ~01:05–01:40)

Environment: macOS, Python 3.11.9 in a throwaway venv (numpy, scipy, pandas, shapely, xarray,
netCDF4; repo has no `.venv`), Node 20.20.0 (default) and Node 22.23.5 (via `npx`), web deps from
`package-lock.json` (`npm ci`, no version changes).

| Check | Command | Result |
|---|---|---|
| Statistics kernel | `python packages/science/test_trends.py` | 14 PASS |
| Evidence chain | `python tests/test_evidence_chain.py` | 8 PASS |
| Demo safety | `python tests/test_scope_and_demo_safety.py` | **3 FAIL before** (stale string matches after the i18n move); **12 PASS after** re-pointing the assertions (§6) |
| Case ↔ bundle consistency (D62) | `python tests/test_energy_research_cases_consistency.py` | 5 PASS |
| TARO guard + policy cases | `python tests/test_aethra_agent.py` | 4 PASS + 1 FAIL on Node 20 (`--experimental-strip-types` needs Node ≥ 22); **5 PASS** with Node 22 on `PATH` |
| Energy infrastructure | `python tests/test_energy_infrastructure.py` | **Not run**: needs `geopandas` (off the judge path) |
| Typecheck | `npm run typecheck` | exit 0 |
| Lint | `npm run lint` | 0 errors, 3 pre-existing warnings (unused vars in `DimensionDock.tsx`, `climate.ts`; `<img>` in `BrandWordmark.tsx`) |
| Production build (judge mode) | `npm run build`, `NEXT_PUBLIC_ENABLE_EXPLORATORY` unset | Success; `/explore` 86.8 kB |
| Browser | `next start` + headless Chrome (SwiftShader WebGL), 1440 × 900 | First view rendered: Study findings open with question, Insufficient evidence (5/5), Supported increase +0.60 °C/decade (CI +0.31 to +0.87; n = 26); no Energy Lab tab. **Clicks after the first view were not exercised in a browser.** Spanish locale not checked in a browser |
| Gate A reproducibility vs D64 | Gate A script re-run with `OUT` redirected to the scratchpad | Identical to `data/results/gate_a_temperature` (slope, CI, p, n, 6 windows) |
| Gate B reproducibility | — | **Not run**: NASA POWER raw data not present on this machine |
| Climate bundle rebuild (D64) | — | **Not run**: regenerates a demo-path artifact; owner decision |
| Repo integrity | `find -newer AGENTS.md` | Only the 4 edited source/test files + 6 new docs + gitignored build output changed. `data/results/` untouched |

**Scientific values checked against artifacts:** every number in `PRODUCT_POSITIONING_FINAL.md`,
`JUDGE_EXPERIENCE.md` §2 and `PITCH_FINAL.md` §6 (see §4.6 above).

**Needs human approval / action (not done by this audit):** `SCIENTIFIC_REVIEW.md` §5 sign-off · D53 ·
re-running `build_climate_bundle.py` / Gate A / Gate B to refresh provenance · whether to hide the
2026–2040 band in judge mode · deployment and public URL · 3× rehearsal · organizer format
confirmation · live challenge-page check. No commit, push or deploy was made (this folder is not a
git repository).
