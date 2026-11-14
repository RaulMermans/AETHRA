# 💧 Spain water balance from NASA GLDAS: monthly (2000 → 2026)

**What it is:** monthly averages over **all of Spain** of where the water goes (evaporation, runoff to rivers, snow, soil moisture), from **NASA GLDAS** (Global Land Data Assimilation System: a land model fed with satellite and ground observations, 0.25° ≈ 25 km grid).
**How it was made:** NASA Giovanni → *Time Series, Area-Averaged* → CSV.

| | |
|---|---|
| 📅 Period | 2000-01 → 2026-07 (319 months) · v2.0 file: 2000-01 → 2014-12 |
| 📍 Region | Spain bbox `-9.5, 35.9, 4.4, 43.9` (Peninsula + Balearics; includes bits of Portugal/France/sea) |
| 🧾 Rows | one per month, one value (Spain average) |
| 🛰️ Product | `GLDAS_NOAH025_M` v2.1 (v2.0 kept only for comparison) |

## ⭐ Start here: `gldas_spain_monthly_water_balance_mm_2000-2026.csv`

All variables already converted to **mm** in one tidy table (one row per month):

```
month,evapotranspiration_mm,surface_runoff_mm,groundwater_runoff_mm,total_runoff_mm,snow_water_equivalent_mm,soil_moisture_0_10cm_mm
2000-01,16.683,...
```

## Some facts hidden in here 🔍 (yearly values 2000-2025, Mann-Kendall + Sen's slope)

- ✅ **Water balance closes:** GLDAS evapotranspiration (~540 mm/yr) + runoff (~170 mm/yr) ≈ GPM rain (~700 mm/yr)
- 🏜️ **Topsoil is drying:** −0.67 mm per decade (~−3 %/decade), **significant** (p = 0.01); driest year 2022
- 🏞️ Runoff to rivers: −29 mm per decade, **not yet significant** (p = 0.09); lowest 2005, highest 2001
- 🌫️ Evapotranspiration: no clear trend (p = 0.86)
- ❄️ Snow: tiny as a Spain average (0.3 mm) → only meaningful for mountain regions

## Raw files (as downloaded from Giovanni)

| File | Variable | Meaning | Units → useful units |
|---|---|---|---|
| `..._evapotranspiration_v2.1_...` | `Evap_tavg` | Water returned to the air by soil + plants | kg m⁻² s⁻¹ → **× 86400 × days in month = mm/month** |
| `..._surface_runoff_...` | `Qs_acc` | Water flowing over the surface after rain | kg m⁻² per 3 h → **× 8 × days = mm/month** |
| `..._groundwater_runoff_...` | `Qsb_acc` | Water reaching rivers from underground | kg m⁻² per 3 h → **× 8 × days = mm/month** |
| `..._snow_water_equivalent_...` | `SWE_inst` | Snow on the ground, as litres of water | kg m⁻² = **mm of water** |
| `..._soil_moisture_0-10cm_...` | `SoilMoi0_10cm_inst` | Water in the top 10 cm of soil | kg m⁻² = **mm of water** |
| `..._evapotranspiration_v2.0_2000-2014` | `Evap_tavg` | Older model version (ends 2014) | as above |

1 kg m⁻² of water = 1 mm = 1 litre per m².

## File format

```
Title:,"Time Series, Area-Averaged of ..."   ← 8 header lines (metadata, reproduce URL)
...
time, GLDAS_NOAH025_M_2_1_Evap_tavg
2000-01-01 00:00:00,5.34e-06
```
Fill value: `-9999` (none present). Read with `pd.read_csv(f, skiprows=8)`.

## What you can do with it

- **Water balance:** rain (GPM) − evapotranspiration − runoff = change in stored water
- **Hydropower potential:** runoff → river flow → energy (`P = ρ·g·Q·H·η`), checked against real REE hydro output
- **Drought signals:** soil-moisture and snow trends (Mann-Kendall + Sen's slope on deseasonalized series)

⚠️ Spain-wide average: good for national trends, not for one basin or city.
