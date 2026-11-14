# TARO knowledge architecture

**Status:** P1 (D68, D69). **TARO is AETHRA’s visible research companion** (replaces the AETHRA Core label). It is curriculum-trained via curated claims and retrieval, **not** a fine-tuned LLM. Do not call it comprehensive.

This document is the map. It does not duplicate `docs/DATASETS.md`, `ENERGY_RESEARCH.md`, `SCIENTIFIC_REVIEW.md`, or the 25 foundational briefs (those files are **not in this repository** — recorded gap).

## First principle

Do not fine-tune an LLM on NASA arrays, plant registers, or citations. Numerical truth is Python `AnalysisBundle` → `evidence-cards.json`. TARO retrieves, classifies, and explains. It does not compute slopes, p-values, CIs, or significance (ADR-002).

Stack in force:

1. Curated sources (`lib/agent/knowledge/sources.ts`)
2. Immutable scientific artifacts (bundles + cards)
3. Versioned concepts and relations (`concepts.ts`)
4. Deterministic tools (allowlist)
5. Intent resolution (`classifyIntent`)
6. Evidence-backed synthesis (`answerQuestion`)
7. Domain/evidence gates (status enum)
8. Offline + runtime evals

## What already exists (audit 14 Nov 2026)

| Layer | Location | State |
|---|---|---|
| Gate A temperature card | `gate-a-temperature-R0` | Technical review passed; human sign-off PENDING |
| Gate B joint-low cards | `energy-gap-{R0,ES11,ES41,ES24,ES61}` | E1 insufficient 5/5 (D41); 2nd review PENDING |
| Climate scopes | `climate-bundle.json` | Precomputed; D53 rain/runoff labels OPEN |
| CyL register | `energy-infrastructure.json` | 652 included; INGESTED, NOT VALIDATED; judge-hidden |
| Core API | `POST /api/aethra/ask` | Deterministic (D65) + LLM socket off (D66) |
| `services/api` | README stub | Do not add FastAPI for this |
| PostgreSQL / pgvector | — | Not justified |
| NEX-GDDP-CMIP6 | spec only | DEFERRED |
| 25 foundational docs | — | **Missing from repo** |

## Retrieval

| Question type | Path |
|---|---|
| Numbers (slope, CI, p, n, MW counts) | Exact card / bundle / register JSON. Never kNN. |
| Concepts (GHI, capacity factor, why heat cuts PV efficiency) | Curated `KnowledgeClaim` (Tier B/D) |
| Mixed | Card + claim, explicitly unfused |
| Missing local card | `NOT_AVAILABLE` + pin if a named place exists. Never national substitution (D50) |

## Control plane (not the system prompt)

Intent allowlist · tool allowlist · typed `AgentAnswer` · claim→evidence id · paraphrase faithfulness · runtime evals · prompt-injection cases.

## Recommendation levels (hard)

0 explanation · 1 retrieve card · 2 compare same method/support · 3 research candidate · 4 feasibility (needs infra + environment + grid — **not built**) · 5 investment/construction **forbidden**.

TARO may not jump from 2 to 5. Site ranking is not a level; it is a refusal.

## Identity

| Surface | Name |
|---|---|
| Product | AETHRA |
| Companion UI | **TARO** (D69) |
| Knowledge/reasoning program | TARO |
| Energy strategy working name | GRIDSHIFT (internal) |
