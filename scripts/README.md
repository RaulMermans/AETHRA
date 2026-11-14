# scripts

## `download_nasa_data.py`: NASA data for Spain

Downloads GPM IMERG monthly precipitation, MERRA-2 monthly 2 m air temperature, GLDAS Noah monthly
runoff/ET/soil moisture, and MODIS MOD13Q1 NDVI/EVI for Spain, from 2000 to the latest data
available. Dataset details are in [docs/DATASETS.md](../docs/DATASETS.md).

### Setup (once)

1. Create a free NASA Earthdata Login account: https://urs.earthdata.nasa.gov/
2. Approve the AppEEARS application in your Earthdata profile (*Applications → Authorized Apps*).
   Approve *NASA GESDISC DATA ARCHIVE* there as well.
3. Provide your credentials using **one** of these options. Never commit them.
   - `cp .env.example .env` and fill in `EARTHDATA_USERNAME` and `EARTHDATA_PASSWORD`, or
   - add this line to `~/.netrc`: `machine urs.earthdata.nasa.gov login <user> password <pass>`,
     then run `chmod 600 ~/.netrc`.
4. Install the dependencies:

```bash
uv venv .venv && uv pip install -p .venv -r scripts/requirements.txt
# or: python3 -m venv .venv && .venv/bin/pip install -r scripts/requirements.txt
```

### Run

```bash
# 1. Dry run (default): checks endpoints, granules, missing periods and storage. Downloads nothing.
.venv/bin/python scripts/download_nasa_data.py

# 2. Pilot: one month of GPM and MERRA-2, one MODIS composite. Downloads and validates it.
.venv/bin/python scripts/download_nasa_data.py --execute

# 3. Full history in yearly batches. Safe to stop and rerun: verified batches are skipped.
.venv/bin/python scripts/download_nasa_data.py --execute --historical --datasets gpm,merra2

# MODIS for selected years only (check free disk first; see DATASETS.md > Storage)
.venv/bin/python scripts/download_nasa_data.py --execute --historical --datasets modis --years 2000-2001

# GLDAS runoff / ET / soil moisture / snow, monthly grid over Spain
.venv/bin/python scripts/download_nasa_data.py --execute --historical --datasets gldas
```

## `download_swot_spain.py`: SWOT rivers and lakes in Spain

SWORD river reaches + prior lakes (Theia WFS), clipped to Spain, then Hydrocron L2 water-surface
elevation time series for wide rivers and larger lakes. Does **not** download the 7 GB Europe L4
discharge file.

```bash
.venv/bin/python scripts/download_swot_spain.py
```

Output locations:
- `data/raw/<dataset>/<year|pilot>/`: server-side subsets as delivered by NASA.
- `data/processed/spain/<dataset>/`: clipped NetCDF files with provenance attributes.
- `data/metadata/download_manifest.json`: every request, source granule, file SHA-256, validation
  result and failure.

`data/raw/` and `data/processed/` are gitignored.
