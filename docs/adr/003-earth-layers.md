# ADR-003 — Opt-in Earth layers on the existing Cesium globe

- **Status:** Implemented initial slice, 15 Nov 2026 (D77). **Amended by D79:** rivers and lakes are always on, watersheds and MODIS removed, no toggle panel.
- **Authorization:** The owner explicitly lifted the feature freeze and the D27/D28 UI restriction after the conflict was explained.

## Decision

Extend the existing `LayerDescriptor` and `CesiumLayerManager` with an OGC WMS adapter. Keep layers off by default. The adapter uses EPSG:4326, transparent PNG tiles, source credits, opacity and deterministic teardown. IGN layers are bounded to Spain; the dated NASA GIBS layer is global. A compact panel controls visibility and opacity.

For geographic inspection, `GetFeatureInfo` requests the official IGN JSON at the clicked WGS84 coordinate. The response is validated for CRS, geometry and displayed attributes before a temporary Cesium GeoJSON highlight is created. Missing names remain unnamed. The feature geometry is cartographic context; it is not an `AnalysisSpec` or a scientifically aggregated basin.

## Verified sources

- IGN WMS `GetCapabilities` on 15 Nov 2026 lists queryable `HY.Network`, `HY.PhysicalWaters.Waterbodies` and `HY.PhysicalWaters.Catchments`, with JSON `GetFeatureInfo` support. A Guadalquivir `GetFeatureInfo` request returned an IGN identifier, name, hierarchy and geometry. Source: <https://servicios.idee.es/wms-inspire/hidrografia>.
- NASA GIBS WMS returned a PNG for `MODIS_Terra_CorrectedReflectance_TrueColor` on `2024-08-01`; this is visualization only. Source: <https://nasa-gibs.github.io/gibs-api-docs/>.

## Limits and follow-up

The WFS endpoint timed out during the audit. HydroRIVERS, HydroLAKES and HydroBASINS are not shipped as global vector layers here: their full datasets must be spatially subset or tiled before browser delivery. WMS layer styles are provider controlled, so the current panel cannot change river color or line width. No backend scientific analysis uses the selected IGN geometry. A production pass must verify real feature clicks, mobile layout, service outages, and performance at different zoom levels.

## Amendment (D79, 15 Nov 2026)

The opt-in panel is removed. `ign-rivers` and `ign-waterbodies` are always visible at the provider default style (opacity 0.7) together with the Spain outline. `ign-catchments` and `nasa-modis-truecolor` are no longer in the catalog. Clicking the globe still runs the validated `GetFeatureInfo` lookup for rivers, then lakes; a hit (or a service failure) is shown inside the clicked-point readout (`CoordinateReadout` + `HydroFeatureCard`), not in a separate floating panel. Verified in Chrome: a click on Embalse de Buendía (40.40 N, 2.78 W) returned the IGN feature and its outline highlight.

Known limitation (accepted): on phones (< 640 px) a globe tap opens the full-height "This place" panel, which hides the point readout, so the IGN river/lake name is not shown there. The judge demo runs on a laptop, where it is visible.
