# Judging Readiness (15 Nov 2026, ~02:00; updated by the recovery sprint, see `FINAL_RELEASE_VALIDATION.md`)

Qualitative self-assessment against the five official criteria. **Not a predicted score; no weights
assumed.** Confidence = our confidence that the criterion is *ready to be judged*, not that we win.

## Summary

| Criterion | Readiness | Blocking risk |
|---|---|---|
| Impact | Low–medium | No user evidence; must not be overclaimed |
| Creativity | Medium | Differentiation must be *shown* (contrast), not asserted |
| Validity | Medium–high (technically) / **blocked on process** | Human review unsigned; D53 open; stale provenance hashes |
| Relevance | High | Curated scope must be stated honestly |
| Presentation | Medium | New first view not yet rehearsed 3×; slides not built; no public URL |

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
