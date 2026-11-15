"""Release guards added in the 15 Nov recovery sprint (D75): D53, D64, judge mode, history-only charts.

Run: .venv/bin/python tests/test_release_guards.py   (pytest-compatible)
Source-level checks; the browser checks are recorded in docs/FINAL_RELEASE_VALIDATION.md.
"""
from __future__ import annotations

import hashlib
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WEB = ROOT / "apps/web"
CLIMATE = json.loads((WEB / "public/data/climate-bundle.json").read_text(encoding="utf-8"))
ADMIN = WEB / "public/data/spain-admin.json"


def src(rel: str) -> str:
    return (WEB / rel).read_text(encoding="utf-8")


def test_province_statistics_use_the_displayed_boundaries():
    """D64: province scopes must be computed on the same spain-admin.json the globe draws."""
    recorded = CLIMATE["provenance"]["boundaries_sha256"]
    assert recorded == hashlib.sha256(ADMIN.read_bytes()).hexdigest(), "climate bundle built on other boundaries"
    admin = json.loads(ADMIN.read_text(encoding="utf-8"))
    assert {f"provincia:{p['id']}" for p in admin["provinces"]} <= set(CLIMATE["scopes"])


def test_infrastructure_points_use_the_displayed_boundaries():
    infra = json.loads((WEB / "public/data/energy-infrastructure.json").read_text(encoding="utf-8"))
    rel = "apps/web/public/data/spain-admin.json"
    assert infra["provenance"]["inputs_sha256"][rel] == hashlib.sha256(ADMIN.read_bytes()).hexdigest()


def test_d53_judge_build_never_promotes_unadjusted_regional_support():
    guard = src("lib/globe/scope-multiplicity.ts")
    assert 'return dimension === "temperature";' in guard
    assert "presentedOutcome(" in src("components/explore/EvidencePanel.tsx")
    m = json.loads((ROOT / "data/results/scope_multiplicity/scope_bh.json").read_text(encoding="utf-8"))["variables"]
    for var in ("precipitation", "drought", "water_rivers"):
        assert m[var]["supported_after_bh"] == 0, var  # what the judge guard protects against
    assert m["temperature"]["supported_after_bh"] == m["temperature"]["n_scopes"]


def test_taro_regional_scope_statistics_stay_labelled():
    # D86 (modifies D53(5)): TARO may quote precomputed regional bundle statistics, but rain and
    # modelled-runoff regional results are multiplicity-unadjusted and must reach the reader labelled.
    ctx = (WEB / "lib/agent/visualization-context.ts").read_text(encoding="utf-8")
    for field in ("precipitation", "water_rivers"):
        entry = re.search(r'\{ field: "' + field + r'"[^\n]*\}', ctx)
        assert entry and 'note: "EXPLORATORY' in entry.group(0), field
    assert "${m.exploratoryNote ? ` [${m.exploratoryNote}]` : \"\"}" in ctx  # the note is printed
    assert "outcome = ${m.outcome})" in ctx


def test_exploratory_relationship_tool_is_closed_in_judge_mode():
    bar = src("components/explore/ToolsBar.tsx")
    assert re.search(r'id: "relationships", icon: "axes", exploratory: true', bar)
    assert 'EXPLORATORY_FEATURES_ENABLED && activeTool === "relationships"' in src("components/explore/ExploreView.tsx")


def test_case_chart_ends_at_last_observed_year_in_judge_mode():
    panel = src("components/explore/EnergyCasePanel.tsx")
    assert "const showHorizon = EXPLORATORY_FEATURES_ENABLED;" in panel
    assert "const xMax = showHorizon ? 2040 : lastObs;" in panel
    assert "{showHorizon && (" in panel  # hatch + "no validated projection" only in research builds
    assert "EXPLORATORY_FEATURES_ENABLED && <Section title={c.horizon}>" in panel
    # the fitted line never extends beyond the observed period
    assert re.search(r"x2=\{fx\(lastObs\)\}\s*y2=\{fy\(lineAt\(lastObs\)\)\}", panel)


def test_history_only_copy_exists_in_both_languages():
    msgs = src("lib/i18n/messages.ts")
    assert msgs.count("chartCaptionHistorical: (label, units, year) =>") == 2
    assert msgs.count("chartAriaHistorical: (label, from, to) =>") == 2
    assert len(re.findall(r"^ {6}mapNote:", msgs, re.MULTILINE)) == 2  # EN + ES values (not the type)
    hist = re.findall(r"chartCaptionHistorical: \(label, units, year\) =>\s*`([^`]*)`", msgs)
    assert all("2040" not in h and "2026" not in h for h in hist)


def test_url_params_cannot_open_exploratory_workspaces():
    view = src("components/explore/ExploreView.tsx")
    assert 'EXPLORATORY_FEATURES_ENABLED ? params.get("lab") : null' in view
    assert 'EXPLORATORY_FEATURES_ENABLED ? (params.get("concept")' in view
    assert 'EXPLORATORY_FEATURES_ENABLED ? rawWorkspaceMode : "climate"' in view
    # unknown scope ids are ignored, not trusted
    assert 'ab.ccaa.some((c) => c.id === idParam)' in view and 'ab.provinces.some((p) => p.id === idParam)' in view
    assert 'if (scopeParam === "age" || validCcaa || validProvince)' in view  # invalid ids never switch scope



def test_competition_cut_d76():
    view = src("components/explore/ExploreView.tsx")
    # D81 supersedes D76(a): TARO button and panel are always rendered, in every build.
    assert 'aria-label="TARO"' in view
    # The panel is mounted unconditionally and toggled by `coreOpen` (no build-flag gate).
    assert "<AethraCorePanel" in view and "open={coreOpen}" in view
    assert not re.search(r"EXPLORATORY_FEATURES_ENABLED\s*&&\s*(coreOpen|secondaryPanel === \"core\")", view)
    assert not re.search(r"EXPLORATORY_FEATURES_ENABLED\s*&&\s*renderTaroButton", view)
    panel = src("components/explore/EvidenceCardPanel.tsx")
    order = [panel.index(k) for k in ("m.cards.sClaim", "m.cards.sVerdict", "m.cards.sSize", "m.cards.sLimits", "m.cards.sMethod", "m.cards.sData")]
    assert order == sorted(order), "evidence receipt sections out of order"
    assert "m.cards.verdictMeaning[card.outcome]" in panel  # keyed on the pipeline outcome, not on values
    # D87: the 2040 "Claim Test boundary" block left the findings panel with the PV pivot (2043334).


def test_external_check_copies_the_noaa_artifact():
    cards = json.loads((WEB / "public/data/evidence-cards.json").read_text(encoding="utf-8"))["cards"]
    noaa = json.loads((ROOT / "data/results/noaa_validation/analysis_bundle.json").read_text(encoding="utf-8"))["summary"]
    ext = next(c for c in cards if c["id"] == "gate-a-temperature-R0")["external_check"]
    assert ext["n_stations"] == noaa["n_stations"] and ext["stations_warming"] == noaa["stations_positive"]
    assert ext["within_0_2_per_decade"] == noaa["abs_slope_diff_le_0_2"]
    assert ext["slope_diff_median_per_decade"] == noaa["slope_diff_median"]
    assert "Not claimed independent" in ext["independence_note"]

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
