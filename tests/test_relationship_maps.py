"""Relationship maps (docs/RELATIONSHIP_MAPS.md, D74) match their pre-registered design.

Run: .venv/bin/python tests/test_relationship_maps.py   (pytest-compatible)
Requires apps/web/public/data/relationship-maps.json from scripts/build_relationship_maps.py.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REL = json.loads((ROOT / "apps/web/public/data/relationship-maps.json").read_text())
VALIDATION = json.loads((ROOT / "data/results/noaa_validation/analysis_bundle.json").read_text())


def _family(rows: list[dict]) -> None:
    for r in rows:
        if r["label"] == "insufficient":
            assert r["rho"] is None and r["q_value_bh"] is None, r
            continue
        assert -1.0 <= r["rho"] <= 1.0 and 0.0 < r["p_value"] <= 1.0, r
        assert r["q_value_bh"] >= r["p_value"] - 1e-9, r  # BH never lowers a p-value
        assert (r["label"] == "robust") == (r["q_value_bh"] < 0.05), r


def test_r1_copies_the_recorded_validation_result():
    r1 = REL["r1_validation"]
    assert r1["summary"] == VALIDATION["summary"]
    src = {p["station"]: p for p in VALIDATION["pairs"]}
    assert len(r1["pairs"]) == len(src)
    for p in r1["pairs"]:
        s = src[p["id"]]
        assert p["pearson_r_annual"] == s["pearson_r_annual"]
        assert p["slope_diff_cell_minus_station"] == s["slope_diff_cell_minus_station"]


def test_r2_follows_the_preregistered_design():
    r2 = REL["r2_temp_precip"]
    assert r2["period"] == "2000–2024" and "EXPLORATORY" in r2["status"]
    _family(r2["cells"])
    for c in r2["cells"]:
        assert (c["label"] == "insufficient") == (c["gpm_coverage"] < 0.5), c
        if c["n"] is not None:
            assert c["n"] == 25, c
    s = r2["summary"]
    tested = [c for c in r2["cells"] if c["rho"] is not None]
    assert s["n_tested"] == len(tested)
    assert s["n_robust"] == sum(c["label"] == "robust" for c in r2["cells"])
    assert s["n_tested_negative"] == sum(c["rho"] < 0 for c in tested)


def test_r3_follows_the_preregistered_design():
    r3 = REL["r3_heat_drought"]
    assert "EXPLORATORY" in r3["status"]
    _family(r3["stations"])
    for st in r3["stations"]:
        if st["paired_years"] < 15:
            assert st["label"] == "insufficient", st
        if st["n"] is not None:
            assert st["n"] == st["paired_years"], st
    s = r3["summary"]
    assert s["n_robust"] == sum(st["label"] == "robust" for st in r3["stations"])


def test_frontend_renders_relationships_without_statistics():
    src = (ROOT / "apps/web/lib/globe/relationships.ts").read_text()
    src += (ROOT / "apps/web/components/explore/RelationshipPanel.tsx").read_text()
    assert not re.search(r"(p_value|q_value\w*|rho)\s*[<>]=?\s*0\.\d", src), "threshold in frontend"
    assert not re.search(r"spearman|pearson\s*\(|detrend\s*\(|benjamini", src, re.IGNORECASE), "statistic in frontend"


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
