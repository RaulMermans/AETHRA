# Roadmap

Rule: **scientific completion before visual completeness.** If P0 isn't green, cut scope. Never cut
the scientific controls. Owners are `unassigned` until the team fills them in.

## Timeline to submission (Málaga local time)

| When | Milestone | Stop rule |
|---|---|---|
| Sat 14 Nov, evening → Sun 10:00 | **Gate 1 + Gate 2** for the Gate A variable (P0-S*) | Not passed by 10:00 → narrow the claim (sign only, Peninsula only), don't add variables |
| Sun 10:00 → 13:00 | **Gate 4** integration (P0-B*, P0-F*) | Not passed by 13:00 → demo the static EvidenceCard + chart; globe becomes backdrop |
| Sun 08:00 → **12:00 hard cut** | Gate B / Gate 3 time-box (only people not on the P0 critical path, only after `ENERGY_RESEARCH.md` is approved) | Not passed by 12:00 → energy becomes "next step" on slide 7 |
| Sun 14:00 | **Feature freeze.** Demo path frozen; only bug fixes | — |
| Sun 14:00 → 16:30 | Gate 5: slides/video, project page, rehearsal | — |
| Sun 16:30–17:15 | Local technical test | — |
| Sun 17:30–19:00 | Local pitch | — |
| Sun **21:00 target**, 23:59 hard | **Submit for Judging** + confirmation captured | — |

## Gates (evidence required to pass; record the evidence next to the box)

**Gate 1 — Source readiness.** Variable named precisely · product + version/DOI + lineage recorded ·
native spatial/temporal support known · reproducible access (script + manifest) · units, time
standard, nodata and QA interpretable.

**Gate 2 — Single-variable science.** Reproducible series · estimand written down · method valid
for the series (seasonality and serial dependence handled) · uncertainty reported · window
sensitivity checked · multiple comparisons handled for maps · claim limited to what is stable.

**Gate 3 — Joint renewable indicator.** See `ENERGY_RESEARCH.md` §9. Both inputs READY ·
definitions frozen before testing · night/season/missing handled · enough information · robustness
checked · never confused with generation or grid reliability.

**Gate 4 — Product integration.** Python produces an immutable, versioned result · frontend
displays it without recomputing · EvidenceCard reachable · displayed values == bundle values (test) ·
loading/invalid/insufficient states work.

**Gate 5 — Demonstration.** Demo path works three times in a row on the presenting machine ·
the finding shown is backed by a gate-checked result · provenance inspectable · no synthetic or
extrapolated value presented as observation · public links work in a private window.

## P0 — must work (Gate A: MERRA-2 2 m air temperature, leading candidate)

Nothing is ticked unless verified in this repo. Current state is noted in *italics*.

### Science & data (owner: unassigned)

- [x] **P0-S1 Estimand.** *Implemented 14 Nov in `scripts/analyze_gate_a_temperature.py` (R0 polygon, cos φ × cell-fraction weights); D36 approval still pending.* Write it in `DECISIONS.md`: annual mean of MERRA-2 `T2M` (M2TMNXSLV
  5.12.4) over a stated extent, area-weighted (cos φ), complete calendar years 2000–2025, °C/decade.
  *Today: unweighted mean of every cell touching Spain, Canarias and border/sea cells included.*
  Accept: extent = Peninsula + Balearics (Canarias reported separately); cell-inclusion rule stated.
- [x] **P0-S2 Tested statistics in Python.** *Done: `packages/science/trends.py` + `regions.py` (14 kernel tests) used by every pipeline incl. `build_climate_bundle.py`; 8 evidence-chain tests in `tests/test_evidence_chain.py`. Run with `.venv/bin/python <file>` (pytest not installed).*
- [x] **P0-S3 QA & completeness.** *Done 14 Nov (D46): complete years only in every series; all scaling/adjustments removed; `tests/test_evidence_chain.py`.*
- [x] **P0-S4 Window sensitivity.** *Done for the R0 area-weighted series: +0.41 to +0.83 °C/decade over 6 windows, all positive.* Report the slope for several start/end windows. *Exploratory
  check (14 Nov, unweighted series): sign stable and MK p < 0.03 in all windows tried, magnitude
  0.34 (2000–2020) to 0.74 (2005–2025) °C/decade, residual lag-1 r ≈ 0.03.* Accept: the claim
  states the range, not a single value with false precision.
- [x] **P0-S5 Independent check.** *Computed 14 Nov (D52, `scripts/validate_merra2_vs_noaa.py`): 64 paired stations, 64/64 same sign, median slope difference +0.004 °C/decade, median r 0.93; 5 disagreements documented. Second-person review PENDING (`docs/SCIENTIFIC_REVIEW.md`).*
- [x] **P0-S6 Map multiplicity.** *Done: maps show slope only (legend says so); `cell_q_value` stored (MERRA-2 99.6 % of cells q < 0.05; GPM 0 %); station catalog uses BH q.*
- [x] **P0-S7 Period.** *Decided by default: 2000–2025 (data on disk). 1980 extension not done; D37 stays OPEN for after submission.*

### Backend & contracts (owner: unassigned)

- [x] **P0-B1 AnalysisBundle contract.** *`climate-bundle.json` v2 + `data/results/*/analysis_bundle.json`, each with method, provenance (input SHA-256, code SHA-256, git rev).*
- [x] **P0-B2 Precompute every region the UI offers.** *Done: `scopes` = R0 + 19 CCAA + 52 provinces for temperature, precipitation, dry/wet anomaly, modelled runoff.*
- [x] **P0-B3 Reproducibility.** *Two runs gave identical results (14 Nov).* One command regenerates the bundle from processed data. Accept:
  re-run gives byte-identical stats.

### Frontend & experience (owner: unassigned)

- [x] **P0-F1 Render, don't recompute.** *Done (D47): browser statistics removed; guard test.*
- [x] **P0-F2 EvidenceCard.** *`EvidenceCardPanel.tsx` (map tool "Evidence cards") renders `public/data/evidence-cards.json` from `scripts/export_evidence_cards.py`; typecheck + lint pass. **Checked in a browser 14 Nov (production build, judge mode): full demo path 3× in a row, 0 console errors; scope-exact since D50.*** What / where / when / how much / evidence / trust, plus "do not
  conclude" line. Reachable in one click from the chart.
- [x] **P0-F3 Outcome states** *(EvidencePanel + EvidenceCardPanel: text + glyph, exhaustive switch)*
- [x] **P0-F4 Demo path hygiene.** *Done on the climate path (D47): no 2030 mode, slider ends at 2025, no Decision Matrix. The Energy Tech Lab tab (D44, EXPLORATORY) still contains rankings and 2030 series; it is opt-in and off the demo path.*

### Product & presentation (owner: unassigned)

- [ ] **P0-P1** Submission checklist in `DEMO_AND_SUBMISSION.md` complete.
- [ ] **P0-P2** Slide 5 written from a gate-checked result only. Claim review by a second person.
- [ ] **P0-P3** Rehearsed demo ≤ 2:00 with a fallback screen recording.

**15 Nov 02:00:** MVP alignment audit, readiness and submission docs written: `MVP_ALIGNMENT_AUDIT.md`, `JUDGING_READINESS.md` (release checklist), `JUDGE_EXPERIENCE.md`, `PITCH_FINAL.md`. New blocker found: province-scope results predate the D64 boundary change (audit §4.3).

**Immediate next action (updated 14 Nov, late evening):** a named second team member works through the
PENDING sign-off list in `docs/SCIENTIFIC_REVIEW.md` §5 and **decides D53** (Python significance
rule). Judge-facing Trend badges already hide unadjusted rain/runoff Supported labels (D60) — that
is presentation, not a method change. Then P0-P1–P3 (submission checklist, slide 5 from the approved
claims in `DEMO_AND_SUBMISSION.md`, rehearsal + fallback recording).
Do not implement AETHRA Intelligence (D63) while these boxes are open.
TARO knowledge architecture (D68) was started on a human waiver in the same pattern as D65: documentation + deterministic retrieval only. It must not delay P0-P1–P3 or D53.

## P1 — only after P0 is green

- ~~Gate B experiment~~ **run 14 Nov**: Gate 1 passed, E1 = insufficient evidence in all 5 regions,
  complementarity descriptive finding. Only remaining Gate 3 item: second-person review. No more
  variants on this question (`ENERGY_RESEARCH.md` §10b).
- Regional comparison with a proper difference test.
- GPM precipitation and GLDAS soil moisture through the same gates (secondary context).
- **TARO / AETHRA Core knowledge layer (D68).** Taxonomy, source registry, five evidence-safe flows, evaluation bank. LLM still off. Not a trained specialist until evals + human gold review say so.
- A concise energy-relevance interpretation, written only from Gate 3 results.
- **P1 CONDITIONAL — observed generation comparison.** Only with independently verified generation time
  series at a compatible spatial/temporal scale: compare NASA resource conditions with observed generation,
  keep MW, MWh, capacity factor and resource distinct, account for changing installed capacity and
  operational constraints (curtailment, outages), never assign aggregate generation to single plants,
  never read correlation as causation. Not started.
- **Energy infrastructure context (D49).** *Built 14 Nov at the human's request while P0 was open; hidden in judge mode (D51); not a sprint deliverable.* DoD: a user selects one verified installation (Castilla y León register layer), sees its metadata, source and data date, the MERRA-2 cell vs the province support, and the province's precomputed NASA result. Generation comparison: not done (needs a separately validated plant-level series). Not shown in the demo unless P0 is green and a second person reviews it.
- **P1A Geographic destinations (D54, prototype 14 Nov).** `ExploreSpain` menu + `lib/globe/destinations.ts`. Mulhacén (IGN), Picos de Europa, Spain overview. Parks labelled not energy sites.
- **P1B One territorial case (D54, prototype 14 Nov).** Castilla y León case panel quotes Gate B cards ES41/ES24. Difference not tested. No new statistics.
- **P1C Illustrative 3D (D54, prototype 14 Nov).** One Cesium geometry turbine at registered Buniel (RE-114777), labelled not a reconstruction. Point markers kept. Ghost style = appearance toggle on the same point.

## P2 / DEFERRED

Plant-by-plant performance rankings · investment suitability scores · energy output predictions · grid
optimisation · site recommendations · site selection or ranking · generation/production modelling · storage sizing · grid dispatch,
outage or price prediction · investment/ROI recommendations · 2030–2040 projections or any
extrapolation shown as a forecast · ML forecasting · causal attribution · universal dataset explorer
· AI agent producing findings · new map tools, terrain or visual effects · **vector logo / full brand system** (AETHRA chrome + raster kit landed as D56/D58; SVG master still deferred)
· nationwide 3D plant reconstruction · digital twins without surveyed geometry · **ghost / conceptual infrastructure in 3D** (D54 Feature D — prototype only after P1C, always off in judge mode)
· construction feasibility simulation.

## Workstreams

| Workstream | Deliverable | Owner | Depends on | Acceptance | Blocker | Cut condition |
|---|---|---|---|---|---|---|
| Science & data | Gate 1–2 for Gate A variable; Gate 3 if time | unassigned | — | Gate boxes ticked with evidence | Estimand + period decision (P0-S1, S7) | Sun 10:00 → narrow claim |
| Backend & contracts | AnalysisBundle JSON + regeneration command | unassigned | P0-S2 | P0-B1–B3 | Stats module | Sun 13:00 → single static result file |
| Frontend & experience | Render bundle, EvidenceCard, outcome states | unassigned | P0-B1 | Gate 4 | Bundle schema | Sun 13:00 → static EvidenceCard |
| Product & presentation | Slides/video, page text, pitch, checklist | unassigned | Gate 2 result | Gate 5 | Verified finding | Never cut. Use the honest null if needed |

No workstream defines scientific conclusions on its own. Claims come only from gate-checked results.

## Readiness matrix (internal 0–4 scale; not the official scoring)

0 = absent · 1 = idea · 2 = partial/exploratory · 3 = works, gaps known · 4 = verified with evidence.

| Criterion | Now | Evidence / gap |
|---|---|---|
| Impact | 1 | User and problem stated as hypotheses. No demonstrated outcome (correctly) |
| Creativity | 2 | Joint low-resource question is non-obvious but untested. Current app is closer to a dashboard |
| Validity | 3 | Real NASA data with DOIs and checksums. Tested Python stats, pre-registered energy test, reproducible bundles. Old panel still re-aggregates p-values and shows 2030 extrapolation |
| Relevance | 3 | All five challenge tasks partially covered with real NASA data |
| Presentation | 2 | Strong globe, EvidenceCards wired in. Findings pending review. Slides not started |

## Historical checklist (kept for reference)

- [x] Repository foundation · [x] UX/UI rules · [x] Implementation authorized (14 Nov)
- [x] NASA data ingestion: GPM, MERRA-2, GLDAS, partial MODIS, NOAA GHCN (see `DATASETS.md`)
- [x] 3D globe `/explore` (CesiumJS, ADR-001)
- [ ] NASA challenge requirements verified against the live page (see `PROJECT.md` §1)
- [ ] Canary Islands decision (D6)
