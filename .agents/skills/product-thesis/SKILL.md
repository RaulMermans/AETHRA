---
name: product-thesis
description: >-
  The product idea: evidence-first Earth-system trend investigation for Spain, where the unit of
  value is the EvidenceCard. Use when deciding what to build or cut, naming or framing features,
  writing copy, pitch or README text, discussing the energy angle (GRIDSHIFT / "Hidden Energy
  Gap"), or whenever a request drifts toward a dashboard, atlas, forecast, site ranking or
  recommendation engine. Keeps the strategic vision separate from what the MVP actually claims.
---

# Product Thesis

**Source of truth:** `docs/PROJECT.md` §2–5. If they differ from this skill, the doc wins.

## The idea in one line

**Evidence-first Earth-system trend investigation for Spain.**
North Star: **minimize time-to-evidence**, the time from an Earth-system question to a
quantified conclusion that traces back to NASA data.

The unit of value is the **Evidence-Backed Insight (EvidenceCard)**. It is not a layer, a chart
or a recommendation. Judge every feature by whether it gets the user to a trustworthy
EvidenceCard faster or makes the card more trustworthy.

## Vision vs MVP: never blur them

| | Vision (motivation only) | MVP (what we demonstrate and claim) |
|---|---|---|
| Question | How are the conditions behind clean energy in Spain changing? | Did a NASA variable change over a defined region and period, by how much, and is that supported? |
| Variables | Solar, wind, a joint low-resource indicator | One validated variable (Gate A: MERRA-2 2 m air temperature). Energy only if Gate B passes |
| Output | Better-informed choice of what to study next | EvidenceCard: series, slope + CI, test, outcome state, provenance |

The energy story gives **ambition and context**. The MVP doesn't answer it, and no text may
imply that it does. Generic warming is **never** presented as evidence about renewable potential.

**Gate B status (D41):** joint solar–wind low days show *insufficient evidence* of a trend in 5/5
regions. Descriptive finding: they occur at about half the chance rate. It's pending a second
review. **No new thresholds, regions or variables on this question** (no searching for
significance).

## Anti-goals (refuse or flag them; don't build them)

Generic climate dashboard · static solar/wind atlas · PVGIS / Worldview / GIS replacement ·
investment recommendation engine · site-selection or ranking tool · grid-failure or price
predictor · climate forecasting platform · an AI that invents findings.

When a request looks like one of these, say so, name the anti-goal, and offer the
evidence-first version. For example: "rank regions for solar" becomes "show which regions have
a supported change in irradiance, with CI".

## User and value (hypotheses: say "may", not "will")

- **User (unvalidated):** a renewable-energy resource analyst or early-stage planner. For Gate A,
  a regional environmental analyst needing trustworthy territorial trends.
- **Job:** "Show me how conditions changed in a region, whether the change is statistically
  supported, and what further study it justifies."
- **Insight we build on:** averages hide timing. Plentiful resources ≠ available when needed.
- **Claimable benefit:** better evidence for deciding *what to study next*. **Never claim** lower
  prices, grid stability, avoided blackouts, higher production, optimal sites or emission cuts.

## Scope

- Spain. Headline analysis extent = **Peninsula + Balearics** (D5). **Canarias reported
  separately** (D6), never averaged in silently. Always state the extent.
- Region picker: Spain / CCAA / Provincia. Regional statistics come from Python only (P0-B2).
  Regions without a precomputed result show "not computed".

## Framing language

| Use | Avoid |
|---|---|
| "Trend detective", "evidence", "supported / not supported", "what changed, where, how much, how sure" | "Dashboard", "predicts", "optimal", "proves", "causes", "by 2030" |
| "Motivated by clean-energy questions" | "Renewable-energy platform", "tells you where to build" |
| "Reanalysis" / "satellite–gauge estimate" / "modelled" | Calling any of these "measured" or "observed" |

Story arc (`DEMO_AND_SUBMISSION.md`): Promise → Blind spot → Investigation → Evidence (real result
or honest "inconclusive") → Why it matters. The story **follows the evidence**, never runs ahead.
