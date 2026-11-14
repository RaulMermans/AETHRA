# ADR-001 — CesiumJS as the 3D globe engine (instead of MapLibre GL JS)

- **Status:** Proposed (14 Nov 2026) — open to team review. Recorded as D17 in `DECISIONS.md`.
- **Scope:** the `/explore` view in `apps/web`.

## Context

`apps/web/README.md` listed MapLibre GL JS as the map library, but no MapLibre code or dependency
existed yet (the app had not been scaffolded). The product's centrepiece is an immersive Earth view
of Spain that will later carry NASA imagery, GeoJSON regions, raster overlays, heatmaps, extruded
value columns and time-dependent layers.

## Decision

Use **CesiumJS** (npm `cesium`, v1.140.0) for the `/explore` globe.

- Loaded client-only. Cesium's prebuilt `Cesium.js` and its Workers/Assets/Widgets/ThirdParty are
  copied to `public/cesium/` by `scripts/copy-cesium-assets.mjs` (`predev`/`prebuild`) and loaded at
  runtime (`CESIUM_BASE_URL=/cesium/`). Cesium is **not** bundled by webpack: Next's minifier
  corrupts Cesium's shader template strings ("Octal escape sequences are not allowed…").
- Base imagery without a token: NASA GIBS Blue Marble (no key needed). With
  `NEXT_PUBLIC_CESIUM_ION_TOKEN`: Cesium World Imagery + Cesium World Terrain.
- Engine-agnostic layer descriptors (`lib/globe/types.ts`, `catalog.ts`) are reconciled onto the
  scene by `lib/globe/cesium/layer-manager.ts` (one adapter per layer kind).

## Trade-offs

| | CesiumJS | MapLibre GL JS |
|---|---|---|
| True 3D globe, atmosphere, lighting | Native | Globe projection (v5+), lighter 3D |
| Real terrain | Cesium World Terrain (ion token) or any quantized-mesh source | Raster-DEM terrain |
| Time-dynamic layers | Built-in clock / time-dynamic imagery | Manual |
| 3D columns, extruded data | Entities / primitives | fill-extrusion (2.5D) |
| Bundle / load | Heavy (~4 MB JS + workers, served statically) | Light (~800 kB) |
| Vector tiles & cartographic styling | Weaker | Excellent |
| Next.js integration | Needs static asset copy, client-only | Straightforward |

## Consequences / validation impact

- High-resolution imagery and terrain depend on a Cesium ion account (free tier, token in env).
  Without it the globe still works with NASA imagery but has no 3D topography — the UI says so.
- Coordinates are WGS84 decimal degrees from globe surface picking (terrain if loaded, else
  ellipsoid). Elevation is shown only when terrain is active.
- Heavier first load on mobile; WebGL is required (an error state is shown otherwise).
- If 2D cartography (vector tiles, choropleths) becomes central, MapLibre can still be added for a
  2D view; the layer descriptors are engine-agnostic so a MapLibre adapter would be possible.
- No MapLibre code existed, so nothing was removed.
