import type * as CesiumNS from "cesium";
import type { GeoCoordinate, OverlayFeature } from "../types";
import type { OverlayEntity } from "./layer-manager";
import type { TerrainResult } from "./providers";

type Cesium = typeof CesiumNS;

/**
 * Converts a screen position to a WGS84 coordinate on the globe surface.
 * Tries the rendered surface (terrain, if loaded) first, then the ellipsoid.
 * Returns null for sky, off-globe or otherwise invalid intersections.
 * Elevation is attached only when real terrain is loaded, read from the rendered mesh
 * (`approximate: true`); use sampleTerrainHeight for the most detailed value.
 */
export function pickCoordinate(
  Cesium: Cesium,
  viewer: CesiumNS.Viewer,
  position: CesiumNS.Cartesian2 | undefined,
  terrain: TerrainResult | null,
): GeoCoordinate | null {
  if (!position || viewer.isDestroyed()) return null;
  const { scene } = viewer;
  if (scene.mode === Cesium.SceneMode.MORPHING) return null; // mid 2D↔3D transition

  let cartesian: CesiumNS.Cartesian3 | undefined;
  let onTerrain = false;
  const ray = scene.camera.getPickRay(position);
  if (ray) {
    cartesian = scene.globe.pick(ray, scene);
    onTerrain = cartesian !== undefined;
  }
  if (!cartesian) cartesian = scene.camera.pickEllipsoid(position, scene.globe.ellipsoid);
  if (!cartesian) return null;

  const carto = Cesium.Cartographic.fromCartesian(cartesian);
  if (!carto) return null;
  const latitude = Cesium.Math.toDegrees(carto.latitude);
  const longitude = Cesium.Math.toDegrees(Cesium.Math.negativePiToPi(carto.longitude));
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;

  if (!terrain || !onTerrain || !Number.isFinite(carto.height)) return { latitude, longitude };
  // The rendered mesh is scaled by the vertical exaggeration (relative to 0 m): report true height.
  const metres = carto.height / (scene.verticalExaggeration || 1);
  return {
    latitude,
    longitude,
    elevation: { metres, datum: terrain.datum, source: terrain.label, approximate: true },
  };
}

/** Picks a station / basin / river overlay entity under the cursor, if any. */
export function pickOverlayFeature(
  Cesium: Cesium,
  viewer: CesiumNS.Viewer,
  position: CesiumNS.Cartesian2 | undefined,
): OverlayFeature | null {
  if (!position || viewer.isDestroyed()) return null;
  const picked = viewer.scene.pick(position, 16, 16);
  if (!Cesium.defined(picked) || !picked.id) return null;
  const entity = picked.id as OverlayEntity;
  return entity.overlay ?? null;
}
