# TARO evaluation plan

## Corpora (kept separate)

| Set | File | Role |
|---|---|---|
| A Domain knowledge | `question-bank.ts` (rubric rows) | Conceptual correctness; many **not** auto-scored yet |
| B Evidence retrieval | `policy-cases.ts` + executable bank rows with `expectEvidenceIds` | Card id, scope, no substitution |
| C Industry reasoning | slices 2–4 | Mechanism vs measurement |
| D Claim safety | adversarial + forecast + investment | Unsupported causality / 2030 / rank |
| E Geographic grounding | Toledo, Burgos, Málaga, Cuenca | Pins without fake cards |
| F Adversarial | `adv-*` | Injection, invented sources |
| G Continuity | `turn-*` rubric | Session memory is not evidence |

Training examples must not be copied into answer templates. The 200+ bank is an **evaluation sketch**. Gold numerical answers are only those already on EvidenceCards. Gaps are left empty on purpose.

## Metrics

Domain precision/recall · citation accuracy · unsupported-claim rate · numerical consistency vs cards · geographic-scope errors · refusal correctness · insufficient-evidence behaviour · multi-turn consistency · latency/cost (when LLM on).

A handful of demo chats is not reliability.

## What ran (14 Nov 2026 night, D71)

- Browser exam on `/explore` (8 compound questions) then routing/claim/scope fixes
- Re-run: `python3 tests/test_aethra_agent.py` including exam policy cases

## What ran (14 Nov 2026 evening)

- `python3 tests/test_aethra_agent.py` including the executable bank
- `cd apps/web && npm run typecheck && npm run lint` (2 pre-existing warnings, unrelated)

Not run: named human scientific review, D53 decision, browser pass of the five TARO slices in this session, LLM-on evals.

## Promotion rule

No domain is “TARO-trained” until (1) executable cases pass, (2) a second person reviews gold text for that domain, (3) P0 gates that domain depends on are signed.
