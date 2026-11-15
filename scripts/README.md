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
     then run `chmod 600 ~/.netrc`. On Windows the file is `%USERPROFILE%\_netrc` (no `chmod`);
     the `.env` option is simpler there.
4. Install the dependencies:

```bash
uv venv .venv && uv pip install -p .venv -r scripts/requirements.txt
# or: python3 -m venv .venv && .venv/bin/pip install -r scripts/requirements.txt
```

**Windows (PowerShell):** the virtual environment's interpreter is `.venv\Scripts\python.exe`
instead of `.venv/bin/python`. Use it in every command below.

```powershell
uv venv .venv; uv pip install -p .venv -r scripts/requirements.txt
# or: py -m venv .venv; .venv\Scripts\pip install -r scripts/requirements.txt
Copy-Item .env.example .env
.venv\Scripts\python.exe scripts/download_nasa_data.py
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

## `build_spain_hydrography.py`: rivers, reservoirs and lakes for the globe

Writes `apps/web/public/data/spain-hydrography.geojson` (Natural Earth river centre-lines +
Wikidata Spanish reservoirs/lakes/lagoons as area-scaled buffers). No Earthdata login.

```bash
.venv/bin/python scripts/build_spain_hydrography.py
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

## `build_admin_boundaries.py`: CCAA (NUTS-2) and provinces (NUTS-3)

Writes `apps/web/public/data/spain-admin.json`. CCAA come from GISCO NUTS 2021 level 2; provinces
from level 3 grouped to INE codes (island units unioned for Illes Balears, Las Palmas and Santa
Cruz de Tenerife). No Earthdata login. Downloads the Europe NUTS-3 file if the Spain extract is
missing.

```bash
python3 scripts/build_admin_boundaries.py
```

Then rebuild `climate-bundle.json` so province-scope weights match the new polygons.

## `build_energy_infrastructure.py`: registered energy installations (D49, not NASA)

Builds `apps/web/public/data/energy-infrastructure.json` for the opt-in **Energy infrastructure** map
tool: wind farms and PV plants in operation in **Castilla y León** from the Junta de Castilla y León
register layer (©Junta de Castilla y León, IGCYL licence), each linked to the MERRA-2 cell that
contains it and to its province's precomputed NASA scope. Metadata only: no generation, capacity
factors, scores or rankings.

```bash
.venv/bin/python scripts/build_energy_infrastructure.py             # uses the committed raw snapshot
.venv/bin/python scripts/build_energy_infrastructure.py --download  # refresh the snapshot (new SHA-256)
.venv/bin/python tests/test_energy_infrastructure.py
```

Re-run after `build_climate_bundle.py` or `build_admin_boundaries.py` change (their hashes are recorded).

## Relationship maps (D74, `docs/RELATIONSHIP_MAPS.md`)

Two-variable maps for the `/explore` "Relationship maps" tool: R1 MERRA-2 vs NOAA agreement (copied
from `data/results/noaa_validation`), R2 warm vs dry years (MERRA-2 × GPM, per cell) and R3 hot days
vs dry spells (NOAA stations). R2 and R3 are EXPLORATORY: detrended Spearman rho, permutation p,
Benjamini–Hochberg. Deterministic (seed 0).

```bash
.venv/bin/python scripts/build_relationship_maps.py   # → apps/web/public/data/relationship-maps.json
.venv/bin/python tests/test_relationship_maps.py
```

Re-run after `build_climate_bundle.py` or `validate_merra2_vs_noaa.py` change (input hashes are recorded).
