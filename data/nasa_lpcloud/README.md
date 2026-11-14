# Catálogo Clasificado NASA EOSDIS — LPCLOUD

Índice completo, clasificado y con enlaces filtrados para España de las **1.084** colecciones publicadas en el directorio oficial de NASA LPCLOUD (https://cmr.earthdata.nasa.gov/search/site/collections/directory/LPCLOUD/gov.nasa.eosdis).

## Resumen general

- **Colecciones totales catalogadas:** 1.084
- **Activas con cobertura sobre España:** 714 (carpetas `01` a `10`)
- **Activas regionales fuera de España:** 36 (carpeta `11`)
- **Sin gránulos publicados (`No Granules`):** 334 (carpeta `12`)
- **Gránulos totales en el proveedor:** 389.691.616
- **Índices globales:** [catalogo_completo.csv](catalogo_completo.csv) · [catalogo_completo.json](catalogo_completo.json)

## Carpetas por temática

| Carpeta | Descripción | Colecciones | Gránulos totales |
|---|---|---:|---:|
| [01 · Temperatura Superficial y Emisividad](01_temperatura_superficie_y_emisividad/README.md) | Temperatura de la superficie terrestre (LST), emisividad espectral, balance energético superficial (SEB), meteorología reescalada (ECOSTRESS) y bandas térmicas (MODIS, VIIRS, ASTER, CAMEL). | 82 | 105.861.228 |
| [02 · Vegetación, Fenología y Productividad](02_vegetacion_fenologia_y_productividad/README.md) | Índices de vegetación (NDVI, EVI, EVI2), índice de área foliar (LAI/FPAR), productividad primaria bruta y neta (GPP/NPP), fenología anual y cobertura arbórea continua. | 66 | 48.483.652 |
| [03 · Agua, Evapotranspiración y Humedad](03_agua_evapotranspiracion_y_humedad/README.md) | Evapotranspiración neta y potencial (ET), índice de estrés evaporativo (ESI), eficiencia en el uso del agua (WUE), humedad del suelo, embalses y máscaras de masas de agua. | 27 | 20.924.804 |
| [04 · Agricultura, Cultivos y Cobertura del Suelo](04_agricultura_cultivos_y_cobertura_suelo/README.md) | Mapas de tipos de cobertura del suelo (Land Cover), cultivos de regadío vs. secano (LGRIP30, GFSAD) y alertas de perturbación superficial (OPERA). | 14 | 16.492.535 |
| [05 · Incendios y Anomalías Térmicas](05_incendios_y_anomalias_termicas/README.md) | Focos activos de incendio, anomalías térmicas diarias/8-días, áreas quemadas mensuales (MCD64A1) y eficiencia de combustión (FILDA-2). | 21 | 15.496.410 |
| [06 · Elevación y Topografía](06_elevacion_y_topografia/README.md) | Modelos digitales de elevación (DEM), pendiente, curvatura y mosaicos topográficos globales a 30 m / 90 m (NASADEM, SRTM, ASTER GDEM). | 23 | 4.096.762 |
| [07 · Bosques, LiDAR y Estructura 3D](07_bosques_lidar_y_estructura_3d/README.md) | Mediciones láser LiDAR espaciales (GEDI) de forma de onda, elevación del terreno, altura del dosel forestal y perfiles verticales de vegetación. | 3 | 287.817 |
| [08 · Reflectancia, Radiancia e Imágenes Multiespectrales](08_reflectancia_radiancia_e_imagenes/README.md) | Reflectancia superficial óptica/SWIR (HLS Landsat/Sentinel-2 a 30 m, MODIS, VIIRS, ASTER, EMIT, GWELD), radiación solar incidente (PAR/onda corta) y geolocalización. | 66 | 108.739.150 |
| [09 · Albedo y Parámetros BRDF por Banda](09_albedo_y_brdf_por_banda/README.md) | Productos diarios globales de función de distribución de reflectancia bidireccional (BRDF), albedo (Black-Sky / White-Sky) y reflectancia NBAR desglosados por banda espectral (MODIS MCD43 / VIIRS VNP43-VJ143-VJ243). | 395 | 59.152.818 |
| [10 · Atmósfera, Aerosoles, Gases y Minerales](10_atmosfera_aerosoles_gases_y_minerales/README.md) | Profundidad óptica de aerosoles (AOD) y vapor de agua (MAIAC), penachos y flujos de metano (CH4) y CO2 (EMIT, LPJ-EOSIM), e identificación mineral superficial. | 17 | 8.976.148 |
| [11 · Colecciones Regionales Fuera de España](11_regionales_fuera_de_espana/README.md) | Colecciones activas con gránulos cuya cobertura geográfica corresponde exclusivamente a otras regiones (Norteamérica/CONUS, Sudamérica, África, Asia u Oceanía) y no cubren España. | 36 | 1.180.292 |
| [12 · Sin Gránulos Publicados (Versiones Anteriores o Archivadas)](12_sin_granulos_publicados/README.md) | Entradas del directorio LPCLOUD marcadas actualmente como 'No Granules' (0 archivos publicados), normalmente versiones antiguas sustituidas por ediciones más recientes (ej. v006 sustituida por v061). | 334 | 0 |

## Colecciones recomendadas para empezar en España

| Colección | Uso principal | Formato | AppEEARS | Metadatos locales | Enlace España (Earthdata) |
|---|---|---|---|---|---|
| `MOD11A1` v061 | Temperatura superficial diaria 1 km (Terra) | HDF-EOS2 | Sí | [metadata.json](01_temperatura_superficie_y_emisividad/colecciones/MOD11A1_v061/metadata.json) | [Ver en España](https://search.earthdata.nasa.gov/search/granules?p=C1748058432-LPCLOUD&sb%5B0%5D=-9.5%2C35.9%2C4.4%2C43.9) |
| `ECO_L2T_LSTE` v002 | Temperatura superficial y emisividad 70 m (ECOSTRESS) | COG | Sí | [metadata.json](01_temperatura_superficie_y_emisividad/colecciones/ECO_L2T_LSTE_v002/metadata.json) | [Ver en España](https://search.earthdata.nasa.gov/search/granules?p=C2076090826-LPCLOUD&sb%5B0%5D=-9.5%2C35.9%2C4.4%2C43.9) |
| `MOD13Q1` v061 | Índices de vegetación NDVI/EVI 16 días 250 m (Terra) | HDF-EOS2 | Sí | [metadata.json](02_vegetacion_fenologia_y_productividad/colecciones/MOD13Q1_v061/metadata.json) | [Ver en España](https://search.earthdata.nasa.gov/search/granules?p=C1748066515-LPCLOUD&sb%5B0%5D=-9.5%2C35.9%2C4.4%2C43.9) |
| `HLSS30_VI` v2.0 | Índices de vegetación Sentinel-2 HLS 30 m | COG | Sí | [metadata.json](02_vegetacion_fenologia_y_productividad/colecciones/HLSS30_VI_v2.0/metadata.json) | [Ver en España](https://search.earthdata.nasa.gov/search/granules?p=C3246894861-LPCLOUD&sb%5B0%5D=-9.5%2C35.9%2C4.4%2C43.9) |
| `MOD16A2GF` v061 | Evapotranspiración neta 8 días 500 m (Gap-Filled) | HDF-EOS2 | Sí | [metadata.json](03_agua_evapotranspiracion_y_humedad/colecciones/MOD16A2GF_v061/metadata.json) | [Ver en España](https://search.earthdata.nasa.gov/search/granules?p=C2565791021-LPCLOUD&sb%5B0%5D=-9.5%2C35.9%2C4.4%2C43.9) |
| `ECO_L3T_JET` v002 | Evapotranspiración 70 m (ECOSTRESS) | COG | Sí | [metadata.json](03_agua_evapotranspiracion_y_humedad/colecciones/ECO_L3T_JET_v002/metadata.json) | [Ver en España](https://search.earthdata.nasa.gov/search/granules?p=C2076106409-LPCLOUD&sb%5B0%5D=-9.5%2C35.9%2C4.4%2C43.9) |
| `LGRIP30_L3` v002 | Cultivos de regadío vs. secano 30 m (2020) | GeoTIFF | No | [metadata.json](04_agricultura_cultivos_y_cobertura_suelo/colecciones/LGRIP30_L3_v002/metadata.json) | [Ver en España](https://search.earthdata.nasa.gov/search/granules?p=C3262817664-LPCLOUD&sb%5B0%5D=-9.5%2C35.9%2C4.4%2C43.9) |
| `MCD12Q1` v061 | Cobertura del suelo anual 500 m (MODIS) | HDF-EOS2 | Sí | [metadata.json](04_agricultura_cultivos_y_cobertura_suelo/colecciones/MCD12Q1_v061/metadata.json) | [Ver en España](https://search.earthdata.nasa.gov/search/granules?p=C2484079608-LPCLOUD&sb%5B0%5D=-9.5%2C35.9%2C4.4%2C43.9) |
| `MCD64A1` v061 | Área quemada mensual 500 m (MODIS) | HDF-EOS2 | Sí | [metadata.json](05_incendios_y_anomalias_termicas/colecciones/MCD64A1_v061/metadata.json) | [Ver en España](https://search.earthdata.nasa.gov/search/granules?p=C2565786756-LPCLOUD&sb%5B0%5D=-9.5%2C35.9%2C4.4%2C43.9) |
| `VNP14IMG` v002 | Focos activos de incendio 375 m (VIIRS/NPP) | netCDF-4 | No | [metadata.json](05_incendios_y_anomalias_termicas/colecciones/VNP14IMG_v002/metadata.json) | [Ver en España](https://search.earthdata.nasa.gov/search/granules?p=C2734202914-LPCLOUD&sb%5B0%5D=-9.5%2C35.9%2C4.4%2C43.9) |
| `NASADEM_HGT` v001 | Modelo digital de elevación 30 m (NASADEM) | HGT | Sí | [metadata.json](06_elevacion_y_topografia/colecciones/NASADEM_HGT_v001/metadata.json) | [Ver en España](https://search.earthdata.nasa.gov/search/granules?p=C2763264762-LPCLOUD&sb%5B0%5D=-9.5%2C35.9%2C4.4%2C43.9) |
| `HLSS30` v2.0 | Reflectancia superficial Sentinel-2 HLS 30 m | COG | Sí | [metadata.json](08_reflectancia_radiancia_e_imagenes/colecciones/HLSS30_v2.0/metadata.json) | [Ver en España](https://search.earthdata.nasa.gov/search/granules?p=C2021957295-LPCLOUD&sb%5B0%5D=-9.5%2C35.9%2C4.4%2C43.9) |

## Cómo descargar datos reales para España sin bajar el planeta entero

1. **Vía [AppEEARS](https://appeears.earthdatacloud.nasa.gov/):** recomendada para MODIS, VIIRS, ECOSTRESS, ASTER, NASADEM y HLS. Permite subir un polígono de España (o puntos de estaciones como los de `../noaa_ghcnd_spain_daily/`) y descargar directamente un CSV o GeoTIFF recortado (requiere cuenta gratuita de NASA Earthdata Login).
2. **Vía Earthdata Search (enlace ya prefiltrado en cada colección):** abre el enlace `España` de cualquier fila (`bounding_box` Península + Baleares `-9.5,35.9,4.4,43.9`, o España completa incl. Canarias `-18.3,27.6,4.4,43.9` dentro de cada `metadata.json`), elige el rango de fechas (ej. `2022-01-01` a `2026-11-14`) y descarga solo los gránulos que intersectan España.
3. **Vía API CMR + script Python:** cada `metadata.json` incluye el `cmr_granules_api_spain_peninsula` y `cmr_granules_api_spain_all` listos para consultar URLs exactas de descarga mediante autenticación con NASA Earthdata Login (`~/.netrc` o Bearer Token).
