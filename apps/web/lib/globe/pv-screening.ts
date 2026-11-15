/**
 * Evidence-based solar PV screening (contract: research/2026-11-15_pv-screening-contrato.md, v1).
 * The browser only renders what the Python pipeline wrote (render, don't compute): verdicts,
 * slopes, CIs and p-values are read as-is. Missing files are a normal "not available yet" state.
 */

export type PvVerdict = "good" | "mixed" | "avoid" | "no_data";

export type PvVerdictReason =
  | "high_resource"
  | "low_resource"
  | "low_sensitivity"
  | "high_sensitivity"
  | "irr_rising_not_proven"
  | "irr_rising_significant"
  | "irr_falling_significant"
  | "heat_penalty_small"
  | "heat_penalty_large"
  | (string & {});

/** [west, south, east, north] in degrees. */
export type Bounds4 = [number, number, number, number];

export interface PvCell {
  id: string;
  lat: number;
  lon: number;
  bounds: Bounds4;
  land_fraction: number;
  irr_mean_kwh_m2_day: number | null;
  irr_resource_percentile: number | null;
  irr_trend_pct_decade: number | null;
  irr_ci_pct_decade: [number, number] | null;
  irr_p: number | null;
  irr_p_bh: number | null;
  irr_significant: boolean | null;
  t_summer_mean_c: number | null;
  t_trend_c_decade: number | null;
  t_ci_c_decade: [number, number] | null;
  t_p: number | null;
  t_p_bh: number | null;
  t_significant: boolean | null;
  heat_penalty_pct_decade: number | null;
  net_pv_trend_pct_decade: number | null;
  miteco_share_pct?: Record<string, number> | null;
  miteco_low_moderate_pct: number | null;
  plants_operating_n?: number | null;
  plants_operating_mw?: number | null;
  verdict: PvVerdict;
  verdict_reasons: PvVerdictReason[];
}

export interface PvSource {
  id: string;
  label: string;
  doi?: string;
  url?: string;
}

export interface PvLandmark {
  name: string;
  mw: number;
  tech: "pv" | "csp" | (string & {});
  lat: number;
  lon: number;
  cell_id?: string;
  miteco_class?: number | null;
  source?: string;
}

export interface PvSummary {
  cells_good: number;
  cells_mixed: number;
  cells_avoid: number;
  operating_mw_total?: number;
  operating_mw_in_good_pct?: number;
  operating_mw_in_avoid_pct?: number;
  /** Optional, if the pipeline adds it: short place names where green cells concentrate. */
  good_regions?: string[];
}

export interface PvRegionValidation {
  region: string;
  power_trend_pct_decade: number | null;
  power_p: number | null;
  merra2_trend_pct_decade: number | null;
  merra2_p: number | null;
}

export interface PvScreeningFile {
  schema: string;
  generated_utc?: string;
  status?: string;
  period: [number, number];
  temp_coefficient_pct_per_c?: number;
  method?: string;
  verdict_rule?: string;
  sources?: PvSource[];
  grid?: { cell_deg?: [number, number]; lats?: number[]; lons?: number[] };
  cells: PvCell[];
  regions_validation?: PvRegionValidation[];
  landmarks?: PvLandmark[];
  summary: PvSummary;
}

export interface SolarPlant {
  name: string;
  mw: number;
  tech: "pv" | "csp" | (string & {});
  status: "operating" | "construction" | (string & {});
  lat: number;
  lon: number;
  accuracy?: string;
  miteco_class?: number | null;
}

export interface SolarPlantsFile {
  schema: string;
  source?: string | { name?: string; url?: string; version?: string };
  plants: SolarPlant[];
}

export interface MitecoImage {
  file: string;
  bounds: Bounds4;
}

export interface MitecoClass {
  value: number;
  label: string;
  color: string;
}

export interface MitecoSensitivityFile {
  images: MitecoImage[];
  classes: MitecoClass[];
}

/** Each file loads independently: a missing optional file must not hide the others. */
export interface PvScreeningData {
  screening: PvScreeningFile | null;
  plants: SolarPlantsFile | null;
  miteco: MitecoSensitivityFile | null;
}

export const PV_SCREENING_URL = "/data/pv-screening.json";
export const SOLAR_PLANTS_URL = "/data/solar-plants.json";
export const MITECO_SENSITIVITY_URL = "/data/miteco-pv-sensitivity.json";

async function fetchJsonOrNull<T>(url: string, valid: (x: unknown) => boolean): Promise<T | null> {
  try {
    const res = await fetch(url, { cache: "no-cache" });
    if (!res.ok) return null;
    const json: unknown = await res.json();
    return valid(json) ? (json as T) : null;
  } catch {
    return null;
  }
}

const isObj = (x: unknown): x is Record<string, unknown> => typeof x === "object" && x !== null;

export async function loadPvScreeningData(): Promise<PvScreeningData> {
  const [screening, plants, miteco] = await Promise.all([
    fetchJsonOrNull<PvScreeningFile>(PV_SCREENING_URL, (x) => isObj(x) && Array.isArray(x.cells) && isObj(x.summary)),
    fetchJsonOrNull<SolarPlantsFile>(SOLAR_PLANTS_URL, (x) => isObj(x) && Array.isArray(x.plants)),
    fetchJsonOrNull<MitecoSensitivityFile>(MITECO_SENSITIVITY_URL, (x) => isObj(x) && Array.isArray(x.images)),
  ]);
  return { screening, plants, miteco };
}

/** MITECO PNGs are referenced by file name next to the JSON in /data. */
export function mitecoImageUrl(file: string): string {
  if (file.startsWith("/") || /^https?:/.test(file)) return file;
  return `/data/${file.replace(/^.*[\\/]/, "")}`;
}

/** Cell whose native bounds contain the coordinate (lookup only, no interpolation). */
export function cellAt(file: PvScreeningFile, lat: number, lon: number): PvCell | null {
  for (const c of file.cells) {
    const [w, s, e, n] = c.bounds;
    if (lon >= w && lon < e && lat >= s && lat < n) return c;
  }
  return null;
}

/** Plant drawn at exactly this coordinate (marker clicks report the marker position). */
export function plantAt(plants: readonly SolarPlant[], lat: number, lon: number): SolarPlant | null {
  return plants.find((p) => Math.abs(p.lat - lat) < 1e-7 && Math.abs(p.lon - lon) < 1e-7) ?? null;
}

/** Verdict colours (data colours, not brand colours). Text labels always accompany them. */
export const VERDICT_COLORS: Record<Exclude<PvVerdict, "no_data">, string> = {
  good: "#22c55e",
  mixed: "#f59e0b",
  avoid: "#ef4444",
};

/** Fallback MITECO class colours if the JSON omits them (0 red … 4 green). */
export const MITECO_FALLBACK_COLORS = ["#d7191c", "#fd8d3c", "#fecc5c", "#a6d96a", "#1a9641"];
