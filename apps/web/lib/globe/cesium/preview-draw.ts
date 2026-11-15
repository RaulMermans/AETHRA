import type * as CesiumNS from "cesium";
import type { PreviewPoint } from "../types";

type Cesium = typeof CesiumNS;

const RING = "#ffffff";
const FOCUS = "#f5c26b";

/**
 * Draws list-preview locations into `ds` (replacing what was there): a small ring per point and,
 * for the focused one, a larger amber point with its name. Heights use the point's own elevation
 * times the scene's vertical exaggeration (as the selected-location marker does), and depth
 * testing is off so the rings stay visible behind relief.
 */
export function drawPreview(
  Cesium: Cesium,
  ds: CesiumNS.CustomDataSource,
  points: readonly PreviewPoint[],
  exaggeration: number,
) {
  ds.entities.removeAll();
  const color = (c: string, a = 1) => Cesium.Color.fromCssColorString(c).withAlpha(a);
  // Focused point last so it draws on top of neighbours.
  const ordered = [...points].sort((a, b) => Number(a.focus) - Number(b.focus));
  for (const p of ordered) {
    ds.entities.add({
      position: Cesium.Cartesian3.fromDegrees(p.longitude, p.latitude, p.heightMetres * exaggeration),
      point: p.focus
        ? {
            pixelSize: 13,
            color: color(FOCUS),
            outlineColor: color(RING),
            outlineWidth: 2.5,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          }
        : {
            pixelSize: 8,
            color: color(RING, 0.15),
            outlineColor: color(RING, 0.85),
            outlineWidth: 1.5,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
      label: p.focus
        ? {
            text: p.label,
            font: "600 12px ui-sans-serif, system-ui, sans-serif",
            fillColor: color("#e8edf3"),
            showBackground: true,
            backgroundColor: color("#03050a", 0.82),
            backgroundPadding: new Cesium.Cartesian2(6, 4),
            pixelOffset: new Cesium.Cartesian2(0, -18),
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          }
        : undefined,
    });
  }
}
