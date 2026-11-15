/**
 * Relationship maps (docs/RELATIONSHIP_MAPS.md, D74). Render-only: every rho, p, q, label and summary
 * count comes from scripts/build_relationship_maps.py. The browser formats and colours values; it
 * computes no statistic and applies no threshold.
 */

import {
  HEATMAP_BOUNDS,
  loadSpainMultiPolygon,
  samplePalette,
  samplePaletteCss,
  type PaletteId,
} from "./climate";

export const RELATION_MAP_IDS = ["agreement", "trend-gap", "temp-precip", "heat-drought"] as const;
export type RelationMapId = (typeof RELATION_MAP_IDS)[number];

export function isRelationMapId(v: string): v is RelationMapId {
  return (RELATION_MAP_IDS as readonly string[]).includes(v);
}

export type RelationLabel = "robust" | "not-robust" | "insufficient";

interface CorrelationFields {
  readonly rho: number | null;
  readonly p_value: number | null;
  readonly q_value_bh: number | null;
  readonly n: number | null;
  readonly label: RelationLabel;
}

export interface CouplingCell extends CorrelationFields {
  readonly lat: number;
  readonly lon: number;
  readonly gpm_coverage: number;
}

export interface CompoundStation extends CorrelationFields {
  readonly id: string;
  readonly name: string;
  readonly lat: number;
  readonly lon: number;
  readonly elevation_m: number;
  readonly paired_years: number;
}

export interface AgreementPair {
  readonly id: string;
  readonly name: string;
  readonly lat: number;
  readonly lon: number;
  readonly elevation_m: number;
  readonly n_years: number;
  readonly pearson_r_annual: number;
  readonly slope_diff_cell_minus_station: number;
  readonly station_slope: number;
  readonly merra2_slope: number;
}

interface CorrelationSummary {
  readonly n_tested: number;
  readonly n_robust: number;
  readonly rho_median: number;
  readonly n_tested_negative: number;
  readonly n_tested_positive: number;
  readonly q_min: number;
}

interface MapBlockBase {
  readonly status: string;
  readonly datasets: string;
  readonly period: string;
  readonly method?: string;
  readonly variables?: string;
}

export interface RelationshipsFile {
  readonly bundle_version: string;
  readonly do_not_conclude: string;
  readonly r1_validation: MapBlockBase & {
    readonly summary: { readonly n_stations: number; readonly pearson_r_median: number; readonly slope_diff_median: number; readonly sign_agreement: number };
    readonly pairs: readonly AgreementPair[];
  };
  readonly r2_temp_precip: MapBlockBase & {
    readonly cell_size_deg: readonly [number, number];
    readonly summary: CorrelationSummary & { readonly n_cells: number };
    readonly cells: readonly CouplingCell[];
  };
  readonly r3_heat_drought: MapBlockBase & {
    readonly summary: CorrelationSummary & { readonly n_stations: number };
    readonly stations: readonly CompoundStation[];
  };
}

// --- Boundary validation -----------------------------------------------------------------

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const isNumOrNull = (v: unknown): boolean => v === null || isNum(v);
const isLabel = (v: unknown): v is RelationLabel => v === "robust" || v === "not-robust" || v === "insufficient";

function isCorrelation(v: Record<string, unknown>): boolean {
  return isNumOrNull(v.rho) && isNumOrNull(v.p_value) && isNumOrNull(v.q_value_bh) && isNumOrNull(v.n) && isLabel(v.label);
}

function isBlock(v: unknown): v is Record<string, unknown> {
  return isObj(v) && typeof v.status === "string" && typeof v.datasets === "string" && typeof v.period === "string" && isObj(v.summary);
}

export function isRelationshipsFile(raw: unknown): raw is RelationshipsFile {
  if (!isObj(raw) || raw.bundle_version !== "relationships/v1" || typeof raw.do_not_conclude !== "string") return false;
  const r1 = raw.r1_validation;
  const r2 = raw.r2_temp_precip;
  const r3 = raw.r3_heat_drought;
  if (!isBlock(r1) || !isBlock(r2) || !isBlock(r3)) return false;
  if (!Array.isArray(r1.pairs) || !Array.isArray(r2.cells) || !Array.isArray(r3.stations)) return false;
  const pairsOk = r1.pairs.every(
    (p: unknown) => isObj(p) && isNum(p.lat) && isNum(p.lon) && isNum(p.pearson_r_annual) && isNum(p.slope_diff_cell_minus_station),
  );
  const cellsOk = r2.cells.every((c: unknown) => isObj(c) && isNum(c.lat) && isNum(c.lon) && isCorrelation(c));
  const stationsOk = r3.stations.every(
    (s: unknown) => isObj(s) && typeof s.name === "string" && isNum(s.lat) && isNum(s.lon) && isCorrelation(s),
  );
  const size = r2.cell_size_deg;
  return pairsOk && cellsOk && stationsOk && Array.isArray(size) && size.length === 2 && size.every(isNum);
}

let filePromise: Promise<RelationshipsFile> | null = null;

export function loadRelationships(): Promise<RelationshipsFile> {
  if (!filePromise) {
    filePromise = fetch("/data/relationship-maps.json")
      .then(async (r) => {
        if (!r.ok) throw new Error(`Failed to load relationship-maps.json (${r.status})`);
        const raw: unknown = await r.json();
        if (!isRelationshipsFile(raw)) throw new Error("relationship-maps.json: unexpected schema");
        return raw;
      })
      .catch((err: unknown) => {
        filePromise = null; // allow a retry
        throw err;
      });
  }
  return filePromise;
}

// --- Display metadata (visual only) -------------------------------------------------------

export interface RelationMapMeta {
  readonly encoding: "cells" | "stations";
  readonly palette: PaletteId;
  /** Fixed colour domain (no data-driven stretching for correlations). */
  readonly domain: readonly [number, number];
  readonly units: string;
  readonly exploratory: boolean;
}

export const RELATION_MAP_META: Record<RelationMapId, RelationMapMeta> = {
  agreement: { encoding: "stations", palette: "thermal", domain: [0.5, 1], units: "r", exploratory: true },
  "trend-gap": { encoding: "stations", palette: "rdbu_rev", domain: [-0.6, 0.6], units: "°C/decade", exploratory: true },
  // brbg: brown = negative rho (warm years drier), teal = positive (warm years wetter).
  "temp-precip": { encoding: "cells", palette: "brbg", domain: [-1, 1], units: "rho", exploratory: true },
  // rdbu_rev: red = positive rho (more hot days in years with longer dry spells).
  "heat-drought": { encoding: "stations", palette: "rdbu_rev", domain: [-1, 1], units: "rho", exploratory: true },
};

// --- Raster: R2 coupling cells ------------------------------------------------------------

const MAP_INK: readonly [number, number, number] = [11, 20, 36];
const W = 920;
const H = 680;
let couplingUrl: Promise<string> | null = null;

/**
 * One flat colour per MERRA-2 cell (colour = rho). Cells whose pipeline label is "not-robust" carry a
 * dot, as in the trend maps. "insufficient" cells (GPM coverage below the pre-registered 50 %) stay blank.
 */
export function renderCouplingRaster(file: RelationshipsFile): Promise<string> {
  if (couplingUrl) return couplingUrl;
  couplingUrl = (async () => {
    const multiPoly = await loadSpainMultiPolygon();
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";
    const { west, south, east, north } = HEATMAP_BOUNDS;
    const xOf = (lon: number) => ((lon - west) / (east - west)) * W;
    const yOf = (lat: number) => ((north - lat) / (north - south)) * H;
    const [dLat, dLon] = file.r2_temp_precip.cell_size_deg;
    const meta = RELATION_MAP_META["temp-precip"];
    const [lo, hi] = meta.domain;

    for (const c of file.r2_temp_precip.cells) {
      if (c.rho === null) continue;
      const [r, g, b] = samplePalette(meta.palette, (c.rho - lo) / (hi - lo));
      ctx.fillStyle = `rgba(${r},${g},${b},0.78)`;
      const x0 = xOf(c.lon - dLon / 2);
      const y0 = yOf(c.lat + dLat / 2);
      ctx.fillRect(x0, y0, xOf(c.lon + dLon / 2) - x0, yOf(c.lat - dLat / 2) - y0);
    }
    const cellPx = (dLat / (north - south)) * H;
    ctx.fillStyle = `rgba(${MAP_INK[0]},${MAP_INK[1]},${MAP_INK[2]},0.8)`;
    for (const c of file.r2_temp_precip.cells) {
      if (c.label !== "not-robust") continue;
      ctx.beginPath();
      ctx.arc(xOf(c.lon), yOf(c.lat), Math.max(1.2, Math.min(2.6, cellPx * 0.12)), 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalCompositeOperation = "destination-in";
    ctx.beginPath();
    for (const poly of multiPoly) {
      for (const ring of poly) {
        ring.forEach(([lon, lat], i) => (i === 0 ? ctx.moveTo(xOf(lon), yOf(lat)) : ctx.lineTo(xOf(lon), yOf(lat))));
        ctx.closePath();
      }
    }
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.globalCompositeOperation = "source-over";
    return canvas.toDataURL("image/png");
  })();
  return couplingUrl;
}

// --- Overlay: station symbols for R1 and R3 ----------------------------------------------

export interface RelationOverlayCopy {
  robust: string;
  notRobust: string;
  insufficient: string;
  agreement: (r: string, n: number) => string;
  trendGap: (diff: string, cell: string, station: string) => string;
}

interface PointFeature {
  type: "Feature";
  properties: Record<string, unknown>;
  geometry: { type: "Point"; coordinates: [number, number] };
}

const NO_VALUE_CSS = "rgb(120,128,140)";
const fmt = (v: number, d = 2) => (v > 0 ? "+" : "") + v.toFixed(d);

export function buildRelationOverlay(
  file: RelationshipsFile,
  id: RelationMapId,
  copy: RelationOverlayCopy,
): { type: "FeatureCollection"; features: PointFeature[] } {
  const meta = RELATION_MAP_META[id];
  const domain: [number, number] = [meta.domain[0], meta.domain[1]];
  const features: PointFeature[] = [];
  const point = (lon: number, lat: number, properties: Record<string, unknown>): PointFeature => ({
    type: "Feature",
    properties: { ...properties, latitude: lat, longitude: lon },
    geometry: { type: "Point", coordinates: [lon, lat] },
  });

  if (id === "agreement" || id === "trend-gap") {
    for (const p of file.r1_validation.pairs) {
      const value = id === "agreement" ? p.pearson_r_annual : p.slope_diff_cell_minus_station;
      features.push(
        point(p.lon, p.lat, {
          kind: "station",
          id: p.id,
          name: p.name,
          value,
          units: meta.units,
          elevation: p.elevation_m,
          color: samplePaletteCss(meta.palette, value, domain),
          symbol: "filled",
          pixelSize: 11,
          detail:
            id === "agreement"
              ? copy.agreement(p.pearson_r_annual.toFixed(2), p.n_years)
              : copy.trendGap(fmt(p.slope_diff_cell_minus_station), fmt(p.merra2_slope), fmt(p.station_slope)),
        }),
      );
    }
  } else if (id === "heat-drought") {
    for (const s of file.r3_heat_drought.stations) {
      const labelText =
        s.label === "robust" ? copy.robust : s.label === "not-robust" ? copy.notRobust : copy.insufficient;
      const stats =
        s.rho !== null && s.q_value_bh !== null && s.n !== null
          ? `rho ${fmt(s.rho)} · q ${s.q_value_bh.toFixed(2)} · n ${s.n} · `
          : `n ${s.paired_years} · `;
      features.push(
        point(s.lon, s.lat, {
          kind: "station",
          id: s.id,
          name: s.name,
          value: s.rho ?? undefined,
          units: meta.units,
          elevation: s.elevation_m,
          color: s.rho === null ? NO_VALUE_CSS : samplePaletteCss(meta.palette, s.rho, domain),
          symbol: s.label === "robust" ? "filled" : s.label === "not-robust" ? "ring" : "insufficient",
          pixelSize: s.rho === null ? 5 : 11,
          hideLabel: 1,
          detail: stats + labelText,
        }),
      );
    }
  }
  return { type: "FeatureCollection", features };
}
