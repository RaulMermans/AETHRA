# ADR-001 — CesiumJS as the 3D globe engine (replaces the MapLibre-first default)

- **Status:** Accepted — merged in PR #2 (14 Nov 2026); updated the same day with imagery, terrain
  and rendering-quality decisions. Recorded as D17 in `DECISIONS.md`.
- **Scope:** the `/explore` view in `apps/web`.

## Context

`apps/web/README.md` originally listed MapLibre GL JS, but no MapLibre code existed. The product's
centrepiece is an immersive Earth view of Spain that will carry NASA imagery, GeoJSON regions,
raster fields, extruded value columns and time-dependent layers, with real relief for mountain
areas (Pyrenees, Sierra Nevada, Picos de Europa, Canary Islands).

## Decision

Use **CesiumJS** (npm `cesium` 1.140.0, Next.js 15.5, React 19) for the `/explore` globe.

### Integration
- Client-only (`next/dynamic`, `ssr: false`). Cesium's prebuilt `Cesium.js` and its
  Workers/Assets/Widgets/ThirdParty are copied to `public/cesium/` by
  `scripts/copy-cesium-assets.mjs` (`predev`/`prebuild`) and loaded at runtime with
  `CESIUM_BASE_URL=/cesium/`. Cesium is **not** bundled: Next's minifier corrupts Cesium shader
  template strings ("Octal escape sequences are not allowed…").
- One viewer per mount; handlers, frame watchers and the viewer are destroyed on unmount
  (verified over repeated navigation, including React Strict Mode).

### Imagery and terrain (`lib/globe/cesium/providers.ts`)

| | With `NEXT_PUBLIC_CESIUM_ION_TOKEN` | Without token |
|---|---|---|
| Imagery | Cesium World Imagery (Bing Maps Aerial), sub-metre in many areas — no low-res layers underneath | NASA GIBS Blue Marble (≤ level 8, ~600 m) for the global view → Sentinel-2 cloudless 2024 by EOX (10 m, capped at its native level 14) from regional zoom |
| Terrain | Cesium World Terrain (vertex normals, water mask); heights **WGS84 ellipsoidal** | Esri World Elevation 3D (no key); heights **orthometric** (above sea level) |
| Closest camera distance | 150 m | 2,500 m — so 10 m imagery is never stretched into fake detail |

- Failed ion imagery or terrain falls back explicitly and the panel says so. If no terrain loads,
  the UI states "smooth ellipsoid, no relief" and no elevation is shown.
- Tile failures get one retry, then are counted and shown in the panel (not silently hidden).
- Esri terrain uses Web Mercator tiling (no data above ±85.05°); the polar holes are covered with
  the globe base colour.
- Terrain exaggeration is 1.0 (none). Elevation readouts state their datum; hover values are
  marked approximate (rendered mesh), selections are refined with the most detailed sample.

### Rendering quality (`lib/globe/cesium/quality.ts`)

| Profile | Pixel-ratio cap | Screen-space error | MSAA | Tile cache |
|---|---|---|---|---|
| High | 2 | 1.5 | 4× | 400 |
| Balanced | 1.5 | 2 | 2× | 200 |
| Performance | 1.5 | 3 | off (FXAA) | 100 |

Auto mode picks a profile from the WebGL renderer (software → Performance), device type and
memory/CPU, then steps down one level if the median frame time during camera movement exceeds
45 ms. Users can override it in the layer panel (remembered per browser). Profiles change only
rendering, never data values.

## Trade-offs

| | CesiumJS | MapLibre GL JS |
|---|---|---|
| True 3D globe, atmosphere, sun lighting | Native | Globe projection (v5+), lighter 3D |
| Real terrain | Quantized-mesh / ArcGIS elevation, collision detection | Raster-DEM terrain |
| Time-dynamic layers | Built-in clock / time-dynamic imagery | Manual |
| 3D columns, extruded data | Entities / primitives | fill-extrusion (2.5D) |
| Bundle / load | Heavy (~4 MB JS + workers, served statically) | Light (~800 kB) |
| Vector tiles & cartographic styling | Weaker | Excellent |
| Next.js integration | Static asset copy, client-only | Straightforward |

## Consequences

- **Visual:** real relief, atmosphere and lighting; strongest possible "wow" for the demo.
- **Cost:** heavier first load; WebGL required (error state otherwise, including GPU context loss).
- **Licences/attribution:** Cesium ion and Bing via the team's ion account terms; Esri World
  Elevation 3D terms of use; Sentinel-2 cloudless 2024 is CC BY-NC-SA 4.0 (non-commercial).
  All credits are shown on screen.
- **Scientific layers:** descriptors are engine-agnostic (`lib/globe/types.ts`). Data-bearing
  layers must carry `ScientificLayerMetadata` (variable, units, bounds, native resolution, time
  coverage, encoding, colour scale + domain, missing-data policy, source/version/DOI). Extruded
  heights are graphic encodings and are kept separate from physical terrain elevation; colour or
  height never implies significance. Visual tiles (e.g. GIBS) never replace the traceable
  analysis datasets served by the API. Adapters exist for imagery and GeoJSON; `raster-field`
  and `point-values` are typed and get adapters with the first real dataset.
- If 2D cartography (vector tiles, choropleths) becomes central, a MapLibre view could be added
  through the same descriptors — only with a new ADR.
