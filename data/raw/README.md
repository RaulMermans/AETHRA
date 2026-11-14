# 📦 data/raw: original NASA downloads (don't edit)

Files exactly as delivered by NASA (Harmony subsetting service), before clipping to Spain.
**For analysis use [`../processed/spain/`](../processed/spain/README.md) instead.** Provenance and checksums: [`../metadata/download_manifest.json`](../metadata/download_manifest.json).

| Folder | What | Period | Files |
|---|---|---|---|
| `gpm/<year>/` | 🌧️ GPM IMERG monthly rain (`GPM_3IMERGM` V07), one `.nc4` per month | 2000-01 → 2025-09 | ~309 |
| `merra2/<year>/` | 🌡️ MERRA-2 monthly 2 m air temperature (`M2TMNXSLV`, variable `T2M` in Kelvin) | 2000-01 → 2026-09 | ~321 |
| `modis/pilot/<region>/` | 🌱 MOD13Q1 v061 NDVI/EVI (AppEEARS bundle), **one composite** | 2000-02-18 | 2 regions (peninsula + Canarias) |
| `boundary/` | 🗺️ Eurostat NUTS 2021 regions (level 2, 1:1M), used to cut out Spain | — | 1 |

Rebuild everything with `scripts/download_nasa_data.py` (needs a free NASA Earthdata account).
