# Team Workflow

Hackathon pace: keep it simple. Applies to every developer and every AI agent.

## Rules

1. Committing and pushing directly to `main` is fine. Use a branch + PR only for big or risky
   changes you want reviewed.
2. **Always pull before you push** (`git pull --rebase origin main`), so you don't overwrite others.
3. Resolve conflicts before pushing. When unsure whose change is right, ask the author.
4. Never overwrite another developer's work.
5. **No force push, `reset --hard`, `clean -f` or history rewrite on `main`.**
6. Commit messages: short and descriptive (`Add GHCND Spain 2021-2023 data`).
7. Don't commit secrets. Data files must stay **< 50 MB each** (GitHub rejects > 100 MB);
   split or compress (`.csv.gz`, Parquet) bigger ones.

## Daily flow

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
