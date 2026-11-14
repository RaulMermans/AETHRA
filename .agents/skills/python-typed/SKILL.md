---
name: python-typed
description: >-
  Enforces type hints and clean, testable Python in packages/science, scripts/ and services/api.
  Use whenever you write or edit any .py file: statistics, data fetch/build/export scripts,
  harmonizers, tests. Covers annotated signatures, NumPy array typing, frozen dataclasses for
  results, explicit error handling, pathlib, named constants with units/sources, pure functions,
  and running ruff + the tests before finishing.
---

# Python Typed

The Python pipeline is where every scientific number in this project is produced (AGENTS.md
rule 6), so it gets the strictest standard in the repo.

## Hard rules

1. **Annotate every function signature**: parameters and return type, including `-> None`. Put
   `from __future__ import annotations` at the top of each module. Use built-in generics
   (`list[str]`, `dict[str, float]`, `X | None`), not `typing.List`/`Optional`.
2. **Type NumPy arrays.** Accept `npt.ArrayLike`, convert once, and return precise types:
   ```python
   import numpy as np
   import numpy.typing as npt

   FloatArray = npt.NDArray[np.float64]

   def theil_sen(t: npt.ArrayLike, y: npt.ArrayLike) -> SenResult: ...
   ```
   Don't leave untyped `def _clean(t, y):` helpers. Private helpers get hints too.
3. **Return structured results, not tuples or dicts.** Use `@dataclass(frozen=True)` (or
   `TypedDict` for JSON-shaped output). Carry **provenance** on any result that leaves the
   module: dataset, version/DOI, variable, units, period, spatial support, method.
4. **No bare `except:` and no `except Exception: pass`.** Catch the specific exception, add
   context, and re-raise or exit non-zero. A pipeline that fails silently writes wrong evidence.
5. **No mutable default arguments** (`def f(x: list[str] = [])`). Use `None` and create the
   value inside.
6. **Use `pathlib.Path`, not string paths.** Build paths from a repo-root constant, never from the
   current working directory. Open text files with an explicit `encoding="utf-8"`.
7. **No magic numbers.** Thresholds, baselines and periods become module-level `UPPER_CASE`
   constants with units and source in a comment or name (`BASELINE_YEARS = (1991, 2020)`).
   Changing one of them is a science change: ask first (AGENTS.md rule 1/7).
8. **Keep functions pure where possible.** Statistics functions take arrays and return
   results. No I/O, globals or printing. Keep file reading/writing in thin `main()` / CLI layers.
9. **Scripts:** use an `argparse` CLI, `def main() -> int`, `if __name__ == "__main__":
   raise SystemExit(main())`. Write deterministic output (sorted keys/rows, fixed float
   formatting) so diffs show real changes only.
10. **Label exploratory and synthetic values** as such in code, file names and output fields.

## Handling missing data

Don't silently drop NaNs and carry on. Count them, enforce a minimum-coverage rule, and when
it fails return an explicit "insufficient evidence" state instead of a number computed from
too little data.

## Tests

- Every new or changed statistic in `packages/science` gets a test in `test_*.py`: a known
  answer (hand-computed or from a published reference), edge cases (n < 3, ties, all NaN,
  constant series) and the sign convention.
- Tests must not touch the network. Use small inline fixtures.

## Before you finish

```bash
ruff check <files you touched>            # must be clean; `ruff check --fix` for safe fixes only
ruff format --check <files you touched>   # if the file was already ruff-formatted
.venv/bin/python -m pytest packages/science -q   # pytest is not installed yet:
                                                 # `.venv/bin/pip install pytest` or run the
                                                 # test file directly; say which you did
```
mypy/pyright aren't installed in this repo. Don't claim a type check ran unless you installed
and ran one. Report exactly what ran, what passed, and what you skipped.
