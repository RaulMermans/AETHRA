# 🗂️ Data: what we have and what we can get out of it

All data covers **Spain, 2000 → 2026**. This page is the quick overview; each folder has its own README with the details.

## 📁 The folders in one look

| Folder | What it is, in plain words | Shape of the data | Period |
|---|---|---|---|
| [`noaa_ghcnd_spain_daily/`](noaa_ghcnd_spain_daily/README.md) | 🌡️🌧️ **Real thermometer and rain-gauge readings** from ~180 weather stations across Spain (NOAA, the US weather agency) | One value per **station** per **day** | 2001 → 2026 |
| [`processed/spain/gpm/`](processed/spain/README.md) | 🌧️ **Rain measured from space** (NASA GPM satellites, corrected with rain gauges) | A **map** of Spain cut into ~10 km squares, one map per **month** | 2000 → 2025-09 |
| [`processed/spain/merra2/`](processed/spain/README.md) | 🌡️ **Air temperature** from NASA MERRA-2, a *reanalysis*: a weather model that blends all available observations to fill gaps | A **map** in ~50 km squares, one per **month** | 2000 → 2026-09 |
| [`processed/spain/modis/`](processed/spain/README.md) | 🌱 **How green the vegetation is**, seen by NASA's MODIS satellite (250 m detail) | 16-day NDVI maps for two Spain regions; **not uploaded** (too large for git) | 2000, 2012, 2024 |
| [`processed/spain/gldas/`](processed/spain/README.md) | 💧 Runoff, ET, soil moisture, snow — **map grid** ~25 km (NASA GLDAS) | A **map** of Spain, one per **month** | 2000 → 2026-07 |
| [`processed/spain/swot/`](processed/spain/README.md) | 🏞️ River reaches + lakes: water-surface height from SWOT (not gauges) | lines/polygons, ~days | 2023 → |
| [`nasa_gldas_spain_monthly/`](nasa_gldas_spain_monthly/README.md) | 💧 **Where the water goes** (evaporation, rivers, soil, snow), from NASA GLDAS, a land model fed with satellite data | **One number per month for all of Spain** (an average, no map) | 2000 → 2026-07 |
| [`raw/`](raw/README.md) | Original NASA files, before cutting them to Spain | Don't use directly | — |
| [`metadata/`](metadata/) | Where each file came from (dataset IDs, versions, checksums) | — | — |

## 📖 What each variable means

### 🌡️🌧️ `noaa_ghcnd_spain_daily/` (weather stations)
| Variable | Meaning | Unit |
|---|---|---|
| `STATION`, `NAME`, `LATITUDE`, `LONGITUDE`, `ELEVATION` | Station ID, name and location (elevation = metres above sea level) | — |
| `TMAX` / `TMIN` | Highest / lowest temperature of the day | °C |
| `TAVG` | Average temperature of the day. Often empty → use `(TMAX + TMIN) / 2` | °C |
| `PRCP` | Rain that fell that day | mm (1 mm = 1 litre per m²) |
| `SNWD` | Snow on the ground. Almost always empty in Spain | mm |
| `*_ATTRIBUTES` | Quality and source tags of each value. If the **middle** letter is filled, the value failed a quality check → drop it | — |
| `AWND`, `WSFG`, `WT**` | Only in the 2001-2004 file: wind speed and "weather type" yes/no flags (fog, thunder…). Almost empty | — |

### 🌧️ `processed/spain/gpm/` (rain from satellites)
| Variable | Meaning | Unit |
|---|---|---|
| `precipitation_monthly_accumulation` | ⭐ **Total rain in the month** in each square. Use this one | mm |
| `precipitation` | Same rain, as an average rate | mm per hour |
| `randomError` | How uncertain the estimate is | mm per hour |
| `gaugeRelativeWeighting` | How much real rain gauges contributed to the value | % |
| `probabilityLiquidPrecipitation` | Chance it fell as rain rather than snow | % |
| `precipitationQualityIndex` | Overall confidence (higher = better) | — |

### 🌡️ `processed/spain/merra2/` (air temperature)
| Variable | Meaning | Unit |
|---|---|---|
| `T2M_celsius` | ⭐ **Average air temperature of the month**, measured 2 m above the ground (like a normal thermometer). Use this one | °C |
| `T2M` | Same value in Kelvin (°C + 273.15) | K |

### 🌱 `processed/spain/modis/` (vegetation, test only)
| Variable | Meaning | Unit |
|---|---|---|
| `NDVI` | **Greenness index**: 0 = bare soil/rock, ~0.2-0.4 = dry grass or crops, 0.6-0.9 = dense healthy vegetation. Satellites compute it from how plants reflect red vs infrared light | 0 → 1 |
| `EVI` | Same idea as NDVI, but works better over very dense forests | 0 → 1 |
| Quality layers | Tell which pixels are reliable (e.g. not covered by clouds) | — |

Each image is a **16-day composite**: the satellite takes the best (least cloudy) view of each pixel over 16 days.

### 💧 `nasa_gldas_spain_monthly/` (water balance)
All values are **mm of water per month, averaged over Spain** (1 mm = 1 litre per m²).

| Variable | Meaning |
|---|---|
| `evapotranspiration_mm` | Water that goes **back to the air**: evaporating from the soil + "sweated" by plants |
| `surface_runoff_mm` | Rain that **flows over the ground** straight into streams (fast, after storms) |
| `groundwater_runoff_mm` | Water that **soaks into the ground** and slowly feeds rivers from below |
| `total_runoff_mm` | **All the water that ends up in rivers** = surface + groundwater runoff. This is what fills reservoirs and drives hydropower |
| `snow_water_equivalent_mm` | Snow on the ground, expressed as the water you'd get if it melted |
| `soil_moisture_0_10cm_mm` | Water held in the **top 10 cm of soil** (what crops and fires "feel") |

Simple rule that ties them together: **rain ≈ evapotranspiration + total runoff + change in stored water**.

## 🔍 Headline findings so far

A trend is **significant** when it is very unlikely to be chance (*p* < 0.05). Tested with Mann-Kendall (is there a real trend?) and Sen's slope (how big per decade?).

| Finding | Value | Significant? |
|---|---|---|
| Spain is warming (MERRA-2) | **+0.56 °C per decade** | ✅ yes (p = 0.0005) |
| Every part of Spain warms, but unevenly | +0.2 → +0.76 °C per decade | map to show *where* |
| Madrid Retiro station (NOAA, 1920-2025) | +0.24 °C per decade (since 1980: +0.38) | ✅ yes (p < 0.001) |
| Topsoil is drying (GLDAS) | −3 % per decade | ✅ yes (p = 0.01) |
| Less water reaching rivers (GLDAS) | −29 mm per decade | ⏳ not yet (p = 0.09) |
| Less rain (GPM) | −34 mm per decade | ⏳ not yet (p = 0.18) |
| The water numbers add up | rain ≈ evapotranspiration + runoff (~700 mm/year) | ✅ data are consistent |

"Not yet" means the trend may be real but we need more years of data to be sure.

## 💡 What we can get out of it

✅ = can be computed **now** with the data in this folder · ⏳ = needs an **extra dataset** (where to get it is listed)

| | Indicator (what it means) | From | Use case in the app |
|---|---|---|---|
| ✅ | **Tropical nights** (nights that don't drop below 20 °C), **days above 35 °C**, **heatwaves** (3+ hot days in a row) | NOAA stations | Health, city heat, power plants that need cool water |
| ✅ | **Last frost date** of spring, heat during flowering | NOAA stations | Farming calendar |
| ✅ | **Wettest day of the year**, **longest dry spell** | NOAA + GPM | Dams, floods, drought |
| ✅ | **Warming map** per square | MERRA-2 | "Where is Spain changing most?" |
| ✅ | **Rain trend map** per square | GPM | Look for opposite trends between regions (e.g. north vs south-east; not checked yet) |
| ✅ | Soil drying, water balance (Spain) | GLDAS + GPM | Drought and agriculture |
| ✅ | **Station vs satellite** comparison | NOAA vs MERRA-2 / GPM | Proves our numbers: "different sources agree" |
| ⏳ | Olive harvest vs heat during flowering (Jaén) | NOAA + **olive production per season** (Spanish Ministry of Agriculture, MAPA) | Olive farmers |
| ⏳ | **Hydropower potential**: water in rivers → electricity (`P = ρ·g·Q·H·η`) | GPM + **GLDAS for one river basin** (Giovanni, e.g. Duero) + **real hydro output** (REE REData API) | Engineering demo |
| ⏳ | Reservoir levels | **MITECO weekly reservoir bulletin** or SWOT satellite | Water availability |
| ⏳ | Vegetation trend (NDVI) | **Full MODIS history** (AppEEARS, product MOD13A3: monthly, 1 km, much lighter) | Crops, drought |

**Also missing:** NOAA 1992-2000, to get longer station series.
