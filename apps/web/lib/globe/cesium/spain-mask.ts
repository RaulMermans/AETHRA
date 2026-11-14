import type * as CesiumNS from "cesium";
import { CAMERA_BOUNDS, SPAIN_BOUNDARY_URL } from "../catalog";

type Cesium = typeof CesiumNS;
type Ring = [number, number][];

/**
 * Spain outline (mainland, Balearic and Canary Islands, Ceuta, Melilla), one outer ring per
 * polygon, lon/lat WGS84. Built by scripts/build_web_boundary.py from Eurostat GISCO NUTS 2021.
 */
export interface SpainBoundary {
  rings: Ring[];
  /** Point-in-Spain test (ray casting over the simplified outline, ~300 m tolerance). */
  contains(longitude: number, latitude: number): boolean;
}

export async function loadSpainBoundary(): Promise<SpainBoundary> {
  const res = await fetch(SPAIN_BOUNDARY_URL);
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
 * Keeps the camera position inside CAMERA_BOUNDS (lon/lat), preserving height and orientation,
 * so the view cannot drift away from Spain. Returns a function that removes the constraint.
 */
export function constrainCameraToSpain(Cesium: Cesium, viewer: CesiumNS.Viewer): () => void {
  const { camera } = viewer.scene;
  const { west, south, east, north } = CAMERA_BOUNDS;
  return viewer.scene.preUpdate.addEventListener(() => {
    const c = camera.positionCartographic;
    const lon = Cesium.Math.toDegrees(c.longitude);
    const lat = Cesium.Math.toDegrees(c.latitude);
    const clampedLon = Math.min(east, Math.max(west, lon));
    const clampedLat = Math.min(north, Math.max(south, lat));
    if (clampedLon === lon && clampedLat === lat) return;
    camera.setView({
      destination: Cesium.Cartesian3.fromDegrees(clampedLon, clampedLat, c.height),
      orientation: { heading: camera.heading, pitch: camera.pitch, roll: camera.roll },
    });
  });
}

/**
 * Renders only Spain: the globe surface (imagery + terrain) outside the outline is clipped
 * away. The sky atmosphere halo is hidden because there is no full Earth disc behind it.
 */
export function clipGlobeToSpain(Cesium: Cesium, viewer: CesiumNS.Viewer, boundary: SpainBoundary) {
  const { scene } = viewer;
  const polygons = boundary.rings.map(
    (ring) => new Cesium.ClippingPolygon({ positions: Cesium.Cartesian3.fromDegreesArray(ring.slice(0, -1).flat()) }),
  );
  scene.globe.clippingPolygons = new Cesium.ClippingPolygonCollection({
    polygons,
    inverse: true,
    // The clip texture spans Canarias → Balearics (~2,300 km); 2× default keeps coasts crisp
    // at a quarter of the texture cost of 4×.
    quality: 2,
  });
  scene.globe.showGroundAtmosphere = false;
  if (scene.skyAtmosphere) scene.skyAtmosphere.show = false;
  scene.requestRender();
}
