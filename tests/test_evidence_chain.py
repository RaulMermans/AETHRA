"""Regression tests for the evidence chain (bundle invariants + render-only frontend).

Run: .venv/bin/python tests/test_evidence_chain.py   (pytest-compatible)
Requires the generated files: apps/web/public/data/climate-bundle.json,
data/results/gate_a_temperature/analysis_bundle.json, apps/web/public/data/evidence-cards.json.
"""
from __future__ import annotations

import json
import math
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BUNDLE = json.loads((ROOT / "apps/web/public/data/climate-bundle.json").read_text())


def _all_stats(obj, path=""):
    if isinstance(obj, dict):
        if {"slope_decade", "ci_low_decade", "ci_high_decade", "p_value", "significant"} <= obj.keys():
            yield path, obj
        for k, v in obj.items():
            yield from _all_stats(v, f"{path}.{k}")
    elif isinstance(obj, list):
        for i, v in enumerate(obj):
            yield from _all_stats(v, f"{path}[{i}]")


def test_no_synthetic_layers_or_projection_horizon():
    assert "modis" not in BUNDLE and "wind" not in BUNDLE
    assert "projection_horizon" not in BUNDLE


def test_only_complete_years():
    assert max(map(int, BUNDLE["merra2"]["annual_by_year"])) == 2025
    assert max(map(int, BUNDLE["gpm"]["annual_by_year"])) == 2024  # GPM ends 2025-09
    assert max(BUNDLE["gldas"]["years"]) == 2025
    for st in BUNDLE["noaa"]["stations"]:
        assert all(2001 <= int(y) <= 2025 for y in st["years"])


def test_every_trend_is_internally_consistent():
    n = 0
    for path, s in _all_stats(BUNDLE):
        n += 1
        assert s["ci_low_decade"] <= s["slope_decade"] <= s["ci_high_decade"], path
        excl = s["ci_low_decade"] > 0 or s["ci_high_decade"] < 0
        assert s["significant"] == (s["p_value"] < 0.05 and excl), path
        assert s["n"] >= 15, path
        assert all(math.isfinite(s[k]) for k in ("slope_decade", "ci_low_decade", "ci_high_decade", "p_value")), path
    assert n > 500


def test_headline_matches_independent_gate_a_analysis():
    a = BUNDLE["merra2"]["spain_stats"]
    g = json.loads((ROOT / "data/results/gate_a_temperature/analysis_bundle.json").read_text())["result"]
    assert abs(a["slope_decade"] - g["slope_per_decade"]) < 1e-3
    assert abs(a["ci_low_decade"] - g["ci_low_per_decade"]) < 1e-3
    assert abs(a["ci_high_decade"] - g["ci_high_per_decade"]) < 1e-3


def test_headline_regression_values():
    # Frozen 14 Nov 2026 (MERRA-2 R0, 2000–2025). A change here must be explained in DECISIONS.md.
    a = BUNDLE["merra2"]["spain_stats"]
    assert (a["slope_decade"], a["ci_low_decade"], a["ci_high_decade"], a["n"]) == (0.596, 0.307, 0.868, 26)


def test_every_ui_scope_has_precomputed_series():
    sc = BUNDLE["scopes"]
    assert "age" in sc and sum(k.startswith("ccaa:") for k in sc) == 19 and sum(k.startswith("provincia:") for k in sc) == 52
    for key, v in sc.items():
        assert v.get("temperature", {}).get("stats"), key


def test_cards_copy_bundle_values():
    cards = {c["id"]: c for c in json.loads((ROOT / "apps/web/public/data/evidence-cards.json").read_text())["cards"]}
    t = cards["gate-a-temperature-R0"]["how_much"]
    a = BUNDLE["merra2"]["spain_stats"]
    assert t["slope_per_decade"] == round(a["slope_decade"], 2)


def test_frontend_does_not_compute_statistics():
    forbidden = re.compile(r"senFromSeries|averageStats|averageStationMetric|erfcApprox|Math\.erf|function\s+\w*(mann|kendall|theil|sen|pvalue)\w*\s*\(", re.I)
    for f in ["apps/web/lib/globe/climate.ts", "apps/web/components/explore/EvidencePanel.tsx",
              "apps/web/components/explore/EvidenceCardPanel.tsx"]:
        hits = forbidden.findall((ROOT / f).read_text())
        assert not hits, (f, hits)
    panel = (ROOT / "apps/web/components/explore/EvidencePanel.tsx").read_text()
    assert "2030" not in panel and "decisions" not in panel


if __name__ == "__main__":
    fails = 0
    for name, fn in list(globals().items()):
        if name.startswith("test_") and callable(fn):
            try:
                fn()
                print("PASS", name)
            except AssertionError as e:
                fails += 1
                print("FAIL", name, str(e)[:300])
    sys.exit(1 if fails else 0)
