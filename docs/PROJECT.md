# Project

## Challenge

**NASA Space Apps Challenge 2026 — "Be An Earth System Trend Detective!"**
(Málaga local event: challenge 02, *Detective de tendencias de la Tierra*:
"Analyze environmental data to discover what is changing in the Earth system.")

| Resource | Link |
|---|---|
| Challenges 2026 (full statement + resources) | https://www.spaceappschallenge.org/2026/challenges/ |
| Space Apps 2026 (registration, Project page) | https://www.spaceappschallenge.org/2026/ |
| Málaga local event | https://www.spaceappschallenge.org/2026/local-events/malaga/ |
| Participant FAQs | https://www.spaceappschallenge.org/resources/participant-faqs/ |
| Legal / terms | https://www.spaceappschallenge.org/legal/ |
| Earthdata Search | https://search.earthdata.nasa.gov/ |

Local reference material (Spanish) lives in this folder: participant guide, judging guide, UX guide
and challenge posters (`[NASA] *.pdf`, `*.png`).

> **To verify:** the exact challenge page URL and its official "Resources" list. Record both here
> once confirmed (ROADMAP: *NASA challenge requirements verified*).

## Event rules that affect this repository

From the Málaga participant guide (revised 14 Nov 2026). Confirm any change with the organizers.

- **Development starts Saturday 14 Nov 2026, 09:00 local.** Before that: team formation, reading
  challenges and preparing tools only. Any prior work must be declared.
- **Official deadline: Sunday 15 Nov 2026, before 23:59 local** — via *Submit for Judging*.
- Team of 1–6 registered members.
- **At least one NASA resource from the challenge** must be used, and its real role explained.
  Partner-agency data (e.g. NOAA) may complement but never replace it.
- Project page, slides and written material **in English**.
- Project Demo: one public link — **≤ 7 slides** (cover included) **or ≤ 30 s video**.
- AI use is allowed and must be declared; generated content must be verified and marked.
- No NASA logos/insignia in generated content. No identifiable minors in submitted material.
- Judging criteria (1–5 each): **Impact, Creativity, Validity, Relevance, Presentation.**

## Objective

Help users explore how the environment in **Spain** has changed, using NASA Earth observation or
model data, and answer with evidence:

1. **What** changed? (variable, units)
2. **Where?** (region, with spatial resolution stated)
3. **When?** (period, temporal resolution stated)
4. **How much?** (magnitude with uncertainty)
5. **Is it statistically significant?** (validated method, or "insufficient evidence")

## Geographic scope

Spain. Default analysis extent: Peninsula + Balearic Islands, bbox `-9.5, 35.9, 4.4, 43.9`
(lon/lat, WGS84). Canary Islands (`-18.3, 27.6, ...`) are OPEN — see `DECISIONS.md`.

## Core scientific requirements

- Every result is traceable to dataset (short name, version, DOI/concept ID), extent, period and
  method.
- Units, QA filtering and missing-data handling are explicit.
- Significance is only reported with a documented, validated test; otherwise the result is
  "insufficient evidence".
- Correlation is never presented as causation.

## MVP boundaries

**In:** one environmental variable · one validated NASA dataset · Spain · one trend method · a map, a
time-series chart and a provenance panel.

**Out (for now):** multiple variables, forecasting, attribution/causal claims, user accounts,
real-time ingestion, in-browser computation.

## Success criteria

- A user can select a region of Spain and get a trend with magnitude, period, units, significance
  and provenance.
- Results reproduce from the documented pipeline.
- Limitations and missing data are visible in the UI.
- Submission meets every event rule above before 23:59 Sunday.
