# Datasets

**Status legend:** `CANDIDATE` = researched, not tested · `VALIDATED` = downloaded for Spain, units,
QA and coverage checked, recorded in `data/metadata/` · `REJECTED` = reason given.

**No dataset is VALIDATED yet.** The primary variable is OPEN (see `DECISIONS.md`).

## Access tools

| Tool | Use |
|---|---|
| [Earthdata Search](https://search.earthdata.nasa.gov/) | Discover and download granules (Earthdata Login) |
| [AppEEARS](https://appeears.earthdatacloud.nasa.gov/) | Spatial/temporal subsets of MODIS, VIIRS, ECOSTRESS, HLS for a polygon or points |
| [Giovanni](https://giovanni.gsfc.nasa.gov/giovanni/) | Quick exploratory time series / maps (GES DISC data) |
| [GES DISC Hydrology Time Series](https://disc.gsfc.nasa.gov/information/tools?title=Hydrology%20Time%20Series) | Point time series for hydrology models |
| [NASA Science Data Portal](https://science.data.nasa.gov/) · [NASA Open Data](https://data.nasa.gov/) · [NASA APIs](https://api.nasa.gov/) | Catalogs and APIs |

Non-NASA references collected earlier (complementary only): [NOAA CDO](https://www.ncei.noaa.gov/cdo-web/),
[KNMI Climate Explorer](https://climexp.knmi.nl/), [CSA RCM](https://donnees-data.asc-csa.gc.ca/en/dataset/rcm),
[CSA SWOT](https://www.asc-csa.gc.ca/eng/satellites/swot/), [geo.ca](https://geo.ca/).

## Local catalogs in this repo

- [`data/nasa_lpcloud/`](../data/nasa_lpcloud/README.md) — 1,084 LP DAAC (LPCLOUD) collections,
  classified by theme, 714 with coverage over Spain. Each has a `metadata.json` with concept ID,
  temporal scope and pre-filtered Spain search/API links.
- [`data/noaa_ghcnd_spain_daily/`](../data/noaa_ghcnd_spain_daily/) — NOAA GHCN-Daily station data for Spain, 2012-01-01 →
  2026-11-07, one CSV per period (PRCP, SNWD, TAVG, TMAX, TMIN), ~170-177 stations. **Not NASA**: usable
  only as ground-truth/validation. Metric units (°C, mm). Limitations: ~15 years (short for a climate
  trend; older years being added); sparse TAVG/SNWD; check quality flags in `*_ATTRIBUTES`.

## Candidate NASA datasets for Spain

Coverage for LP DAAC rows comes from the local catalog metadata; other rows are from provider
documentation and **must be re-checked in CMR before selection**.

| Variable | Dataset (version) | Spatial / temporal res. | Coverage | Units | Known limitations | Status |
|---|---|---|---|---|---|---|
| Land surface temperature | MOD11A1 v061 (`C1748058432-LPCLOUD`) | 1 km / daily | 2000-02-24 → present | K (scale 0.02) | Clear-sky only; LST ≠ air temperature; view-angle & cloud gaps | CANDIDATE |
| Vegetation (NDVI/EVI) | MOD13Q1 v061 (`C1748066515-LPCLOUD`) | 250 m / 16-day | 2000-02-18 → present | unitless (scale 0.0001) | Composite; use pixel reliability QA; land-cover change confounds trends | CANDIDATE |
| Evapotranspiration | MOD16A2GF v061 (`C2565791021-LPCLOUD`) | 500 m / 8-day | 2000-01-01 → present | kg/m²/8-day (scale 0.1) | Model product; gap-filled annually; urban/water fill values | CANDIDATE |
| Burned area | MCD64A1 v061 (`C2565786756-LPCLOUD`) | 500 m / monthly | 2000-11-01 → present | burn date (day of year) | Misses small fires; event data — trend needs careful aggregation | CANDIDATE |
| Land cover | MCD12Q1 v061 (`C2484079608-LPCLOUD`) | 500 m / yearly | 2001 → present | class | Classification noise year-to-year; context layer, not a trend target | CANDIDATE (context) |
| Vegetation, high-res | HLSS30_VI v2.0 (`C3246894861-LPCLOUD`) | 30 m / ~2–5 day | 2015-11-28 → present | unitless | Short record; heavy volume | CANDIDATE |
| LST, high-res | ECO_L2T_LSTE v002 (`C2076090826-LPCLOUD`) | 70 m / irregular | 2018-07-09 → present | K | Irregular ISS overpass times; not suited to trends | CANDIDATE (unlikely) |
| Precipitation | GPM IMERG Final (GES DISC) | 0.1° / daily, monthly | ~2000 → present (verify) | mm | Satellite-gauge merged; coarse for small regions | CANDIDATE — verify |
| Air temperature, reanalysis | MERRA-2 (GES DISC) | 0.5° × 0.625° / hourly–monthly | 1980 → present (verify) | K | Reanalysis (model), not observation; coarse | CANDIDATE — verify |
| Soil moisture | SMAP L3 (NSIDC) / GLDAS (GES DISC) | 9–36 km / 0.25° | SMAP 2015 →; GLDAS-2.1 2000 → (verify) | m³/m³, kg/m² | Short record (SMAP) or model (GLDAS) | CANDIDATE — verify |

## Selection criteria

A dataset can become VALIDATED only when:

1. It is a NASA resource relevant to the challenge.
2. Record length supports a trend (target ≥ 20 years for climate-style trends).
3. A Spain subset was actually downloaded and inspected (sample first).
4. Units, scale factors, fill values and QA flags are documented.
5. Licence/citation is recorded.
6. A provenance file exists in `data/metadata/`.
