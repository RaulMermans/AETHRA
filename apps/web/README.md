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

## Cesium ion token (optional)

| Token | Base imagery | Terrain |
|---|---|---|
| none | NASA GIBS Blue Marble (500 m) | off (smooth ellipsoid) |
| `NEXT_PUBLIC_CESIUM_ION_TOKEN` set | Cesium World Imagery | Cesium World Terrain |

The token is public by design (it ships to the browser); restrict it to your domains in Cesium ion.

## Structure

```text
app/explore/page.tsx           /explore route
components/explore/            UI overlays: nav, layer panel, coordinates, camera, evidence
components/globe/Globe.tsx     Cesium viewer lifecycle (client-only, via GlobeClient)
lib/globe/types.ts             engine-agnostic types (layers, views, controller)
lib/globe/catalog.ts           layer catalog + camera views (Spain, home)
lib/globe/cesium/              Cesium adapters: loader, layer manager, picking, camera
```

## Adding a layer

1. Add a descriptor to `buildLayerCatalog()` in `lib/globe/catalog.ts` (`kind: "imagery"` for
   XYZ/WMTS tiles — use `{Time}` for dated layers — or `kind: "geojson"`).
2. New kinds (raster, heatmap, columns): extend `LayerDescriptor` in `types.ts` and add one adapter
   in `lib/globe/cesium/layer-manager.ts`.
3. Mark placeholder data with `synthetic: true` — the panel labels it.
