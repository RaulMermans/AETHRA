#!/usr/bin/env python3
"""Seville countryside PV case study (cell r20c20). Design: docs/PV_SEVILLA_CASE.md §1.

Two separate evidence strands, kept apart on purpose:
1. PV-relevant climate trends 2001-2025 from NASA POWER daily point data at the cell centre:
   GHI, JJA mean T2M, days with T2M_MAX > 35 C, AOD_55. Theil-Sen + Mann-Kendall
   (packages/science/trends.py), BH-FDR across the four pre-registered tests.
2. Descriptive PV development from the GEM February 2026 snapshot (no trend test).

Usage:
  .venv/bin/python scripts/build_pv_case_sevilla.py --fetch   # download POWER once, then build
  .venv/bin/python scripts/build_pv_case_sevilla.py           # rebuild from the cached raw file
"""
from __future__ import annotations

import argparse
import csv
import gzip
import hashlib
import json
import sys
from collections import Counter
from dataclasses import dataclass
from datetime import UTC, date, datetime
from pathlib import Path

import numpy as np
import requests

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "packages/science"))
sys.path.insert(0, str(ROOT / "scripts"))
import trends as T
from build_pv_history import TECHNOLOGIES, annual_records, inside_bounds, summary

CELL_ID = "r20c20"
SCREENING = ROOT / "apps/web/public/data/pv-screening.json"
GEM_CSV = ROOT / "data/gem_solar_spain/gem_solar_spain_utility_2026-02.csv"
RAW = ROOT / "data/raw/power_point/pv_case_sevilla_r20c20_2001-2025.json.gz"
SERIES_CSV = ROOT / "data/results/pv_case_sevilla/annual_series.csv"
OUTPUT = ROOT / "apps/web/public/data/pv-case-sevilla.json"

API = "https://power.larc.nasa.gov/api/temporal/daily/point"
FIRST_YEAR, LAST_YEAR = 2001, 2025
MIN_COMPLETE_YEARS = 20
ALPHA = 0.05
HOT_DAY_THRESHOLD_C = 35.0  # same definition as R3 (D74)
SUMMER_MONTHS = (6, 7, 8)
PIPELINE_STATUSES = ("construction", "pre-construction")


@dataclass(frozen=True)
class Variable:
    id: str
    parameter: str
    label: str
    units: str
    statistic: str


VARIABLES = (
    Variable("ghi", "ALLSKY_SFC_SW_DWN", "All-sky surface solar irradiance (GHI)", "kWh m-2 day-1", "annual mean of daily values"),
    Variable("t_summer", "T2M", "Summer (JJA) 2 m air temperature", "degC", "mean of June-August daily values"),
    Variable("hot_days", "T2M_MAX", "Days with maximum 2 m temperature > 35 degC", "days per year", "count of days with T2M_MAX > 35 degC"),
    Variable("aod", "AOD_55", "Aerosol optical depth at 550 nm", "dimensionless", "annual mean of daily values"),
)


def featured_cell() -> dict:
    screening = json.loads(SCREENING.read_text(encoding="utf-8"))
    cell = next(c for c in screening["cells"] if c["id"] == CELL_ID)
    if cell["verdict"] != "good":
        raise ValueError(f"{CELL_ID} no longer passes the frozen screening rule")
    return cell


def fetch_power(lat: float, lon: float) -> None:
    params = {
        "parameters": ",".join(v.parameter for v in VARIABLES),
        "community": "RE",
        "latitude": lat,
        "longitude": lon,
        "start": f"{FIRST_YEAR}0101",
        "end": f"{LAST_YEAR}1231",
        "format": "JSON",
    }
    response = requests.get(API, params=params, timeout=180)
    response.raise_for_status()
    payload = response.json()
    payload["_retrieval"] = {"url": response.url, "retrieved_utc": datetime.now(UTC).isoformat(timespec="seconds")}
    RAW.parent.mkdir(parents=True, exist_ok=True)
    with gzip.open(RAW, "wt", encoding="utf-8") as handle:
        json.dump(payload, handle)


def load_daily() -> tuple[dict, dict[str, dict[date, float]]]:
    with gzip.open(RAW, "rt", encoding="utf-8") as handle:
        payload = json.load(handle)
    fill = float(payload["header"]["fill_value"])
    daily: dict[str, dict[date, float]] = {}
    for variable in VARIABLES:
        raw = payload["properties"]["parameter"][variable.parameter]
        daily[variable.parameter] = {
            datetime.strptime(key, "%Y%m%d").date(): (np.nan if float(value) == fill else float(value))
            for key, value in raw.items()
        }
    return payload, daily


def annual_value(variable: Variable, values: dict[date, float], year: int) -> float | None:
    """Annual statistic, or None unless every day of the year has a valid value."""
    days = [d for d in values if d.year == year]
    expected = (date(year, 12, 31) - date(year, 1, 1)).days + 1
    series = np.array([values[d] for d in days])
    if len(days) != expected or not np.isfinite(series).all():
        return None
    if variable.id == "t_summer":
        return float(np.mean([values[d] for d in days if d.month in SUMMER_MONTHS]))
    if variable.id == "hot_days":
        return float(np.sum(series > HOT_DAY_THRESHOLD_C))
    return float(np.mean(series))


def outcome(n_complete: int, q: float | None, ci: tuple[float, float] | None, slope: float | None) -> str:
    if n_complete < MIN_COMPLETE_YEARS or q is None or ci is None or slope is None:
        return "insufficient_evidence"
    if q < ALPHA and (ci[0] > 0 or ci[1] < 0):
        return "supported_increase" if slope > 0 else "supported_decrease"
    return "no_robust_trend"


def climate_trends(daily: dict[str, dict[date, float]]) -> list[dict]:
    years = list(range(FIRST_YEAR, LAST_YEAR + 1))
    rows = []
    for variable in VARIABLES:
        annual = [annual_value(variable, daily[variable.parameter], y) for y in years]
        y = np.array([np.nan if v is None else v for v in annual])
        complete = int(np.isfinite(y).sum())
        result = T.trend(np.array(years, float), y) if complete >= MIN_COMPLETE_YEARS else None
        rows.append({"variable": variable, "annual": annual, "complete": complete, "result": result})
    tested = [k for k, row in enumerate(rows) if row["result"] is not None]
    q_values = T.benjamini_hochberg([rows[k]["result"].p for k in tested]) if tested else []
    out = []
    for k, row in enumerate(rows):
        variable: Variable = row["variable"]
        res: T.TrendResult | None = row["result"]
        q = float(q_values[tested.index(k)]) if res is not None else None
        ci = (res.ci_low_per_decade, res.ci_high_per_decade) if res else None
        mean = float(np.nanmean([v for v in row["annual"] if v is not None]))
        entry = {
            "id": variable.id,
            "label": variable.label,
            "power_parameter": variable.parameter,
            "units": variable.units,
            "statistic": variable.statistic,
            "period": [FIRST_YEAR, LAST_YEAR],
            "complete_years": row["complete"],
            "mean": round(mean, 4),
            "slope_per_decade": round(res.slope_per_decade, 4) if res else None,
            "ci95_per_decade": [round(ci[0], 4), round(ci[1], 4)] if ci else None,
            "p": round(res.p, 4) if res else None,
            "q_bh": round(q, 4) if q is not None else None,
            "hamed_rao_applied": res.hamed_rao_applied if res else None,
            "outcome": outcome(row["complete"], q, ci, res.slope_per_decade if res else None),
            "annual": [{"year": y, "value": None if v is None else round(v, 4)} for y, v in zip(range(FIRST_YEAR, LAST_YEAR + 1), row["annual"])],
        }
        if variable.id == "ghi" and res:
            entry["slope_pct_per_decade"] = round(100 * res.slope_per_decade / mean, 3)
            entry["ci95_pct_per_decade"] = [round(100 * ci[0] / mean, 3), round(100 * ci[1] / mean, 3)]
        out.append(entry)
    return out


def development(cell: dict) -> dict:
    with GEM_CSV.open(newline="", encoding="utf-8") as handle:
        rows = [r for r in csv.DictReader(handle) if r["latitude"] and inside_bounds(r, cell["bounds"])]
    pv = [r for r in rows if r["technology_type"] in TECHNOLOGIES]
    operating = [r for r in pv if r["status"] == "operating"]
    pipeline = [r for r in pv if r["status"] in PIPELINE_STATUSES]
    mw_by_rating: Counter[str] = Counter()
    for r in operating:
        mw_by_rating[r["capacity_rating"] or "unknown"] += float(r["capacity_mw"] or 0)
    miteco = Counter(r["miteco_pv_sensitivity_class"] or "unknown" for r in operating)
    return {
        "source": {
            "name": "Global Energy Monitor, Global Solar Power Tracker",
            "version": "February 2026 Spain utility-scale snapshot (projects >= 1 MW)",
            "license": "CC BY 4.0",
            "file": str(GEM_CSV.relative_to(ROOT)),
            "sha256": hashlib.sha256(GEM_CSV.read_bytes()).hexdigest(),
        },
        "units": "registered project phases (count); MW listed per rating basis and never summed across bases",
        "summary": summary(operating),
        "operating_locations": len({r["gem_location_id"] for r in operating}),
        "exact_location_phases": sum(r["location_accuracy"] == "exact" for r in operating),
        "operating_mw_by_rating": {k: round(v, 1) for k, v in sorted(mw_by_rating.items())},
        "operating_miteco_class_phases": dict(sorted(miteco.items())),
        "pipeline": {status: sum(r["status"] == status for r in pipeline) for status in PIPELINE_STATUSES},
        "annual": annual_records(operating),
        "trend_assessment": {
            "outcome": "insufficient_evidence",
            "label": "Insufficient evidence",
            "method": "No trend fit: the GEM February 2026 snapshot is not an annual commissioning census",
            "slope_per_year": None,
            "ci95": None,
            "p_value": None,
        },
    }


def build() -> dict:
    cell = featured_cell()
    payload, daily = load_daily()
    climate = climate_trends(daily)
    SERIES_CSV.parent.mkdir(parents=True, exist_ok=True)
    with SERIES_CSV.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.writer(handle)
        writer.writerow(["year", *(f"{v['id']} [{v['units']}]" for v in climate)])
        for k, year in enumerate(range(FIRST_YEAR, LAST_YEAR + 1)):
            writer.writerow([year, *("" if v["annual"][k]["value"] is None else v["annual"][k]["value"] for v in climate)])
    header = payload["header"]
    return {
        "schema": "pv-case/v1",
        "status": "EXPLORATORY",
        "generated_utc": datetime.now(UTC).isoformat(timespec="seconds"),
        "cell_id": CELL_ID,
        "place": "Seville countryside (Carmona, Alcalá de Guadaíra, Lora del Río)",
        "selection": "Post-hoc editorial case: the green screening cell with the most operating GEM PV phases; not an optimal-site ranking",
        "bounds": cell["bounds"],
        "design": "docs/PV_SEVILLA_CASE.md §1 (pre-registered before the POWER download)",
        "screening": {k: cell[k] for k in ("verdict", "irr_mean_kwh_m2_day", "irr_resource_percentile", "irr_trend_pct_decade", "irr_ci_pct_decade", "irr_p_bh", "t_trend_c_decade", "t_ci_c_decade", "t_p_bh", "t_significant", "miteco_low_moderate_pct")},
        "climate": {
            "source": {
                "name": "NASA POWER daily point API (community RE)",
                "api_version": header.get("api", {}).get("version") if isinstance(header.get("api"), dict) else None,
                "sources": header.get("sources"),
                "url": payload["_retrieval"]["url"],
                "retrieved_utc": payload["_retrieval"]["retrieved_utc"],
                "raw_file": str(RAW.relative_to(ROOT)),
                "raw_sha256": hashlib.sha256(gzip.decompress(RAW.read_bytes())).hexdigest(),
                "point": {"lat": cell["lat"], "lon": cell["lon"]},
                "spatial_support": "POWER solar ~1 deg, meteorology/aerosol 0.5 x 0.625 deg (MERRA-2 lineage); regional context, not a parcel",
            },
            "method": "Theil-Sen slope, Gilbert 95% CI, Mann-Kendall (Hamed-Rao if lag-1 autocorrelation significant); BH-FDR across the 4 variables; supported = q < 0.05 and CI excludes 0",
            "variables": climate,
        },
        "development": development(cell),
        "limitations": [
            "Cell chosen after viewing the screening and GEM data; the four climate tests were fixed before download.",
            "NASA POWER is satellite- and reanalysis-derived, not a station observation; one point represents a ~50-100 km area.",
            "No window-sensitivity test was run; every outcome stays EXPLORATORY.",
            "AOD is atmospheric aerosol, not panel soiling; temperature and heat days are not PV output.",
            "GEM is a 2026 inventory, not a commissioning census: no installation trend is tested and MW bases are not summed.",
            "Climate and development are shown side by side; nothing here shows that climate caused construction.",
        ],
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--fetch", action="store_true", help="download the NASA POWER daily point series first")
    args = parser.parse_args()
    if args.fetch:
        cell = featured_cell()
        fetch_power(cell["lat"], cell["lon"])
    output = build()
    OUTPUT.write_text(json.dumps(output, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    for v in output["climate"]["variables"]:
        print(v["id"], v["mean"], v["slope_per_decade"], v["ci95_per_decade"], v["p"], v["q_bh"], v["outcome"])
    print("development", output["development"]["summary"], output["development"]["pipeline"])
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
