import type * as CesiumNS from "cesium";
import { DETAIL_BASE_IMAGERY, FALLBACK_BASE_IMAGERY, TERRAIN_FALLBACK } from "../catalog";
import type { GlobeStatus } from "../types";

type Cesium = typeof CesiumNS;

export interface TerrainResult {
  label: string;
  datum: NonNullable<GlobeStatus["terrain"]["datum"]>;
}

/** Counts tile failures (without retry storms) and reports them throttled. */
function countFailures(
  event: CesiumNS.Event,
  onCount: (n: number) => void,
): void {
  let failures = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  event.addEventListener((err: CesiumNS.TileProviderError) => {
    // One retry for transient network errors, then give up on that tile.
    err.retry = err.timesRetried < 1;
    if (err.retry) return;
    failures++;
    timer ??= setTimeout(() => {
      timer = undefined;
      onCount(failures);
    }, 500);
  });
}

/**
 * Base imagery. With an ion token: Cesium World Imagery (Bing Maps Aerial, sub-metre in many
 * areas) only — no low-resolution layers underneath. Without: NASA Blue Marble for the global
 * view plus Sentinel-2 cloudless (10 m) from regional zoom.
 */
export function createBaseImagery(
  Cesium: Cesium,
  token: string | undefined,
  onFailedTiles: (n: number) => void,
): { layers: CesiumNS.ImageryLayer[]; label: string; finestDetail: string; tier: "ion" | "fallback" } {
  if (token) {
    const layer = Cesium.ImageryLayer.fromWorldImagery({}); // default style: AERIAL
    layer.readyEvent.addEventListener((provider: CesiumNS.ImageryProvider) =>
      countFailures(provider.errorEvent, onFailedTiles),
    );
    return {
      layers: [layer],
      label: "Cesium World Imagery (Bing Maps Aerial)",
      finestDetail: "< 1 m in many areas (varies)",
      tier: "ion",
    };
  }
  return { ...createFallbackImagery(Cesium, onFailedTiles), tier: "fallback" };
}

export function createFallbackImagery(Cesium: Cesium, onFailedTiles: (n: number) => void) {
  const make = (cfg: typeof FALLBACK_BASE_IMAGERY | typeof DETAIL_BASE_IMAGERY, minimumTerrainLevel?: number) => {
    const provider = new Cesium.UrlTemplateImageryProvider({
      url: cfg.urlTemplate,
      maximumLevel: cfg.maximumLevel,
      credit: new Cesium.Credit(cfg.credit, true),
    });
    countFailures(provider.errorEvent, onFailedTiles);
    return new Cesium.ImageryLayer(provider, { minimumTerrainLevel });
  };
  return {
    layers: [make(FALLBACK_BASE_IMAGERY), make(DETAIL_BASE_IMAGERY, DETAIL_BASE_IMAGERY.minimumTerrainLevel)],
    label: `${FALLBACK_BASE_IMAGERY.title} → ${DETAIL_BASE_IMAGERY.title}`,
    finestDetail: DETAIL_BASE_IMAGERY.finestDetail,
  };
}

/**
 * Real terrain: Cesium World Terrain (ion; ellipsoidal heights, vertex normals for lighting) or
 * Esri World Elevation 3D (no key; orthometric heights). Returns null if neither loads — the
 * caller must then show the ellipsoid as "no terrain", never as topography.
 */
export async function loadTerrain(
  Cesium: Cesium,
  viewer: CesiumNS.Viewer,
  token: string | undefined,
  onFailedTiles: (n: number) => void,
): Promise<TerrainResult | null> {
  const sources: { result: TerrainResult; load: () => Promise<CesiumNS.TerrainProvider>; credit?: string }[] = [];
  if (token) {
    sources.push({
      result: { label: "Cesium World Terrain", datum: "ellipsoid-wgs84" },
      load: () => Cesium.createWorldTerrainAsync({ requestVertexNormals: true, requestWaterMask: true }),
    });
  }
  sources.push({
    result: { label: TERRAIN_FALLBACK.title, datum: "orthometric" },
    load: () => Cesium.ArcGISTiledElevationTerrainProvider.fromUrl(TERRAIN_FALLBACK.url),
    credit: TERRAIN_FALLBACK.credit,
  });
  for (const source of sources) {
    try {
      const provider = await source.load();
      if (viewer.isDestroyed()) return null;
      countFailures(provider.errorEvent, onFailedTiles);
      viewer.terrainProvider = provider;
      if (source.credit) viewer.creditDisplay.addStaticCredit(new Cesium.Credit(source.credit, true));
      if (provider.tilingScheme instanceof Cesium.WebMercatorTilingScheme) coverPoleHoles(Cesium, viewer);
      return source.result;
    } catch (err) {
      console.warn(`[globe] terrain "${source.result.label}" failed`, err);
    }
  }
  return null;
}

/**
 * Web Mercator terrain (Esri) stops at ±85.05°, leaving holes at the poles through which the
 * sky shows as a white disc. Imagery has no data there either, so cover them with the globe's
 * base colour — the same look as without terrain.
 */
function coverPoleHoles(Cesium: Cesium, viewer: CesiumNS.Viewer) {
  const material = viewer.scene.globe.baseColor;
  for (const [south, north] of [[85, 90], [-90, -85]]) {
    viewer.entities.add({
      rectangle: { coordinates: Cesium.Rectangle.fromDegrees(-180, south, 180, north), material, height: 0 },
    });
  }
}

/**
 * Terrain height at a point, or undefined if unavailable. Without `level` it uses the most
 * detailed data (selection readout); with `level` it is a fast, coarser sample (camera targets).
 */
export async function sampleTerrainHeight(
  Cesium: Cesium,
  viewer: CesiumNS.Viewer,
  latitude: number,
  longitude: number,
  level?: number,
): Promise<number | undefined> {
  const provider = viewer.terrainProvider;
  if (provider instanceof Cesium.EllipsoidTerrainProvider) return undefined;
  try {
    const points = [Cesium.Cartographic.fromDegrees(longitude, latitude)];
    const [p] =
      level === undefined
        ? await Cesium.sampleTerrainMostDetailed(provider, points)
        : await Cesium.sampleTerrain(provider, level, points);
    return Number.isFinite(p.height) ? p.height : undefined;
  } catch {
    return undefined;
  }
}
