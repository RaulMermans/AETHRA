/**
 * Energy Infrastructure context layer (D49, P1, opt-in — not on the demo path).
 *
 * Registered renewable installations in Castilla y León from the Junta de Castilla y León open-data
 * layer (RD 413/2014 register, PRETOR), built by scripts/build_energy_infrastructure.py into
 * public/data/energy-infrastructure.json. The browser only validates and renders that file.
 *
 * Context, not evidence: capacity is *registered* MW, never generation, output or performance.
 * Nothing here is ranked, scored or derived from climate values.
 */

export type InstallationTechnology = "wind_onshore" | "solar_pv";
export type InstallationStatus = "in_operation" | "operation_end_recorded";

export interface Merra2CellSupport {
  latCenter: number;
  lonCenter: number;
  /** west, south, east, north (degrees) */
  bounds: [number, number, number, number];
  widthKm: number;
  heightKm: number;
}

export interface Installation {
  /** Register code (c_reg_adm), unique. */
  id: string;
  name: string;
  technology: InstallationTechnology;
  categoryCode: string;
  /** Registered installed capacity, MW. Not generation. */
  capacityMw: number;
  status: InstallationStatus;
  operationStart: string | null;
  operationEnd: string | null;
  authority: "regional" | "state" | "unknown";
  municipality: string;
  provinceId: string;
  provinceName: string;
  /** False when the point lies outside the app's simplified province outline (the register province still applies). */
  pointInProvinceOutline: boolean;
  infoDate: string;
  lat: number;
  lon: number;
  perimeterAreaKm2: number;
  merra2Cell: Merra2CellSupport;
  /** Climate-bundle scope key whose precomputed result is the NASA evidence, e.g. "provincia:47". */
  evidenceScope: string;
}

export interface InfrastructureSource {
  name: string;
  register: string;
  url: string;
  metadataUrl: string;
  retrievedUtc: string;
  sha256: string;
  licence: string;
  attribution: string;
  infoDateRange: [string, string] | null;
}

export interface InfrastructureFile {
  status: string;
  coverage: string;
  source: InfrastructureSource;
  inclusionRule: string;
  counts: { sourcePolygons: number; installations: number; excludedPolygons: Record<string, number> };
  installations: Installation[];
}

export const TECHNOLOGY_META: Record<InstallationTechnology, { label: string; short: string; color: string }> = {
  wind_onshore: { label: "Onshore wind", short: "Wind", color: "#5eead4" },
  solar_pv: { label: "Solar photovoltaic", short: "Solar PV", color: "#fbbf24" },
};

export const AUTHORITY_LABEL: Record<Installation["authority"], string> = {
  regional: "Junta de Castilla y León (≤ 50 MW)",
  state: "MITECO (> 50 MW)",
  unknown: "Not stated",
};

// --- Validation at the JSON boundary (no casts) ------------------------------------------------

type Json = unknown;

function isRecord(v: Json): v is Record<string, Json> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
function str(o: Record<string, Json>, k: string): string {
  const v = o[k];
  if (typeof v !== "string") throw new Error(`energy-infrastructure: "${k}" must be a string`);
  return v;
}
function strOrNull(o: Record<string, Json>, k: string): string | null {
  const v = o[k];
  if (v === null || v === undefined) return null;
  if (typeof v !== "string") throw new Error(`energy-infrastructure: "${k}" must be a string or null`);
  return v;
}
function num(o: Record<string, Json>, k: string): number {
  const v = o[k];
  if (typeof v !== "number" || !Number.isFinite(v)) throw new Error(`energy-infrastructure: "${k}" must be a number`);
  return v;
}
function rec(o: Record<string, Json>, k: string): Record<string, Json> {
  const v = o[k];
  if (!isRecord(v)) throw new Error(`energy-infrastructure: "${k}" must be an object`);
  return v;
}
function bbox(v: Json, k: string): [number, number, number, number] {
  if (!Array.isArray(v) || v.length !== 4 || !v.every((x) => typeof x === "number" && Number.isFinite(x))) {
    throw new Error(`energy-infrastructure: "${k}" must be [w, s, e, n]`);
  }
  const [w, s, e, n] = v.map(Number);
  return [w, s, e, n];
}
function technology(v: string): InstallationTechnology {
  if (v === "wind_onshore" || v === "solar_pv") return v;
  throw new Error(`energy-infrastructure: unknown technology "${v}"`);
}
function status(v: string): InstallationStatus {
  if (v === "in_operation" || v === "operation_end_recorded") return v;
  throw new Error(`energy-infrastructure: unknown status "${v}"`);
}
function authority(v: string): Installation["authority"] {
  return v === "regional" || v === "state" ? v : "unknown";
}

function parseInstallation(v: Json): Installation {
  if (!isRecord(v)) throw new Error("energy-infrastructure: installation must be an object");
  const cell = rec(v, "merra2_cell");
  const inOutline = v.point_in_province_boundary;
  if (typeof inOutline !== "boolean") throw new Error('energy-infrastructure: "point_in_province_boundary" must be boolean');
  const capacityMw = num(v, "capacity_mw");
  if (capacityMw <= 0) throw new Error("energy-infrastructure: capacity must be > 0");
  return {
    id: str(v, "id"),
    name: str(v, "name"),
    technology: technology(str(v, "technology")),
    categoryCode: str(v, "category_code"),
    capacityMw,
    status: status(str(v, "status")),
    operationStart: strOrNull(v, "operation_start"),
    operationEnd: strOrNull(v, "operation_end"),
    authority: authority(str(v, "authority")),
    municipality: str(v, "municipality"),
    provinceId: str(v, "province_id"),
    provinceName: str(v, "province_name"),
    pointInProvinceOutline: inOutline,
    infoDate: str(v, "info_date"),
    lat: num(v, "lat"),
    lon: num(v, "lon"),
    perimeterAreaKm2: num(v, "perimeter_area_km2"),
    merra2Cell: {
      latCenter: num(cell, "lat_center"),
      lonCenter: num(cell, "lon_center"),
      bounds: bbox(cell.bounds, "merra2_cell.bounds"),
      widthKm: num(cell, "width_km"),
      heightKm: num(cell, "height_km"),
    },
    evidenceScope: str(v, "evidence_scope"),
  };
}

export function parseInfrastructureFile(v: Json): InfrastructureFile {
  if (!isRecord(v) || v.schema !== "energy-infrastructure/v1") {
    throw new Error("energy-infrastructure: unexpected schema");
  }
  const src = rec(v, "source");
  const range = src.info_date_range;
  const counts = rec(v, "counts");
  const excluded = rec(counts, "excluded_polygons");
  const list = v.installations;
  if (!Array.isArray(list)) throw new Error('energy-infrastructure: "installations" must be an array');
  return {
    status: str(v, "status"),
    coverage: str(v, "coverage"),
    source: {
      name: str(src, "name"),
      register: str(src, "register"),
      url: str(src, "url"),
      metadataUrl: str(src, "metadata_url"),
      retrievedUtc: str(src, "retrieved_utc"),
      sha256: str(src, "sha256"),
      licence: str(src, "licence"),
      attribution: str(src, "attribution"),
      infoDateRange:
        Array.isArray(range) && range.length === 2 && typeof range[0] === "string" && typeof range[1] === "string"
          ? [range[0], range[1]]
          : null,
    },
    inclusionRule: str(v, "inclusion_rule"),
    counts: {
      sourcePolygons: num(counts, "source_polygons"),
      installations: num(counts, "installations"),
      excludedPolygons: Object.fromEntries(
        Object.entries(excluded).filter((e): e is [string, number] => typeof e[1] === "number"),
      ),
    },
    installations: list.map(parseInstallation),
  };
}

export async function loadInfrastructureFile(): Promise<InfrastructureFile> {
  const res = await fetch("/data/energy-infrastructure.json");
  if (!res.ok) throw new Error(`energy-infrastructure.json: HTTP ${res.status}`);
  return parseInfrastructureFile(await res.json());
}

// --- Map overlay ---------------------------------------------------------------------------

interface OverlayPointFeature {
  type: "Feature";
  properties: Record<string, string | number>;
  geometry: { type: "Point"; coordinates: [number, number] } | { type: "LineString"; coordinates: [number, number][] };
}

/**
 * Installation markers (colour = technology, labelled in the panel legend) plus, for the selected
 * installation, the outline of the MERRA-2 cell that contains it. The cell outline is drawn last so
 * the layer key changes with the selection.
 */
export function buildInfrastructureOverlay(
  installations: Installation[],
  selected: Installation | null,
): { type: "FeatureCollection"; features: OverlayPointFeature[] } {
  const features: OverlayPointFeature[] = installations.map((i) => ({
    type: "Feature",
    properties: {
      kind: "installation",
      id: i.id,
      name: i.name,
      detail: `${TECHNOLOGY_META[i.technology].label} · ${i.municipality}`,
      value: i.capacityMw,
      units: "MW registered",
      latitude: i.lat,
      longitude: i.lon,
      color: selected?.id === i.id ? "#ffffff" : TECHNOLOGY_META[i.technology].color,
      pixelSize: selected?.id === i.id ? 11 : 5.5,
      hideLabel: selected?.id === i.id ? 0 : 1,
    },
    geometry: { type: "Point", coordinates: [i.lon, i.lat] },
  }));
  if (selected) {
    const [w, s, e, n] = selected.merra2Cell.bounds;
    features.push({
      type: "Feature",
      properties: { kind: "merra2-cell", name: `cell:${selected.id}`, color: "#e2e8f0" },
      geometry: { type: "LineString", coordinates: [[w, s], [e, s], [e, n], [w, n], [w, s]] },
    });
  }
  return { type: "FeatureCollection", features };
}
