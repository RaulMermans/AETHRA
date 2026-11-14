# 🗂️ Data: what we have and what we can get out of it

All data covers **Spain, 2000 → 2026**. Each folder has its own README with details.

| Folder | Source | What | Type | Period |
|---|---|---|---|---|
| [`noaa_ghcnd_spain_daily/`](noaa_ghcnd_spain_daily/README.md) | NOAA (CDO) | 🌡️🌧️ Daily max/min temperature + rain from **~180 weather stations** | points, daily | 2001 → 2026 |
| [`processed/spain/gpm/`](processed/spain/README.md) | NASA GPM | 🌧️ Monthly rain, ~10 km grid | map, monthly | 2000 → 2025-09 |
| [`processed/spain/merra2/`](processed/spain/README.md) | NASA MERRA-2 | 🌡️ Monthly air temperature, ~50 km grid | map, monthly | 2000 → 2026-09 |
| [`nasa_gldas_spain_monthly/`](nasa_gldas_spain_monthly/README.md) | NASA GLDAS (via Giovanni) | 💧 Evaporation, runoff to rivers, soil moisture, snow (**Spain average**) | 1 series, monthly | 2000 → 2026-07 |
| [`raw/`](raw/README.md) | NASA | Original downloads behind `processed/` | — | — |
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

## 💡 What we can potentially get out of it

| Indicator | From | Use case in the app |
|---|---|---|
| Tropical nights (min ≥ 20 °C), days > 35 °C, heatwaves | NOAA stations | Health, city heat islands, power-plant cooling |
| Last frost date, heat during flowering | NOAA stations | Farming calendar, olive groves (Jaén) |
| Max 1-day rain, longest dry spell | NOAA + GPM | Dams, floods, drought |
| Warming map per pixel | MERRA-2 | "Where is Spain changing most?" |
| Rain trend map per pixel | GPM | Opposite trends: north vs south-east |
| Water balance + runoff → hydropower potential (`P = ρ·g·Q·H·η`) | GPM + GLDAS | Engineering demo, checked against real REE hydro output |
| Soil drying | GLDAS | Drought and agriculture |
| Station vs satellite agreement | NOAA vs MERRA-2 / GPM | Validity: "3 sources agree" |

**Still missing:** NOAA 1992-2000 (longer station series), GLDAS per basin (e.g. Duero), sector data (REE hydro, reservoirs, olive harvests).
