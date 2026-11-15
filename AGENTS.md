# Guardrails for AI Coding Agents

Move fast on code, but never cut corners on science. A result we can't defend loses more points under
*Validity* than a missing feature does. The scope and ask-first rules were removed on 15 Nov 2026 at
the human's request (DECISIONS D74).

| Working on… | Read first |
|---|---|
| Anything | `docs/PROJECT.md`, `docs/ROADMAP.md`, `docs/DECISIONS.md` |
| Git | `docs/TEAM_WORKFLOW.md` |
| `apps/web` or any UI | `docs/UX_UI_RULES.md`, `docs/adr/001-cesium-globe.md` |
| `data/`, `scripts/`, `packages/science`, `services/api` | `docs/DATASETS.md`, `docs/adr/002-evidence-chain-alignment.md` |
| Solar / wind / energy work | `docs/ENERGY_RESEARCH.md` |
| Demo, slides, submission text | `docs/DEMO_AND_SUBMISSION.md` |
| Any task (hard stops, claim review) | skill `.agents/skills/non-negotiables` |
| Scoping, priorities, submission | skill `.agents/skills/challenge-contract` |
| Framing, features, copy, energy angle | skill `.agents/skills/product-thesis` |
| UI, charts, maps, UI text | skill `.agents/skills/scientific-ux-ui` |
| Any code change | skill `.agents/skills/code-quality-gate` |
| `.ts` / `.tsx` | skill `.agents/skills/typescript-strict` |
| `.py` | skill `.agents/skills/python-typed` |

## Git safety

1. Don't push over teammates' work: no force push, no `reset --hard`, no `clean -f`, no history
   rewrite, and don't discard uncommitted changes you didn't make.
2. Push, merge, open PRs or change GitHub settings only when the human asked in this session.

## Always

- Look at existing files (including uncommitted changes) before editing them. Preserve working code.
- Record provenance with every number: dataset, version or DOI, variable, units, period, spatial
  support, method.
- Label placeholder, synthetic, extrapolated and exploratory values as exactly that, in code, data
  files and UI.
- Use the honest outcome states from `UX_UI_RULES.md`. "No robust trend" and "insufficient
  evidence" are valid results.
- Report what you actually ran (tests, lint, typecheck) and what you didn't.
- Update `docs/` when you change something others rely on.
- Never commit secrets (`.env`, `~/.netrc`, tokens). Keep each data file under 50 MB.
