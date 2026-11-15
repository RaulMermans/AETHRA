# Judging Readiness (15 Nov 2026; updated by the recovery sprint D75 and the competition sprint D76)

Qualitative self-assessment against the five official criteria. **Not a predicted score; no weights
assumed.** Confidence = our confidence that the criterion is *ready to be judged*, not that we win.

## Summary

| Criterion | Readiness | Blocking risk |
|---|---|---|
| Impact | Medium (functional) / low (human) | Simulated use cases pass; no user evidence — must not be overclaimed |
| Creativity | Medium–high | Claim Test (supported · insufficient · outside the evidence) now visible on screen |
| Validity | High (technically) / **human review pending** | D53 closed, D64 rebuilt, Gate A/B reproduced (15 Nov); §5 unsigned |
| Relevance | High | Curated scope must be stated honestly |
| Presentation | Medium–high | Automated 3× rehearsal + stills done; venue rehearsal, slide file and public URL pending |

## Scorecard (15 Nov, after D75/D76) — evidence per criterion, no scores

| Criterion | Main claim | Supporting evidence | How it is demonstrated | Remaining weakness | Release blocker | Validation status |
|---|---|---|---|---|---|---|
| **Impact** | Helps a (hypothetical) regional energy-resource analyst decide whether "more joint lows" is a supported finding or stays a hypothesis | CyL receipt: insufficient evidence; Claim C boundary | S01–S04 simulated use cases (`SCENARIO_VALIDATION.md`) | Persona unvalidated; 0 participant sessions | None (claim stays "unvalidated") | Functional ✔ · human ✘ |
| **Creativity** | Evidence status *is* the product output: a non-obvious joint-low indicator, an honest null, a supported contrast and a boundary, each with a "do not conclude" line | Evidence receipt (D76), first-screen Claim Test | Live path step 4–7; stills 03/04/05 | Trend tests and cards exist elsewhere; novelty is the workflow, not the maths | None | Shown in build ✔ |
| **Validity** | Real NASA data, area-weighted, Theil–Sen + Mann–Kendall + Hamed–Rao, BH where required, CIs, provenance | Gate A/B bundles; reproduction 15 Nov; 70 Python tests | Receipt sections 3, 5, 6; Sources & provenance | Reanalysis/satellite support; 25–26 years; NOAA not independent; human review | `SCIENTIFIC_REVIEW.md` §5 (or keep EXPLORATORY labels) | Reproduced ✔ · human review ✘ |
| **Relevance** | Covers the challenge chain: indicator → NASA data → geography → long series → trend magnitude → significance → communication | `PITCH_FINAL.md` §4 slide 3; DATASETS | Receipt 1–6 maps onto the chain | Curated, precomputed; not arbitrary variable search | Official Resources list check | Mapped ✔ · rules check ✘ |
| **Presentation** | One question, one answer, one contrast, one boundary in 2 minutes | `JUDGE_EXPERIENCE.md`; stills; 3× automated runs | 2-minute script; Claim Test | Slide file not built here; venue machine untested | Deploy URL; 3 live rehearsals | Automated ✔ · live ✘ |

## Impact

- **For us:** a named user hypothesis, a precise research decision ("investigate further or not"),
  and a result that changes that decision (the joint-low assumption is not supported).
- **Weaknesses:** persona unvalidated; zero participant sessions; the decision is upstream of any real
  outcome.
- **Blocking risk:** saying "improves planning" or quoting time savings would fail *Validity* too.
- **Smallest acceptable improvement:** run the 2-participant protocol in `IMPACT_VALIDATION.md` if
  anyone outside the team is available before 16:00; report raw outcomes only. Otherwise say "impact
  unvalidated; protocol ready".
- **Confidence:** low–medium.

## Creativity

- **For us:** the honest null is the hero, not hidden; a pre-registered, non-obvious indicator (joint
  lows, not averages); outcome states and "do not conclude" lines as first-class UI; first view now
  puts question, answer and contrast side by side.
- **Weaknesses:** maps, Mann–Kendall, EvidenceCards and AI assistants all exist elsewhere; no
  competitive review done.
- **Blocking risk:** claiming novelty.
- **Smallest acceptable improvement:** done in code (first view). In the pitch, frame creativity as the
  *workflow* ("evidence status is the result"), per `PRODUCT_POSITIONING_FINAL.md` §6.
- **Confidence:** medium.

## Validity

- **For us:** real NASA products with DOIs and checksums; statistics in tested Python (14 kernel + 8
  evidence-chain + 12 demo-safety + 5 case-consistency tests pass, run 15 Nov ~01:10); browser
  computes nothing; pre-registered Gate B with BH across 5 regions and sensitivity; NOAA independent
  check; Gate A headline re-run tonight with current boundaries and code reproduces exactly.
- **Weaknesses:** reanalysis/satellite support; 25–26 years; E2 low-wind result exploratory; NOAA
  stations not homogenized; MERRA-2 independence of the station check not yet confirmed in GMAO docs.
- **Blocking risks (must be closed or disclosed):**
  1. `SCIENTIFIC_REVIEW.md` §5: **0/8 signed**. Slide 5 depends on it (non-negotiable 17).
  2. D53: **CLOSED 15 Nov** (conservative judge policy, D75).
  3. Provenance: **resolved for the climate bundle** (rebuilt on D64 boundaries, 15 Nov); Gate A
     reproduced with current code (all fields identical). Remaining limitation: the exact
     `trends.py` (c43f59e1…) that produced Gate A/B was never committed (D75).
  4. Gate B CCAA regions not re-runnable on this machine (POWER raw data absent).
- **Smallest acceptable improvement:** a teammate signs §5 and records D53 before 14:00; until then,
  everything is presented as EXPLORATORY. Re-run of `build_climate_bundle.py` is P1, not required for
  the demo path (which uses no province result).
- **Confidence:** medium–high on the numbers; low on process until §5 is signed.

## Relevance

- **For us:** all five challenge tasks are on screen with NASA data. WHAT (variable, units, source),
  WHERE (region + native grid), HOW MUCH (slope ± CI per decade), SIGNIFICANCE (outcome state) are
  on every EvidenceCard and in the first view.
- **Weaknesses:** variable identification (task 1) is curated, not a search; official challenge page
  and Resources list still not human-verified (`PROJECT.md` §1).
- **Blocking risk:** implying arbitrary-variable discovery.
- **Smallest acceptable improvement:** a human ticks the live-page check; pitch says "curated".
- **Confidence:** high.

## Presentation

- **For us:** one story (question → answer → evidence → contrast → decision) now matches the first
  screen; 2-minute script and 7-slide outline written; fallback narration written.
- **Weaknesses:** slides not built; no fallback recording; new default view not rehearsed; no public
  URL recorded in the repo; pitch format with organizers unconfirmed.
- **Blocking risk:** a demo path that hasn't run 3× on the presenting machine (non-negotiable 20).
- **Smallest acceptable improvement:** deploy judge build → rehearse 3× → record fallback → build 7
  slides from `PITCH_FINAL.md` §4 with real screenshots.
- **Confidence:** medium.

## Release check: what must be true before Submit for Judging

- [ ] `SCIENTIFIC_REVIEW.md` §5 signed by a named teammate (or every result labelled EXPLORATORY in slides/page)
- [x] D53 recorded in `DECISIONS.md` (closed 15 Nov, D75)
- [ ] Judge build deployed; URL works in a private window; `/explore?lab=energy` shows no Energy Lab
- [ ] Demo path in `JUDGE_EXPERIENCE.md` run 3× on the presenting machine; fallback recorded *(substitute: 3 automated browser runs on a dev machine passed 15 Nov; venue machine still pending; a 1440×900 recording of run 1 exists, see `FINAL_RELEASE_VALIDATION.md`)*
- [ ] 7 slides built from `PITCH_FINAL.md`; every number checked against §6 of that file
- [ ] Submission checklist in `DEMO_AND_SUBMISSION.md` ticked by a human
- [ ] Submit for Judging pressed by 21:00; confirmation captured
