/**
 * Seville countryside PV case study (`pv-case/v1`, scripts/build_pv_case_sevilla.py,
 * design in docs/PV_SEVILLA_CASE.md). The browser renders the exported values only:
 * slopes, CIs, q-values and outcome states come from the Python pipeline.
 */
import type { PvHistoryYear } from "./pv-screening";

export const PV_CASE_SEVILLA_URL = "/data/pv-case-sevilla.json";

export type PvCaseOutcome = "supported_increase" | "supported_decrease" | "no_robust_trend" | "insufficient_evidence";
export type PvCaseVariableId = "ghi" | "t_summer" | "hot_days" | "aod";

export interface PvCaseVariable {
  id: PvCaseVariableId;
  label: string;
  power_parameter: string;
  units: string;
  statistic: string;
  period: [number, number];
  complete_years: number;
  mean: number;
  slope_per_decade: number | null;
  ci95_per_decade: [number, number] | null;
  p: number | null;
  q_bh: number | null;
  outcome: PvCaseOutcome;
  slope_pct_per_decade?: number;
  ci95_pct_per_decade?: [number, number];
  annual: { year: number; value: number | null }[];
}

export interface PvCaseFile {
  schema: "pv-case/v1";
  status: "EXPLORATORY";
  cell_id: string;
  place: string;
  bounds: [number, number, number, number];
  climate: {
    source: { name: string; api_version: string | null; url: string; retrieved_utc: string; spatial_support: string };
    method: string;
    variables: PvCaseVariable[];
  };
  development: {
    summary: { operating_pv_phases: number; explicit_pv_phases: number; assumed_pv_phases: number; known_start_year_phases: number };
    operating_locations: number;
    exact_location_phases: number;
    operating_mw_by_rating: Record<string, number>;
    operating_miteco_class_phases: Record<string, number>;
    pipeline: { construction: number; "pre-construction": number };
    annual: PvHistoryYear[];
    trend_assessment: { outcome: "insufficient_evidence" };
  };
  limitations: string[];
}

const OUTCOMES: readonly string[] = ["supported_increase", "supported_decrease", "no_robust_trend", "insufficient_evidence"];
const VARIABLE_IDS: readonly string[] = ["ghi", "t_summer", "hot_days", "aod"];

const isObj = (x: unknown): x is Record<string, unknown> => typeof x === "object" && x !== null;
const isNum = (x: unknown): x is number => typeof x === "number" && Number.isFinite(x);
const isNumOrNull = (x: unknown): boolean => x === null || isNum(x);
const isPair = (x: unknown): boolean => Array.isArray(x) && x.length === 2 && x.every(isNum);

function isVariable(x: unknown): boolean {
  return isObj(x) && typeof x.id === "string" && VARIABLE_IDS.includes(x.id) &&
    typeof x.label === "string" && typeof x.units === "string" && typeof x.outcome === "string" && OUTCOMES.includes(x.outcome) &&
    isNum(x.mean) && isNum(x.complete_years) && isNumOrNull(x.slope_per_decade) && isNumOrNull(x.q_bh) &&
    (x.ci95_per_decade === null || isPair(x.ci95_per_decade)) &&
    Array.isArray(x.annual) && x.annual.every((row: unknown) => isObj(row) && isNum(row.year) && isNumOrNull(row.value));
}

function isHistoryRow(x: unknown): boolean {
  return isObj(x) && ["year", "explicit_pv_phases", "assumed_pv_phases", "total_phases", "cumulative_reported_phases"].every((k) => isNum(x[k]));
}

export function isPvCaseFile(x: unknown): x is PvCaseFile {
  if (!isObj(x) || x.schema !== "pv-case/v1" || x.status !== "EXPLORATORY" || typeof x.cell_id !== "string" || typeof x.place !== "string") return false;
  const climate = x.climate;
  const dev = x.development;
  if (!isObj(climate) || !isObj(climate.source) || !Array.isArray(climate.variables) || !climate.variables.every(isVariable)) return false;
  if (!isObj(dev) || !isObj(dev.summary) || !isObj(dev.pipeline) || !Array.isArray(dev.annual) || !dev.annual.every(isHistoryRow)) return false;
  if (!isObj(dev.trend_assessment) || dev.trend_assessment.outcome !== "insufficient_evidence") return false;
  return isNum(dev.operating_locations) && isNum(dev.exact_location_phases) && isObj(dev.operating_mw_by_rating) &&
    isObj(dev.operating_miteco_class_phases) && Array.isArray(x.limitations);
}

export async function fetchPvCase(): Promise<PvCaseFile | null> {
  try {
    const response = await fetch(PV_CASE_SEVILLA_URL, { cache: "no-cache" });
    if (!response.ok) return null;
    const raw: unknown = await response.json();
    return isPvCaseFile(raw) ? raw : null;
  } catch {
    return null;
  }
}
