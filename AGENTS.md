# Guidelines for AI Coding Agents

These are guidelines, not gates. Use judgment and move fast; the hackathon clock matters more than
process.

| Working on… | Useful context |
|---|---|
| Anything | `docs/PROJECT.md`, `docs/DECISIONS.md` |
| Git | `docs/TEAM_WORKFLOW.md` |
| `apps/web` or any UI | `docs/UX_UI_RULES.md` |
| `data/`, `packages/science`, `services/api` | `docs/DATASETS.md` |

## General

1. Look at existing files before changing them and don't throw away teammates' work by accident.
2. Implementation is open — build features whenever useful.
3. Prefer small, simple changes; add dependencies when they help.
4. Decisions in `docs/DECISIONS.md` can be changed; just record the change there.
5. Work on a feature branch and pull before committing (see `docs/TEAM_WORKFLOW.md`).
6. Never commit secrets (`.env`, `~/.netrc`, tokens). Keep very large raw files out of Git.

## Data and science (recommended practices)

- Record where data came from (dataset, version, units, period) when you can — it helps the
  *Validity* judging criterion.
- Label placeholder or synthetic data as such so the team knows what is real.
- Prefer careful wording ("trend", "associated with") over causal claims in the UI.
- Exploratory data, quick computations and prototypes are welcome anywhere, including the browser.

## Before finishing

- Run the relevant tests/linters and report the result.
- Update `docs/` if you changed something others rely on.
