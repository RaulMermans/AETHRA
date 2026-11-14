# data/processed/spain

NASA data clipped to Spain (mainland, Illes Balears, Canarias, Ceuta, Melilla), one NetCDF file per
year. Produced by [`scripts/download_nasa_data.py`](../../../scripts/download_nasa_data.py). Every
file's source granules, SHA-256 and validation result are listed in
[`data/metadata/download_manifest.json`](../../metadata/download_manifest.json). Dataset details:
[`docs/DATASETS.md`](../../../docs/DATASETS.md).

| Folder | Product | Period | Grid | Size |
|---|---|---|---|---|
| `gpm/` | GPM_3IMERGM V07 (IMERG Final, monthly), DOI 10.5067/GPM/IMERG/3B-MONTH/07 | 2000-01 → 2025-09 (latest published) | 0.1°, 162 × 226 cells | ~0.7 MB/year |
| `merra2/` | M2TMNXSLV 5.12.4 (MERRA-2 monthly), DOI 10.5067/AP1B0BA5PD2K | 2000-01 → 2026-09 (latest published) | 0.5° × 0.625°, 34 × 37 cells | ~65 KB/year |

## 👀 At a glance

| | 🌧️ `gpm/` (rain) | 🌡️ `merra2/` (air temperature) |
|---|---|---|
| What | Monthly rain from satellites + rain gauges | Monthly air temperature at 2 m, from a reanalysis (model + observations) |
| Period | 2000-01 → 2025-09 | 2000-01 → 2026-09 |
| Detail | ~10 km cells | ~50 km cells |
| Use | rain trends, droughts, water balance | warming trends, maps per pixel |

**Facts hidden in here 🔍** (Spain average, full years, Mann-Kendall + Sen's slope):
- 🌡️ Spain warms **+0.56 °C per decade** (p = 0.0005, significant). Warmest year 2022 (16.4 °C), coldest 2010 (14.3 °C)
- 🗺️ **Every pixel warms**, but unevenly: from +0.2 to +0.76 °C per decade → good for a "where is it changing most" map
- 🌧️ Rain: −34 mm per decade, **not significant** (p = 0.18): average ~700 mm/yr, driest 2005 (516 mm), wettest 2010 (921 mm)
- ☔ Wettest month in a single cell: ~658 mm, Galicia (42.05 N, 8.55 W), March 2001


All variables have dimensions `(time, lat, lon)` and use EPSG:4326. `time` is the first day of each
month.

## Variables

**Use the display variable** (D20: units conversion is done here, never in the frontend). Each
file lists it in the global attribute `display_variables`.

| File | Display variable | Units | Original variables kept |
|---|---|---|---|
| `gpm/` | `precipitation_monthly_accumulation` | mm (monthly accumulated) | `precipitation` (mm/hr, monthly mean **rate**), `randomError` (mm/hr), `gaugeRelativeWeighting` (%), `probabilityLiquidPrecipitation` (%), `precipitationQualityIndex` (equivalent gauges per 2.5° box; no units attribute in the file) |
| `merra2/` | `T2M_celsius` | °C | `T2M` (K) |

- `precipitation_monthly_accumulation` = `precipitation` × 24 × days in the month.
- `T2M_celsius` = `T2M` − 273.15.
- MERRA-2 is a **reanalysis** (model + data assimilation), not a direct satellite observation.

## Spatial rule

Cells outside Spain are NaN. A cell is kept if it **touches** Spain (`all_touched=True`), so Ceuta,
Melilla and the small islands are not lost. Coastal cells therefore also include some sea or
neighbouring land.

The boundary is `spain_boundary_nuts2021_01m.geojson`: Eurostat GISCO NUTS 2021, level 2, 1:1
million. **© EuroGeographics for the administrative boundaries.**

```python
import xarray as xr
ds = xr.open_mfdataset("data/processed/spain/merra2/*.nc")   # 2000-01 .. 2026-09
t = ds["T2M_celsius"]                                         # °C
```
