#!/usr/bin/env python3
"""Review check: how many per-region "Supported" labels in the Trend panel survive a multiple-
comparison adjustment across all regions the UI offers (Peninsula + Balearics, 19 CCAA, 52 provinces).

Does not change any displayed statistic. The Trend panel labels each scope with p < 0.05 and CI
excluding 0 (D46/D47). Here, per variable, Benjamini–Hochberg (q < 0.05) is applied across all
scopes with a precomputed result, keeping the same CI rule. Scopes are spatially nested and
correlated, so BH is a reasonable screen, not an exact family-wise correction.

Reads  apps/web/public/data/climate-bundle.json
Writes data/results/scope_multiplicity/scope_bh.json
"""
from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "packages/science"))
import trends as T  # noqa: E402

BUNDLE = ROOT / "apps/web/public/data/climate-bundle.json"
OUT = ROOT / "data/results/scope_multiplicity/scope_bh.json"
VARIABLES = ["temperature", "precipitation", "drought", "water_rivers"]


def main() -> None:
    b = json.loads(BUNDLE.read_text(encoding="utf-8"))
    out: dict[str, dict] = {}
    for var in VARIABLES:
        items = [(k, v[var]["stats"]) for k, v in sorted(b["scopes"].items()) if v.get(var, {}).get("stats")]
        q = T.benjamini_hochberg([s["p_value"] for _, s in items])
        rows = []
        for (k, s), qq in zip(items, q):
            excl = s["ci_low_decade"] > 0 or s["ci_high_decade"] < 0
            rows.append({"scope": k, "p": s["p_value"], "q_bh": round(float(qq), 4), "supported_unadjusted": bool(s["significant"]), "supported_bh": bool(qq < 0.05 and excl)})
        out[var] = {
            "n_scopes": len(rows),
            "supported_unadjusted": sum(r["supported_unadjusted"] for r in rows),
            "supported_after_bh": sum(r["supported_bh"] for r in rows),
            "lost_after_bh": [r["scope"] for r in rows if r["supported_unadjusted"] and not r["supported_bh"]],
            "scopes": rows,
        }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({
        "status": "Review check (not a new result). UI labels unchanged; pending team decision on adjustment.",
        "rule": "BH q < 0.05 across all scopes with a precomputed result, per variable, plus 95% CI excludes 0",
        "input_sha256": hashlib.sha256(BUNDLE.read_bytes()).hexdigest(),
        "variables": out,
    }, indent=1) + "\n", encoding="utf-8", newline="\n")
    for var, v in out.items():
        print(var, v["n_scopes"], "supported", v["supported_unadjusted"], "after BH", v["supported_after_bh"])


if __name__ == "__main__":
    main()
