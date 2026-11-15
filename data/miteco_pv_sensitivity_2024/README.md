# 🚫 Where NOT to put solar farms: MITECO environmental sensitivity map (2024)

**What it is:** the Spanish Ministry for the Ecological Transition (MITECO) official map that rates every point of Spain by how environmentally sensitive it is for **large solar PV plants** (protected areas, habitats, landscape, water…). It is the official "where not" layer for our screening.

| | |
|---|---|
| Source | MITECO, *Zonificación ambiental para la implantación de energías renovables: fotovoltaica*, file `Zonificacion_FTV_clasificada_2024` |
| Original | GeoTIFF, 25 m pixels (Peninsula + Balearics EPSG:25830, Canaries EPSG:32628). Kept in `data/raw/miteco/` (not in Git) |
| This folder | Same classes resampled to **0.01° (~1 km), WGS84 (EPSG:4326)**, majority value per pixel |

## Values

| Value | Sensitivity | Meaning for the app |
|---|---|---|
| `0` | **Maximum (not recommended)** | 🔴 where not |
| `1` | Very high | 🟠 |
| `2` | High | 🟡 |
| `3` | Moderate | 🟢 |
| `4` | **Low** | 🟢 best |
| `255` | No data (sea, outside Spain) | — |

## Files

| File | Content |
|---|---|
| `miteco_pv_sensitivity_peninsula_baleares_0p01deg.tif` | Peninsula + Balearics, 1420 × 820 pixels |
| `miteco_pv_sensitivity_canarias_0p01deg.tif` | Canary Islands, 530 × 210 pixels |
| `class_share_percent.json` | % of land in each class |

**Share of land:** Peninsula + Balearics: 32 % maximum (not recommended), 38 % low. Canaries: 61 % maximum.

⚠️ It is an orientation tool: it does not replace each project's environmental assessment, and regions may have their own rules. Resampling to ~1 km smooths small protected areas.
