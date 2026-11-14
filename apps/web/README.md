# apps/web

Frontend: Next.js 15 (App Router) · TypeScript · Tailwind CSS v4 · CesiumJS 3D globe.
Deployed on Vercel. UI guidelines: [docs/UX_UI_RULES.md](../../docs/UX_UI_RULES.md).
Globe engine decision: [ADR-001](../../docs/adr/001-cesium-globe.md).

## Run

```bash
cd apps/web
npm install
cp .env.example .env.local   # optional: add NEXT_PUBLIC_CESIUM_ION_TOKEN for terrain
npm run dev                  # http://localhost:3000/explore
```

`predev`/`prebuild` copy Cesium's runtime files to `public/cesium/` (git-ignored).

Checks: `npm run lint` · `npm run typecheck` · `npm run build`.

## Imagery, terrain and quality

| `NEXT_PUBLIC_CESIUM_ION_TOKEN` | Imagery | Terrain (heights) |
|---|---|---|
| not set | NASA Blue Marble (global) → Sentinel-2 cloudless 2024 by EOX, 10 m (CC BY-NC-SA 4.0) | Esri World Elevation 3D (above sea level) |
| set | Cesium World Imagery (Bing Maps Aerial) | Cesium World Terrain (WGS84 ellipsoidal) |

Get a free token at https://ion.cesium.com/tokens and put it in `.env.local`. It ships to the
browser by design; restrict it to your domains in Cesium ion. Without a token, zoom stops 2.5 km
from the ground so the 10 m imagery is not shown stretched.

Rendering quality: **Layers → Globe → Rendering** (Auto / High / Balanced / Performance). Details
and rationale: [ADR-001](../../docs/adr/001-cesium-globe.md).

In development, `window.__globe` exposes `{ controller, viewer, Cesium }` for debugging.

## Structure

```text
app/explore/page.tsx           /explore route
components/explore/            UI overlays: nav, layer panel, coordinates, camera, evidence
components/globe/Globe.tsx     Cesium viewer lifecycle (client-only, via GlobeClient)
lib/globe/types.ts             engine-agnostic types (layers, views, controller)
lib/globe/catalog.ts           layer catalog + camera views (Spain, home)
lib/globe/cesium/              loader, providers (imagery/terrain), quality, layer manager, picking, camera
```

## Adding a layer

1. Add a descriptor to `buildLayerCatalog()` in `lib/globe/catalog.ts` (`kind: "imagery"` for
   XYZ/WMTS tiles — use `{Time}` for dated layers — or `kind: "geojson"`).
2. Data-bearing layers (`raster-field`, `point-values`) must carry `science` metadata (units,
   bounds, native resolution, time coverage, colour scale, missing-data policy). Their Cesium
   adapters are added in `lib/globe/cesium/layer-manager.ts` with the first real dataset.
3. Mark placeholder data with `synthetic: true` — the panel labels it.
