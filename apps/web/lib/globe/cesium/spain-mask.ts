import type * as CesiumNS from "cesium";
import { SPAIN_IMAGERY_EXTENTS, SPAIN_RENDER_AREA_URL } from "../catalog";

type Cesium = typeof CesiumNS;
type Ring = [number, number][];

/**
 * Area rendered on the globe: Spain (mainland, Balearic and Canary Islands, Ceuta, Melilla) plus an
 * 200 nm sea band (visual context); one outer ring per polygon, lon/lat WGS84. Built by
 * scripts/build_web_boundary.py from Eurostat GISCO NUTS 2021 and GISCO Countries 2020.
 */
export interface SpainBoundary {
  rings: Ring[];
  /** Point-in-area test (ray casting over the simplified outline, ~300 m tolerance). */
  contains(longitude: number, latitude: number): boolean;
}

export async function loadSpainBoundary(): Promise<SpainBoundary> {
  const res = await fetch(SPAIN_RENDER_AREA_URL);
  if (!res.ok) throw new Error(`Spain boundary: HTTP ${res.status}`);
  const fc = (await res.json()) as {
    features: { geometry: { type: string; coordinates: number[][][] | number[][][][] } }[];
  };
  const rings: Ring[] = [];
  for (const { geometry: g } of fc.features) {
    const polys = (g.type === "Polygon" ? [g.coordinates] : g.coordinates) as number[][][][];
    for (const poly of polys) rings.push(poly[0] as Ring);
  }
  const boxes = rings.map((r) => {
    const xs = r.map((p) => p[0]);
    const ys = r.map((p) => p[1]);
    return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
  });
  return {
    rings,
    contains(x, y) {
      return rings.some((ring, i) => {
        const [w, s, e, n] = boxes[i];
        if (x < w || x > e || y < s || y > n) return false;
        let inside = false;
        for (let a = 0, b = ring.length - 1; a < ring.length; b = a++) {
          const [xa, ya] = ring[a];
          const [xb, yb] = ring[b];
          if (ya > y !== yb > y && x < ((xb - xa) * (y - ya)) / (yb - ya) + xa) inside = !inside;
        }
        return inside;
      });
    },
  };
}

/**
 * Clips the globe surface (imagery + terrain) outside the area. `enabled` toggles it (view mode).
 */
export function clipGlobeToSpain(
  Cesium: Cesium,
  viewer: CesiumNS.Viewer,
  boundary: SpainBoundary,
  enabled: boolean,
) {
  const { scene } = viewer;
  const polygons = boundary.rings.map(
    (ring) => new Cesium.ClippingPolygon({ positions: Cesium.Cartesian3.fromDegreesArray(ring.slice(0, -1).flat()) }),
  );
  scene.globe.clippingPolygons = new Cesium.ClippingPolygonCollection({
    polygons,
    enabled,
    inverse: true,
    // The clip texture spans ~3,000 km; 2× default keeps coasts crisp
    // at a quarter of the texture cost of 4×.
    quality: 2,
  });
  scene.requestRender();
}

/**
 * Mask for the flat 2D map, where globe clipping polygons don't render: an opaque ground polygon
 * per imagery extent with the rendered area cut out as holes, so only Spain (+ sea) shows.
 * (Outside the extents no imagery is requested, so only the globe base colour is visible.)
 */
export function createSpain2DMask(
  Cesium: Cesium,
  viewer: CesiumNS.Viewer,
  boundary: SpainBoundary,
  color: CesiumNS.Color,
): CesiumNS.Entity[] {
  const fromRing = (ring: Ring) => Cesium.Cartesian3.fromDegreesArray(ring.slice(0, -1).flat());
  return SPAIN_IMAGERY_EXTENTS.map(({ west, south, east, north }) => {
    const holes = boundary.rings
      .filter(([[x, y]]) => x > west && x < east && y > south && y < north)
      .map((r) => new Cesium.PolygonHierarchy(fromRing(r)));
    // Outer ring slightly larger than the extent and densified along parallels/meridians.
    const pad = 0.2;
    const outer: [number, number][] = [];
    const steps = 40;
    for (let i = 0; i <= steps; i++) outer.push([west - pad + ((east - west + 2 * pad) * i) / steps, south - pad]);
    for (let i = 0; i <= steps; i++) outer.push([east + pad, south - pad + ((north - south + 2 * pad) * i) / steps]);
    for (let i = 0; i <= steps; i++) outer.push([east + pad - ((east - west + 2 * pad) * i) / steps, north + pad]);
    for (let i = 0; i <= steps; i++) outer.push([west - pad, north + pad - ((north - south + 2 * pad) * i) / steps]);
    return viewer.entities.add({
      show: false,
      polygon: {
        hierarchy: new Cesium.PolygonHierarchy(Cesium.Cartesian3.fromDegreesArray(outer.flat()), holes),
        material: color,
        arcType: Cesium.ArcType.RHUMB,
        classificationType: Cesium.ClassificationType.TERRAIN,
      },
    });
  });
}
