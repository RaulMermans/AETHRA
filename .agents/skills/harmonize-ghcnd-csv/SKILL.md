---
name: harmonize-ghcnd-csv
description: >-
  Enforces running data/noaa_ghcnd_spain/harmonize_ghcnd_spain.py whenever a new
  NOAA GHCND CSV file is added, updated, or combined in the repository. Use this
  skill whenever any new climate/station CSV is introduced, prepared, or merged
  to guarantee the unified 17-column Metric schema (°C, mm) and deterministic sorting.
---

# Harmonize NOAA GHCND CSV Skill

Whenever a new NOAA GHCND CSV file is added to the repository, **you MUST process it through** [harmonize_ghcnd_spain.py](../../../data/noaa_ghcnd_spain/harmonize_ghcnd_spain.py) before using, committing, or merging it. Do not write ad-hoc conversion scripts or hand-edit columns.

## Mandatory Workflow

### 1. Inspect the New CSV Before Running
Check the header, sample rows, and date range of the incoming CSV to confirm:
- **Units:** Explicitly verify whether values are `metric` (`°C`, `mm`) or `standard` (`°F`, `inches`). **Never guess units.**
- **Period:** Identify the year span (e.g., `1997_2001`).

### 2. Normalize with `prepare`
Run `prepare` to map columns into the unified 17-column Metric schema (`STATION`, `NAME`, `LATITUDE`, `LONGITUDE`, `ELEVATION_M`, `DATE`, `PERIOD`, `PRCP_MM`, `PRCP_ATTRIBUTES`, `SNWD_MM`, `SNWD_ATTRIBUTES`, `TAVG_C`, `TAVG_ATTRIBUTES`, `TMAX_C`, `TMAX_ATTRIBUTES`, `TMIN_C`, `TMIN_ATTRIBUTES`), fill missing columns with `""`, drop extra columns, deduplicate by `(STATION, DATE)`, and sort deterministically:

```bash
python3 data/noaa_ghcnd_spain/harmonize_ghcnd_spain.py prepare \
  --input <path/to/new_raw.csv> \
  --units <metric|standard> \
  --period <YYYY_YYYY> \
  --output data/noaa_ghcnd_spain/noaa_ghcnd_spain_<YYYY_YYYY>_metric.csv
```

If a secondary CSV is needed to fill missing `(STATION, DATE)` rows, pass `--fill-from <secondary.csv> --fill-units <metric|standard>`.

### 3. Combine Periods with `merge`
When combining multiple harmonized period CSVs into a single dataset (earlier `--inputs` take priority on duplicate `(STATION, DATE)` keys):

```bash
python3 data/noaa_ghcnd_spain/harmonize_ghcnd_spain.py merge \
  --inputs data/noaa_ghcnd_spain/noaa_ghcnd_spain_*_metric.csv \
  --output data/noaa_ghcnd_spain/noaa_ghcnd_spain_all_metric.csv
```

### 4. Verify the Output
After running the script:
1. Check the printed summary (`period`, `rows`, `stations`, `dates`, and any `missing columns filled with ''`).
2. Confirm the output file has the exact 17-column Metric header and non-zero rows before proceeding.
