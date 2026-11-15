"""Offline checks for the Giovanni dust ingestion boundary and annual aggregation."""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
from ingest_giovanni_dust import FIRST_YEAR, LAST_YEAR, MonthlyAot, annual_series, selected_urls  # noqa: E402


def test_url_manifest_has_every_complete_year_month() -> None:
    manifest = ROOT / "data/nasa_merra2_dust_giovanni/giovanni_duexttau_monthly_urls_2000-2026.txt"
    urls = selected_urls(manifest)
    assert len(urls) == (LAST_YEAR - FIRST_YEAR + 1) * 12
    assert list(urls)[0] == "2000-01"
    assert list(urls)[-1] == "2025-12"


def test_annual_series_requires_twelve_months() -> None:
    months = [MonthlyAot(f"{year}-{month:02d}", 0.1, 30, "hash")
              for year in range(FIRST_YEAR, LAST_YEAR + 1) for month in range(1, 13)]
    annual = annual_series(months)
    assert len(annual) == 26
    assert annual[0] == {"year": 2000, "mean_aot": 0.1, "months_valid": 12}
    try:
        annual_series(months[1:])
    except ValueError as exc:
        assert "valid months" in str(exc)
    else:
        raise AssertionError("Incomplete year was accepted")


def test_published_dust_output_has_provenance_and_complete_series() -> None:
    output = ROOT / "apps/web/public/data/giovanni-dust.json"
    assert output.exists(), "Dust output has not been generated"
    data = json.loads(output.read_text(encoding="utf-8"))
    assert data["schema"] == "giovanni-dust/v1"
    assert data["status"] == "EXPLORATORY"
    assert data["variable"] == "DUEXTTAU" and data["units"] == "1"
    assert data["period"] == [2000, 2025]
    assert data["qa"] == {"months_expected": 312, "months_valid": 312, "years_complete": 26, "missing_months": 0}
    featured = data["featured_cell"]
    assert featured["id"] == "r20c23"
    assert len(featured["annual"]) == 26
    assert all(row["months_valid"] == 12 and row["mean_aot"] >= 0 for row in featured["annual"])


if __name__ == "__main__":
    tests = [value for name, value in dict(globals()).items() if name.startswith("test_")]
    for test in tests:
        test()
        print(f"ok  {test.__name__}")
    print(f"{len(tests)} passed")
