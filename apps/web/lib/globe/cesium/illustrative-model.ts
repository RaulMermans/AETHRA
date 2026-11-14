/**
 * Stylized plant symbols from Cesium geometry (original, no third-party glTF).
 * Sizes are exaggerated so the symbol is readable on the globe — not surveyed hub height or layout.
 */

import type * as CesiumNS from "cesium";
import { plantMarkerImage } from "./marker-icons";

export const ILLUSTRATIVE_TURBINE_HEIGHT_M = 220;
export const ILLUSTRATIVE_ROTOR_RADIUS_M = 70;
export const ILLUSTRATIVE_DISCLAIMER =
  "Illustrative 3D — not an exact reconstruction. Height is exaggerated so you can see it.";
export const CONCEPTUAL_DISCLAIMER =
  "Conceptual / Not a real project. Style preview only; not a proposed plant.";

export interface IllustrativeAssetView {
  installationId: string;
  latitude: number;
  longitude: number;
  technology: "wind_onshore" | "solar_pv";
  appearance: "existing" | "conceptual";
  conceptualOpacity: number;
}

type Cesium = typeof CesiumNS;

let placeGeneration = 0;

async function sampleGroundM(Cesium: Cesium, viewer: CesiumNS.Viewer, lat: number, lon: number): Promise<number> {
  const provider = viewer.terrainProvider;
  if (!provider || provider instanceof Cesium.EllipsoidTerrainProvider) return 0;
  try {
    const sampled = await Cesium.sampleTerrainMostDetailed(provider, [Cesium.Cartographic.fromDegrees(lon, lat)]);
    const h = sampled[0]?.height;
    return typeof h === "number" && Number.isFinite(h) ? h : 0;
  } catch {
    return 0;
  }
}

function colours(Cesium: Cesium, ghost: boolean, alpha: number): { fill: CesiumNS.Color; accent: CesiumNS.Color } {
  if (ghost) {
    return {
      fill: Cesium.Color.fromCssColorString("#94a3b8").withAlpha(alpha),
      accent: Cesium.Color.fromCssColorString("#38bdf8").withAlpha(alpha * 0.7),
    };
  }
  return {
    fill: Cesium.Color.fromCssColorString("#f8fafc").withAlpha(0.98),
    accent: Cesium.Color.fromCssColorString("#2dd4bf").withAlpha(0.92),
  };
}

/** Rebuilds the illustrative plant in `source`. */
export async function syncIllustrativeWindTurbine(
  Cesium: Cesium,
  viewer: CesiumNS.Viewer,
  source: CesiumNS.CustomDataSource,
  asset: IllustrativeAssetView | null,
): Promise<void> {
  const gen = ++placeGeneration;
  source.entities.removeAll();
  if (!asset) {
    viewer.scene.requestRender();
    return;
  }

  const ground = await sampleGroundM(Cesium, viewer, asset.latitude, asset.longitude);
  if (gen !== placeGeneration || viewer.isDestroyed()) return;

  const ghost = asset.appearance === "conceptual";
  const alpha = ghost ? Math.min(0.75, Math.max(0.18, asset.conceptualOpacity)) : 1;
  const { fill, accent } = colours(Cesium, ghost, alpha);
  const far = new Cesium.DistanceDisplayCondition(0, 90_000);
  const { longitude: lon, latitude: lat } = asset;

  source.entities.add({
    id: "illustrative-plant-ring",
    position: Cesium.Cartesian3.fromDegrees(lon, lat, ground + 2),
    ellipse: {
      semiMajorAxis: 90,
      semiMinorAxis: 90,
      material: accent.withAlpha(ghost ? 0.2 : 0.35),
      outline: true,
      outlineColor: Cesium.Color.WHITE.withAlpha(0.85),
      outlineWidth: 3,
      height: ground + 2,
    },
  });

  if (asset.technology === "solar_pv") {
    const deck = 4;
    source.entities.add({
      id: "illustrative-pv-deck",
      position: Cesium.Cartesian3.fromDegrees(lon, lat, ground + deck / 2 + 1),
      box: {
        dimensions: new Cesium.Cartesian3(80, 48, deck),
        material: Cesium.Color.fromCssColorString("#fbbf24").withAlpha(ghost ? alpha : 0.92),
        outline: true,
        outlineColor: Cesium.Color.WHITE.withAlpha(0.7),
      },
    });
  } else {
    const tower = ILLUSTRATIVE_TURBINE_HEIGHT_M;
    const hub = ground + tower - 8;
    source.entities.add({
      id: "illustrative-turbine-tower",
      name: ghost ? "Conceptual wind turbine" : "Illustrative wind turbine",
      position: Cesium.Cartesian3.fromDegrees(lon, lat, ground + tower / 2),
      cylinder: {
        length: tower,
        topRadius: 5,
        bottomRadius: 11,
        material: fill,
        outline: true,
        outlineColor: Cesium.Color.WHITE.withAlpha(0.8),
        distanceDisplayCondition: far,
      },
    });
    source.entities.add({
      id: "illustrative-turbine-hub",
      position: Cesium.Cartesian3.fromDegrees(lon, lat, hub),
      ellipsoid: {
        radii: new Cesium.Cartesian3(8, 8, 8),
        material: accent,
        distanceDisplayCondition: far,
      },
    });
    source.entities.add({
      id: "illustrative-turbine-rotor",
      position: Cesium.Cartesian3.fromDegrees(lon, lat, hub),
      ellipsoid: {
        radii: new Cesium.Cartesian3(5, ILLUSTRATIVE_ROTOR_RADIUS_M, ILLUSTRATIVE_ROTOR_RADIUS_M),
        material: accent.withAlpha(ghost ? alpha * 0.5 : 0.55),
        outline: true,
        outlineColor: Cesium.Color.WHITE.withAlpha(0.75),
        distanceDisplayCondition: far,
      },
    });
  }

  source.entities.add({
    id: "illustrative-plant-label",
    position: Cesium.Cartesian3.fromDegrees(lon, lat, ground + (asset.technology === "solar_pv" ? 40 : ILLUSTRATIVE_TURBINE_HEIGHT_M + 30)),
    label: {
      text: ghost ? CONCEPTUAL_DISCLAIMER : ILLUSTRATIVE_DISCLAIMER,
      font: "600 13px sans-serif",
      fillColor: Cesium.Color.WHITE,
      outlineColor: Cesium.Color.fromCssColorString("#0b1424"),
      outlineWidth: 5,
      style: Cesium.LabelStyle.FILL_AND_OUTLINE,
      pixelOffset: new Cesium.Cartesian2(0, -28),
      showBackground: true,
      backgroundColor: Cesium.Color.fromCssColorString("#0b1424").withAlpha(0.78),
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
      distanceDisplayCondition: far,
    },
    billboard: {
      image: plantMarkerImage(asset.technology === "solar_pv" ? "solar" : "wind", asset.technology === "solar_pv" ? "#fbbf24" : "#2dd4bf"),
      width: 36,
      height: 36,
      verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
      pixelOffset: new Cesium.Cartesian2(0, 18),
    },
  });

  viewer.scene.requestRender();
}
