---
name: code-quality-gate
description: >-
  General coding-practice gate for any code change in this repo (TypeScript, Python, scripts,
  config). Use before starting a change and again before declaring it done: read-before-edit,
  minimal focused diffs, naming, error handling, no dead code or debug leftovers, tests, and an
  honest verification report. Pairs with typescript-strict (apps/web) and python-typed (.py files).
---

# Code Quality Gate

Apply this to every code change. Language-specific rules live in `typescript-strict` and
`python-typed`; load the one that matches the files you touch.

## Before editing

- **Read the file first,** including uncommitted changes (`git status`, `git diff <file>`).
  Files with `UU` status have unresolved merge conflicts: don't edit them until the human
  says how to resolve them.
- **Find existing helpers before writing new ones** (`lib/format.ts`, `lib/globe/*`,
  `packages/science/*`). Duplicate logic drifts, and in this repo drift means two different
  numbers for the same thing.
- **Check the task against AGENTS.md "Never do silently".** If it touches datasets,
  baselines, thresholds, claims or LOCKED decisions, stop and ask.

## While editing

- **Keep diffs small and focused.** One concern per change. Don't reformat, rename or "tidy"
  unrelated code in the same edit.
- **Use names that carry meaning:** `annualMeanTempC`, not `data2`. Booleans read as
  predicates (`isLoading`, `hasCoverage`). Put units in names when the value has them.
- **Keep functions to one job** and under about 50 lines. Prefer early returns to deep nesting.
- **Make errors explicit.** Never swallow an error. In the UI, show a real error or empty state
  from `UX_UI_RULES.md`, never a silent blank or a made-up fallback number.
- **Leave no dead code:** no commented-out blocks, unused imports or variables, `console.log`
  or `print` debugging, or `TODO`s without an owner or reason.
- **No hard-coded secrets, tokens or absolute local paths** (`/Users/...`). Config goes in
  `.env` (never committed) and is documented in `.env.example`.
- **Comments explain *why*,** plus provenance for numbers. Don't narrate what the code
  obviously does.
- **Data files stay under 50 MB.** Keep generated output deterministic.

## Before declaring done

1. Run the checks for every area you touched:

   | Touched | Run |
   |---|---|
   | `apps/web/**` | `cd apps/web && npm run typecheck && npm run lint` |
   | `*.py` | `ruff check <files>`, plus tests for `packages/science` |
   | data builders/exporters | re-run the script and `git diff --stat` the output; explain every changed number |

2. **Re-read your own diff** (`git diff`) as a reviewer would. Look for leftovers, unrelated
   changes, missing types, and missing provenance or labels on new values.
3. **Update `docs/`** if you changed something others rely on: schema, script flags, file
   locations.
4. **Report honestly,** in this shape:
   ```
   Ran: npm run typecheck ✅, npm run lint ✅ (2 pre-existing warnings in Globe.tsx), ruff ✅
   Not run: pytest (not installed), manual browser check
   ```
   Don't write "should work" when you could have run something to find out.
