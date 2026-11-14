# 🌡️ Spain weather stations: daily data (2015 → 2026)

**What it is:** real thermometer and rain-gauge readings from **~177 weather stations across Spain**, one row per station per day.
**Source:** NOAA GHCN-Daily (Global Historical Climatology Network). 🇪🇸 **Not NASA**: we use it as *ground truth* to validate NASA data.

| | |
|---|---|
| 📅 Period | 2015-01-01 → 2026-11-07 |
| 📍 Stations | ~177 (Madrid Retiro, Málaga, Sevilla, Puigcerdà, Izaña…) |
| 🧾 Rows | ~700,000 |
| 📏 Units | °C and mm |
| 📁 Files | one CSV per 3 years: `ghcnd_spain_daily_<from>-<to>_metric.csv` |

## What's in a row

```
STATION      NAME               LATITUDE LONGITUDE ELEVATION DATE        PRCP  TMAX  TMIN
SP000003195  MADRID RETIRO, SP  40.4117  -3.6781   667.0     2025-07-10  0.0   35.0  21.7
```

| Column | Meaning | Filled |
|---|---|---|
| `TMAX` / `TMIN` | Max / min temperature of the day (°C) | ~96% |
| `PRCP` | Rain that day (mm) | ~95% |
| `TAVG` | Average temperature (°C). Often empty → use `(TMAX+TMIN)/2` | ~38% |
| `SNWD` | Snow depth (mm) | ~1% |
| `*_ATTRIBUTES` | Quality/source flags. If the **middle** letter is set, the value failed a quality check → drop it | |

## Some facts hidden in here 🔍

- 🔥 Hottest day: **47.0 °C**, Murcia-Alcantarilla, 15 Aug 2021
- 🥶 Coldest day: **−25.2 °C**, Molina de Aragón, 12 Jan 2021 (storm Filomena)
- 🌧️ Wettest day: **276 mm**, Amposta, 29 Sep 2025
- ☀️ Madrid summers (avg. July-Aug max): 33.1 °C in 2021 → **35.5 °C in 2022**

## What you can do with it

- Plot a station's temperature or rain over time
- Spot heatwaves, cold snaps and extreme rain
- **Check NASA satellite/model data against real measurements** (main use in this project)
- ⚠️ ~12 years is short for a *climate* trend; aim for 30+ years before claiming one

## Quick start (Python)

```python
import pandas as pd, glob
df = pd.concat(pd.read_csv(f, parse_dates=["DATE"]) for f in glob.glob("ghcnd_spain_daily_*.csv"))
madrid = df[df.STATION == "SP000003195"].set_index("DATE")
madrid["TMAX"].resample("YE").mean().plot(title="Madrid Retiro: yearly mean max temp (°C)")
```

More details: [`metadata.json`](metadata.json) · [`docs/DATASETS.md`](../../docs/DATASETS.md)
