# Datasets

## Readiness classification (audit 14 Nov 2026)

Classes: **VERIFIED / READY** (passed Gate 1 + Gate 2, recorded) · **INGESTED, NOT VALIDATED**
(on disk with provenance, no gate passed) · **EXPLORATORY** (results computed, unchecked) ·
**PARTIAL / PILOT** · **SYNTHETIC / PLACEHOLDER** · **CANDIDATE** · **DEFERRED**.
Only a recorded gate check moves an asset up a class (see `AGENTS.md`).

The **readiness table below was written 14 Nov morning.** Several "What's missing" rows for
MERRA-2 / GPM / GLDAS / 2030 UI were addressed later the same day by **D46–D47 and D51**
(complete years only, area weighting, no partial-year scaling, 2030 off the default path).
**Classes are not upgraded here** — Gate 2/3 still need a named human (`SCIENTIFIC_REVIEW.md`).
> **15 Nov 2026 (D75):** `climate-bundle.json` was rebuilt on the D64 NUTS-3 province boundaries (national and CCAA values unchanged). Gate A and Gate B were re-executed with current code and fresh NASA POWER downloads and reproduce exactly. See `docs/FINAL_RELEASE_VALIDATION.md`.

Use the **temporal integrity table** (next section) and `climate-bundle.json` / AnalysisBundles
for analysis windows. Spatial/3D layers: `docs/SPATIAL_EXPERIENCE.md` (D54, not implemented).

## Temporal integrity (verified from files, 14 Nov evening)

Do not conflate: native product span · files on disk · last complete calendar year · years
approved for a named analysis.

| Dataset | Native availability | Local coverage | Last complete year | Analysis window in force | QA status | Caveats |
|---|---|---|---|---|---|---|
| MERRA-2 `T2M` M2TMNXSLV 5.12.4 | 1980 → present | 2000-01 → 2026-09 | **2025** | Gate A **2000–2025** (n = 26). D37 1980 not done | INGESTED; trend EXPLORATORY pending review | Reanalysis ~50 km. Do not annualize 2026. Not energy evidence |
| POWER `ALLSKY_SFC_SW_DWN` | SYN1deg **2001**→; SRB 1984–2000 (break); FLASHFlux NRT | Daily 2001–2025 | **2025** (SYN1DEG) | Gate B **2001–2025** (n = 25) | Gate 1 passed; results EXPLORATORY | No SRB mix, no 2026 FLASHFlux. Irradiance ≠ PV. Native 1° |
| POWER `WS50M` | MERRA-2; GEOS-IT in NRT | Daily 2001–2025 | **2025** | Gate B **2001–2025** | Same | Not hub-height, not generation. 2026 GEOS-IT excluded |
| GPM IMERG Final V07 monthly | ~2000 → metadata **2025-09-30** | 2000-01 → **2025-09** | **2024** | D46 **2000–2024** (n = 25) | INGESTED; EXPLORATORY. D53: 0/72 rain labels survive BH | **2025 is not a complete annual rainfall year** |
| GLDAS Noah 0.25° v2.1 | 2000-01 → present | Grid → **2026-07** | **2025** | D46 **2000–2025** from the **grid** | INGESTED; EXPLORATORY | Modelled runoff ≠ discharge. No 2026 scaling |
| NOAA GHCN-Daily Spain | Station-dependent, files → 2026-11 | ~175 stations | Station-years with **≥ 330** valid days; bundle last year **2025** | D52 pairs 2001–2025; incomplete years dropped | Partner observations | Not homogenized; not NASA |
| MODIS MOD13Q1 v061 | 2000-02 → present | Years **2000, 2012, 2024** + pilot | n/a | **No NDVI trend series** | PARTIAL / PILOT (D29 hidden) | Snapshots ≠ a continuous trend |
| CyL plant register (D49) | Administrative | 652 installations; info dates 2024-06-19 → 2025-11-18 | n/a | Context only | INGESTED, NOT VALIDATED | CyL only; MW ≠ MWh |

| Asset | Type | Class | Shown in `/explore`? | What is missing |
|---|---|---|---|---|
| MERRA-2 M2TMNXSLV 5.12.4 `T2M` monthly, 2000-01 → 2026-09, 0.5° × 0.625° | Reanalysis | INGESTED, NOT VALIDATED · trend EXPLORATORY | Yes (temperature) | **D46 implemented** area weighting, Peninsula+Balearics extent, complete years 2000–2025, no 2026 scaling. **Still missing:** named human Gate 2 / D36 approval (`SCIENTIFIC_REVIEW.md`) |
| GPM IMERG Final V07 monthly, 2000-01 → 2025-09, 0.1° | Satellite–gauge merged estimate | INGESTED, NOT VALIDATED · trend EXPLORATORY | Yes (rain, drought, rain extremes, basin boxes) | Annual trend **2000–2024** (n = 25). D53: rain "Supported" labels do not survive BH — not presentable. Human gate still open |
| GLDAS Noah 0.25° monthly v2.1 (grid + Giovanni Spain-mean CSVs) | Land-surface **model** | INGESTED, NOT VALIDATED · trends EXPLORATORY | Yes (runoff, soil, SWE) | Runoff is modelled, **not** measured river discharge. v2.0/v2.1 mixing check (ET CSVs) |
| NOAA GHCN-Daily Spain, 2001 → 2026-11, ~175 stations | Station observations (partner, not NASA) | INGESTED, NOT VALIDATED | Yes (stations, catalog) | Not homogenized. Station coverage changes over time. Completeness rules per metric. Independent check only |
| MODIS MOD13Q1 v061 NDVI/EVI, years 2000, 2012, 2024 + pilot | Satellite observation | PARTIAL / PILOT | No (removed, D29) | Snapshots only; no continuous series |
| MERRA-2 U50M/V50M monthly (`data/nasa_merra2_wind_spain_monthly`) | Reanalysis | PARTIAL (download links only locally) | No | Monthly **vector** means, so not valid as wind speed or resource |
| SWOT Hydrocron WSE + SWORD/PLD, 2023 → | Satellite observation | EXPLORATORY | No | Record too short for trends |
| Spain hydrography (Natural Earth + Wikidata) | Non-NASA context | DEFERRED | No (D27) | Schematic geometry |
| Bundle `wind` grid and `modis` block in `climate-bundle.json` | Hand-built formula | **SYNTHETIC / PLACEHOLDER** | No (D29/D31; verify before demo) | Never present as NASA data. Remove from the bundle when convenient |
| 2027–2030 values, cones, `anomaly2030`, Decision Matrix | Linear extrapolation + rules | **EXPLORATORY EXTRAPOLATION** (not data) | **No on default / judge path** (D47, D51). Energy Tech Lab still has 2030 if `NEXT_PUBLIC_ENABLE_EXPLORATORY=1` | Keep off demo path (D38) |
| NASA POWER `ALLSKY_SFC_SW_DWN`, `WS50M` daily, 2001–2025 (`data/raw/power`, manifest `data/metadata/power_manifest.json`) | Satellite-derived flux / reanalysis | **Gate 1 PASSED** (14 Nov); results EXPLORATORY pending 2nd review | Yes (Evidence cards tool) | Second-person review (Gate 3). 2026 data excluded (FLASHFlux/GEOS-IT) |
| Castilla y León renewable installations (`energia_cyl_renov_instal_polig`, Junta de Castilla y León / IDECyL; data date per record, 2024-06-19 → 2025-11-18; raw `data/raw/energy_infrastructure/jcyl/`, manifest in `energy-infrastructure.json`) | Official administrative register + digitised perimeters (non-NASA context, not a measurement) | **INGESTED, NOT VALIDATED** (D49) | Opt-in only (Energy infrastructure tool) | Castilla y León only. PV < 500 kW perimeters digitised from orthophoto; many PV polygons lack register code/capacity and are excluded. Registered capacity can differ from the sum of digitised turbines. No generation data. Licence IGCYL (attribution «©Junta de Castilla y León», free at www.jcyl.es) |

## NASA POWER (candidate for Gate B)

Read from <https://power.larc.nasa.gov/docs/> on 14 Nov 2026. ⚠️ = not yet confirmed.

| | `ALLSKY_SFC_SW_DWN` (solar) | `WS50M` / `WS10M` (wind) |
|---|---|---|
| Lineage | GEWEX SRB R4-IP 1984–2000 → CERES SYN1deg Ed4.2 2001-01-01 → NRT−~3–4 mo → CERES FLASHFlux NRT (not climate quality; release guide also mentions a NOAA-20 FLASHFlux version ⚠️) | MERRA-2 → ~1 month behind NRT; GEOS-IT appended for NRT, overwritten later |
| Native resolution | 1° × 1° | 0.5° × 0.625° |
| Temporal | Daily from 1981 (service), solar from 1984; hourly from 2001 | Same |
| Time standard | LST (default) or UTC; LST derived from UTC by 15° longitude swaths | Same |
| Units | kWh m⁻² day⁻¹ ⚠️ dictionary not read | m s⁻¹, height above grid-mean elevation |
| Access | API, point (≤ 20 params daily) or regional (1 param/request, 0.5° output grid; area limit ⚠️). Data v10 (latest seen v10.2.3, 29 Dec 2025 ⚠️) | Same |
| Trend caveats | Step at 2001-01-01 ("not a physical climate signal"). Don't trend across source changes. FLASHFlux not for trends | End trend analysis ≥ 2 months behind NRT. Regional mean flow, not local site |

Resolved 14 Nov from API responses: units `kW-hr/m^2/day` and `m/s`; per-request `sources` show 2001–2025 = SYN1DEG only (solar) and MERRA2 (wind), 2000 includes SRB, 2026 adds FLASHFLUX + GEOSIT; regional limit is 10° of longitude; solar is served on its native 1° grid (90 + 45 points for the two tiles), wind on 0.5° × 0.625° (288 + 126 points); API v2.10.3. Fetch: `scripts/fetch_power_spain.py`.

**Readiness summary (14 Nov, D48).** READY for daily regional use 2001–2025 (Gate 1 passed; results still need a second-person review). Daily = 100 % complete, 0 fill values, sources SYN1DEG (solar) and MERRA2 (wind) only. Hourly API is **point-only** (regional request → 404), solar hourly in Wh m⁻² with night zeros, UTC or LST. 2026 data mix in FLASHFLUX + GEOSIT and are excluded. `WS50M` is wind speed 50 m above the grid-mean elevation from a reanalysis: regional mean flow, not hub-height site wind and not turbine output. `ALLSKY_SFC_SW_DWN` is horizontal-plane irradiance, not PV output.

## Notes from before the audit

**Old status legend (informal):** `CANDIDATE` = looks useful · `IN USE` = being used in the app ·
`DROPPED` = not used. "IN USE" ≠ validated; the readiness table above takes precedence.

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
- [`data/nasa_gldas_spain_monthly/`](../data/nasa_gldas_spain_monthly/README.md) — NASA GLDAS Noah
  0.25° monthly v2.1 via Giovanni (area-averaged over the Spain bbox), 2000-01 → 2026-07:
  evapotranspiration, surface + groundwater runoff, snow water equivalent, soil moisture 0-10 cm.
  Tidy mm/month table: `gldas_spain_monthly_water_balance_mm_2000-2026.csv`.

- [`data/processed/spain/modis/`](../data/processed/spain/README.md) — NASA MOD13Q1 v061 NDVI
  for Spain, two AppEEARS regions (peninsula + Balears + Ceuta/Melilla, and Canarias). On disk:
  the 2000-02-18 **pilot**, plus full 16-day years **2000, 2012, 2024** (68 composites per region).
  Raw bundles: `data/raw/modis/`. The rest of 2001–2026 is not downloaded (~185–500 GB). Inventory:
  [`data/README.md`](../data/README.md).

- [`data/processed/spain/gldas/`](../data/processed/spain/README.md) — NASA GLDAS Noah 0.25° monthly
  **grid** for Spain (not the Giovanni Spain-average CSV): surface + groundwater runoff, ET, soil
  moisture 0–10 cm, SWE. Display variables in mm. 2000-01 → latest published. Harmony subset via
  `scripts/download_nasa_data.py --datasets gldas`.

- [`apps/web/public/data/spain-hydrography.geojson`](../apps/web/public/data/spain-hydrography.geojson) —
  globe water map (rivers, reservoirs, lakes, lagoons). Rivers: Natural Earth 10m + Europe
  centre-lines clipped to Spain. Reservoirs/lakes/lagoons: Wikidata items in Spain with coordinates,
  drawn as area-scaled buffers (schematic). Built by `scripts/build_spain_hydrography.py`.

- [`data/processed/spain/swot/`](../data/processed/spain/README.md) — SWOT SWORD river reaches and
  prior lakes clipped to Spain, plus Hydrocron L2 water-surface elevation series for wide rivers
  and larger lakes (2023→). Not in-situ discharge; the Europe L4 SOS file is ~7 GB and was not
  downloaded. `scripts/download_swot_spain.py`.

## Candidate NASA datasets for Spain

Coverage for LP DAAC rows comes from the local catalog metadata; other rows come from provider
documentation (worth a quick check in CMR).

| Variable | Dataset (version) | Spatial / temporal res. | Coverage | Units | Notes | Status |
|---|---|---|---|---|---|---|
| Land surface temperature | MOD11A1 v061 (`C1748058432-LPCLOUD`) | 1 km / daily | 2000-02-24 → present | K (scale 0.02) | Clear-sky only; LST ≠ air temperature | CANDIDATE |
| Vegetation (NDVI/EVI) | MOD13Q1 v061 (`C1748066515-LPCLOUD`) | 250 m / 16-day | 2000-02-18 → present | unitless (scale 0.0001) | Local years **2000, 2012, 2024** (plus Feb 2000 pilot); pixel reliability QA available | IN USE (three years on disk) |
| Evapotranspiration | MOD16A2GF v061 (`C2565791021-LPCLOUD`) | 500 m / 8-day | 2000-01-01 → present | kg/m²/8-day (scale 0.1) | Model product, gap-filled | CANDIDATE |
| Burned area | MCD64A1 v061 (`C2565786756-LPCLOUD`) | 500 m / monthly | 2000-11-01 → present | burn date (day of year) | Event data; aggregate for trends | CANDIDATE |
| Land cover | MCD12Q1 v061 (`C2484079608-LPCLOUD`) | 500 m / yearly | 2001 → present | class | Good context layer | CANDIDATE |
| Vegetation, high-res | HLSS30_VI v2.0 (`C3246894861-LPCLOUD`) | 30 m / ~2–5 day | 2015-11-28 → present | unitless | Short record; large volume | CANDIDATE |
| LST, high-res | ECO_L2T_LSTE v002 (`C2076090826-LPCLOUD`) | 70 m / irregular | 2018-07-09 → present | K | Irregular overpass times | CANDIDATE |
| Precipitation | GPM IMERG Final (GES DISC) | 0.1° / daily, monthly | ~2000 → present | mm | Satellite-gauge merged | CANDIDATE |
| Air temperature, reanalysis | MERRA-2 (GES DISC) | 0.5° × 0.625° / hourly–monthly | 1980 → present | K | Reanalysis (model) | CANDIDATE |
| Soil moisture | SMAP L3 (NSIDC) / GLDAS (GES DISC) | 9–36 km / 0.25° | SMAP 2015 →; GLDAS-2.1 2000 → | m³/m³, kg/m² | SMAP record is short | CANDIDATE |
| Runoff (to rivers) | GLDAS_NOAH025_M v2.1 (`C1342986036-GES_DISC`) | 0.25° / monthly | 2000-01 → present | mm/month (derived) | Model, not gauges; Spain **grid** via Harmony | IN USE |
| River / lake water surface | SWOT L2 HR via Hydrocron + SWORD/PLD | reaches / lakes | 2023-03 → present | m (WSE), m (width) | Short record; not in-situ discharge. Spain subset in `processed/spain/swot/` | IN USE |

## Tips for picking a dataset

- A NASA resource relevant to the challenge (event rule).
- Longer records make trends more convincing (20+ years is great, shorter is OK for exploration).
- Noting units, scale factors and source helps the *Validity* judging criterion.
- A small provenance note in `data/metadata/` is handy but optional.

## NASA downloads for Spain (`scripts/download_nasa_data.py`)

Setup and usage: [`scripts/README.md`](../scripts/README.md). Machine-readable metadata:
[`data/metadata/datasets.json`](../data/metadata/datasets.json); per-file provenance, checksums and
the last dry-run report: [`data/metadata/download_manifest.json`](../data/metadata/download_manifest.json).

Verified in CMR on 14 Nov 2026 (dry run, from 2000-01-01):

| Key | Product | Concept ID / DOI | Type | Native res. | Granules for Spain | Coverage | Subsetting |
|---|---|---|---|---|---|---|---|
| `gpm` | GPM_3IMERGM V07 (IMERG Final, monthly) | `C2723754851-GES_DISC` / 10.5067/GPM/IMERG/3B-MONTH/07 | Satellite-gauge estimate | 0.1° | 309 | 2000-01 → **2025-09** (collection metadata ends 2025-09-30; nothing newer published) | Harmony HOSS |
| `merra2` | M2TMNXSLV 5.12.4 (monthly) | `C1276812859-GES_DISC` / 10.5067/AP1B0BA5PD2K | **Reanalysis (model), not observation** | 0.5° × 0.625° | 321 | 2000-01 → 2026-09 | Harmony HOSS |
| `modis` | MOD13Q1 061 (Terra, 16-day) | `C1748066515-LPCLOUD` / 10.5067/MODIS/MOD13Q1.061 | Satellite observation | 250 m, sinusoidal | 3,070 tiles (614 composites × tiles h17v04, h17v05, h18v04, h18v05 + h16v06 Canarias) | 2000-02-18 → 2026-10-16 | AppEEARS area request (no Harmony service in CMR) |
| `gldas` | GLDAS_NOAH025_M 2.1 (monthly) | `C1342986036-GES_DISC` / 10.5067/SXAVCZFAQLNO | Land surface **model** (Noah), not river gauges | 0.25° | 319 | 2000-01 → **2026-07** | Harmony HOSS |

No missing months or composites were found in these ranges (every expected period has a granule).
CMR publishes **no checksums** for these granules. The script records SHA-256 for every saved file
and validates each file by opening it. AppEEARS bundle files are also checked against the SHA-256
that AppEEARS publishes.

**Variables and units**

- `gpm`: `precipitation` (mm/hr, monthly mean **rate**), `randomError` (mm/hr),
  `gaugeRelativeWeighting` (%), `probabilityLiquidPrecipitation` (%), `precipitationQualityIndex`
  (equivalent gauges per 2.5° box). The processed file adds `precipitation_monthly_accumulation`
  (mm), computed as rate × hours in the calendar month. It is labelled DERIVED, and the native
  rate is kept unchanged alongside it.
- `merra2`: `T2M` (K). The processed file adds `T2M_celsius` (degC), computed as T2M − 273.15 and
  labelled DERIVED. The original K values are kept.
- Units policy (D20): the frontend shows only the converted display variables (°C, mm, and the
  dimensionless NDVI/EVI with units set to `1`). Each processed file lists them in its global
  `display_variables` attribute. Source units and formulas stay in each variable's attributes
  (`source_units`, `derivation`).
- `gldas`: native `Qs_acc` / `Qsb_acc` (kg m⁻² per 3 h, monthly mean), `Evap_tavg` (kg m⁻² s⁻¹),
  `SoilMoi0_10cm_inst` and `SWE_inst` (kg m⁻²). Display: `surface_runoff_mm` = Qs × 8 × days,
  `groundwater_runoff_mm` = Qsb × 8 × days, `total_runoff_mm` = both, `evapotranspiration_mm` =
  Evap × 86400 × days, soil and SWE as mm (1 kg m⁻² = 1 mm). Native fields kept.
- `modis` (AppEEARS layer names): `_250m_16_days_NDVI`, `_250m_16_days_EVI` (scale 0.0001, fill
  −3000, valid −0.2…1), `_250m_16_days_VI_Quality` (bit field), `_250m_16_days_pixel_reliability`
  (0 good, 1 marginal, 2 snow/ice, 3 cloudy, −1 fill), `_250m_16_days_composite_day_of_the_year`.
  The processed file adds a `qa_usable` flag (reliability 0 or 1). No values are masked.

**Processing rules.** Native units, grid and time step are kept. MODIS is not resampled to monthly,
and nothing is interpolated or gap-filled. GPM, MERRA-2 and GLDAS are clipped to the Spain polygon with
`all_touched=True`, so any grid cell that touches Spain is kept. Without that rule, Ceuta, Melilla
and the smaller islands, which are each smaller than one cell, would be lost. Cells outside Spain
become NaN. MODIS is masked to the polygon on the server by AppEEARS, as two areas:
`peninsula_baleares_ceuta_melilla` and `canarias`.

**Boundary.** Eurostat GISCO NUTS 2021, 1:1 million (`CNTR_CODE = ES`), © EuroGeographics.
Level 2 is the 19 CCAA / ciudades autónomas (including ES53 Illes Balears, ES63 Ceuta, ES64
Melilla and ES70 Canarias). Level 3 is grouped to the 52 INE provinces (island NUTS-3 units are
unioned for Illes Balears, Las Palmas and Santa Cruz de Tenerife). The minor sovereign
territories (plazas de soberanía) are not in NUTS. See D19 and D64.

**Storage.** GPM and MERRA-2 for Spain come to under 0.5 GB. The full MODIS history is estimated
at 185–500 GB for raw plus processed files, which is far more than the ~22 GB free on the
development laptop. The script refuses any batch that would leave less than `--min-free-gb` free.
The pilot measures the real size per composite.
