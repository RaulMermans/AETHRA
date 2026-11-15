#!/usr/bin/env python3
"""Export GEM solar plant points for the web map (contract solar-plants/v1).

Source: Global Energy Monitor, Global Solar Power Tracker, February 2026 (CC BY 4.0),
data/gem_solar_spain/gem_solar_spain_utility_2026-02.csv. Utility-scale (>= 1 MW) phases with
status operating or construction.

`start_year` is GEM's reported start year of the phase (D85). It lets the map show which
registered phases report a start year up to a given year. It is not a complete commissioning
census: 2017 holds a cataloguing spike of "Assumed PV" rows, some phases have no year, and MW
ratings mix AC/DC bases. Use it to show registered phases, never to fit a growth trend.

Split out of build_pv_screening.py so the plant file can be rebuilt without the MERRA-2 /
rasterio stack; build_pv_screening.py calls `write_plants` from here.
Run: python3 scripts/build_solar_plants.py
"""
from __future__ import annotations

import json
import math
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
GEM_CSV = ROOT / "data/gem_solar_spain/gem_solar_spain_utility_2026-02.csv"
OUT = ROOT / "apps/web/public/data"
GEM_LABEL = "GEM Global Solar Power Tracker, Feb 2026"
MITECO_NO_DATA = 255
EARLIEST_PLAUSIBLE_YEAR = 1900
LATEST_PLAUSIBLE_YEAR = 2030  # construction phases may report a planned year


def r(x: object, nd: int = 2) -> float | None:
    if x is None or (isinstance(x, float) and not math.isfinite(x)):
        return None
    return round(float(x), nd)  # type: ignore[arg-type]


def load_gem() -> pd.DataFrame:
    d = pd.read_csv(GEM_CSV, encoding="utf-8")
    d["tech"] = np.where(d["technology_type"] == "Solar Thermal", "csp", "pv")
    return d


def parse_start_year(raw: object) -> int | None:
    """GEM stores the year as a float ("2020.0"); empty -> None; fractional or implausible -> error."""
    if raw is None or (isinstance(raw, float) and not math.isfinite(raw)):
        return None
    number = float(raw)  # type: ignore[arg-type]
    if not number.is_integer() or not EARLIEST_PLAUSIBLE_YEAR <= number <= LATEST_PLAUSIBLE_YEAR:
        raise ValueError(f"Invalid GEM start_year {raw!r}")
    return int(number)


def write_plants(gem: pd.DataFrame) -> int:
    d = gem[gem["status"].isin(["operating", "construction"])].copy()
    plants = []
    for _, p in d.iterrows():
        name = p["project_name"]
        if isinstance(p["phase_name"], str) and p["phase_name"].strip() not in ("", "--"):
            name = f"{name} (phase {p['phase_name']})"
        mc = p["miteco_pv_sensitivity_class"]
        plants.append({
            "name": name, "mw": r(p["capacity_mw"], 1), "tech": p["tech"], "status": p["status"],
            "lat": r(p["latitude"], 4), "lon": r(p["longitude"], 4), "accuracy": p["location_accuracy"],
            "miteco_class": int(mc) if pd.notna(mc) and int(mc) != MITECO_NO_DATA else None,
            "start_year": parse_start_year(p["start_year"]),
        })
    plants.sort(key=lambda q: -(q["mw"] or 0))
    out = {
        "schema": "solar-plants/v1",
        "source": f"{GEM_LABEL} (CC BY 4.0); utility-scale >= 1 MW; operating + construction",
        "start_year_note": (
            "GEM reported start year of the phase; null when GEM gives none. Registered phases, "
            "not a complete commissioning census (2017 includes a cataloguing spike of Assumed PV rows)."
        ),
        "n": len(plants),
        "plants": plants,
    }
    (OUT / "solar-plants.json").write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    return len(plants)


if __name__ == "__main__":
    print(f"solar-plants.json: {write_plants(load_gem())} plants")
