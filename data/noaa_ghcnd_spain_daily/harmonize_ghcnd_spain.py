#!/usr/bin/env python3
"""Prepare and merge NOAA GHCND Spain CSV exports into a unified Metric schema.

Input: raw NOAA NCEI GHCND Spain CSV exports (Metric or Standard units), e.g. the
ghcnd_spain_daily_<from>-<to>_metric.csv files in this folder.

Usage examples:
  # Prepare a new NOAA export (handles missing/extra columns and unit conversion):
  python3 data/noaa_ghcnd_spain_daily/harmonize_ghcnd_spain.py prepare \\
    --input path/to/noaa_1997_2001.csv \\
    --units metric \\
    --period 1997_2001 \\
    --output data/noaa_ghcnd_spain_daily/noaa_ghcnd_spain_1997_2001_metric.csv

  # Merge all harmonized period CSVs into one combined file:
  python3 data/noaa_ghcnd_spain_daily/harmonize_ghcnd_spain.py merge \\
    --inputs data/noaa_ghcnd_spain_daily/noaa_ghcnd_spain_*_metric.csv \\
    --output data/noaa_ghcnd_spain_daily/noaa_ghcnd_spain_all_metric.csv
"""

from __future__ import annotations

import argparse
import csv
from pathlib import Path
from typing import Callable, Iterable

HARMONIZED_COLUMNS = [
    "STATION",
    "NAME",
    "LATITUDE",
    "LONGITUDE",
    "ELEVATION_M",
    "DATE",
    "PERIOD",
    "PRCP_MM",
    "PRCP_ATTRIBUTES",
    "SNWD_MM",
    "SNWD_ATTRIBUTES",
    "TAVG_C",
    "TAVG_ATTRIBUTES",
    "TMAX_C",
    "TMAX_ATTRIBUTES",
    "TMIN_C",
    "TMIN_ATTRIBUTES",
]


def clean_str(value: str | None) -> str:
    """Normalize optional CSV field by trimming whitespace."""
    return value.strip() if value else ""


def fahrenheit_to_celsius(value: str | None) -> str:
    """Convert Fahrenheit string to Celsius rounded to 2 decimals."""
    cleaned = clean_str(value)
    if not cleaned:
        return ""
    celsius = (float(cleaned) - 32.0) * 5.0 / 9.0
    return f"{round(celsius, 2) + 0.0:.2f}"


def inches_to_mm(value: str | None) -> str:
    """Convert inches string to millimeters rounded to 2 decimals."""
    cleaned = clean_str(value)
    if not cleaned:
        return ""
    mm = float(cleaned) * 25.4
    return f"{round(mm, 2) + 0.0:.2f}"


def _unit_converters(units: str) -> tuple[Callable[[str | None], str], Callable[[str | None], str]]:
    if units == "metric":
        return clean_str, clean_str
    if units == "standard":
        return inches_to_mm, fahrenheit_to_celsius
    raise ValueError(f"Unsupported units '{units}'. Use 'metric' or 'standard'.")


def _first_present(row: dict[str, str], *keys: str) -> str:
    for key in keys:
        val = clean_str(row.get(key))
        if val != "":
            return val
    return ""


def transform_row(
    row: dict[str, str],
    period_label: str,
    convert_precip_snow: Callable[[str | None], str],
    convert_temp: Callable[[str | None], str],
) -> list[str]:
    """Map an arbitrary NOAA GHCND row into the unified 17-column Metric schema.

    Missing columns default to empty strings; extra columns are ignored.
    """
    resolved_period = period_label or clean_str(row.get("PERIOD"))
    return [
        clean_str(row.get("STATION")),
        clean_str(row.get("NAME")),
        clean_str(row.get("LATITUDE")),
        clean_str(row.get("LONGITUDE")),
        _first_present(row, "ELEVATION_M", "ELEVATION"),
        clean_str(row.get("DATE")),
        resolved_period,
        convert_precip_snow(_first_present(row, "PRCP_MM", "PRCP")),
        clean_str(row.get("PRCP_ATTRIBUTES")),
        convert_precip_snow(_first_present(row, "SNWD_MM", "SNWD")),
        clean_str(row.get("SNWD_ATTRIBUTES")),
        convert_temp(_first_present(row, "TAVG_C", "TAVG")),
        clean_str(row.get("TAVG_ATTRIBUTES")),
        convert_temp(_first_present(row, "TMAX_C", "TMAX")),
        clean_str(row.get("TMAX_ATTRIBUTES")),
        convert_temp(_first_present(row, "TMIN_C", "TMIN")),
        clean_str(row.get("TMIN_ATTRIBUTES")),
    ]


def _write_csv(path: Path, rows: list[list[str]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    # Sort deterministically by (STATION, DATE)
    rows.sort(key=lambda r: (r[0], r[5]))
    with path.open("w", encoding="utf-8", newline="") as f:
        writer = csv.writer(f, lineterminator="\n")
        writer.writerow(HARMONIZED_COLUMNS)
        writer.writerows(rows)


def _infer_period_label(paths: Iterable[Path]) -> str:
    years: list[str] = []
    for path in paths:
        with path.open("r", encoding="utf-8", newline="") as f:
            for row in csv.DictReader(f):
                date = clean_str(row.get("DATE"))
                if len(date) >= 4:
                    years.append(date[:4])
    if not years:
        return "unspecified"
    return f"{min(years)}_{max(years)}"


_REQUIRED_OR_OPTIONAL_ALIASES: dict[str, tuple[str, ...]] = {
    "STATION": ("STATION",),
    "NAME": ("NAME",),
    "LATITUDE": ("LATITUDE",),
    "LONGITUDE": ("LONGITUDE",),
    "ELEVATION_M": ("ELEVATION_M", "ELEVATION"),
    "DATE": ("DATE",),
    "PRCP_MM": ("PRCP_MM", "PRCP"),
    "PRCP_ATTRIBUTES": ("PRCP_ATTRIBUTES",),
    "SNWD_MM": ("SNWD_MM", "SNWD"),
    "SNWD_ATTRIBUTES": ("SNWD_ATTRIBUTES",),
    "TAVG_C": ("TAVG_C", "TAVG"),
    "TAVG_ATTRIBUTES": ("TAVG_ATTRIBUTES",),
    "TMAX_C": ("TMAX_C", "TMAX"),
    "TMAX_ATTRIBUTES": ("TMAX_ATTRIBUTES",),
    "TMIN_C": ("TMIN_C", "TMIN"),
    "TMIN_ATTRIBUTES": ("TMIN_ATTRIBUTES",),
}


def prepare_dataset(
    input_path: Path,
    output_path: Path,
    units: str,
    period: str | None,
    fill_from: Path | None = None,
    fill_units: str = "standard",
) -> None:
    """Harmonize a NOAA GHCND CSV (with optional secondary fill source) into Metric schema."""
    sources: list[tuple[Path, str]] = [(input_path, units)]
    if fill_from is not None:
        sources.append((fill_from, fill_units))

    period_label = period or _infer_period_label([p for p, _ in sources])

    rows: list[list[str]] = []
    seen_keys: set[tuple[str, str]] = set()
    missing_cols_report: dict[str, list[str]] = {}

    for src_path, src_units in sources:
        conv_precip, conv_temp = _unit_converters(src_units)
        with src_path.open("r", encoding="utf-8", newline="") as f:
            reader = csv.DictReader(f)
            fieldnames = set(reader.fieldnames or [])
            absent = sorted(
                out_col
                for out_col, aliases in _REQUIRED_OR_OPTIONAL_ALIASES.items()
                if not any(alias in fieldnames for alias in aliases)
            )
            if absent:
                missing_cols_report[src_path.name] = absent

            for row in reader:
                station = clean_str(row.get("STATION"))
                date = clean_str(row.get("DATE"))
                if not station or not date:
                    continue
                key = (station, date)
                if key in seen_keys:
                    continue
                seen_keys.add(key)
                rows.append(transform_row(row, period_label, conv_precip, conv_temp))

    _write_csv(output_path, rows)

    dates = [r[5] for r in rows]
    stations = {r[0] for r in rows}
    print(f"Prepared {output_path}:")
    print(f"  period:   {period_label}")
    print(f"  rows:     {len(rows):,}")
    print(f"  stations: {len(stations)}")
    if dates:
        print(f"  dates:    {min(dates)} -> {max(dates)}")
    if missing_cols_report:
        print(f"  missing columns filled with '': {missing_cols_report}")


def merge_datasets(input_paths: list[Path], output_path: Path) -> None:
    """Merge multiple harmonized Metric CSVs into a single deduplicated, sorted CSV."""
    rows: list[list[str]] = []
    seen_keys: set[tuple[str, str]] = set()
    duplicates_skipped = 0

    for path in input_paths:
        with path.open("r", encoding="utf-8", newline="") as f:
            reader = csv.DictReader(f)
            for row in reader:
                station = clean_str(row.get("STATION"))
                date = clean_str(row.get("DATE"))
                if not station or not date:
                    continue
                key = (station, date)
                if key in seen_keys:
                    duplicates_skipped += 1
                    continue
                seen_keys.add(key)
                rows.append(transform_row(row, "", clean_str, clean_str))

    _write_csv(output_path, rows)

    dates = [r[5] for r in rows]
    stations = {r[0] for r in rows}
    periods = sorted({r[6] for r in rows if r[6]})
    print(f"Merged {len(input_paths)} files -> {output_path}:")
    print(f"  rows:               {len(rows):,}")
    print(f"  duplicates skipped: {duplicates_skipped:,}")
    print(f"  stations:           {len(stations)}")
    print(f"  periods:            {periods}")
    if dates:
        print(f"  dates:              {min(dates)} -> {max(dates)}")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Harmonize NOAA GHCND Spain CSV files into Metric units and merge periods."
    )
    sub = parser.add_subparsers(dest="command", required=True)

    p_prep = sub.add_parser("prepare", help="Convert/normalize one NOAA CSV into Metric schema.")
    p_prep.add_argument("--input", required=True, type=Path, help="Primary NOAA CSV file.")
    p_prep.add_argument("--output", required=True, type=Path, help="Output harmonized CSV file.")
    p_prep.add_argument(
        "--units",
        required=True,
        choices=("metric", "standard"),
        help="Units of --input ('metric' for °C/mm, 'standard' for °F/in).",
    )
    p_prep.add_argument(
        "--period",
        default=None,
        help="Label stored in PERIOD column (defaults to <min_year>_<max_year>).",
    )
    p_prep.add_argument(
        "--fill-from",
        type=Path,
        default=None,
        help="Optional secondary CSV to fill missing (STATION, DATE) rows.",
    )
    p_prep.add_argument(
        "--fill-units",
        choices=("metric", "standard"),
        default="standard",
        help="Units of --fill-from (default: standard).",
    )

    p_merge = sub.add_parser("merge", help="Merge multiple harmonized CSVs into one file.")
    p_merge.add_argument(
        "--inputs",
        required=True,
        nargs="+",
        type=Path,
        help="Harmonized Metric CSV files to combine (earlier files take priority on duplicates).",
    )
    p_merge.add_argument("--output", required=True, type=Path, help="Combined output CSV file.")
    return parser


def main() -> None:
    args = build_parser().parse_args()
    if args.command == "prepare":
        prepare_dataset(
            input_path=args.input,
            output_path=args.output,
            units=args.units,
            period=args.period,
            fill_from=args.fill_from,
            fill_units=args.fill_units,
        )
    elif args.command == "merge":
        merge_datasets(input_paths=args.inputs, output_path=args.output)


if __name__ == "__main__":
    main()
