# Competition cut (judge build, 15 Nov 2026)

One investigation, front and centre: **are days with both low sun and low wind becoming more frequent?**
Everything else is context or off the judge path. Judge build = `NEXT_PUBLIC_ENABLE_EXPLORATORY` unset
(`lib/demo-mode.ts`); gates are enforced in state, not only by hiding buttons (D61, D75, D76).

| Feature | Class | Why | Evidence status |
|---|---|---|---|
| Study findings panel (question → answer → contrast → boundary) | **PRIMARY** | First screen ≥ 1200 px (D72); answers the question before any click | Quotes `evidence-cards.json` / `energy-research-cases.ts` (D62 tests) |
| Castilla y León research case (history-only chart) | **PRIMARY** | Flagship region; chart ends at 2025 in judge mode (D75) | Gate B card `energy-gap-ES41`, EXPLORATORY until §5 review |
| EvidenceCard as evidence receipt | **PRIMARY** | The inspectable result: claim, verdict, size, limits, method, provenance (D76) | Python export only |
| Temperature contrast + NOAA external comparison | **PRIMARY** | Shows the same discipline saying "supported" | Gate A, reproduced 15 Nov; NOAA not claimed independent |
| Claim C boundary block | **PRIMARY** | Shows where the evidence stops (2040 profitability) | Narrative device, no analysis |
| Sources & provenance | **PRIMARY** (one click) | Bundle path, SHA-256, git, status | — |
| Globe, region/province selector, climate maps, station symbols | **SECONDARY** | Geographic context; labelled as context in Study findings | Temperature labels hold after BH; rain/runoff EXPLORATORY (D53) |
| Other four research regions | **SECONDARY** | Same pre-registered family | Gate B, insufficient evidence 5/5 |
| Station catalog, Trend panel ("This place") | **SECONDARY** | Drill-down | Network FDR labels |
| Energy Tech Lab (rankings, suitability, 2030) | **HIDDEN IN JUDGE MODE** | Not a validated result | EXPLORATORY (D44) |
| Energy infrastructure layer, plant register, illustrative 3D turbine | **HIDDEN IN JUDGE MODE** | Context, not evidence | D49, D54 |
| TARO assistant (portrait + panel) | **ALWAYS VISIBLE** (D81, supersedes D76a) | Shown in every build and state; the demo still must not depend on it | Deterministic, LLM off |
| Relationship maps (R1–R3) | **HIDDEN IN JUDGE MODE** | New, unreviewed exploratory analyses | R2/R3 0 robust after FDR (D74) |
| 2032–2040 planning horizon in case chart | **HIDDEN IN JUDGE MODE** | Invites forecast reading | Not a projection |
| Rain / rain anomaly / runoff "Supported" labels | **BLOCKED** (shown as EXPLORATORY — multiplicity unadjusted) | Do not survive BH across regions | D53 closed |
| Province statistics | Rebuilt, **SECONDARY** | D64 boundaries now match | Rebuilt 15 Nov (D75) |
| AETHRA Intelligence / LLM agent, projections, generation models | **DEFERRED** | Out of MVP | D63, ROADMAP P2 |

What a judge does **not** see: rankings, scores, production numbers, 2030/2040 values, the
relationship maps, unadjusted rain/runoff "Supported" badges. Verified by
`apps/web/e2e/scenarios.spec.ts` (S05) and `tests/test_release_guards.py`.
