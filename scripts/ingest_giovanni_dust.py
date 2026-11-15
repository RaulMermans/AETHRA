#!/usr/bin/env python3
"""Fetch Giovanni MERRA-2 monthly dust AOT and export the Jaén screening-cell series.

The input URL list is a Giovanni export, not data. This script validates every NetCDF,
requires all 12 months per year, and never estimates PV soiling or production.
"""
from __future__ import annotations

import argparse
import calendar
import hashlib
import json
import re
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

import numpy as np
import netCDF4
import requests

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data/nasa_merra2_dust_giovanni"
URLS = DATA_DIR / "giovanni_duexttau_monthly_urls_2000-2026.txt"
RAW_DIR = DATA_DIR / "raw"
OUTPUT = ROOT / "apps/web/public/data/giovanni-dust.json"
MANIFEST = DATA_DIR / "download_manifest.json"
VARIABLE = "M2TMNXAER_5_12_4_DUEXTTAU"
DOI = "10.5067/FH9A0MLJPC7N"
FIRST_YEAR = 2000
LAST_YEAR = 2025
CELL_ID = "r20c23"
LAT_DEG = 37.5
LON_DEG = -3.75
FILE_PATTERN = re.compile(r"\.(\d{4})(\d{2})(?:\d{2}(?:\d{6})?)?\.18W_27N_4E_44N\.nc$")


@dataclass(frozen=True)
class DownloadedMonth:
    month: str
    url: str
    file: Path
    sha256: str
    size_bytes: int


@dataclass(frozen=True)
class MonthlyAot:
    month: str
    mean_aot: float
    days: int
    sha256: str


def selected_urls(path: Path) -> dict[str, str]:
    """Reject duplicates and missing complete-year months before fetching anything."""
    urls: dict[str, str] = {}
    for url in path.read_text(encoding="utf-8").splitlines():
        if not url:
            continue
        match = FILE_PATTERN.search(urlparse(url).path)
        if match is None:
            raise ValueError(f"Unexpected Giovanni URL: {url}")
        year, month = int(match[1]), int(match[2])
        if not 1 <= month <= 12:
            raise ValueError(f"Invalid Giovanni month in {url}")
        if not FIRST_YEAR <= year <= LAST_YEAR:
            continue
        key = f"{year:04d}-{month:02d}"
        if key in urls:
            raise ValueError(f"Duplicate URL for {key}")
        urls[key] = url
    required = {f"{year:04d}-{month:02d}" for year in range(FIRST_YEAR, LAST_YEAR + 1) for month in range(1, 13)}
    missing = required - urls.keys()
    if missing:
        raise ValueError(f"Missing Giovanni URLs: {sorted(missing)}")
    return dict(sorted(urls.items()))


def fetch_month(month: str, url: str) -> DownloadedMonth:
    """Use local Earthdata .netrc through requests; never log or copy credentials."""
    destination = RAW_DIR / f"{month}.nc"
    if not destination.exists():
        temporary = RAW_DIR / f"{month}.partial"
        try:
            with requests.get(url, timeout=60, stream=True) as response:
                response.raise_for_status()
                if "netcdf" not in response.headers.get("Content-Type", "").lower():
                    raise ValueError(f"{month}: expected NetCDF, got {response.headers.get('Content-Type')}")
                with temporary.open("wb") as output:
                    for chunk in response.iter_content(chunk_size=65536):
                        output.write(chunk)
            if temporary.stat().st_size < 1000:
                raise ValueError(f"{month}: suspiciously small NetCDF")
            temporary.replace(destination)
        finally:
            temporary.unlink(missing_ok=True)
    raw = destination.read_bytes()
    return DownloadedMonth(month, url, destination, hashlib.sha256(raw).hexdigest(), len(raw))


def inspect_month(item: DownloadedMonth) -> MonthlyAot:
    year, month = (int(part) for part in item.month.split("-"))
    with netCDF4.Dataset(item.file) as dataset:
        if VARIABLE not in dataset.variables:
            raise ValueError(f"{item.month}: missing {VARIABLE}")
        field = dataset.variables[VARIABLE]
        if (getattr(field, "units", None) != "1"
                or getattr(field, "product_short_name", None) != "M2TMNXAER"
                or getattr(field, "product_version", None) != "5.12.4"
                or getattr(field, "standard_name", None) != VARIABLE.lower()):
            raise ValueError(f"{item.month}: unexpected variable units or identity")
        if field.shape[0] != 1:
            raise ValueError(f"{item.month}: expected exactly one monthly time step")
        actual_month = dataset.getncattr("start_time")[:7]
        if actual_month != item.month:
            raise ValueError(f"{item.month}: file time is {actual_month}")
        latitudes = np.asarray(dataset.variables["lat"][:], dtype=np.float64)
        longitudes = np.asarray(dataset.variables["lon"][:], dtype=np.float64)
        lat_matches = np.flatnonzero(np.isclose(latitudes, LAT_DEG, atol=1e-6))
        lon_matches = np.flatnonzero(np.isclose(longitudes, LON_DEG, atol=1e-6))
        if len(lat_matches) != 1 or len(lon_matches) != 1:
            raise ValueError(f"{item.month}: featured cell is not on the expected native grid")
        value = float(field[0, int(lat_matches[0]), int(lon_matches[0])])
    if not np.isfinite(value) or value < 0:
        raise ValueError(f"{item.month}: invalid dust AOT {value}")
    return MonthlyAot(item.month, value, calendar.monthrange(year, month)[1], item.sha256)


def annual_series(months: list[MonthlyAot]) -> list[dict[str, int | float]]:
    by_year: dict[int, list[MonthlyAot]] = {}
    for item in months:
        by_year.setdefault(int(item.month[:4]), []).append(item)
    annual: list[dict[str, int | float]] = []
    for year in range(FIRST_YEAR, LAST_YEAR + 1):
        year_months = sorted(by_year.get(year, []), key=lambda item: item.month)
        if len(year_months) != 12:
            raise ValueError(f"{year}: {len(year_months)}/12 valid months; annual value withheld")
        total_days = sum(item.days for item in year_months)
        mean = sum(item.mean_aot * item.days for item in year_months) / total_days
        annual.append({"year": year, "mean_aot": round(mean, 6), "months_valid": 12})
    return annual


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--workers", type=int, default=8)
    args = parser.parse_args()
    if not 1 <= args.workers <= 16:
        parser.error("--workers must be between 1 and 16")
    urls = selected_urls(URLS)
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    downloaded: list[DownloadedMonth] = []
    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        futures = {pool.submit(fetch_month, month, url): month for month, url in urls.items()}
        for future in as_completed(futures):
            downloaded.append(future.result())
    downloaded.sort(key=lambda item: item.month)
    months = [inspect_month(item) for item in downloaded]
    annual = annual_series(months)
    overall = sum(item["mean_aot"] for item in annual) / len(annual)
    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    OUTPUT.write_text(json.dumps({
        "schema": "giovanni-dust/v1",
        "status": "EXPLORATORY",
        "generated_utc": now,
        "dataset": "NASA GMAO MERRA-2 M2TMNXAER v5.12.4",
        "doi": DOI,
        "variable": "DUEXTTAU",
        "description": "Dust extinction aerosol optical thickness at 550 nm; reanalysis, not surface concentration or panel soiling",
        "units": "1",
        "native_grid_deg": [0.5, 0.625],
        "giovanni_subset_bounds_deg": [-18.5, 27.5, 4.5, 44.0],
        "period": [FIRST_YEAR, LAST_YEAR],
        "method": "Monthly MERRA-2 cell values, weighted by calendar days within each complete year; overall mean of annual values",
        "qa": {"months_expected": len(urls), "months_valid": len(months), "years_complete": len(annual), "missing_months": 0},
        "featured_cell": {"id": CELL_ID, "lat": LAT_DEG, "lon": LON_DEG, "annual": annual, "mean_aot_2000_2025": round(overall, 6)},
        "limitation": "AOT measures column optical thickness of modelled dust, not deposition on panels or PV energy loss.",
    }, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    MANIFEST.write_text(json.dumps({
        "schema": "giovanni-dust-download/v1", "generated_utc": now, "product": "M2TMNXAER v5.12.4",
        "doi": DOI, "variable": "DUEXTTAU", "files": [
            {"month": item.month, "url": item.url, "sha256": item.sha256, "size_bytes": item.size_bytes}
            for item in downloaded
        ],
    }, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"Validated {len(months)} monthly NetCDFs; {len(annual)} complete years; featured mean AOT {overall:.6f}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
