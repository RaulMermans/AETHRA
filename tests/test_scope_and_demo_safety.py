"""Guards for EvidenceCard ↔ region consistency and the judge-facing demo path.

Run: .venv/bin/python tests/test_scope_and_demo_safety.py   (pytest-compatible)
Requires the generated files (export_evidence_cards.py, check_energy_gap_independence.py,
validate_merra2_vs_noaa.py, build_climate_bundle.py).
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WEB = ROOT / "apps/web"
CARDS = json.loads((WEB / "public/data/evidence-cards.json").read_text())["cards"]
CLIMATE = json.loads((WEB / "public/data/climate-bundle.json").read_text())
ENERGY = json.loads((ROOT / "data/results/energy_gap/analysis_bundle.json").read_text())
GATE_A = json.loads((ROOT / "data/results/gate_a_temperature/analysis_bundle.json").read_text())
INDEP = json.loads((ROOT / "data/results/energy_gap/independence_check.json").read_text())
NOAA = json.loads((ROOT / "data/results/noaa_validation/analysis_bundle.json").read_text())


def src(rel: str) -> str:
    return (WEB / rel).read_text()


# --- EvidenceCards match their stated geographic support -----------------------------------
def test_every_card_names_a_real_ui_scope_with_matching_name():
    for c in CARDS:
        scope = c["region"]["scope"]
        assert scope in CLIMATE["scopes"], (c["id"], scope)
        assert c["region"]["name"] == CLIMATE["scopes"][scope]["name"], (c["id"], c["region"]["name"])
        assert c["region"]["name"] in c["where"], c["id"]


def test_one_national_headline_card_per_topic():
    for topic in ("temperature", "joint_low"):
        heads = [c for c in CARDS if c["topic"] == topic and c["headline"]]
        assert len(heads) == 1 and heads[0]["region"]["scope"] == "age", topic
    keys = [(c["topic"], c["region"]["scope"]) for c in CARDS]
    assert len(keys) == len(set(keys)), "two cards for the same topic and region"


def test_regional_energy_cards_copy_their_own_region_result():
    for c in (c for c in CARDS if c["topic"] == "joint_low"):
        rid = "R0" if c["region"]["scope"] == "age" else c["region"]["scope"].split(":")[1]
        res = ENERGY["results"][rid]
        e1 = res["E1_joint_low_days_P20"]
        assert res["region"] == c["region"]["name"]
        assert c["outcome"] == res["E1_outcome"]
        assert c["how_much"]["slope_per_decade"] == round(e1["slope_per_decade"], 2)
        assert c["how_much"]["ci95_per_decade"] == [round(e1["ci_low_per_decade"], 2), round(e1["ci_high_per_decade"], 2)]
        assert c["evidence"]["p_adjusted_bh"] == round(res["E1_p_BH"], 3)
        ind = INDEP["regions"][rid]
        assert c["complementarity"]["observed_2001_2025"] == ind["year_shift"]["observed_without_feb29"]
        assert c["complementarity"]["expected_if_independent_mean"] == ind["year_shift"]["surrogate_mean"]


def test_temperature_card_matches_gate_a_and_national_scope():
    t = next(c for c in CARDS if c["topic"] == "temperature")
    assert t["region"]["scope"] == "age"
    g, s = GATE_A["result"], CLIMATE["scopes"]["age"]["temperature"]["stats"]
    assert t["how_much"]["slope_per_decade"] == round(g["slope_per_decade"], 2) == round(s["slope_decade"], 2)
    assert t["how_much"]["ci95_per_decade"] == [round(g["ci_low_per_decade"], 2), round(g["ci_high_per_decade"], 2)]
    assert t["outcome"] == GATE_A["outcome"] == s["outcome"]


def test_no_energy_claim_wording_in_cards():
    banned = re.compile(r"\b(improv|reliab\w* (is|has)|gap is (growing|shrinking)|caus(ed|es) by|due to|will )", re.I)
    for c in CARDS:
        text = " ".join([c["question"], c["what"], c["where"], c["outcome_label"]])
        assert not banned.search(text), (c["id"], banned.search(text).group(0))
        assert "not" in c["do_not_conclude"].lower()


# --- Frontend: scope matching, render-only ------------------------------------------------
def test_card_panel_matches_scope_exactly_and_labels_national_reference():
    p = src("components/explore/EvidenceCardPanel.tsx")
    assert "c.region.scope === key" in p
    assert "not</strong> a result for" in p
    assert "TITLES" not in p, "fixed national card list is back"
    x = src("components/explore/ExploreView.tsx")
    assert "<EvidenceCardPanel scope={resolvedScope}" in x


def test_new_frontend_files_do_not_compute_statistics():
    forbidden = re.compile(r"senFromSeries|averageStats|Math\.erf|function\s+\w*(mann|kendall|theil|pvalue)\w*\s*\(|\.reduce\([^)]*p_value", re.I)
    for rel in ["components/explore/EvidenceCardPanel.tsx", "components/explore/EnergyInfrastructurePanel.tsx", "lib/globe/energy-infrastructure.ts"]:
        assert not forbidden.search(src(rel)), rel


# --- Judge mode -----------------------------------------------------------------------------
def test_judge_mode_is_default_and_gates_every_exploratory_entry_point():
    flag = src("lib/demo-mode.ts")
    assert 'process.env.NEXT_PUBLIC_ENABLE_EXPLORATORY === "1"' in flag
    x = src("components/explore/ExploreView.tsx")
    assert 'EXPLORATORY_FEATURES_ENABLED ? rawWorkspaceMode : "climate"' in x
    assert 'EXPLORATORY_FEATURES_ENABLED ? params.get("lab") : null' in x
    assert "EXPLORATORY_FEATURES_ENABLED ? (params.get(\"concept\")" in x
    assert "{EXPLORATORY_FEATURES_ENABLED && (\n        <div\n          role=\"tablist\"" in x
    assert 'EXPLORATORY_FEATURES_ENABLED && activeTool === "infrastructure"' in x
    assert "allowInfrastructureControls={EXPLORATORY_FEATURES_ENABLED}" in x
    assert "EXPLORATORY_FEATURES_ENABLED &&" in x and "destinationId === \"installation-buniel\"" in x
    spain = src("components/explore/ExploreSpain.tsx")
    assert "destinationAllowedInJudgeMode" in spain
    cases = src("components/explore/EnergyCasePanel.tsx")
    assert "allowInfrastructureControls && study.hasPlantRegister" in cases
    t = src("components/explore/ToolsBar.tsx")
    assert re.search(r'id: "infrastructure",[\s\S]{0,300}exploratory: true', t)
    assert "EXPLORATORY_FEATURES_ENABLED || !t.exploratory" in t
    for env in (WEB / ".env.local", WEB / ".env", ROOT / ".env"):
        if env.exists():
            assert "NEXT_PUBLIC_ENABLE_EXPLORATORY=1" not in env.read_text(), f"{env} enables exploratory mode"


def test_judge_path_has_no_forecast_or_2030_wording():
    for rel in ["components/explore/EvidenceCardPanel.tsx", "components/explore/EvidencePanel.tsx", "components/explore/DimensionDock.tsx"]:
        text = src(rel)
        assert "2030" not in text, rel
        compact = re.sub(r"\s+", " ", text)
        for m in re.finditer(r"forecast", compact, re.I):
            prefix = compact[max(0, m.start() - 8):m.start()].lower()
            assert prefix.endswith("not a "), (rel, compact[m.start() - 40:m.end()])


def test_multiplicity_caveat_matches_recorded_check():
    m = json.loads((ROOT / "data/results/scope_multiplicity/scope_bh.json").read_text())["variables"]
    assert m["temperature"]["supported_after_bh"] == m["temperature"]["supported_unadjusted"]
    assert m["precipitation"]["supported_after_bh"] == 0 and m["drought"]["supported_after_bh"] == 0
    r = m["water_rivers"]
    panel = src("components/explore/EvidencePanel.tsx")
    assert f"only {r['supported_after_bh']} of {r['supported_unadjusted']} modelled-runoff" in panel
    assert 'config.dimension !== "temperature" && st' in panel
    guard = src("lib/globe/scope-multiplicity.ts")
    assert "judgePromotesUnadjustedSupport" in guard
    assert 'return dimension === "temperature"' in guard
    assert "presentedOutcome" in panel
    assert "EXPLORATORY — multiplicity unadjusted" in panel
    assert "supported_increase" in panel


def test_climate_timeline_slots_are_observed_years_then_trend_not_a_year():
    timeline = src("lib/globe/climate-timeline.ts")
    assert "kind: \"trend-summary\"" in timeline
    assert "labelledObservedYear" in timeline
    assert "2030" not in timeline
    assert "LAST_COMPLETE_YEAR" in timeline
    view = src("components/explore/ExploreView.tsx")
    assert "labelledObservedYear(playbackRef.current)" in view
    dock = src("components/explore/DimensionDock.tsx")
    assert "Visual blend between consecutive observed years" in dock
    assert "not a new year, not a forecast" in dock


# --- NASA vs NOAA artifact is internally consistent ---------------------------------------------
def test_noaa_validation_summary_matches_pairs():
    s, pairs = NOAA["summary"], NOAA["pairs"]
    assert s["n_stations"] == len(pairs) > 0
    assert s["sign_agreement"] == sum((p["station_slope"] > 0) == (p["merra2_slope"] > 0) for p in pairs)
    assert all(p["n_years"] >= NOAA["inclusion"]["min_years"] for p in pairs)


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
