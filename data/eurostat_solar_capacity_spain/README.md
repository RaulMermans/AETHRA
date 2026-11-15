# ☀️ Solar panels installed in Spain, year by year (Eurostat, official)

**What it is:** how much **solar panel (photovoltaic) capacity** Spain had installed at the end of each year, from the official EU energy statistics (Eurostat dataset `nrg_inf_epcrw`). We use it to show how fast Spain is becoming a solar hub, and as national context for the screening (the featured Jaén–Granada cell is about *where* new plants fit; this table shows *how fast* they are being built).

Why not the plant list in `../gem_solar_spain/`? That registry is a snapshot of plants, not a yearly census, so it can't give a reliable trend (see `docs/PV_HISTORY.md`). Official statistics can.

| | |
|---|---|
| File | `eurostat_solar_pv_capacity_spain.csv` (one row per year, 2000 → 2024) |
| Source | Eurostat `nrg_inf_epcrw`, `siec=RA420` (solar photovoltaic), `plant_tec=CAP_NET_ELC` (net maximum electrical capacity, total), `unit=MW` |
| Raw API answers | `data/raw/eurostat/*.json` (not in Git) |
| Built by | `scripts/build_solar_capacity_trend.py` (also writes `apps/web/public/data/solar-capacity-trend.json`) |
| Licence | Eurostat, free reuse with attribution (cite "Eurostat, nrg_inf_epcrw") |

## Columns

| Column | Meaning |
|---|---|
| `year` | Year (value is at the end of the year) |
| `mw` | Total solar panel capacity installed, in megawatts (1 GW = 1,000 MW) |
| `added_mw` | New capacity that year = this year minus last year (empty for the first year) |

## Facts hidden in here 🔍

- **~35.8 GW at the end of 2024**, about 8 times more than in 2015 (4.7 GW).
- Growth since 2019: about **32 % per year**, so capacity doubled roughly every 2.5 years.
- Three phases: a **2008 rush** (+2.9 GW, subsidy boom), an **almost flat 2013-2018** (subsidy cuts), then a **restart from 2019** (+4 GW in 2019, a +10 GW peak in 2022, ~6 GW per year in 2023-2024).
- In 2024 Spain was **2nd in the EU** (after Germany, 91 GW), with ~12 % of the EU total, but Italy (35.4 GW) is right behind.

## Careful with ⚠️

- **Capacity is not electricity.** MW says how much the panels *could* deliver at full sun, not how much energy (MWh) they produced.
- The total almost never goes down, so "it is rising" is close to automatic. The more useful question is whether **new installations per year** are growing (they are since 2015, but they jump a lot year to year).
- `added_mw` is a net difference: if old plants are removed it understates what was actually built.
- Latest year is 2024 (Eurostat publishes about a year later). Spain's grid operator REE (apidatos) was down when we built this, so 2025 is missing.
