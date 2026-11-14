---
name: challenge-contract
description: >-
  The NASA Space Apps 2026 Challenge #02 "Be An Earth System Trend Detective!" contract, event
  rules and judging criteria. Use whenever you plan, prioritize or scope work, decide whether a
  feature is worth building, write anything for the submission (project page, slides, video,
  pitch, README), or are asked "does this help us win / meet the challenge?". Maps every piece of
  work to one of the five required tasks and the WHAT/WHERE/WHEN/HOW MUCH/EVIDENCE/TRUST contract.
---

# Challenge Contract

**Sources of truth:** `docs/PROJECT.md` §1 (challenge), `docs/DEMO_AND_SUBMISSION.md` (rules,
checklist), `docs/ROADMAP.md` (gates, timeline). If they disagree with this skill, the docs win.
Tell the human about the mismatch.

## The five required tasks

The challenge takes precedence over the energy theme, aesthetics, new features and storytelling.
**A globe without a reproducible trend analysis is not a solution.**

| # | The tool must… | Where it lives in this repo |
|---|---|---|
| 1 | Identify relevant Earth-science variables from NASA observations/models | `docs/DATASETS.md`, D36 (MERRA-2 `T2M`) |
| 2 | Obtain the data for a geographic region | `scripts/download_nasa_data.py`, `scripts/fetch_power_spain.py` |
| 3 | Generate and visualize a time series over a scientifically meaningful period | `data/results/*`, EvidenceCard chart |
| 4 | Determine direction and magnitude of the trend | `packages/science/trends.py` (Theil–Sen + CI) |
| 5 | Evaluate statistical significance | `packages/science/trends.py` (Mann–Kendall, autocorrelation-checked) |

> The task list comes from the team brief. The live challenge page has **not** been verified yet
> (`PROJECT.md` §1). Never present it as verified until a human ticks that box.

## The result contract

Every result shown anywhere answers all six:

**WHAT** (variable, units) · **WHERE** (region, native resolution) · **WHEN** (period, temporal
resolution) · **HOW MUCH** (rate ± uncertainty) · **EVIDENCE** (method, test, n) · **TRUST**
(QA, limitations, outcome state).

If a screen, slide or sentence leaves one out, it isn't finished.

## Feature triage: run this before building anything

1. Which of tasks 1–5 does it advance? None → it's not P0. Check `ROADMAP.md` P2/DEFERRED and stop.
2. Does it move a **gate** forward (`ROADMAP.md` Gates 1–5)? Gate A comes first. Gate B is
   conditional and has a hard cut at **Sun 12:00**.
3. Is it past **feature freeze (Sun 14:00)**? Then only bug fixes on the demo path.
4. Does it raise a judging criterion **without lowering Validity**? If it trades Validity for
   Presentation, the answer is no.

## Judging (local guide; weights NOT fixed, don't assume them)

Impact · Creativity · **Validity** · Relevance · Presentation, each scored 1–5.
- **Validity** suffers from any unsupported claim, invalid statistic or unlabelled extrapolation.
- **Relevance** depends on covering all five tasks with real NASA data.
- An honest "no robust trend" or "insufficient evidence" scores better than an indefensible
  "significant".

## Event rules that affect output

- **Deadline:** Submit for Judging before **Sun 15 Nov 2026, 23:59 local**. Team target is
  **21:00**. Capture the confirmation.
- **Project Demo:** one public link. Either **≤ 7 slides including the cover** or a **≤ 30 s video**.
- **Language:** project page, slides and written material in **English**. A video in another
  language needs English subtitles.
- **NASA resource:** at least one, with its **real role in the chain** explained. Partner data
  (NOAA) complements NASA data and never replaces it.
- **Credits:** NASA products with version/DOI, NOAA GHCN-Daily, Cesium ion/Bing, Esri,
  Sentinel-2 cloudless by EOX, GISCO.
- **AI:** allowed, but declare the tools and how they were used. Mark generated images or video
  visibly. The team verifies all generated content.
- **No NASA logos/insignia** in generated content. No identifiable minors.
- **Prior work** before Sat 09:00 must be declared.
- Public links must open in a **private window with no login**.

Rules marked ⚠️ in `DEMO_AND_SUBMISSION.md` are unconfirmed. Keep the ⚠️ when you repeat them.

## When writing submission material

Read `DEMO_AND_SUBMISSION.md` (pitch, 7-slide outline, story arc) and load the
`non-negotiables` skill. Slide 5 holds **only a gate-checked, second-person-reviewed finding**.
Never write it ahead of the evidence.
