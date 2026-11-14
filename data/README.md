# 🗂️ Data: what we have and what we can get out of it

All data covers **Spain, 2000 → 2026**. Each folder has its own README with details.

| Folder | Source | Variables inside | Type | Period |
|---|---|---|---|---|
| [`noaa_ghcnd_spain_daily/`](noaa_ghcnd_spain_daily/README.md) | NOAA (CDO) | **~180 weather stations** (name, lat, lon, elevation) · `TMAX` / `TMIN` / `TAVG` (°C) · `PRCP` rain (mm) · `SNWD` snow depth (mm, ~empty) · quality flags `*_ATTRIBUTES` · 2001-2004 file also has (almost empty) wind `AWND`/`WSFG` and weather types `WT**` | points, daily | 2001 → 2026 |
| [`processed/spain/gpm/`](processed/spain/README.md) | NASA GPM IMERG | `precipitation_monthly_accumulation` (mm/month) · `precipitation` (mm/h) · `randomError` · `gaugeRelativeWeighting` · `probabilityLiquidPrecipitation` · `precipitationQualityIndex` | map ~10 km, monthly | 2000 → 2025-09 |
| [`processed/spain/merra2/`](processed/spain/README.md) | NASA MERRA-2 | `T2M_celsius` air temperature at 2 m (°C) · `T2M` (K) | map ~50 km, monthly | 2000 → 2026-09 |
| [`processed/spain/modis/`](processed/spain/README.md) | NASA MODIS | `NDVI` / `EVI` vegetation greenness (0-1) + quality layers — **pilot: one 16-day composite, local only (not in Git)** | map 250 m, 16-day | 2000-02-18 |
| [`nasa_gldas_spain_monthly/`](nasa_gldas_spain_monthly/README.md) | NASA GLDAS (Giovanni) | **Spain average**, mm/month: `evapotranspiration` · `surface_runoff` · `groundwater_runoff` · `total_runoff` · `snow_water_equivalent` · `soil_moisture_0_10cm` | 1 series, monthly | 2000 → 2026-07 |
| [`raw/`](raw/README.md) | NASA | Original downloads behind `processed/` + Spain boundary (NUTS 2021) | — | — |
| [`metadata/`](metadata/) | — | Provenance: DOIs, versions, checksums | — | — |

## 🔍 Headline findings so far (Mann-Kendall + Sen's slope)

| Finding | Value | Significant? |
|---|---|---|
| Spain is warming (MERRA-2) | **+0.56 °C / decade** | ✅ p = 0.0005 |
| Every pixel warms, unevenly | +0.2 → +0.76 °C / decade | map to show *where* |
| Madrid Retiro station (NOAA, 1920-2025) | +0.24 °C / decade (since 1980: +0.38) | ✅ p < 0.001 |
| Topsoil is drying (GLDAS) | −3 % / decade | ✅ p = 0.01 |
| Less runoff to rivers (GLDAS) | −29 mm / decade | ⏳ p = 0.09, not yet |
| Less rain (GPM) | −34 mm / decade | ⏳ p = 0.18, not yet |
| Water balance closes | rain ≈ evaporation + runoff (~700 mm/yr) | ✅ data are consistent |

## 💡 What we can get out of it

✅ = can be computed **now** with the data in this folder · ⏳ = needs an **extra dataset** (listed)

| | Indicator | From | Use case in the app |
|---|---|---|---|
| ✅ | Tropical nights (min ≥ 20 °C), days > 35 °C, heatwaves | NOAA stations | Health, city heat islands, power-plant cooling |
| ✅ | Last frost date, heat during flowering | NOAA stations | Farming calendar |
| ✅ | Max 1-day rain, longest dry spell | NOAA + GPM | Dams, floods, drought |
| ✅ | Warming map per pixel | MERRA-2 | "Where is Spain changing most?" |
| ✅ | Rain trend map per pixel | GPM | Opposite trends: north vs south-east |
| ✅ | Soil drying, water balance (Spain) | GLDAS + GPM | Drought and agriculture |
| ✅ | Station vs satellite agreement | NOAA vs MERRA-2 / GPM | Validity: "sources agree" |
| ⏳ | Olive harvest vs heat in flowering (Jaén) | NOAA + **olive production per campaign** (Ministry of Agriculture, MAPA) | Olive groves |
| ⏳ | Hydropower potential `P = ρ·g·Q·H·η` | GPM + **GLDAS per basin** (Giovanni, e.g. Duero) + **REE hydro output** (REE REData API) | Engineering demo |
| ⏳ | Reservoir levels | **MITECO weekly reservoir bulletin** / SWOT | Water availability |
| ⏳ | Vegetation trend (NDVI) | **Full MODIS history** (AppEEARS, MOD13A3 monthly 1 km is much lighter) | Crops, drought |

**Also missing:** NOAA 1992-2000 for longer station series.
