# Final release validation (15 Nov 2026)

Recovery sprint on the judge build. Decisions: D53 (closed), D64 (rebuilt), D75 (this sprint).
Executed by a coding agent on the owner's authorization. **This is an automated validation record,
not the human scientific sign-off** (`SCIENTIFIC_REVIEW.md` §5 stays open).

- Base revision: `main` @ `f4c50f5` plus uncommitted work in the tree (see "Working tree" below)
- Release branch: `release/2026-11-15-judge` (commit hash in `git log`)
- Judge build: `NEXT_PUBLIC_ENABLE_EXPLORATORY` unset (`apps/web/.env.local` does not set it; guarded by `test_judge_mode_is_default_and_gates_every_exploratory_entry_point`)
- Environment: Linux, Node v22.23.4, Next.js 15.5.29, Python 3.12 (`.venv`, `scripts/requirements.txt` + pandas, shapely, scipy, pytest, playwright), Chrome (system) with SwiftShader WebGL

## 1. Status by item

| Item | Status | Evidence |
|---|---|---|
| D53 regional multiplicity | **FIXED (policy recorded)** | DECISIONS D53/D75; guard `scope-multiplicity.ts`; `test_d53_judge_build_never_promotes_unadjusted_regional_support` |
| D64 province statistics | **FIXED (rebuilt)** | `build_climate_bundle.py` re-run; `test_province_statistics_use_the_displayed_boundaries` |
| Dependent artifacts | **FIXED** | `scope_bh.json`, `energy-infrastructure.json`, `relationship-maps.json` regenerated; infra hash test now passes (it failed at baseline) |
| Gate A provenance | **VERIFIED** | Re-run with current code: all analysis fields identical (`gate_a_temperature/reproduction_2026-11-15.json`) |
| Gate B provenance | **VERIFIED** | NASA POWER re-downloaded (100 files); `analyze_energy_gap.py` re-run to scratch: `results`, `analysis_spec`, `annual_series.csv` identical; independence check identical; `export_evidence_cards.py` re-run in place → `evidence-cards.json` byte-identical |
| Historical `trends.py` (c43f59e1…) | **LIMITATION** | Never committed; cannot be recovered. Mitigated: current code reproduces Gate A and Gate B exactly |
| NOAA "independent check" wording | **FIXED** | Now "external station comparison"; primary GMAO doc does not state the land-station variable list (D75) |
| Judge mode | **VERIFIED** | URL attacks pass in browser; relationship-maps tool and 2040 horizon gated by build flag in toolbar *and* state |
| 2040 chart distraction | **FIXED** | Judge chart ends at last observed year; caption/aria history-only (EN+ES) |
| Research case → EvidenceCard dead end | **FIXED** | Found by the e2e run: it opened the temperature topic ("No air-temperature EvidenceCard for Castilla y León"); now opens the joint-low card |
| First-screen clarity | **FIXED** | Study findings note: globe layer is context, joint-low results are five regions (EN+ES) |
| Independent human review | **BLOCKED — HUMAN ACTION** | `SCIENTIFIC_REVIEW.md` §5 (automated review in §7) |
| Deployment | **BLOCKED — MISSING RESOURCE** | No Vercel CLI/credentials on this machine; no public URL fabricated |
| Official rules / Resources list | **BLOCKED — HUMAN ACTION** | Challenge page unreachable from this machine (TLS certificate error) |
| Venue-machine rehearsal | **BLOCKED — HUMAN ACTION** | Substitute: 3 automated runs below |
| Submission | **NOT EXECUTED** | Requires the team's Space Apps account |
| Impact study (P1) | **NOT EXECUTED** | No participants; claim stays "unvalidated, protocol ready" |

## 2. D64 rebuild — what changed

`.venv/bin/python scripts/build_climate_bundle.py` on `spain-admin.json` `12bdd074…` (NUTS-3).

| Block | Result |
|---|---|
| `merra2`, `gpm`, `gldas`, `noaa`, `method`, `last_complete_year` | identical |
| `scopes` national (`age`) + 19 CCAA | identical |
| `scopes` provinces | 41/52 changed; 11 unchanged (single-province CCAA, both Canarias provinces, Ceuta, Melilla). Max \|Δ\| slope: temperature 0.035 °C/decade, precipitation 9.4 mm/decade. **No outcome flips** |
| `admin_profiles` (EXPLORATORY) | 42/52 provinces; 3 CCAA change only in `dtr_c` (NOAA stations assigned via provinces) |
| `swot_reservoirs` (EXPLORATORY) | 2 reservoirs re-assigned to another province |
| `rivers` | Tajo label anchor latitude 39.942 → 39.943 (mean of coordinates; not a value) |

Multiplicity re-run (`check_scope_multiplicity.py`): temperature 72→72; rain 6→0; rain anomaly 7→0
(was 6 pre-D64); runoff 17→0 (was 1). UI caveat updated to "0 of 17".

Gate B support: CCAA polygons in the pre-D64 `spain-admin.json` (commit `15d7893`, `88fe72de…`) and
the current file are identical for all 19 CCAA, so the hash recorded in the Gate B bundle describes
geometry equal to today's.

## 3. Provenance inventory — promoted findings

| Finding | NASA product | Period / support | Method | Code (recorded) | Inputs | Reproduced 15 Nov |
|---|---|---|---|---|---|---|
| Gate A: T2M +0.60 °C/decade (CI +0.31 to +0.87), n 26 | MERRA-2 M2TMNXSLV v5.12.4 T2M, doi:10.5067/AP1B0BA5PD2K | 2000–2025 complete years; Peninsula + Balearics, cos φ × cell fraction | Theil–Sen + Gilbert CI; MK ties-corrected; Hamed–Rao | `analyze_gate_a_temperature.py` `de9f56ca…` (unchanged); `trends.py` `c43f59e1…` (not in git) | 26 annual files, SHA-256 in bundle | **Yes**, identical |
| Gate B: joint lows, insufficient evidence 5/5 (CyL 0.00 d/decade, CI −1.55 to +1.67) | NASA POWER v2.10.3: ALLSKY_SFC_SW_DWN (CERES SYN1deg), WS50M (MERRA-2) | 2001–2025 daily; R0 + 4 CCAA (NUTS-2) | E1 P20 ref 2001–2020; Theil–Sen + MK; BH q = 0.10 over 5 | `analyze_energy_gap.py` `49b879b1…` (unchanged); `trends.py` `c43f59e1…` | `power_manifest.json` `413e9889…` (100 files; historical) | **Yes**, identical (fresh download; see `power_manifest.redownload-2026-11-15.json`) |
| Complementarity ratios (descriptive) | as Gate B | as Gate B | year-shift surrogates | `check_energy_gap_independence.py` | processed daily CSV | **Yes**, identical |
| External station comparison: 64/64 warming | MERRA-2 T2M × NOAA GHCN-Daily | 2001–2025, 64 stations ≥ 23 years | Theil–Sen per pair, Pearson r | `validate_merra2_vs_noaa.py` | NOAA CSV hashes in bundle | Not re-run (artifact unchanged; summary tested against pairs) |

Known limitations kept explicit: reanalysis/satellite support; 25–26 years (MDT ≈ 2 days/decade for
E1); NOAA not homogenized; E2 low-wind result exploratory; MERRA-2/land-station independence not
confirmed; every finding EXPLORATORY until §5 is signed.

## 4. Commands and results

| Command | Result |
|---|---|
| `.venv/bin/python -m pytest -q packages/science tests` (baseline, before changes) | 59 passed, 1 failed (`test_energy_infrastructure` hash, D64) |
| same, final | **68 passed, 0 failed** |
| `.venv/bin/python tests/test_aethra_agent.py` (TARO policy, Node 22) | all PASS |
| `cd apps/web && npm run typecheck` | 0 errors |
| `npm run lint` | 0 errors, 2 pre-existing warnings (`BrandWordmark.tsx` `<img>`, `DimensionDock.tsx` unused `eff`) |
| `npm run build` (judge) | success; `/explore` 95.1 kB, first load 198 kB |
| `uvx ruff check` on changed Python | no new findings vs HEAD |

## 5. Browser end-to-end (real Chromium, judge production build)

`scripts/e2e_judge_path.py --base http://localhost:3518 --runs 3` against `next start` of the final
build. **65/65 checks passed** (`docs/release/2026-11-15/e2e-results.json`).

| Scenario | Checks |
|---|---|
| A Initial view (×3 fresh contexts) | globe ready (13.7 s, 12.8 s, 19.4 s with software WebGL), canvas, research question, no Energy Lab, map-vs-study note |
| B Castilla y León (×3) | Insufficient evidence; no 2032/2040; history-only caption |
| C EvidenceCard (×3) | Castilla y León; 0.00 days/decade, CI −1.55 to +1.67; n = 25; NASA POWER source |
| D Temperature contrast (×3) | +0.60, CI +0.31 to +0.87; do-not-conclude line; no uncaught page errors |
| E URL attacks | `?lab=energy`, `?concept=solar_pv`, `?scope=provincia&id=09` (rebuilt province OK), `id=ZZ`, `scope=bogus`, `#cam=nan` → safe, no page errors |
| F Responsive | 1920×1080, 1280×800, 390×844: question reachable (narrow: Trend → Study findings), no horizontal scroll, no page errors |
| G Failure | `evidence-cards.json` + `climate-bundle.json` return 503 → error shown ("HTTP 503. No finding was invented."), no temperature value rendered |

Screenshots and a 1440×900 recording of run 1 (no audio): `docs/release/2026-11-15/`. A dev-machine
run is **not** the venue rehearsal.

## 6. Working tree note

The tree contained uncommitted work not made in this sprint: a station-catalog map preview
(`lib/globe/cesium/preview-draw.ts`, `PreviewPoint`, edits in `Globe.tsx`, `StationCatalogPanel.tsx`,
`ExploreView.tsx`). It is part of the verified build (typecheck, build and e2e ran with it) and is
committed on the release branch as found. Its author should review it.

## 7. Release recommendation

**CONDITIONAL GO** for an EXPLORATORY submission: Gates A (scientific integrity, with the human
review pending and labelled) and B (product/engineering) pass on automated evidence. Gate C needs a
public deployment and a venue rehearsal; Gate D needs a human to verify the official rules/Resources
list and to submit.
