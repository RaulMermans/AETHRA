# Datasets

**Status legend (informal):** `CANDIDATE` = looks useful · `IN USE` = being used in the app ·
`DROPPED` = not used (note why if useful).

The primary variable is OPEN (see `DECISIONS.md`). Use any dataset that helps — just note it here.

## Access tools

| Tool | Use |
|---|---|
| [Earthdata Search](https://search.earthdata.nasa.gov/) | Discover and download granules (Earthdata Login) |
| [AppEEARS](https://appeears.earthdatacloud.nasa.gov/) | Spatial/temporal subsets of MODIS, VIIRS, ECOSTRESS, HLS for a polygon or points |
| [Giovanni](https://giovanni.gsfc.nasa.gov/giovanni/) | Quick exploratory time series / maps (GES DISC data) |
| [GES DISC Hydrology Time Series](https://disc.gsfc.nasa.gov/information/tools?title=Hydrology%20Time%20Series) | Point time series for hydrology models |
| [NASA Science Data Portal](https://science.data.nasa.gov/) · [NASA Open Data](https://data.nasa.gov/) · [NASA APIs](https://api.nasa.gov/) | Catalogs and APIs |
| [NASA GIBS](https://nasa-gibs.github.io/gibs-api-docs/) | Ready-made satellite imagery tiles (WMTS) for map/globe layers |

Other sources are welcome too, e.g. [NOAA CDO](https://www.ncei.noaa.gov/cdo-web/),
[KNMI Climate Explorer](https://climexp.knmi.nl/), [CSA RCM](https://donnees-data.asc-csa.gc.ca/en/dataset/rcm),
[CSA SWOT](https://www.asc-csa.gc.ca/eng/satellites/swot/), [geo.ca](https://geo.ca/).
(Event rule: at least one NASA resource must be used — see `PROJECT.md`.)

## Local catalogs in this repo

- [`data/noaa_ghcnd_spain_daily/`](../data/noaa_ghcnd_spain_daily/README.md) — NOAA GHCN-Daily station
  data for Spain, 2001-01-01 → 2026-11-07, one raw NOAA CSV per period (PRCP, SNWD, TAVG, TMAX,
  TMIN), ~170-177 stations, metric (°C, mm). `harmonize_ghcnd_spain.py` (same folder) converts and
  merges exports into one schema. **Not NASA**: ground truth/validation. ~26 years is borderline for a
  climate trend (older years being added); check quality flags in `*_ATTRIBUTES`.

## Candidate NASA datasets for Spain

Coverage for LP DAAC rows comes from the local catalog metadata; other rows come from provider
documentation (worth a quick check in CMR).

| Variable | Dataset (version) | Spatial / temporal res. | Coverage | Units | Notes | Status |
|---|---|---|---|---|---|---|
| Land surface temperature | MOD11A1 v061 (`C1748058432-LPCLOUD`) | 1 km / daily | 2000-02-24 → present | K (scale 0.02) | Clear-sky only; LST ≠ air temperature | CANDIDATE |
| Vegetation (NDVI/EVI) | MOD13Q1 v061 (`C1748066515-LPCLOUD`) | 250 m / 16-day | 2000-02-18 → present | unitless (scale 0.0001) | 16-day composite; pixel reliability QA available | CANDIDATE |
| Evapotranspiration | MOD16A2GF v061 (`C2565791021-LPCLOUD`) | 500 m / 8-day | 2000-01-01 → present | kg/m²/8-day (scale 0.1) | Model product, gap-filled | CANDIDATE |
| Burned area | MCD64A1 v061 (`C2565786756-LPCLOUD`) | 500 m / monthly | 2000-11-01 → present | burn date (day of year) | Event data; aggregate for trends | CANDIDATE |
| Land cover | MCD12Q1 v061 (`C2484079608-LPCLOUD`) | 500 m / yearly | 2001 → present | class | Good context layer | CANDIDATE |
| Vegetation, high-res | HLSS30_VI v2.0 (`C3246894861-LPCLOUD`) | 30 m / ~2–5 day | 2015-11-28 → present | unitless | Short record; large volume | CANDIDATE |
| LST, high-res | ECO_L2T_LSTE v002 (`C2076090826-LPCLOUD`) | 70 m / irregular | 2018-07-09 → present | K | Irregular overpass times | CANDIDATE |
| Precipitation | GPM IMERG Final (GES DISC) | 0.1° / daily, monthly | ~2000 → present | mm | Satellite-gauge merged | CANDIDATE |
| Air temperature, reanalysis | MERRA-2 (GES DISC) | 0.5° × 0.625° / hourly–monthly | 1980 → present | K | Reanalysis (model) | CANDIDATE |
| Soil moisture | SMAP L3 (NSIDC) / GLDAS (GES DISC) | 9–36 km / 0.25° | SMAP 2015 →; GLDAS-2.1 2000 → | m³/m³, kg/m² | SMAP record is short | CANDIDATE |

## Tips for picking a dataset

- A NASA resource relevant to the challenge (event rule).
- Longer records make trends more convincing (20+ years is great, shorter is OK for exploration).
- Noting units, scale factors and source helps the *Validity* judging criterion.
- A small provenance note in `data/metadata/` is handy but optional.
