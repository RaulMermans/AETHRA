"""Checks the official solar PV capacity bundle (contract solar-capacity-trend/v1).

Run: python tests/test_solar_capacity_trend.py   (pytest-compatible)
Requires apps/web/public/data/solar-capacity-trend.json (scripts/build_solar_capacity_trend.py).
"""
from __future__ import annotations

import csv
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = json.loads((ROOT / "apps/web/public/data/solar-capacity-trend.json").read_text(encoding="utf-8"))
CSV = ROOT / "data/eurostat_solar_capacity_spain/eurostat_solar_pv_capacity_spain.csv"


def test_schema() -> None:
    assert DATA["schema"] == "solar-capacity-trend/v1"
    assert DATA["status"] == "OFFICIAL_STATISTICS"
    assert {"schema", "status", "source", "spain", "eu", "plain", "notes"} <= DATA.keys()
    assert {"name", "url", "retrieved_utc", "unit"} <= DATA["source"].keys() and DATA["source"]["unit"] == "MW"
    s = DATA["spain"]
    for key in ("years", "mw", "added_mw", "latest", "trend_full", "trend_recent", "added_mw_trend", "cagr_pct", "doubling_years"):
        assert key in s, key
    for key in ("trend_full", "trend_recent"):
        assert {"period", "sen_mw_per_year", "ci95", "p", "significant"} <= s[key].keys()
        assert s[key]["ci95"][0] <= s[key]["sen_mw_per_year"] <= s[key]["ci95"][1]
    assert {"period", "sen_mw_per_year2", "ci95", "p", "significant"} <= s["added_mw_trend"].keys()
    assert "method" in s["trend_full"]
    for lang in ("en", "es"):
        assert set(DATA["plain"][lang]) == {"headline", "growth", "rank"}
        assert all(isinstance(v, str) and v for v in DATA["plain"][lang].values())
    assert "PV" not in DATA["plain"]["en"]["headline"]
    assert any("not generation" in n for n in DATA["notes"])
    assert any("mechanical" in n for n in DATA["notes"])


def test_years_monotonic_and_added_is_diff() -> None:
    s = DATA["spain"]
    years, mw, added = s["years"], s["mw"], s["added_mw"]
    assert len(years) == len(mw) == len(added)
    assert years == list(range(years[0], years[-1] + 1))
    assert added[0] is None
    for i in range(1, len(mw)):
        assert abs(added[i] - (mw[i] - mw[i - 1])) < 0.11
    assert s["latest"]["year"] == years[-1] and abs(s["latest"]["mw"] - mw[-1]) < 0.11
    y0, y1 = s["cagr_pct"]["period"]
    cagr = (mw[years.index(y1)] / mw[years.index(y0)]) ** (1 / (y1 - y0)) - 1
    assert abs(cagr * 100 - s["cagr_pct"]["value"]) < 0.2


def test_csv_matches_json() -> None:
    with CSV.open(encoding="utf-8") as f:
        rows = list(csv.DictReader(f))
    s = DATA["spain"]
    assert [int(r["year"]) for r in rows] == s["years"]
    assert [float(r["mw"]) for r in rows] == s["mw"]
    assert [None if r["added_mw"] == "" else float(r["added_mw"]) for r in rows] == s["added_mw"]


def test_ranking_consistent() -> None:
    eu = DATA["eu"]
    top = eu["top"]
    assert eu["n_countries"] == 27 == len(top) == len({t["geo"] for t in top})
    assert all(top[i]["mw"] >= top[i + 1]["mw"] for i in range(len(top) - 1))
    geos = [t["geo"] for t in top]
    assert geos.index("ES") + 1 == eu["spain_rank"]
    es = top[geos.index("ES")]["mw"]
    total = sum(t["mw"] for t in top)
    assert abs(100 * es / total - eu["spain_share_pct"]) < 0.1
    if eu["year"] == DATA["spain"]["latest"]["year"]:
        assert abs(es - DATA["spain"]["latest"]["mw"]) < 0.11


if __name__ == "__main__":
    tests = [value for name, value in dict(globals()).items() if name.startswith("test_")]
    for test in tests:
        test()
        print(f"ok  {test.__name__}")
    print(f"{len(tests)} passed")
