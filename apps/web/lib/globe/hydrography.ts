import { HEATMAP_BOUNDS } from "./climate";

const HYDRO_URL = "/data/spain-hydrography.geojson";

interface HydroFeature {
  properties?: {
    hydro?: string;
    name?: string;
    area_km2?: number;
    latitude?: number;
    longitude?: number;
  };
  geometry?: {
    type: string;
    coordinates: unknown;
  };
}

const FILL: Record<string, string> = {
  reservoir: "rgba(125, 211, 230, 0.42)",
  lake: "rgba(147, 197, 253, 0.38)",
  lagoon: "rgba(153, 246, 228, 0.40)",
};
const STROKE: Record<string, string> = {
  reservoir: "rgba(165, 243, 252, 0.75)",
  lake: "rgba(186, 230, 253, 0.7)",
  lagoon: "rgba(167, 243, 208, 0.75)",
};

let cachedUrl: string | null = null;
let inflight: Promise<string> | null = null;

function project(lon: number, lat: number, width: number, height: number): [number, number] {
  const { west, south, east, north } = HEATMAP_BOUNDS;
  return [((lon - west) / (east - west)) * width, ((north - lat) / (north - south)) * height];
}

function lineLengthPx(coords: number[][], width: number, height: number): number {
  let len = 0;
  for (let i = 1; i < coords.length; i++) {
    const a = project(coords[i - 1][0], coords[i - 1][1], width, height);
    const b = project(coords[i][0], coords[i][1], width, height);
    len += Math.hypot(b[0] - a[0], b[1] - a[1]);
  }
  return len;
}

function strokeLine(
  ctx: CanvasRenderingContext2D,
  coords: number[][],
  width: number,
  height: number,
) {
  if (!coords || coords.length < 2) return;
  ctx.beginPath();
  for (let i = 0; i < coords.length; i++) {
    const pt = coords[i];
    if (!pt || pt.length < 2) continue;
    const [x, y] = project(pt[0], pt[1], width, height);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
}

function pathRings(ctx: CanvasRenderingContext2D, rings: number[][][], width: number, height: number) {
  for (const ring of rings) {
    if (!ring || ring.length < 3) continue;
    for (let i = 0; i < ring.length; i++) {
      const pt = ring[i];
      if (!pt || pt.length < 2) continue;
      const [x, y] = project(pt[0], pt[1], width, height);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
  }
}

function polygonPixelRadius(geom: NonNullable<HydroFeature["geometry"]>, width: number, height: number): number {
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  const walk = (pt: number[]) => {
    const [x, y] = project(pt[0], pt[1], width, height);
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  };
  if (geom.type === "Polygon") {
    for (const ring of geom.coordinates as number[][][]) for (const pt of ring) walk(pt);
  } else if (geom.type === "MultiPolygon") {
    for (const poly of geom.coordinates as number[][][][]) for (const ring of poly) for (const pt of ring) walk(pt);
  }
  return Math.max(maxX - minX, maxY - minY) / 2;
}

/** Fine atlas-style water overlay (PNG tile stacked like the climate heatmap). */
export function renderHydrographyDataUrl(): Promise<string> {
  if (cachedUrl) return Promise.resolve(cachedUrl);
  if (inflight) return inflight;
  inflight = (async () => {
    const res = await fetch(HYDRO_URL);
    if (!res.ok) throw new Error(`Hydrography GeoJSON HTTP ${res.status}`);
    const fc = (await res.json()) as { features?: HydroFeature[] };
    const features = fc.features ?? [];

    const width = 1600;
    const height = 1190;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    const water = features.filter((f) => {
      const t = f.geometry?.type;
      return t === "Polygon" || t === "MultiPolygon";
    });
    const rivers = features.filter((f) => {
      const t = f.geometry?.type;
      return t === "LineString" || t === "MultiLineString";
    });

    for (const f of water) {
      const hydro = f.properties?.hydro ?? "lake";
      const geom = f.geometry!;
      const pxR = polygonPixelRadius(geom, width, height);
      ctx.fillStyle = FILL[hydro] ?? FILL.lake;
      ctx.strokeStyle = STROKE[hydro] ?? STROKE.lake;
      ctx.lineWidth = 0.7;

      if (pxR < 2.4) {
        const lat = f.properties?.latitude;
        const lon = f.properties?.longitude;
        if (typeof lat !== "number" || typeof lon !== "number") continue;
        const [x, y] = project(lon, lat, width, height);
        const r = Math.min(3.2, Math.max(1.7, pxR));
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        continue;
      }

      ctx.beginPath();
      if (geom.type === "Polygon") pathRings(ctx, geom.coordinates as number[][][], width, height);
      else for (const poly of geom.coordinates as number[][][][]) pathRings(ctx, poly, width, height);
      ctx.fill();
      ctx.stroke();
    }

    const riverParts: { coords: number[][]; len: number }[] = [];
    for (const f of rivers) {
      const geom = f.geometry!;
      const parts =
        geom.type === "LineString"
          ? [geom.coordinates as number[][]]
          : (geom.coordinates as number[][][]);
      for (const line of parts) {
        riverParts.push({ coords: line, len: lineLengthPx(line, width, height) });
      }
    }
    riverParts.sort((a, b) => a.len - b.len);

    for (const { coords, len } of riverParts) {
      const halo = len > 180 ? 3.2 : 2.4;
      const core = len > 180 ? 1.35 : 0.95;
      ctx.shadowBlur = 0;
      ctx.strokeStyle = "rgba(125, 211, 252, 0.22)";
      ctx.lineWidth = halo;
      strokeLine(ctx, coords, width, height);
      ctx.strokeStyle = len > 180 ? "rgba(186, 230, 253, 0.88)" : "rgba(165, 216, 245, 0.72)";
      ctx.lineWidth = core;
      strokeLine(ctx, coords, width, height);
    }

    cachedUrl = canvas.toDataURL("image/png");
    return cachedUrl;
  })();
  return inflight;
}
