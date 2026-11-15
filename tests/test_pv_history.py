"""Checks that the published GEM chronology stays descriptive and traceable."""
from __future__ import annotations

import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "data/gem_solar_spain/gem_solar_spain_utility_2026-02.csv"
OUTPUT = ROOT / "apps/web/public/data/pv-history.json"


def test_published_counts_and_coverage() -> None:
    data = json.loads(OUTPUT.read_text(encoding="utf-8"))
    assert data["schema"] == "pv-history/v1"
    assert data["status"] == "EXPLORATORY"
    assert data["source"]["sha256"] == hashlib.sha256(SOURCE.read_bytes()).hexdigest()
    summary = data["summary"]
    assert summary["operating_pv_phases"] == summary["explicit_pv_phases"] + summary["assumed_pv_phases"]
    assert summary["operating_pv_phases"] == summary["known_start_year_phases"] + summary["unknown_start_year_phases"]
    assert sum(row["total_phases"] for row in data["annual"]) + summary["pre_2000_phases"] == summary["known_start_year_phases"]
    assert len(data["annual"]) == 26
    assert data["annual"][0]["year"] == 2000 and data["annual"][-1]["year"] == 2025


def test_2017_cataloguing_spike_is_not_promoted_to_trend() -> None:
    data = json.loads(OUTPUT.read_text(encoding="utf-8"))
    year = next(row for row in data["annual"] if row["year"] == 2017)
    assert year["total_phases"] == year["assumed_pv_phases"] == 792
    assert year["explicit_pv_phases"] == 0
    assert "trend" not in data and "p_value" not in data and "capacity_mw" not in data
    assert any("2017" in limit for limit in data["limitations"])


def test_featured_case_uses_same_native_cell() -> None:
    data = json.loads(OUTPUT.read_text(encoding="utf-8"))
    screening = json.loads((ROOT / "apps/web/public/data/pv-screening.json").read_text(encoding="utf-8"))
    cell = next(cell for cell in screening["cells"] if cell["id"] == data["featured_cell"]["id"])
    featured = data["featured_cell"]
    assert featured["bounds"] == cell["bounds"]
    assert featured["summary"]["operating_pv_phases"] == cell["plants_operating_n"]
    assert sum(row["total_phases"] for row in featured["annual"]) == featured["summary"]["known_start_year_phases"]
    assessment = featured["trend_assessment"]
    assert assessment["outcome"] == "insufficient_evidence"
    assert assessment["n_phases"] == featured["summary"]["operating_pv_phases"] == 14
    assert assessment["slope_per_year"] is None
    assert assessment["ci95"] is None
    assert assessment["p_value"] is None
    assert assessment["reasons"]


if __name__ == "__main__":
    tests = [value for name, value in dict(globals()).items() if name.startswith("test_")]
    for test in tests:
        test()
        print(f"ok  {test.__name__}")
    print(f"{len(tests)} passed")
