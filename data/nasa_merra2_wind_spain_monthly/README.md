# 🌬️ Wind over Spain from NASA MERRA-2: monthly (2000 → 2026)

**What it is:** monthly wind maps of Spain (Peninsula, Balearics and Canaries) from **NASA MERRA-2**, a *reanalysis* (a weather model that blends all available observations). Downloaded from NASA Giovanni (*Animation* service → one NetCDF file per month).

| | |
|---|---|
| 📅 Period | 2000-01 → 2026-09 (321 months) |
| 📍 Region | `-18.5, 27.5, 4.5, 44.0` (includes sea and parts of Portugal/Morocco) |
| 🗺️ Detail | ~50 km squares (0.5° × 0.625°), 34 × 37 cells |
| 🛰️ Product | `M2TMNXSLV` v5.12.4 |

## Folders

| Folder | Variable | Meaning | Unit |
|---|---|---|---|
| `U50M/` | `M2TMNXSLV_5_12_4_U50M` | Wind blowing **towards the east** at 50 m height (turbine height). Negative = towards the west | m/s |
| `V50M/` | `M2TMNXSLV_5_12_4_V50M` | Wind blowing **towards the north** at 50 m. Negative = towards the south | m/s |
| `download_links/` | — | Lists of the 321 download URLs per variable (need a NASA Earthdata login) | — |

## ⚠️ Read before using

- U and V are **monthly averages of a direction**: winds blowing in opposite directions during the month cancel out. `√(U² + V²)` gives the **average wind direction and a lower-bound speed**, not the real average speed. For wind **energy**, use the scalar wind speed `SPEED` (product `M2TMNXFLX`), to be added.
- MERRA-2 wind has regional biases (in the Mediterranean it underestimates wind power by ~30 %), so use it to **rank zones and see trends**, not as exact production.
- ~50 km cells don't see mountain ridges, where many wind farms are.
