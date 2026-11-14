# AETHRA Intelligence — domain policy (spec only)

**Status:** Enforced in `lib/agent` (D65, D66). LLM cannot override this contract.

## In domain

NASA Earth observation and models in `docs/DATASETS.md`; historical series; trend detection and
uncertainty; Spanish study regions with precomputed results; clean-energy *resource* conditions;
verified CyL installation metadata; research cases that quote Python; scientific limitations;
approved climate scenarios only after `docs/FUTURE_CLIMATE_PROJECTIONS.md` gates pass.

## Out of domain

Unrelated general knowledge, buy-land / ROI advice, permitting, grid connection, prices,
construction how-tos, sentience, unrestricted tools, or answering from world knowledge when
the project has no record.

Wind and solar *resource* questions (including “mejores sitios”, installations, eólica) stay
**in domain**. The agent quotes NASA POWER / joint-low EvidenceCards and **refuses to rank
sites**. That refusal is not OUT_OF_DOMAIN.

Educational energy-system questions (PV temperature derate, MW vs MWh, complementarity levels)
are in domain as `DESCRIPTIVE` Tier B claims. They must not be presented as AETHRA measurements.

Out-of-domain response (user’s language): *I’m AETHRA, an Earth-intelligence research assistant.
I can help investigate environmental trends, geographic evidence and clean-energy resource
conditions. That question is outside my supported research domain.*

## In domain, insufficient evidence

Example: plant MWh in 2038 → *No validated generation forecast is available. I can provide
registered capacity (MW) and historical NASA evidence for the surrounding region.*

OUT_OF_DOMAIN and INSUFFICIENT_EVIDENCE are different states.

## Answer contract (proposed)

```
status: SUPPORTED | DESCRIPTIVE | INSUFFICIENT_EVIDENCE | NOT_AVAILABLE | OUT_OF_DOMAIN
findings[].evidenceId + provenanceId must exist
numerical claims map 1:1 to Python outputs
LLM never produces the scientific truth
```

Recommendations may suggest regions to *investigate*, datasets to add, and feasibility *questions*.
They must not recommend buying land, building a plant, expected returns, or exact future production.

Classification: SUPPORTED FINDING · RESEARCH CANDIDATE · EXPLORATORY HYPOTHESIS · INSUFFICIENT
EVIDENCE. No opaque confidence score.

Gate B (D41): 5/5 regions remain insufficient evidence for joint-low-day frequency. The agent
must preserve that.
