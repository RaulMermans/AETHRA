# data/metadata

One provenance record per **VALIDATED** dataset (`<short_name>_<version>.json`). Minimum fields:

- `short_name`, `version`, `concept_id` / `doi`, `provider`, `source_url`, `license`
- `variable`, `units`, `scale_factor`, `fill_value`, `qa_layers_used`
- `spatial_extent` (bbox, CRS), `spatial_resolution`
- `temporal_coverage`, `temporal_resolution`
- `retrieved_date`, `retrieval_method` (AppEEARS / Earthdata Search / CMR API)
- `known_limitations`

Status of each dataset is tracked in [docs/DATASETS.md](../../docs/DATASETS.md).
