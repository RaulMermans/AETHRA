#!/usr/bin/env python3
"""Export a descriptive chronology of PV phases from the GEM Spain snapshot.

The tracker is not a complete annual commissioning census. Reported start years are
shown as metadata, without fitting a trend or mixing MWac and MWp/dc capacity.
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import json
from collections import Counter
from pathlib import Path
from typing import TypedDict

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "data/gem_solar_spain/gem_solar_spain_utility_2026-02.csv"
SCREENING = ROOT / "apps/web/public/data/pv-screening.json"
OUTPUT = ROOT / "apps/web/public/data/pv-history.json"
FIRST_CHART_YEAR = 2000
LAST_CHART_YEAR = 2025
TECHNOLOGIES = ("PV", "Assumed PV")


class AnnualRecord(TypedDict):
    year: int
    explicit_pv_phases: int
    assumed_pv_phases: int
    total_phases: int
    cumulative_reported_phases: int


def parse_start_year(raw: str) -> int | None:
    """Read GEM's CSV numeric year; reject a fractional year or out-of-range date."""
    if not raw.strip():
        return None
    number = float(raw)
    if not number.is_integer() or not 1900 <= number <= LAST_CHART_YEAR:
        raise ValueError(f"Invalid GEM start_year {raw!r}")
    return int(number)


def annual_records(rows: list[dict[str, str]]) -> list[AnnualRecord]:
    counts: Counter[tuple[int, str]] = Counter()
    for row in rows:
        year = parse_start_year(row["start_year"])
        if year is not None:
            counts[(year, row["technology_type"])] += 1
    annual: list[AnnualRecord] = []
    cumulative = 0
    for year in range(FIRST_CHART_YEAR, LAST_CHART_YEAR + 1):
        explicit = counts[(year, "PV")]
        assumed = counts[(year, "Assumed PV")]
        cumulative += explicit + assumed
        annual.append({
            "year": year,
            "explicit_pv_phases": explicit,
            "assumed_pv_phases": assumed,
            "total_phases": explicit + assumed,
            "cumulative_reported_phases": cumulative,
        })
    return annual


def summary(rows: list[dict[str, str]]) -> dict[str, int]:
    years = [parse_start_year(row["start_year"]) for row in rows]
    return {
        "operating_pv_phases": len(rows),
        "explicit_pv_phases": sum(row["technology_type"] == "PV" for row in rows),
        "assumed_pv_phases": sum(row["technology_type"] == "Assumed PV" for row in rows),
        "known_start_year_phases": sum(year is not None for year in years),
        "unknown_start_year_phases": sum(year is None for year in years),
        "pre_2000_phases": sum(year is not None and year < FIRST_CHART_YEAR for year in years),
    }


def inside_bounds(row: dict[str, str], bounds: list[float]) -> bool:
    west, south, east, north = bounds
    latitude, longitude = float(row["latitude"]), float(row["longitude"])
    return west <= longitude < east and south <= latitude < north


def build() -> dict[str, object]:
    with SOURCE.open(newline="", encoding="utf-8") as source_file:
        rows = list(csv.DictReader(source_file))
    phase_ids = [row["gem_phase_id"] for row in rows]
    if len(phase_ids) != len(set(phase_ids)):
        raise ValueError("GEM snapshot contains duplicate gem_phase_id")
    operating = [row for row in rows if row["status"] == "operating" and row["technology_type"] in TECHNOLOGIES]
    screening = json.loads(SCREENING.read_text(encoding="utf-8"))
    featured_id = screening["featured_case"]["cell_id"]
    featured = next(cell for cell in screening["cells"] if cell["id"] == featured_id)
    local = [row for row in operating if inside_bounds(row, featured["bounds"])]
    return {
        "schema": "pv-history/v1",
        "status": "EXPLORATORY",
        "period": [FIRST_CHART_YEAR, LAST_CHART_YEAR],
        "source": {
            "name": "Global Energy Monitor, Global Solar Power Tracker",
            "version": "February 2026 Spain utility-scale snapshot (projects >= 1 MW)",
            "license": "CC BY 4.0",
            "file": "data/gem_solar_spain/gem_solar_spain_utility_2026-02.csv",
            "sha256": hashlib.sha256(SOURCE.read_bytes()).hexdigest(),
        },
        "measure": "Number of operating GEM solar PV project phases by reported start_year; PV and Assumed PV shown separately",
        "units": "registered project phases (count)",
        "method": "Filter operating rows with PV or Assumed PV; count unique GEM phase IDs by reported start_year; no trend test",
        "summary": summary(operating),
        "annual": annual_records(operating),
        "featured_cell": {
            "id": featured_id,
            "bounds": featured["bounds"],
            "summary": summary(local),
            "annual": annual_records(local),
            "trend_assessment": {
                "outcome": "insufficient_evidence",
                "label": "Insufficient evidence",
                "method": "No trend fit: the GEM February 2026 snapshot is not an annual commissioning census",
                "n_phases": len(local),
                "slope_per_year": None,
                "ci95": None,
                "p_value": None,
                "reasons": [
                    "Only 14 currently listed phases, concentrated in six reported start years.",
                    "13 of 14 phases have Assumed PV technology; year-specific registry completeness is unknown.",
                    "A cumulative count of a fixed snapshot increases by construction and is not a statistical trend test.",
                    "The grid cell spans Jaén and Granada and cannot establish parcel suitability.",
                ],
            },
        },
        "limitations": [
            "GEM is a February 2026 inventory, not a complete national annual commissioning census; zeros mean no registered phases with that year.",
            "The 2017 entry spike consists entirely of Assumed PV phases and should not be read as a documented national installation boom.",
            "Start year is missing for some phases; technology is inferred for Assumed PV. Location points may be approximate.",
            "MW capacity values mix MWac, MWp/dc and unknown ratings, so this chronology does not aggregate them or estimate electricity generation.",
            "A project phase in this cell is context for investigation, not evidence the cell or any parcel is suitable for a new plant.",
        ],
    }


def main() -> int:
    argparse.ArgumentParser(description=__doc__).parse_args()
    output = build()
    OUTPUT.write_text(json.dumps(output, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {OUTPUT.relative_to(ROOT)}: {output['summary']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
