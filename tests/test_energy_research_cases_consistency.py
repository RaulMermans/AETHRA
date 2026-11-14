"""Editorial research-case copy in TypeScript must quote Python outputs, not invent statistics.

Run: .venv/bin/python tests/test_energy_research_cases_consistency.py
Does not change scientific values. Fails if energy-research-cases.ts drifts from the bundles.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CASES_TS = (ROOT / "apps/web/lib/globe/energy-research-cases.ts").read_text()
ENERGY = json.loads((ROOT / "data/results/energy_gap/analysis_bundle.json").read_text())
INDEP = json.loads((ROOT / "data/results/energy_gap/independence_check.json").read_text())
CARDS = json.loads((ROOT / "apps/web/public/data/evidence-cards.json").read_text())["cards"]

CASE_REGIONS = {
    "case-r0-joint-low": "R0",
    "case-es11-joint-low": "ES11",
    "case-es41-joint-low": "ES41",
    "case-es24-joint-low": "ES24",
    "case-es61-joint-low": "ES61",
}


def signed(n: float, digits: int) -> str:
    mag = f"{abs(n):.{digits}f}"
    if n > 0:
        return f"+{mag}"
    if n < 0:
        return f"−{mag}"
    return mag


def primary_block(case_id: str) -> str:
    m = re.search(
        rf'id: "{re.escape(case_id)}"[\s\S]*?primary: \{{([\s\S]*?)\n    \}},',
        CASES_TS,
    )
    assert m, case_id
    return m.group(1)


def complementarity_block(case_id: str) -> str:
    m = re.search(
        rf'id: "{re.escape(case_id)}"[\s\S]*?complementarityPrimary: \{{([\s\S]*?)\n    \}},',
        CASES_TS,
    )
    assert m, case_id
    return m.group(1)


def num(block: str, key: str) -> float:
    m = re.search(rf"{key}: (-?\d+(?:\.\d+)?)", block)
    assert m, (key, block[:120])
    return float(m.group(1))


def test_every_gate_b_region_has_a_case_quoting_its_card():
    assert set(CASE_REGIONS.values()) == set(ENERGY["results"])
    for case_id, rid in CASE_REGIONS.items():
        block = primary_block(case_id)
        assert f'cardId: "energy-gap-{rid}"' in block
        assert 'outcomeLabel: OUT' in CASES_TS or 'outcomeLabel: "Insufficient evidence"' in block or "OUT" in block


def test_quoted_e1_numbers_match_energy_bundle_and_cards():
    for case_id, rid in CASE_REGIONS.items():
        res = ENERGY["results"][rid]
        e1 = res["E1_joint_low_days_P20"]
        block = primary_block(case_id)
        assert num(block, "slopePerDecade") == round(e1["slope_per_decade"], 2)
        assert num(block, "ciLow") == round(e1["ci_low_per_decade"], 2)
        assert num(block, "ciHigh") == round(e1["ci_high_per_decade"], 2)
        assert num(block, "p") == round(e1["p"], 3)
        assert num(block, "pAdjustedBh") == round(res["E1_p_BH"], 3)
        assert num(block, "nYears") == res["n_complete_years"] == 25
        assert num(block, "medianPerYear") == res["median_joint_low_days"]
        assert res["E1_outcome"] == "insufficient_evidence"
        card = next(c for c in CARDS if c["id"] == f"energy-gap-{rid}")
        assert card["outcome"] == "insufficient_evidence"
        assert card["how_much"]["slope_per_decade"] == round(e1["slope_per_decade"], 2)


def test_quoted_complementarity_matches_independence_check():
    for case_id, rid in CASE_REGIONS.items():
        ind = INDEP["regions"][rid]
        block = complementarity_block(case_id)
        assert int(num(block, "observed")) == ind["year_shift"]["observed_without_feb29"]
        assert num(block, "expectedMean") == ind["year_shift"]["surrogate_mean"]
        lo, hi = ind["year_shift"]["surrogate_range_2_5_97_5"]
        rng = re.search(r"expectedRange95: \[([-\d.]+), ([-\d.]+)\]", block)
        assert rng, case_id
        assert float(rng.group(1)) == lo
        assert float(rng.group(2)) == hi
        assert num(block, "ratio") == ind["ratio_observed_to_expected"]["year_shift"]


def test_quoted_e0_context_matches_bundle_rounding():
    for case_id, rid in CASE_REGIONS.items():
        res = ENERGY["results"][rid]
        solar = res["E0_annual_mean_solar"]
        wind = res["E0_annual_mean_wind"]
        m = re.search(
            rf'id: "{re.escape(case_id)}"[\s\S]*?solarContext: "([^"]+)"[\s\S]*?windContext: "([^"]+)"',
            CASES_TS,
        )
        assert m, case_id
        expect_solar = (
            f"{signed(round(solar['slope_per_decade'], 3), 3)} "
            f"(CI {signed(round(solar['ci_low_per_decade'], 3), 3)} to "
            f"{signed(round(solar['ci_high_per_decade'], 3), 3)}; p = {round(solar['p'], 2):.2f}) "
            "kWh m⁻² day⁻¹ per decade"
        )
        expect_wind = (
            f"{signed(round(wind['slope_per_decade'], 3), 3)} "
            f"(CI {signed(round(wind['ci_low_per_decade'], 3), 3)} to "
            f"{signed(round(wind['ci_high_per_decade'], 3), 3)}; p = {round(wind['p'], 2):.2f}) "
            "m s⁻¹ per decade"
        )
        assert m.group(1) == expect_solar, (rid, m.group(1), expect_solar)
        assert m.group(2) == expect_wind, (rid, m.group(2), expect_wind)


def test_cases_do_not_compute_trends():
    assert "Theil" not in CASES_TS or "No slopes or significance are computed here" in CASES_TS
    assert "mannKendall" not in CASES_TS
    assert "p < 0.05" not in CASES_TS


if __name__ == "__main__":
    fails = 0
    for name, fn in list(globals().items()):
        if name.startswith("test_") and callable(fn):
            try:
                fn()
                print("PASS", name)
            except AssertionError as e:
                fails += 1
                print("FAIL", name, str(e)[:400])
    sys.exit(1 if fails else 0)
