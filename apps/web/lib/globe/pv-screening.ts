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

export interface FeaturedPvCase {
  cell_id: string;
  place: string;
  selection: string;
  green_cells_compared: number;
  green_cells_with_more_irradiance: number;
  green_cells_with_more_low_moderate_land: number;
  green_cells_better_on_both: number;
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
  featured_case?: FeaturedPvCase;
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

export interface GiovanniDustFile {
  schema: "giovanni-dust/v1";
  status: "EXPLORATORY";
  period: [number, number];
  featured_cell: {
    id: string;
    lat: number;
    lon: number;
    mean_aot_2000_2025: number;
    annual: { year: number; mean_aot: number; months_valid: number }[];
  };
}

export interface PvHistoryYear {
  year: number;
  explicit_pv_phases: number;
  assumed_pv_phases: number;
  total_phases: number;
  cumulative_reported_phases: number;
}

export interface PvHistoryFile {
  schema: "pv-history/v1";
  period: [number, number];
  annual: PvHistoryYear[];
  summary: {
    operating_pv_phases: number;
    known_start_year_phases: number;
    unknown_start_year_phases: number;
    pre_2000_phases: number;
  };
  featured_cell: {
    id: string;
    trend_assessment: {
      outcome: "insufficient_evidence";
      label: string;
      method: string;
      n_phases: number;
      slope_per_year: null;
      ci95: null;
      p_value: null;
      reasons: string[];
    };
    summary: {
      operating_pv_phases: number;
      explicit_pv_phases: number;
      assumed_pv_phases: number;
      known_start_year_phases: number;
    };
    annual: PvHistoryYear[];
  };
}

/** Each file loads independently: a missing optional file must not hide the others. */
export interface PvScreeningData {
  screening: PvScreeningFile | null;
  plants: SolarPlantsFile | null;
  miteco: MitecoSensitivityFile | null;
  dust: GiovanniDustFile | null;
  history: PvHistoryFile | null;
}

export const PV_SCREENING_URL = "/data/pv-screening.json";
export const SOLAR_PLANTS_URL = "/data/solar-plants.json";
export const MITECO_SENSITIVITY_URL = "/data/miteco-pv-sensitivity.json";
export const GIOVANNI_DUST_URL = "/data/giovanni-dust.json";
export const PV_HISTORY_URL = "/data/pv-history.json";

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

function isGiovanniDustFile(x: unknown): x is GiovanniDustFile {
  if (!isObj(x) || x.schema !== "giovanni-dust/v1" || x.status !== "EXPLORATORY") return false;
  if (!Array.isArray(x.period) || x.period.length !== 2 || !x.period.every((v) => typeof v === "number")) return false;
  const cell = x.featured_cell;
  if (!isObj(cell) || typeof cell.id !== "string" || typeof cell.lat !== "number" || typeof cell.lon !== "number" ||
      typeof cell.mean_aot_2000_2025 !== "number" || !Number.isFinite(cell.mean_aot_2000_2025) || !Array.isArray(cell.annual)) return false;
  return cell.annual.every((item: unknown) => isObj(item) && typeof item.year === "number" &&
    typeof item.mean_aot === "number" && Number.isFinite(item.mean_aot) && typeof item.months_valid === "number");
}

async function fetchDust(): Promise<GiovanniDustFile | null> {
  try {
    const response = await fetch(GIOVANNI_DUST_URL, { cache: "no-cache" });
    if (!response.ok) return null;
    const raw: unknown = await response.json();
    return isGiovanniDustFile(raw) ? raw : null;
  } catch {
    return null;
  }
}

function isPvHistoryFile(x: unknown): x is PvHistoryFile {
  if (!isObj(x) || x.schema !== "pv-history/v1" || !Array.isArray(x.period) || x.period.length !== 2 ||
      !x.period.every((v) => typeof v === "number") || !Array.isArray(x.annual) || !isObj(x.summary) || !isObj(x.featured_cell)) return false;
  const rowValid = (row: unknown): row is PvHistoryYear => isObj(row) &&
    typeof row.year === "number" && typeof row.explicit_pv_phases === "number" &&
    typeof row.assumed_pv_phases === "number" && typeof row.total_phases === "number" &&
    typeof row.cumulative_reported_phases === "number";
  const summary = x.summary;
  const cell = x.featured_cell;
  const cellSummary = cell.summary;
  const assessment = cell.trend_assessment;
  return x.annual.every(rowValid) &&
    ["operating_pv_phases", "known_start_year_phases", "unknown_start_year_phases", "pre_2000_phases"].every((key) => typeof summary[key] === "number") &&
    typeof cell.id === "string" &&
    isObj(cellSummary) &&
    ["operating_pv_phases", "explicit_pv_phases", "assumed_pv_phases", "known_start_year_phases"].every((key) => typeof cellSummary[key] === "number") &&
    isObj(assessment) && assessment.outcome === "insufficient_evidence" && typeof assessment.label === "string" &&
    typeof assessment.method === "string" && typeof assessment.n_phases === "number" &&
    Array.isArray(assessment.reasons) && assessment.reasons.every((reason: unknown) => typeof reason === "string") &&
    assessment.slope_per_year === null && assessment.ci95 === null && assessment.p_value === null &&
    Array.isArray(cell.annual) && cell.annual.every(rowValid);
}

async function fetchHistory(): Promise<PvHistoryFile | null> {
  try {
    const response = await fetch(PV_HISTORY_URL, { cache: "no-cache" });
    if (!response.ok) return null;
    const raw: unknown = await response.json();
    return isPvHistoryFile(raw) ? raw : null;
  } catch {
    return null;
  }
}

export async function loadPvScreeningData(): Promise<PvScreeningData> {
  const [screening, plants, miteco, dust, history] = await Promise.all([
    fetchJsonOrNull<PvScreeningFile>(PV_SCREENING_URL, (x) => isObj(x) && Array.isArray(x.cells) && isObj(x.summary)),
    fetchJsonOrNull<SolarPlantsFile>(SOLAR_PLANTS_URL, (x) => isObj(x) && Array.isArray(x.plants)),
    fetchJsonOrNull<MitecoSensitivityFile>(MITECO_SENSITIVITY_URL, (x) => isObj(x) && Array.isArray(x.images)),
    fetchDust(),
    fetchHistory(),
  ]);
  return { screening, plants, miteco, dust, history };
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
