"""Tests for the evidence-based solar PV screening bundle (contract pv-screening/v1).

Run: python tests/test_pv_screening.py   (pytest-compatible)
Requires apps/web/public/data/pv-screening.json (scripts/build_pv_screening.py).
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
sys.path.insert(0, str(ROOT / "packages/science"))

import trends as T  # noqa: E402
from build_pv_screening import YEARS, annual_complete, load_swgdn, verdict  # noqa: E402

PUB = ROOT / "apps/web/public/data"
DATA = json.loads((PUB / "pv-screening.json").read_text(encoding="utf-8"))
CELLS = DATA["cells"]

TOP_KEYS = {"schema", "generated_utc", "status", "period", "temp_coefficient_pct_per_c", "method", "verdict_rule",
            "sources", "grid", "cells", "regions_validation", "landmarks", "summary"}
CELL_KEYS = {"id", "lat", "lon", "bounds", "land_fraction", "irr_mean_kwh_m2_day", "irr_resource_percentile",
             "irr_trend_pct_decade", "irr_ci_pct_decade", "irr_p", "irr_p_bh", "irr_significant", "t_summer_mean_c",
             "t_trend_c_decade", "t_ci_c_decade", "t_p", "t_p_bh", "t_significant", "heat_penalty_pct_decade",
             "net_pv_trend_pct_decade", "miteco_share_pct", "miteco_low_moderate_pct", "plants_operating_n",
             "plants_operating_mw", "verdict", "verdict_reasons"}
REASONS = {"high_resource", "low_resource", "low_sensitivity", "high_sensitivity", "irr_rising_not_proven",
           "irr_rising_significant", "irr_falling_significant", "heat_penalty_small", "heat_penalty_large"}


def expected_verdict(c: dict) -> str:
    """The pre-registered rule, written independently of the build script."""
    pct, lm = c["irr_resource_percentile"], c["miteco_low_moderate_pct"]
    if c["land_fraction"] < 0.2 or pct is None or lm is None or c["irr_trend_pct_decade"] is None:
        return "no_data"
    if pct < 25 or lm < 30:
        return "avoid"
    falling = bool(c["irr_significant"]) and c["irr_trend_pct_decade"] < 0
    if pct >= 50 and lm >= 50 and not falling:
        return "good"
    return "mixed"


def test_schema_keys_present():
    assert TOP_KEYS <= set(DATA)
    assert DATA["schema"] == "pv-screening/v1" and DATA["status"] == "EXPLORATORY"
    assert DATA["period"] == [2000, 2025] and DATA["temp_coefficient_pct_per_c"] == 0.4
    for c in CELLS:
        assert CELL_KEYS <= set(c), c["id"]
        assert c["verdict"] in {"good", "mixed", "avoid", "no_data"}
        assert set(c["verdict_reasons"]) <= REASONS
    for k in ("cells_good", "cells_mixed", "cells_avoid", "operating_mw_total", "operating_mw_in_good_pct", "operating_mw_in_avoid_pct"):
        assert k in DATA["summary"]
    for lm in DATA["landmarks"]:
        assert {"name", "mw", "tech", "lat", "lon", "cell_id", "miteco_class", "source"} <= set(lm)
    assert 8 <= len(DATA["landmarks"]) <= 15
    for rv in DATA["regions_validation"]:
        assert {"region", "power_trend_pct_decade", "power_p", "merra2_trend_pct_decade", "merra2_p"} <= set(rv)


def test_verdict_rule_applied_exactly():
    for c in CELLS:
        assert c["verdict"] == expected_verdict(c), c["id"]
        assert verdict(c)[0] == c["verdict"]
    s = DATA["summary"]
    for v in ("good", "mixed", "avoid"):
        assert s[f"cells_{v}"] == sum(c["verdict"] == v for c in CELLS)


def test_rule_edge_cases():
    base = {"land_fraction": 1.0, "irr_resource_percentile": 50, "miteco_low_moderate_pct": 50,
            "irr_trend_pct_decade": -1.0, "irr_significant": False, "heat_penalty_pct_decade": -0.2}
    assert verdict(base)[0] == "good"  # thresholds are inclusive; non-significant decline is allowed
    assert verdict({**base, "irr_significant": True})[0] == "mixed"
    assert verdict({**base, "irr_resource_percentile": 24})[0] == "avoid"
    assert verdict({**base, "miteco_low_moderate_pct": 29.9})[0] == "avoid"
    assert verdict({**base, "land_fraction": 0.19})[0] == "no_data"
    assert verdict({**base, "heat_penalty_pct_decade": -5})[0] == "good"  # heat never changes the verdict


def test_net_equals_irr_plus_penalty():
    for c in CELLS:
        if c["t_trend_c_decade"] is None:
            assert c["heat_penalty_pct_decade"] is None
            continue
        assert abs(c["heat_penalty_pct_decade"] - (-0.4 * c["t_trend_c_decade"])) <= 0.006
        if c["irr_trend_pct_decade"] is not None:
            assert abs(c["net_pv_trend_pct_decade"] - (c["irr_trend_pct_decade"] + c["heat_penalty_pct_decade"])) <= 0.011


def test_no_cells_outside_spain():
    assert all(c["land_fraction"] > 0 for c in CELLS)
    for c in CELLS:
        w, s, e, n = c["bounds"]
        assert -18.5 <= w < e <= 4.7 and 27.2 <= s < n <= 44.3
        if c["verdict"] != "no_data":
            assert c["land_fraction"] >= 0.2 and c["miteco_share_pct"] is not None
            assert abs(sum(c["miteco_share_pct"].values()) - 100) < 0.6


def test_bh_and_significance_consistent():
    elig = [c for c in CELLS if c["land_fraction"] >= 0.2 and c["irr_p"] is not None]
    for c in elig:
        assert c["irr_p_bh"] >= c["irr_p"] - 1e-4
        assert c["irr_significant"] == (c["irr_p_bh"] < 0.05)
        assert c["irr_ci_pct_decade"][0] <= c["irr_trend_pct_decade"] <= c["irr_ci_pct_decade"][1]


def test_numbers_reproducible_for_sample_cells():
    sw = load_swgdn()
    ann = annual_complete(sw)
    lats, lons = sw.lat.values, sw.lon.values
    t = np.array(YEARS, float)
    by_id = {c["id"]: c for c in CELLS}
    sample = sorted((c for c in CELLS if c["verdict"] != "no_data"), key=lambda c: -c["plants_operating_mw"])[:3]
    for c in sample:
        i, j = map(int, c["id"][1:].split("c"))
        assert abs(lats[i] - c["lat"]) < 1e-3 and abs(lons[j] - c["lon"]) < 1e-3
        a = ann[:, i, j]
        mean = float(np.nanmean(a))
        assert abs(mean * 0.024 - c["irr_mean_kwh_m2_day"]) < 1e-3
        res = T.trend(t, a)
        assert abs(res.slope_per_decade / mean * 100 - by_id[c["id"]]["irr_trend_pct_decade"]) < 0.006
        assert abs(res.p - c["irr_p"]) < 1e-4


def test_side_files():
    plants = json.loads((PUB / "solar-plants.json").read_text(encoding="utf-8"))
    assert plants["schema"] == "solar-plants/v1"
    assert {p["status"] for p in plants["plants"]} <= {"operating", "construction"}
    assert {p["tech"] for p in plants["plants"]} <= {"pv", "csp"}
    op_mw = sum(p["mw"] for p in plants["plants"] if p["status"] == "operating")
    assert abs(op_mw - DATA["summary"]["operating_mw_total"]) < 5
    meta = json.loads((PUB / "miteco-pv-sensitivity.json").read_text(encoding="utf-8"))
    assert [c["value"] for c in meta["classes"]] == [0, 1, 2, 3, 4]
    total = 0
    for im in meta["images"]:
        f = PUB / im["file"]
        assert f.exists()
        total += f.stat().st_size
    assert total < 2_000_000


if __name__ == "__main__":
    tests = [v for k, v in dict(globals()).items() if k.startswith("test_")]
    for t in tests:
        t()
        print(f"ok  {t.__name__}")
    print(f"{len(tests)} passed")
