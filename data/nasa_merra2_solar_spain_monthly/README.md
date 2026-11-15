# ☀️ Sunlight reaching the ground in Spain, from NASA MERRA-2: monthly (2000 → 2026)

**What it is:** monthly maps of how much **sunlight reaches the ground** over Spain (Peninsula, Balearics and Canaries) from **NASA MERRA-2**, a *reanalysis* (a weather model that blends all available observations). Downloaded from NASA Giovanni (one NetCDF file per month). This is the "fuel" of a solar panel.

| | |
|---|---|
| 📅 Period | 2000-01 → 2026-09 (321 months; complete years used: 2000-2025) |
| 📍 Region | `-18.5, 27.5, 4.5, 44.0` (includes sea and parts of Portugal/Morocco) |
| 🗺️ Detail | ~50 km squares (0.5° × 0.625°), 34 × 37 cells |
| 🛰️ Product | `M2TMNXRAD` v5.12.4 (radiation diagnostics), doi:10.5067/OU3HJDS973O0 |

## Folders

| Folder | Variable | Meaning | Unit |
|---|---|---|---|
| `SWGDN/` | `M2TMNXRAD_5_12_4_SWGDN` | **Surface incoming shortwave flux**: sunlight (direct + diffuse) arriving on a flat surface at ground level, averaged over day and night of the month | W/m² |
| `download_links/` | — | List of the download URLs (need a NASA Earthdata login) | — |

**Unit trick:** W/m² averaged over 24 h × 0.024 = **kWh per m² per day** (what solar engineers use). Example: 210 W/m² ≈ 5.0 kWh/m²/day.

## Facts hidden in here 🔍 (2000-2025, cells mostly in Spain)

- Average sunlight goes from **~4.1 kWh/m²/day** (Cantabrian coast) to **~5.4** (Granada-Almería highlands) on the Peninsula and **~6.0** in the Canaries.
- **No square shows a proven trend** in sunlight: per-square trends range −0.9 → +0.8 % per decade, none significant after correcting for testing 195 squares at once (Mann-Kendall + Benjamini-Hochberg). Median −0.2 % per decade.
- NASA POWER (a different NASA product) sees **+0.5 to +0.8 % per decade** in the same regions, also not significant. MERRA-2 is **~0.3-0.4 kWh/m²/day brighter** than POWER, but year-to-year ups and downs agree well (correlation 0.81-0.90).
- Summer air heat (MERRA-2 `T2M`, June-August) rises **+0.67 °C per decade** (median, significant in 120 of 195 squares). With a typical panel losing 0.4 % per °C, that costs **~0.27 % of output per decade**: small but real.
- Used by `scripts/build_pv_screening.py` → `apps/web/public/data/pv-screening.json` (solar screening map).

## ⚠️ Read before using

- MERRA-2 is a **model**, not a pyranometer. Reanalyses are known to **overestimate surface sunlight** (too few or too thin clouds and aerosols) and their trends depend on how aerosols are handled; use it to **rank zones and look for trends**, not as exact production.
- ~50 km squares average mountains and valleys together; a single solar farm may see more or less sun than its square.
- Monthly means hide day-to-day variability (clouds, dust episodes). Saharan dust is only partly represented.
- Cells along the coast mix land and sea: check the land fraction before quoting a coastal number.
