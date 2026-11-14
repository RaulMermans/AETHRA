# Team Workflow

## Current rules (D18, in force)

1. Committing and pushing directly to `main` is allowed. Use a branch + PR for big or risky changes.
2. **Always pull before you push** (`git pull --rebase origin main`).
3. Resolve conflicts before pushing. When unsure whose change is right, ask the author.
4. Never overwrite another developer's work, including their uncommitted files on a shared machine.
5. **No force push, `reset --hard`, `clean -f` or history rewrite on `main`.**
6. Commit messages: short and descriptive (`Add GHCND Spain 2021-2023 data`).
7. Don't commit secrets. Data files must stay **< 50 MB each** (GitHub rejects > 100 MB). Split or
   compress (`.csv.gz`, Parquet) bigger ones.

## Proposed change (D39, ADR-002 §5): not in force until the team approves

Use a branch + PR with one reviewer for **demo-path evidence files**, since a bad merge there
silently changes a scientific claim:

- `apps/web/public/data/climate-bundle.json`, `scripts/build_climate_bundle.py`
- `apps/web/lib/globe/climate.ts`, `apps/web/components/explore/EvidencePanel.tsx`
- `packages/science/**`, `docs/DECISIONS.md`, `docs/ENERGY_RESEARCH.md`

The reviewer checks that tests pass, that displayed numbers match the bundle, and that no claim goes beyond
the evidence. After the hackathon: protect `main` (PRs required, no force push). Nobody changes GitHub
branch-protection settings without team agreement.

```bash
git switch -c feat/evidence-card          # branch from up-to-date main
# ... work, commit ...
git fetch origin && git rebase origin/main
git push -u origin feat/evidence-card     # open a PR; merge after review
```

## Daily flow (direct to main, as today)

```bash
git pull --rebase origin main      # get latest changes
# ... work ...
git add <specific files>
git commit -m "Describe the change"
git pull --rebase origin main      # again, right before pushing
git push origin main
```

- If you have uncommitted changes when pulling: `git stash`, pull, `git stash pop`.
- If the rebase conflicts: fix the files, `git add <file>`, `git rebase --continue`
  (or `git rebase --abort` to go back).

## Freeze

Demo-path feature freeze **Sun 15 Nov 14:00**. After that, only bug fixes agreed in the team chat.
