# Product Positioning (final for submission, 15 Nov 2026)

Single source for how we describe AETHRA. If slides, the project page or a spoken line disagree with
this page, this page wins, unless `DEMO_AND_SUBMISSION.md` §Approved claim wording is stricter.

## 1. Three statements, three jobs (do not merge them)

| Role | Statement |
|---|---|
| **Product proposition**: what AETHRA does | "We turn NASA Earth data into defensible discoveries." |
| **Positioning line** | "From climate data to defensible discoveries." |
| **Core philosophy**: why the results can be trusted | **"We don't tell you what you want to hear. We show you what NASA's evidence supports."** |
| **Impact narrative**: why it matters | "Before we plan for tomorrow, we need to know what's actually changing today." |

"Discoveries" means *evidence-qualified findings*, including "insufficient evidence". It never means
"significant results only".

## 2. Product, application, user, capability, vision

| Layer | Definition | Status |
|---|---|---|
| **Product** | An evidence-first Earth-system trend investigation platform | Built (MVP) |
| **First application** | Historical solar and wind resource research in Spain | Built: 5 pre-registered regions, 2001–2025 |
| **Initial user** | Regional renewable-energy resource assessment analyst | **Hypothesis**, not validated |
| **Current validated capability** | Explore curated, **precomputed** NASA time-series analyses and inspect their statistical findings | Built; results EXPLORATORY until independent human review |
| **Long-term vision** | Scientific due diligence for more environmental and infrastructure research questions, regions and variables | **Not built. Never presented as operational** |

North Star: **minimise time-to-evidence**. Unit of value: **the Evidence-Backed Insight (EvidenceCard)**.

## 3. User and problem

- **User hypothesis:** an analyst at a regional energy agency, a renewable-development research team,
  an environmental planning body or an applied energy research institute.
- **Job-to-be-done:** "Help me determine whether apparent historical changes in environmental
  conditions are supported strongly enough to justify further technical investigation."
- **Problem:** a visible pattern, a historical trend, a statistically supported change and a
  forecast are different kinds of evidence. Mixing them up lets an unsupported assumption enter a
  study as if it were established.
- **Flagship question:** "Are periods of simultaneously low solar and wind resources becoming more
  frequent?" Flagship region: Castilla y León (one of five pre-registered regions; chosen as a
  continental high-plateau contrast *before* data, not for plant density).

## 4. The research decision AETHRA supports

> Does the historical evidence support the claim that jointly-low-resource conditions are changing,
> or should that claim remain an unconfirmed hypothesis requiring further study?

AETHRA supports the decision **to investigate further or not**. It does **not** support building a
plant, choosing or ranking a site, investing, or predicting any site's electricity output.

**Answer the current evidence gives (Castilla y León, 2001–2025):** the claim "joint-low days are
becoming more frequent" is **not supported**. Outcome: *insufficient evidence* (0.0 days per decade,
95 % CI −1.55 to +1.67, BH-adjusted p 0.79, n = 25). With 25 years the test could only detect trends
of about 2.0 days per decade or more, so smaller changes are not excluded. The claim should stay an
unconfirmed hypothesis. Source: card `energy-gap-ES41`, `data/results/energy_gap/analysis_bundle.json`.

## 5. The two findings and how they differ

| | Investigation A: air temperature | Investigation B: joint solar + wind lows |
|---|---|---|
| NASA source | MERRA-2 M2TMNXSLV 5.12.4 `T2M` (reanalysis), DOI 10.5067/AP1B0BA5PD2K | NASA POWER `ALLSKY_SFC_SW_DWN` (CERES SYN1deg Ed4.2, 1°) + `WS50M` (MERRA-2, 0.5° × 0.625°) |
| Where | Peninsula + Balearics, area-weighted | 5 pre-registered regions: Peninsula + Balearics, Galicia, Castilla y León, Aragón, Andalucía |
| When | 2000–2025 annual means (26 complete years) | 2001–2025 daily → annual counts (25 years) |
| Outcome | **Supported increase**: +0.60 °C per decade (95 % CI +0.31 to +0.87; p < 0.001); positive in all 6 windows (+0.41 to +0.83) | **Insufficient evidence** in 5/5 regions (e.g. Peninsula + Balearics 0.0 days/decade, CI −1.8 to +2.2) |
| External station comparison | 64/64 NOAA GHCN-Daily stations show a positive trend, 57 significant (not claimed independent of MERRA-2, D75); 53 within ±0.2 °C/decade of their cell | Pre-registered definition and sensitivity (P10, P30, alt. reference): no variant significant |
| Descriptive context (not a trend) | — | Joint lows occur about half as often as if solar and wind were independent (Peninsula: 183 vs ≈ 370 expected over 25 years; Aragón ratio 0.79) |
| What it is not | Not a cause, not a forecast, not energy evidence | Not generation, not grid reliability, not site suitability, not a forecast |

**Never link A and B causally or statistically.** They are two separate questions over the same
country. AETHRA computes no correlation between them.

## 6. Differentiation (a hypothesis, not a novelty claim)

We have not done a systematic competitive review, so we make **no global-novelty claim**.

| Tool (precedent) | What it already does well | What our workflow does differently | What we lack |
|---|---|---|---|
| NASA Worldview / GIBS | Fast browsing of imagery layers; provenance per layer | We start from a question and end at a qualified outcome state; imagery is context only | Their breadth, near-real-time data, hundreds of layers |
| NASA Giovanni | On-demand area averages, time series and some statistics for many variables | Fixed, pre-registered estimand per question; outcome label with CI, multiplicity handling and a "do not conclude" line on the result itself | On-demand analysis for arbitrary variables and regions |
| NASA POWER Data Access Viewer | Point/regional solar and meteorological data for energy users | A tested trend + significance outcome on a pre-registered indicator, with the null result shown as a result | Their variable range and export options |
| Generic climate dashboards | Attractive maps and charts | Outcome states that include "insufficient evidence"; values come only from a tested Python pipeline | Polish, scale |

**Claimable difference:** evidence status, uncertainty and traceability are the *core result* of the
interaction, not an appendix. That combination, applied to a renewable-resource question, is what we
demonstrate.

## 7. Claims we make, and claims we never make

**Use only these (from `DEMO_AND_SUBMISSION.md` §Approved claim wording; numbers unchanged):**
1. Temperature: +0.6 °C/decade, 95 % CI 0.31–0.87, p < 0.001, 26 years, windows 0.41–0.83.
2. NOAA: 64/64 stations show a positive trend (57 significant); 53 within 0.2 °C/decade of their reanalysis cell.
3. Joint lows: no detectable change; insufficient evidence in all five pre-registered regions.
4. Descriptive: about half the joint-low days expected under independence (183 vs ≈ 370 over 25 years).
   Never a headline on its own.

**Product claims we can make:** curated, precomputed NASA investigations; every number traceable to
dataset, version/DOI, region, period and method; statistics in tested Python, rendered unchanged;
"insufficient evidence" shown as a result.

**Never say:** the energy gap is growing or shrinking · renewables are more/less reliable · warming
changes solar or wind output · anything about 2030, 2040 or the future · best/optimal sites ·
investment advice · grid stability, blackouts, prices · "proves", "caused by", "due to" · "AI
discovers trends" · "real-time" · "any NASA variable, anywhere" · that AETHRA has improved anyone's
decisions (no user study yet; see `IMPACT_VALIDATION.md`) · that the results are "verified" or
"validated" before the human review in `SCIENTIFIC_REVIEW.md` §5 is signed.

## 8. Limitations to state plainly

- Curated: two investigations, a fixed variable list, 72 precomputed regions. No arbitrary query.
- Reanalysis and satellite-derived data at ~50–100 km support. Not station or plant scale.
- 25–26 years: limited power for small trends.
- Resource ≠ generation. No power curves, PV model, capacity, curtailment or grid.
- Results are EXPLORATORY until a second team member signs the review.
- Province-level numbers were rebuilt on the D64 boundaries on 15 Nov (D75). Non-temperature regional labels stay EXPLORATORY (D53).
- TARO is a deterministic assistant that quotes EvidenceCards. It does not analyse data.
