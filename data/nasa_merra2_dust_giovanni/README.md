# MERRA-2 dust optical thickness: Giovanni subset

**Status: INGESTED; EXPLORATORY analysis, not gate-validated.** The accompanying text file is a Giovanni-generated list of 321 monthly NetCDF download URLs. It was copied from the parent `NASA_Hackathon` folder on 15 Nov 2026; SHA-256: `EBF4071C5136307939711993DEBA319AFB0B4CADC6A4A281C083F1BF57234AD7`. `scripts/ingest_giovanni_dust.py` downloaded and checked the 312 months of complete years 2000–2025. Raw NetCDFs remain local and are ignored by Git; [`download_manifest.json`](download_manifest.json) records each SHA-256. The reproducible featured-cell result is [`giovanni-dust.json`](../../apps/web/public/data/giovanni-dust.json).

| Field | Provenance |
|---|---|
| Product | NASA GMAO MERRA-2 `M2TMNXAER` v5.12.4, monthly aerosol diagnostics; DOI [10.5067/FH9A0MLJPC7N](https://doi.org/10.5067/FH9A0MLJPC7N) |
| Variable | `DUEXTTAU`: dust extinction aerosol optical thickness at 550 nm, dimensionless; a model/reanalysis estimate, **not** surface dust concentration or panel soiling |
| Export | Giovanni spatial subset, bounding box 18.5° W–4.5° E, 27.5°–44° N; native MERRA-2 grid 0.5° × 0.625°. The bounding box includes land outside Spain and sea |
| URL coverage | Monthly links from January 2000 through September 2026; 312 months in 2000–2025 downloaded and validated for the featured cell (26 complete years) |
| Published result | Day-weighted monthly `DUEXTTAU` values yield mean AOT **0.055952** for the cell centred at 37.5° N, 3.75° W, 2000–2025. This is atmospheric column optical thickness, not deposited dust. No uncertainty or trend test is claimed |
| Use in app | Exploratory dust context beside the solar case. It **does not** change the PV verdict or estimate soiling/production loss |

The source is the [NASA GES DISC M2TMNXAER collection](https://disc.gsfc.nasa.gov/datasets/M2TMNXAER_5.12.4/summary). The collection DOI and variable meaning are also listed in [NASA GMAO's MERRA-2 documentation](https://gmao.gsfc.nasa.gov/gmao-products/merra-2/citing-merra-2-data_merra-2/) and [NASA's aerosol parameter table](https://gmao.gsfc.nasa.gov/media/documents/hj4d7kp7trcwjd7m9c5ztwp7p/GEOSIT_FileSpecTables_adj_b5yfp1q9iavogm3h0kd2lu68x.pdf).

Giovanni session URLs may expire or require Earthdata authentication. Reproduce the subset from the collection if that happens. Do not infer a dust trend or a solar production effect from this series.
