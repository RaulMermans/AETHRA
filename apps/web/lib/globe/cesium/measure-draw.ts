import type * as CesiumNS from "cesium";
import { circle, compassPoint, destination, formatArea, formatDistance, geodesic, offset, pathLength, polygonArea } from "../measure";
import type { GeoCoordinate, MeasureState } from "../types";

type Cesium = typeof CesiumNS;

const COLORS = { line: "#7cc4ff", y: "#8be38f", x: "#f5c26b" } as const;

/**
 * Draws the active measurement into `ds` (replacing what was there), with labels:
 * - distance / profile: geodesic A→B;
 * - offset: right-angle path A→corner→B (Y along the meridian, X along the parallel);
 * - area: polygon through the clicked vertices (geodesic edges);
 * - radius: geodesic circle around the centre through the second point.
 * While a measurement is incomplete the cursor position is used as a dashed preview.
 */
export function drawMeasure(Cesium: Cesium, ds: CesiumNS.CustomDataSource, m: MeasureState | null) {
  ds.entities.removeAll();
  if (!m) return;
  const color = (c: string, a = 1) => Cesium.Color.fromCssColorString(c).withAlpha(a);
  const pos = (p: { latitude: number; longitude: number }) => Cesium.Cartesian3.fromDegrees(p.longitude, p.latitude);
  const carto = (p: { latitude: number; longitude: number }) => Cesium.Cartographic.fromDegrees(p.longitude, p.latitude);

  const point = (p: GeoCoordinate, text: string) =>
    ds.entities.add({
      position: pos(p),
      point: {
        pixelSize: 9,
        color: color(COLORS.line),
        outlineColor: Cesium.Color.WHITE,
        outlineWidth: 2,
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
      label: text ? label(text, new Cesium.Cartesian2(0, -16)) : undefined,
    });

  const label = (
    text: string,
    pixelOffset = new Cesium.Cartesian2(0, 0),
    fill = "#e8edf3",
    horizontalOrigin: CesiumNS.HorizontalOrigin = Cesium.HorizontalOrigin.CENTER,
  ) => ({
    text,
    horizontalOrigin,
    font: "600 12px ui-sans-serif, system-ui, sans-serif",
    fillColor: color(fill),
    showBackground: true,
    backgroundColor: color("#03050a", 0.82),
    backgroundPadding: new Cesium.Cartesian2(6, 4),
    pixelOffset,
    heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
    disableDepthTestDistance: Number.POSITIVE_INFINITY,
  });

  const line = (
    a: { latitude: number; longitude: number },
    b: { latitude: number; longitude: number },
    c: string,
    opts: {
      rhumb?: boolean;
      dashed?: boolean;
      width?: number;
      text?: string;
      alpha?: number;
      /** Label placement next to the segment midpoint, so it doesn't cover the A/B labels. */
      labelAt?: "center" | "left" | "above";
    } = {},
  ) => {
    const material = opts.dashed
      ? new Cesium.PolylineDashMaterialProperty({ color: color(c, opts.alpha ?? 1), dashLength: 14 })
      : new Cesium.ColorMaterialProperty(color(c, opts.alpha ?? 1));
    ds.entities.add({
      polyline: {
        positions: [pos(a), pos(b)],
        clampToGround: true,
        arcType: opts.rhumb ? Cesium.ArcType.RHUMB : Cesium.ArcType.GEODESIC,
        width: opts.width ?? 3,
        material,
      },
    });
    if (!opts.text) return;
    const mid = opts.rhumb
      ? new Cesium.EllipsoidRhumbLine(carto(a), carto(b)).interpolateUsingFraction(0.5)
      : new Cesium.EllipsoidGeodesic(carto(a), carto(b)).interpolateUsingFraction(0.5);
    ds.entities.add({
      position: Cesium.Cartesian3.fromRadians(mid.longitude, mid.latitude),
      label:
        opts.labelAt === "left"
          ? label(opts.text, new Cesium.Cartesian2(-12, 0), c, Cesium.HorizontalOrigin.RIGHT)
          : opts.labelAt === "above"
            ? label(opts.text, new Cesium.Cartesian2(0, -16), c)
            : label(opts.text, undefined, c),
    });
  };

  const fill = (pts: { latitude: number; longitude: number }[], c: string, alpha: number) =>
    ds.entities.add({
      polygon: {
        hierarchy: new Cesium.PolygonHierarchy(pts.map(pos)),
        arcType: Cesium.ArcType.GEODESIC,
        material: color(c, alpha),
        classificationType: Cesium.ClassificationType.BOTH,
      },
    });

  if (m.tool === "area") {
    const live = !m.closed && m.preview ? [...m.points, m.preview] : m.points;
    m.points.forEach((p) =>
      ds.entities.add({
        position: pos(p),
        point: {
          pixelSize: 7,
          color: color(COLORS.line),
          outlineColor: Cesium.Color.WHITE,
          outlineWidth: 1.5,
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
      }),
    );
    for (let i = 1; i < live.length; i++) line(live[i - 1], live[i], COLORS.line, { dashed: !m.closed && i === live.length - 1 && !!m.preview });
    if (live.length >= 3) {
      line(live[live.length - 1], live[0], COLORS.line, { dashed: !m.closed, alpha: m.closed ? 1 : 0.6 });
      fill(live, COLORS.line, m.closed ? 0.22 : 0.12);
      const c = live.reduce((acc, p) => ({ latitude: acc.latitude + p.latitude / live.length, longitude: acc.longitude + p.longitude / live.length }), { latitude: 0, longitude: 0 });
      ds.entities.add({ position: pos(c), label: label(formatArea(polygonArea(live))) });
    } else if (live.length === 2) {
      ds.entities.add({ position: pos(live[1]), label: label(formatDistance(pathLength(live)), new Cesium.Cartesian2(0, -16)) });
    }
    return;
  }

  if (m.tool === "radius") {
    const center = m.points[0];
    if (!center) return;
    point(center, "");
    const edge = m.points[1] ?? m.preview;
    if (!edge) return;
    const r = geodesic(center, edge).metres;
    if (r <= 0) return;
    const ring = Array.from({ length: 128 }, (_, i) => destination(center, (i * 360) / 128, r));
    fill(ring, COLORS.line, m.points[1] ? 0.15 : 0.08);
    ds.entities.add({
      polyline: {
        positions: [...ring, ring[0]].map(pos),
        clampToGround: true,
        arcType: Cesium.ArcType.GEODESIC,
        width: 2.5,
        material: m.points[1]
          ? new Cesium.ColorMaterialProperty(color(COLORS.line))
          : new Cesium.PolylineDashMaterialProperty({ color: color(COLORS.line), dashLength: 14 }),
      },
    });
    line(center, edge, COLORS.line, { dashed: true, width: 2, text: `r ${formatDistance(r)} · ${formatArea(circle(r).area)}` });
    return;
  }

  m.points.forEach((p, i) => point(p, i === 0 ? "A" : "B"));
  const b = m.points[1] ?? (m.points.length === 1 ? m.preview : null);
  if (!b) return;
  const a = m.points[0];
  const preview = m.points.length < 2;

  if (m.tool === "distance" || m.tool === "profile") {
    const g = geodesic(a, b);
    line(a, b, COLORS.line, {
      dashed: preview,
      text: `${formatDistance(g.metres)} · ${g.bearingDeg.toFixed(0)}° ${compassPoint(g.bearingDeg)}`,
    });
  } else {
    const o = offset(a, b);
    line(a, b, COLORS.line, { dashed: true, width: 2, alpha: 0.6 });
    line(a, o.corner, COLORS.y, {
      dashed: preview,
      labelAt: "left",
      text: `Y ${formatDistance(o.northSouthMetres)} ${o.dLatDeg >= 0 ? "N" : "S"}`,
    });
    line(o.corner, b, COLORS.x, {
      rhumb: true,
      dashed: preview,
      labelAt: "above",
      text: `X ${formatDistance(o.eastWestMetres)} ${o.dLonDeg >= 0 ? "E" : "W"}`,
    });
  }
}
