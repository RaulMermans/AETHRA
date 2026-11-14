# Guardrails for AI Coding Agents

Move fast on code, but never cut corners on science. A result we can't defend loses more points under
*Validity* than a missing feature does. If a request conflicts with a rule below, stop and ask the
human. Don't work around it.

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

## Never do silently (ask a human, then record it in `docs/DECISIONS.md`)

1. Change a dataset, version, variable, baseline, analysis period, spatial support or trend method.
2. Upgrade a dataset or result to READY or validated (see readiness classes in `DATASETS.md`).
   Only a recorded gate check can do that.
3. Add a scientific claim to UI, docs or slides that no recorded result supports. That includes causal
   wording, energy-production or grid claims, and any statement about 2030.
4. Start a new feature area (new tools, new industries, forecasting, ML, site ranking). P2 items in
   `ROADMAP.md` are off-limits until P0 is green.
5. Edit a **LOCKED** decision, or change the MVP's primary scientific question.
6. Compute or redefine a scientific conclusion (slope, p-value, CI, significance label, aggregation of
   statistics) in frontend code. The browser renders values produced by the Python pipeline.
7. Change thresholds, event definitions or tests in `ENERGY_RESEARCH.md` after seeing results, or
   report only the most significant of several variants.
8. Push over teammates' work: no force push, no `reset --hard`, no `clean -f`, no history rewrite,
   and don't discard uncommitted changes you didn't make.
9. Push, merge, open PRs or change GitHub settings unless the human asked in this session.

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

## Allowed without asking

- Exploratory notebooks or scripts clearly marked EXPLORATORY and kept out of the demo path.
- UI work that doesn't alter scientific values or claims.
- Tests, documentation fixes, refactors that don't change outputs.
