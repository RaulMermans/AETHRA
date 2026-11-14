# Rules for AI Coding Agents

These rules are mandatory. Read the relevant documents **before** modifying anything.

| Before you touch… | Read |
|---|---|
| Anything | `docs/PROJECT.md`, `docs/DECISIONS.md` |
| Git (branch, commit, push) | `docs/TEAM_WORKFLOW.md` |
| `apps/web` or any UI | `docs/UX_UI_RULES.md` |
| `data/`, `packages/science`, `services/api` | `docs/DATASETS.md` + scientific rules below |

## General

1. Inspect existing files before changing them. Preserve others' work; never delete without a
   stated reason.
2. Do not implement product features until `docs/ROADMAP.md` marks **Implementation authorized**.
3. Keep changes small, focused and simple. No speculative features, extra dependencies or
   boilerplate.
4. Do not change a LOCKED decision. Propose changes to OPEN ones in `docs/DECISIONS.md`.
5. Follow `docs/TEAM_WORKFLOW.md`: pushing to `main` is allowed; always pull --rebase before
   pushing; no force push or destructive Git commands without explicit human approval.
6. Never commit secrets (`.env`, `~/.netrc`, tokens) or data files over 50 MB.

## Scientific

1. Never invent data, values, citations or results. If data is unavailable, say so.
2. Never present correlation as causation.
3. Preserve provenance: dataset short name, version, concept ID/DOI, units, scale factors, QA
   flags, extent, period.
4. Respect spatial resolution, temporal coverage and missing values; never interpolate silently.
5. Never claim statistical significance without a method recorded as validated in
   `docs/DECISIONS.md`.
6. "Insufficient evidence" is a legitimate result.
7. Scientific computation lives only in `packages/science`; the API serves it; the browser only
   renders it.

## Before finishing

- Run relevant tests/linters and report the actual result.
- Update `docs/` if you changed a decision, dataset status or workflow.
