# Project

## 1. Official challenge contract (highest priority)

**NASA Space Apps Challenge 2026 — Challenge #02 "Be An Earth System Trend Detective!"**
(Málaga local event: *Detective de tendencias de la Tierra*.)
Official page: <https://www.spaceappschallenge.org/2026/challenges/be-an-earth-system-trend-detective/>

> **Unverified:** the official page renders client-side and could not be read automatically on
> 14 Nov 2026. The five tasks below come from the team brief. A human must check them against the live page,
> along with its *Resources* list, then tick the box in `DEMO_AND_SUBMISSION.md`.

The tool must:

1. Identify relevant Earth-science variables from NASA observations or models.
2. Obtain the corresponding data for a geographic region.
3. Generate and visualize a time series over a scientifically meaningful period.
4. Determine the direction and magnitude of the trend.
5. Evaluate whether the trend is statistically significant.

Every result we show answers **WHAT** (variable, units), **WHERE** (region and native resolution),
**WHEN** (period, temporal resolution), **HOW MUCH** (rate with uncertainty), **EVIDENCE** (method,
test, n), **TRUST** (QA, limitations, outcome state).

The challenge takes precedence over the energy theme, aesthetics, new features and storytelling. A
globe without a reproducible trend analysis is not a solution.

Event rules, deadlines and submission requirements: [DEMO_AND_SUBMISSION.md](DEMO_AND_SUBMISSION.md).

### Product identity (visible UI)

The challenge name stays **Be An Earth System Trend Detective!** (LOCKED, external). The visible
product identity in `/explore` is **AETHRA** — Earth Intelligence Platform; first mission
**MISSION 01 — SPAIN** (D56). GRIDSHIFT (D34) remains an internal energy-strategy working name.
This is an independent Space Apps project, not an official NASA product. Art direction:
[BRAND_ART_DIRECTION.md](BRAND_ART_DIRECTION.md). Raster logo kit in `apps/web/public/brand/aethra`
(D58). Vector master still deferred.

## 2. Product thesis

**Evidence-first Earth-system trend investigation for Spain.**
North Star: *minimize time-to-evidence*, the time it takes to get from an Earth-system question to a
quantified conclusion that traces back to NASA data. The unit of value is the **Evidence-Backed
Insight** (EvidenceCard), not a layer, a chart or a recommendation.

### Strategic vision vs what the MVP actually is

| | Strategic vision (motivation) | MVP (what we will demonstrate) |
|---|---|---|
| Question | How are the environmental conditions behind clean energy in Spain changing? | Did a NASA variable change over a defined region and period, by how much, and is that supported? |
| Variables | Solar irradiance, wind, a joint low-resource indicator | One validated NASA variable (Gate A). Solar/wind only if Gate B passes |
| Output | Better-informed choice of what to study next | EvidenceCard: series, slope + CI, test, outcome state, provenance |
| Status | **Proposed** (D34, pending approval) | **P0** |

The motivating long-term question is *"How attractive could regions of Spain be for future
clean-energy infrastructure, and how are the conditions shaping that changing?"*. We use it for
ambition and context. The MVP cannot answer it, and we don't claim that it does.

### What we are not building (anti-goals)

A generic climate dashboard · a static solar/wind atlas · a PVGIS / Worldview / GIS replacement · an
investment recommendation engine · a site-selection tool · a grid-failure or price predictor · a
climate forecasting platform · an AI that invents findings.

## 3. User, problem, hypothesis

- **Target user (hypothesis, not validated):** a renewable-energy resource analyst or early-stage
  infrastructure planner looking at regional solar and wind behavior. For the Gate A MVP, the same user
  (or a regional environmental analyst) needs trustworthy trends for a territory.
- **User's job:** "Show me how resource conditions have changed in a region, whether the change is
  statistically supported, and what further study it justifies."
- **Problem:** averages hide timing. Plentiful renewable resources don't guarantee availability when
  needed, and periods when solar and wind are *jointly* low may matter more than means.
- **Scientific hypothesis (unconfirmed):** the frequency, persistence or seasonality of jointly low
  solar and wind conditions may differ by region and may be changing. See
  [ENERGY_RESEARCH.md](ENERGY_RESEARCH.md).
- **Human benefit (plausible, not demonstrated):** better evidence for deciding where reliable
  clean-energy development and adaptation need further study. We do **not** claim lower prices,
  better grid stability, avoided blackouts, higher production, optimal sites or emission cuts.

## 4. Geographic scope

Spain. Data are clipped to all of Spain (D19). The **analysis extent** for headline results must be
stated explicitly. Default: Peninsula + Balearics (D5). The Canary Islands are a separate climate
regime (D6, OPEN) and should be reported separately, not averaged in silently. Since D46 the
headline extent is area-weighted (cos φ × cell fraction) over Peninsula + Balearics, with Canarias
reported separately.

## 5. Success criteria

**Gate A (P0, mandatory).** One complete, reproducible evidence chain:
NASA source → ingestion → metadata/QA → spatial/temporal preparation → time series → trend
analysis → statistical evidence → provenance → EvidenceCard → visualization.
It counts as done when every Gate 1, 2, 4 and 5 criterion in [ROADMAP.md](ROADMAP.md) is checked with evidence.

**Gate B (P1, conditional).** The same chain for solar and wind resources plus a pre-registered
joint low-resource indicator (Gate 3). It becomes the primary demo only if it passes. Otherwise it is
presented as the next research step.

**Never:** present a generic result (e.g. warming) as evidence about renewable-energy potential.

### Geographic context vs evidence (proposed, D54 — not in the MVP)

The strategic vision may later connect **where the user is looking**, **what NASA measured at native support**, and **what infrastructure is registered nearby**. That is still not site selection. A research *case* (first candidate: Castilla y León, with Aragón as a descriptive comparison) would only narrate existing Gate B EvidenceCards. Landmark fly-tos (Mulhacén, Picos de Europa) are navigation demonstrations inside national parks, not development candidates. Spec: [SPATIAL_EXPERIENCE.md](SPATIAL_EXPERIENCE.md). **Not implemented while P0 and submission are open.**
