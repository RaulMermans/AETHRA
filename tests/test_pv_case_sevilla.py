"""Checks that the Seville PV case stays traceable, pre-registered and honestly labelled."""
from __future__ import annotations

import gzip
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "apps/web/public/data/pv-case-sevilla.json"
RAW = ROOT / "data/raw/power_point/pv_case_sevilla_r20c20_2001-2025.json.gz"
GEM = ROOT / "data/gem_solar_spain/gem_solar_spain_utility_2026-02.csv"
SCREENING = ROOT / "apps/web/public/data/pv-screening.json"


def load() -> dict:
    return json.loads(OUTPUT.read_text(encoding="utf-8"))


def test_status_and_provenance() -> None:
    data = load()
    assert data["schema"] == "pv-case/v1" and data["status"] == "EXPLORATORY"
    assert data["climate"]["source"]["raw_sha256"] == hashlib.sha256(gzip.decompress(RAW.read_bytes())).hexdigest()
    assert data["development"]["source"]["sha256"] == hashlib.sha256(GEM.read_bytes()).hexdigest()
    cell = next(c for c in json.loads(SCREENING.read_text(encoding="utf-8"))["cells"] if c["id"] == data["cell_id"])
    assert cell["verdict"] == "good" and data["bounds"] == cell["bounds"]


def test_preregistered_family_and_outcome_rule() -> None:
    variables = load()["climate"]["variables"]
    assert [v["id"] for v in variables] == ["ghi", "t_summer", "hot_days", "aod"]
    for v in variables:
        assert v["period"] == [2001, 2025] and len(v["annual"]) == 25
        if v["complete_years"] < 20:
            assert v["outcome"] == "insufficient_evidence"
            continue
        lo, hi = v["ci95_per_decade"]
        supported = v["q_bh"] < 0.05 and (lo > 0 or hi < 0)
        assert (v["outcome"] in ("supported_increase", "supported_decrease")) == supported
        assert v["q_bh"] >= v["p"]


def test_development_is_descriptive_only() -> None:
    dev = load()["development"]
    assessment = dev["trend_assessment"]
    assert assessment["outcome"] == "insufficient_evidence"
    assert assessment["slope_per_year"] is None and assessment["p_value"] is None
    summary = dev["summary"]
    assert summary["operating_pv_phases"] == summary["explicit_pv_phases"] + summary["assumed_pv_phases"]
    assert sum(row["total_phases"] for row in dev["annual"]) + summary["pre_2000_phases"] == summary["known_start_year_phases"]
    assert sum(dev["operating_miteco_class_phases"].values()) == summary["operating_pv_phases"]
    assert "total" not in dev["operating_mw_by_rating"]  # MW bases are never summed
