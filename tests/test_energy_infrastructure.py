"""Tests for the Energy Infrastructure context file (D49).

Run: .venv/bin/python tests/test_energy_infrastructure.py   (pytest-compatible)
Requires apps/web/public/data/energy-infrastructure.json (scripts/build_energy_infrastructure.py).
"""
from __future__ import annotations

import hashlib
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from build_energy_infrastructure import exclusion_reason, merra2_cell  # noqa: E402

DATA = json.loads((ROOT / "apps/web/public/data/energy-infrastructure.json").read_text())
CLIMATE = json.loads((ROOT / "apps/web/public/data/climate-bundle.json").read_text())
LATS, LONS = CLIMATE["merra2"]["lats"], CLIMATE["merra2"]["lons"]

GOOD = {"c_reg_adm": "001/BU/RE/b.2/1", "n_inst_ener": "X", "v_kw_tot": 1000, "n_tip_inst": "Eólica"}


def test_inclusion_rule():
    assert exclusion_reason(GOOD) is None
    assert exclusion_reason({**GOOD, "c_reg_adm": None}) == "no_register_code"
    assert exclusion_reason({**GOOD, "c_reg_adm": "  "}) == "no_register_code"
    assert exclusion_reason({**GOOD, "n_inst_ener": ""}) == "no_name"
    assert exclusion_reason({**GOOD, "v_kw_tot": 0}) == "no_registered_capacity"
    assert exclusion_reason({**GOOD, "v_kw_tot": float("nan")}) == "no_registered_capacity"
    assert exclusion_reason({**GOOD, "n_tip_inst": "Hidráulica"}) == "unknown_technology"


def test_merra2_cell_contains_point_and_rejects_off_grid():
    c = merra2_cell(41.62204, -4.77743, LATS, LONS)
    assert c is not None and (c.lat_center, c.lon_center) == (41.5, -5.0)
    w, s, e, n = c.bounds
    assert w <= -4.77743 <= e and s <= 41.62204 <= n
    assert c.height_km == 55.7 and 50 < c.width_km < 55
    assert merra2_cell(60.0, 10.0, LATS, LONS) is None


def test_every_installation_is_complete_and_linked():
    scopes = CLIMATE["scopes"]
    assert DATA["installations"], "no installations"
    ids = [i["id"] for i in DATA["installations"]]
    assert len(ids) == len(set(ids))
    for i in DATA["installations"]:
        assert i["name"] and i["id"]
        assert i["technology"] in {"wind_onshore", "solar_pv"}
        assert i["capacity_mw"] > 0
        assert i["status"] in {"in_operation", "operation_end_recorded"}
        assert re.fullmatch(r"\d{4}-\d\d-\d\d", i["info_date"])
        assert i["evidence_scope"] == f"provincia:{i['province_id']}"
        assert "temperature" in scopes[i["evidence_scope"]]
        w, s, e, n = i["merra2_cell"]["bounds"]
        assert w <= i["lon"] <= e and s <= i["lat"] <= n


def test_no_derived_performance_or_ranking_fields():
    banned = re.compile(r"generation|mwh|capacity_factor|\bcf\b|score|rank|suitab|efficien|forecast|2030", re.I)
    for i in DATA["installations"]:
        for key in i:
            assert not banned.search(key), key
    for key in DATA:
        assert not banned.search(key) or key == "not_included", key


def test_counts_and_provenance_match_disk():
    c = DATA["counts"]
    assert c["installations"] == len(DATA["installations"])
    assert sum(c["by_technology"].values()) == c["installations"]
    for rel, digest in DATA["provenance"]["inputs_sha256"].items():
        assert hashlib.sha256((ROOT / rel).read_bytes()).hexdigest() == digest, rel
    assert DATA["source"]["attribution"].startswith("©Junta de Castilla y León")


if __name__ == "__main__":
    tests = [v for k, v in dict(globals()).items() if k.startswith("test_")]
    for t in tests:
        t()
        print(f"ok  {t.__name__}")
    print(f"{len(tests)} passed")
