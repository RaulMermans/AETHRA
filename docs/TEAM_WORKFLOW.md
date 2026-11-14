# Team Workflow

Recommended for everyone, so we don't step on each other's work.

## Rules

1. Work on your own feature branch: `feat/<topic>`, `fix/<topic>`, `docs/<topic>`, `data/<topic>`.
2. **Before every commit: fetch and rebase onto the latest remote changes** (steps below).
3. Resolve conflicts before committing. When unsure whose change is right, ask the author.
4. Never overwrite another developer's work.
5. **No force push, `reset --hard`, `clean -f`, branch deletion or history rewrite on shared branches
   without explicit team approval.** If ever approved, use `--force-with-lease`, never `--force`.
6. Descriptive commit messages: imperative, ≤ 72-char subject (`Add MODIS LST provenance record`).
7. Push only to your feature branch.
8. Merge to `main` only through a reviewed Pull Request (at least one teammate approves).
9. Keep branches small and focused (one concern, ideally < 1 day of work).
10. Run the relevant tests/linters before opening a PR and state the result in the PR.

## Start a branch

```bash
git switch main
git pull --ff-only origin main
git switch -c feat/<topic>
```

## Safe sync before every commit

### Case A — working tree is clean

```bash
git fetch origin
git rebase origin/main
```

### Case B — you have uncommitted changes

```bash
git status                         # 1. see what is changed
git stash push -u -m "wip: <topic>" # 2. save changes, including untracked files
git fetch origin                   # 3. get latest remote state
git rebase origin/main             # 4. replay your commits on top of main
git stash pop                      # 5. restore your changes
git status                         # 6. check for conflicts
```

- If step 4 conflicts: fix the files, `git add <file>`, `git rebase --continue`.
  To back out safely: `git rebase --abort` (returns to the pre-rebase state).
- If step 5 conflicts: fix the files and `git add <file>`. The stash is **kept** when `pop`
  conflicts — once resolved, drop it with `git stash drop` after checking `git stash list`.
- Never run `git stash clear`.

Then commit and push:

```bash
git add <specific files>
git commit -m "Describe the change"
git push -u origin feat/<topic>
```

If `git push` is rejected after a rebase of an already-pushed branch that **only you** use:
`git push --force-with-lease` is allowed on your own feature branch. Never on `main`.

## Pull Request checklist

- [ ] Rebased on latest `origin/main`, no conflicts
- [ ] Tests/linters run, result noted
- [ ] UI changes follow `docs/UX_UI_RULES.md`
- [ ] Scientific changes update `docs/DATASETS.md` / `docs/DECISIONS.md` and provenance
- [ ] No secrets, credentials or large raw data files committed
