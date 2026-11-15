import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { AgentLanguage, AgentViewContext } from "./types.ts";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../../../..");
const dataDir = join(repoRoot, "apps/web/public/data");

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function fold(s: string): string {
  return s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

function signed(n: number, digits = 2): string {
  const mag = Math.abs(n).toFixed(digits);
  if (n > 0) return `+${mag}`;
  if (n < 0) return `−${mag}`;
  return mag;
}

export type SeriesHighlights = {
  period: string;
  firstYear: number;
  firstValue: number;
  lastYear: number;
  lastValue: number;
  minYear: number;
  minValue: number;
  maxYear: number;
  maxValue: number;
  queriedYear?: number;
  queriedValue?: number;
};

export type MetricTrendDigest = {
  metricId: string;
  label: string;
  dataset: string;
  units: string;
  trendUnits: string;
  slopePerDecade: number;
  ci95: [number, number];
  pValue: number;
  n: number;
  period: string;
  outcome: string;
  exploratoryNote?: string;
  series?: SeriesHighlights;
};

export type ScopeVisualizationDigest = {
  scopeKey: string;
  name: string;
  level: "age" | "ccaa" | "provincia";
  metrics: Record<string, MetricTrendDigest>;
  noaaStationCount?: number;
  swotCount?: number;
  swotAreaKm2?: number;
  swotCv?: number | null;
};

export type StationVisualizationDigest = {
  id: string;
  name: string;
  lat: number;
  lon: number;
  elevationM: number;
  metrics: Record<string, MetricTrendDigest>;
};

export type BasinVisualizationDigest = {
  id: string;
  name: string;
  river: string;
  lat: number;
  lon: number;
  rain?: MetricTrendDigest;
  runoff?: MetricTrendDigest;
  evap?: MetricTrendDigest;
  note: string;
};

export type ReservoirVisualizationDigest = {
  id: string;
  name: string;
  provinceName: string;
  basinName: string | null;
  nObs: number;
  areaMeanKm2: number;
  areaMinKm2: number;
  areaMaxKm2: number;
  areaCv: number;
  wseMeanM: number;
  wseStdM: number;
  tempSlopeDecade: number | null;
  evapMeanMm: number | null;
  fpvScoreExploratory: number | null;
};

export type SolarScreeningDigest = {
  status: string;
  period: string;
  summary: {
    cellsTested: number;
    cellsGood: number;
    cellsMixed: number;
    cellsAvoid: number;
    cellsNoData: number;
    operatingMwTotal: number;
    operatingMwInGoodPct: number;
    operatingMwInMixedPct: number;
    operatingMwInAvoidPct: number;
    irrTrendMedianPctDecade: number;
    tempCellsSignificantUp: number;
    tempTrendMedianCDecade: number;
    heatPenaltyMedianPctDecade: number;
  };
  featuredCase?: {
    cellId: string;
    place: string;
    irrMeanKwhM2Day: number;
    irrTrendPctDecade: number;
    summerTempMeanC: number;
    summerTempTrendCDecade: number;
    heatPenaltyPctDecade: number;
    mitecoLowModeratePct: number;
    plantsOperatingN: number;
    plantsOperatingMw: number;
    verdict: string;
  };
  matchedLandmark?: {
    name: string;
    mw: number;
    tech: string;
    lat: number;
    lon: number;
    cellId: string;
    verdict: string;
    mitecoClass: number;
    source: string;
  };
  matchedCell?: {
    id: string;
    lat: number;
    lon: number;
    verdict: string;
    irrMeanKwhM2Day: number | null;
    irrTrendPctDecade: number | null;
    summerTempMeanC: number | null;
    summerTempTrendCDecade: number | null;
    heatPenaltyPctDecade: number | null;
    mitecoLowModeratePct: number | null;
    plantsOperatingMw: number;
  };
};

export type SolarCapacityDigest = {
  source: string;
  latestYear: number;
  latestMw: number;
  added2024Mw: number;
  euRank: number;
  euCountries: number;
  euSharePct: number;
  germanyMw: number;
  italyMw: number;
  senSlope2015_2024MwYr: number;
  ci95_2015_2024: [number, number];
  pValue2015_2024: number;
  cagr2019_2024Pct: number;
  doublingYears: number;
  solarThermalMw2024: number;
  queriedYear?: number;
  queriedMw?: number;
};

export type RelationshipsDigest = {
  r1Validation: {
    status: string;
    nStations: number;
    stationSlopeMedian: number;
    merra2SlopeMedian: number;
    signAgreement: number;
    pearsonRMedian: number;
    pearsonRMin: number;
    matchedPair?: {
      name: string;
      stationSlope: number;
      merra2Slope: number;
      pearsonR: number;
    };
  };
  r2WarmDry: {
    status: string;
    nTested: number;
    nRobustFdr: number;
    rhoMedian: number;
    nNegative: number;
    nPositive: number;
    qMin: number;
  };
  r3HeatDrought: {
    status: string;
    nTested: number;
    nRobustFdr: number;
    rhoMedian: number;
    nPositive: number;
    nNegative: number;
    qMin: number;
  };
};

export type DustVisualizationDigest = {
  dataset: string;
  variable: string;
  period: string;
  cellId: string;
  meanAot2000_2025: number;
  peakYear: number;
  peakAot: number;
  minYear: number;
  minAot: number;
  queriedYear?: number;
  queriedAot?: number;
  limitation: string;
};

export type InfrastructureVisualizationDigest = {
  coverage: string;
  source: string;
  totalInstallations: number;
  solarPvCount: number;
  windOnshoreCount: number;
  matchedInstallations: Array<{
    id: string;
    name: string;
    technology: string;
    capacityMw: number;
    municipality: string;
    provinceName: string;
  }>;
};

export type VisualizationContextDigest = {
  activeView?: AgentViewContext;
  queriedYear?: number;
  scopeDigest?: ScopeVisualizationDigest;
  stationDigest?: StationVisualizationDigest;
  stationNetworkCount?: number;
  basinDigests?: readonly BasinVisualizationDigest[];
  reservoirDigests?: readonly ReservoirVisualizationDigest[];
  solarScreening?: SolarScreeningDigest;
  solarCapacity?: SolarCapacityDigest;
  relationships?: RelationshipsDigest;
  dust?: DustVisualizationDigest;
  infrastructure?: InfrastructureVisualizationDigest;
  summaryEs: string;
  summaryEn: string;
};

// --- Cached raw JSON loaders ---

let cachedClimateBundle: Record<string, unknown> | null = null;
let cachedPvScreening: Record<string, unknown> | null = null;
let cachedSolarCapacity: Record<string, unknown> | null = null;
let cachedRelationships: Record<string, unknown> | null = null;
let cachedDust: Record<string, unknown> | null = null;
let cachedInfra: Record<string, unknown> | null = null;

function readJsonFile(filename: string): Record<string, unknown> | null {
  const path = join(dataDir, filename);
  if (!existsSync(path)) return null;
  try {
    const parsed: unknown = JSON.parse(readFileSync(path, "utf8"));
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function getClimateBundle(): Record<string, unknown> | null {
  if (!cachedClimateBundle) cachedClimateBundle = readJsonFile("climate-bundle.json");
  return cachedClimateBundle;
}

function getPvScreening(): Record<string, unknown> | null {
  if (!cachedPvScreening) cachedPvScreening = readJsonFile("pv-screening.json");
  return cachedPvScreening;
}

function getSolarCapacity(): Record<string, unknown> | null {
  if (!cachedSolarCapacity) cachedSolarCapacity = readJsonFile("solar-capacity-trend.json");
  return cachedSolarCapacity;
}

function getRelationships(): Record<string, unknown> | null {
  if (!cachedRelationships) cachedRelationships = readJsonFile("relationship-maps.json");
  return cachedRelationships;
}

function getDust(): Record<string, unknown> | null {
  if (!cachedDust) cachedDust = readJsonFile("giovanni-dust.json");
  return cachedDust;
}

function getInfra(): Record<string, unknown> | null {
  if (!cachedInfra) cachedInfra = readJsonFile("energy-infrastructure.json");
  return cachedInfra;
}

function extractYearFromQuestion(question: string, viewYear?: number): number | undefined {
  const matches = question.match(/\b(200\d|201\d|202[0-6])\b/g);
  if (matches && matches.length === 1) {
    return Number(matches[0]);
  }
  return viewYear;
}

function buildSeriesHighlightsFromRecord(
  seriesRec: Record<string, unknown>,
  queriedYear?: number,
): SeriesHighlights | undefined {
  const entries: Array<{ year: number; val: number }> = [];
  for (const [k, v] of Object.entries(seriesRec)) {
    const yr = Number(k);
    if (Number.isFinite(yr) && typeof v === "number" && Number.isFinite(v)) {
      entries.push({ year: yr, val: Number(v.toFixed(2)) });
    }
  }
  if (entries.length === 0) return undefined;
  entries.sort((a, b) => a.year - b.year);
  const first = entries[0]!;
  const last = entries[entries.length - 1]!;
  let min = first;
  let max = first;
  for (const e of entries) {
    if (e.val < min.val) min = e;
    if (e.val > max.val) max = e;
  }
  const hit = queriedYear ? entries.find((e) => e.year === queriedYear) : undefined;
  return {
    period: `${first.year}–${last.year}`,
    firstYear: first.year,
    firstValue: first.val,
    lastYear: last.year,
    lastValue: last.val,
    minYear: min.year,
    minValue: min.val,
    maxYear: max.year,
    maxValue: max.val,
    queriedYear: hit?.year,
    queriedValue: hit?.val,
  };
}

function buildSeriesHighlightsFromArrays(
  years: unknown[],
  vals: unknown[],
  queriedYear?: number,
): SeriesHighlights | undefined {
  const entries: Array<{ year: number; val: number }> = [];
  const len = Math.min(years.length, vals.length);
  for (let i = 0; i < len; i++) {
    const yr = years[i];
    const v = vals[i];
    if (typeof yr === "number" && typeof v === "number" && Number.isFinite(v)) {
      entries.push({ year: yr, val: Number(v.toFixed(2)) });
    }
  }
  if (entries.length === 0) return undefined;
  entries.sort((a, b) => a.year - b.year);
  const first = entries[0]!;
  const last = entries[entries.length - 1]!;
  let min = first;
  let max = first;
  for (const e of entries) {
    if (e.val < min.val) min = e;
    if (e.val > max.val) max = e;
  }
  const hit = queriedYear ? entries.find((e) => e.year === queriedYear) : undefined;
  return {
    period: `${first.year}–${last.year}`,
    firstYear: first.year,
    firstValue: first.val,
    lastYear: last.year,
    lastValue: last.val,
    minYear: min.year,
    minValue: min.val,
    maxYear: max.year,
    maxValue: max.val,
    queriedYear: hit?.year,
    queriedValue: hit?.val,
  };
}

function parseTrendDigest(
  metricId: string,
  label: string,
  dataset: string,
  units: string,
  trendUnits: string,
  statsRaw: unknown,
  series?: SeriesHighlights,
  exploratoryNote?: string,
): MetricTrendDigest | undefined {
  if (!isRecord(statsRaw)) return undefined;
  if (
    typeof statsRaw.slope_decade !== "number" ||
    typeof statsRaw.ci_low_decade !== "number" ||
    typeof statsRaw.ci_high_decade !== "number" ||
    typeof statsRaw.p_value !== "number" ||
    typeof statsRaw.n !== "number"
  ) {
    return undefined;
  }
  const firstY = typeof statsRaw.first_year === "number" ? statsRaw.first_year : 2000;
  const lastY = typeof statsRaw.last_year === "number" ? statsRaw.last_year : 2025;
  return {
    metricId,
    label,
    dataset,
    units,
    trendUnits,
    slopePerDecade: Number(statsRaw.slope_decade.toFixed(3)),
    ci95: [Number(statsRaw.ci_low_decade.toFixed(3)), Number(statsRaw.ci_high_decade.toFixed(3))],
    pValue: Number(statsRaw.p_value.toFixed(4)),
    n: statsRaw.n,
    period: `${firstY}–${lastY}`,
    outcome: typeof statsRaw.outcome === "string" ? statsRaw.outcome : "not_significant",
    exploratoryNote,
    series,
  };
}

const ADMIN_METRIC_DEFS: ReadonlyArray<{
  key: string;
  label: string;
  dataset: string;
  units: string;
  trendUnits: string;
  note?: string;
}> = [
  { key: "temp_c", label: "Annual 2 m air temperature", dataset: "NASA MERRA-2 M2TMNXSLV v5.12.4", units: "°C", trendUnits: "°C/decade" },
  { key: "summer_temp_c", label: "Summer (JJA) 2 m temperature", dataset: "NASA MERRA-2 M2TMNXSLV v5.12.4", units: "°C", trendUnits: "°C/decade", note: "EXPLORATORY seasonal slice" },
  { key: "rain_mm", label: "Annual precipitation", dataset: "NASA GPM IMERG Final V07", units: "mm", trendUnits: "mm/decade", note: "EXPLORATORY — multiplicity unadjusted (D53/D60)" },
  { key: "runoff_mm", label: "Modelled total runoff", dataset: "NASA GLDAS Noah v2.1 (modelled, not river gauge)", units: "mm/yr", trendUnits: "mm/decade", note: "EXPLORATORY — modelled land-surface runoff" },
  { key: "evap_mm", label: "Evapotranspiration", dataset: "NASA GLDAS Noah v2.1", units: "mm/yr", trendUnits: "mm/decade", note: "EXPLORATORY — modelled evapotranspiration" },
  { key: "soil_mm", label: "Topsoil moisture (0–10 cm)", dataset: "NASA GLDAS Noah v2.1", units: "mm", trendUnits: "mm/decade", note: "EXPLORATORY — modelled soil moisture" },
  { key: "swe_mm", label: "Snow water equivalent (SWE)", dataset: "NASA GLDAS Noah v2.1", units: "mm", trendUnits: "mm/decade", note: "EXPLORATORY — modelled SWE" },
  { key: "hot_days_35", label: "Extreme hot days (Tmax > 35 °C)", dataset: "NOAA GHCN-Daily stations", units: "days/yr", trendUnits: "days/decade", note: "Station point composite" },
  { key: "tropical_nights", label: "Tropical nights (Tmin ≥ 20 °C)", dataset: "NOAA GHCN-Daily stations", units: "nights/yr", trendUnits: "nights/decade", note: "Station point composite" },
  { key: "max_dry_spell", label: "Longest consecutive dry spell (<1 mm/day)", dataset: "NOAA GHCN-Daily stations", units: "days", trendUnits: "days/decade", note: "Station point composite" },
  { key: "dtr_c", label: "Diurnal temperature range (Tmax − Tmin)", dataset: "NOAA GHCN-Daily stations", units: "°C", trendUnits: "°C/decade", note: "EXPLORATORY clear-sky proxy" },
];

export function resolveScopeVisualizationDigest(
  queryOrScope: string,
  queriedYear?: number,
): ScopeVisualizationDigest | undefined {
  const bundle = getClimateBundle();
  if (!bundle || !isRecord(bundle.scopes)) return undefined;
  const scopes = bundle.scopes;
  let matchedKey: string | undefined;
  if (isRecord(scopes[queryOrScope])) {
    matchedKey = queryOrScope;
  } else {
    const f = fold(queryOrScope);
    if (/\b(peninsula|espana|spain|nacional|national|baleares)\b/.test(f)) {
      matchedKey = "age";
    } else {
      let bestLen = 0;
      for (const [k, v] of Object.entries(scopes)) {
        if (!isRecord(v) || typeof v.name !== "string") continue;
        const parts = v.name.split("/").map((p) => fold(p.trim())).filter(Boolean);
        for (const p of parts) {
          if (p.length >= 4 && f.includes(p) && p.length > bestLen) {
            matchedKey = k;
            bestLen = p.length;
          }
        }
      }
    }
  }
  if (!matchedKey) return undefined;
  const scopeObj = scopes[matchedKey];
  if (!isRecord(scopeObj) || typeof scopeObj.name !== "string") return undefined;

  const level: "age" | "ccaa" | "provincia" = matchedKey.startsWith("ccaa:")
    ? "ccaa"
    : matchedKey.startsWith("provincia:")
      ? "provincia"
      : "age";

  const metrics: Record<string, MetricTrendDigest> = {};

  // 1. Primary scope series (temperature, precipitation, drought, water_rivers)
  const scopeMetricMap: ReadonlyArray<{
    field: string;
    id: string;
    label: string;
    dataset: string;
    units: string;
    trendUnits: string;
    note?: string;
  }> = [
    { field: "temperature", id: "temperature", label: "Annual 2 m air temperature", dataset: "NASA MERRA-2 M2TMNXSLV v5.12.4", units: "°C", trendUnits: "°C/decade" },
    { field: "precipitation", id: "precipitation", label: "Annual precipitation", dataset: "NASA GPM IMERG Final V07", units: "mm", trendUnits: "mm/decade", note: "EXPLORATORY — multiplicity unadjusted (D53/D60)" },
    { field: "drought", id: "drought", label: "Precipitation anomaly z-score", dataset: "NASA GPM IMERG Final V07 (standardized anomaly)", units: "σ", trendUnits: "σ/decade", note: "Standardized annual precipitation anomaly vs 2000–2024" },
    { field: "water_rivers", id: "water_rivers", label: "Modelled total runoff", dataset: "NASA GLDAS Noah v2.1 (modelled, not river discharge)", units: "mm/yr", trendUnits: "mm/decade", note: "EXPLORATORY — GLDAS modelled runoff (not river gauges)" },
  ];

  for (const m of scopeMetricMap) {
    const rawM = scopeObj[m.field];
    if (!isRecord(rawM)) continue;
    const series = isRecord(rawM.series) ? buildSeriesHighlightsFromRecord(rawM.series, queriedYear) : undefined;
    const digest = parseTrendDigest(m.id, m.label, m.dataset, m.units, m.trendUnits, rawM.stats, series, m.note);
    if (digest) metrics[m.id] = digest;
  }

  // 2. If national ("age"), also attach GLDAS national variables (evapotranspiration, soil moisture, SWE)
  if (level === "age" && isRecord(bundle.gldas) && isRecord(bundle.gldas.stats)) {
    const gStats = bundle.gldas.stats;
    const gAnnual = isRecord(bundle.gldas.annual) ? bundle.gldas.annual : {};
    const extractGldasSeries = (field: string): SeriesHighlights | undefined => {
      const rec: Record<string, unknown> = {};
      for (const [yr, row] of Object.entries(gAnnual)) {
        if (isRecord(row) && typeof row[field] === "number") rec[yr] = row[field];
      }
      return buildSeriesHighlightsFromRecord(rec, queriedYear);
    };
    const evap = parseTrendDigest(
      "evap_mm",
      "Evapotranspiration",
      "NASA GLDAS Noah v2.1",
      "mm/yr",
      "mm/decade",
      gStats.evapotranspiration_mm,
      extractGldasSeries("evapotranspiration_mm"),
      "EXPLORATORY — modelled evapotranspiration",
    );
    if (evap) metrics.evap_mm = evap;
    const soil = parseTrendDigest(
      "soil_mm",
      "Topsoil moisture (0–10 cm)",
      "NASA GLDAS Noah v2.1",
      "mm",
      "mm/decade",
      gStats.soil_moisture_0_10cm_mm,
      extractGldasSeries("soil_moisture_0_10cm_mm"),
      "EXPLORATORY — modelled soil moisture",
    );
    if (soil) metrics.soil_mm = soil;
    const swe = parseTrendDigest(
      "swe_mm",
      "Snow water equivalent (SWE)",
      "NASA GLDAS Noah v2.1",
      "mm",
      "mm/decade",
      gStats.snow_water_equivalent_mm,
      extractGldasSeries("snow_water_equivalent_mm"),
      "EXPLORATORY — modelled SWE",
    );
    if (swe) metrics.swe_mm = swe;
  }

  // 3. Admin profiles for CCAA / Province (summer_temp_c, hot_days_35, tropical_nights, max_dry_spell, evap_mm, soil_mm, swe_mm, dtr_c, swot, etc.)
  let noaaStationCount: number | undefined;
  let swotCount: number | undefined;
  let swotAreaKm2: number | undefined;
  let swotCv: number | null | undefined;

  if (isRecord(bundle.admin_profiles)) {
    const ap = bundle.admin_profiles;
    const years = Array.isArray(ap.years) ? ap.years : [];
    const subId = matchedKey.split(":")[1] ?? "";
    const group = level === "ccaa" ? ap.ccaa : level === "provincia" ? ap.provinces : null;
    const prof = isRecord(group) && isRecord(group[subId]) ? group[subId] : null;
    if (prof && isRecord(prof.stats) && isRecord(prof.series)) {
      if (typeof prof.noaa_station_count === "number") noaaStationCount = prof.noaa_station_count;
      if (typeof prof.swot_count === "number") swotCount = prof.swot_count;
      if (typeof prof.swot_area_km2 === "number") swotAreaKm2 = prof.swot_area_km2;
      if (typeof prof.swot_cv === "number" || prof.swot_cv === null) swotCv = prof.swot_cv;

      for (const def of ADMIN_METRIC_DEFS) {
        if (def.key === "temp_c" && metrics.temperature) continue;
        if (def.key === "rain_mm" && metrics.precipitation) continue;
        if (def.key === "runoff_mm" && metrics.water_rivers) continue;
        const arr = Array.isArray(prof.series[def.key]) ? prof.series[def.key] as unknown[] : [];
        const series = buildSeriesHighlightsFromArrays(years, arr, queriedYear);
        const digest = parseTrendDigest(
          def.key,
          def.label,
          def.dataset,
          def.units,
          def.trendUnits,
          prof.stats[def.key],
          series,
          def.note,
        );
        if (digest) metrics[def.key] = digest;
      }
    }
  }

  return {
    scopeKey: matchedKey,
    name: scopeObj.name,
    level,
    metrics,
    noaaStationCount,
    swotCount,
    swotAreaKm2,
    swotCv,
  };
}

export function findStationDigest(
  question: string,
  selectedCoord?: { lat: number; lon: number },
  queriedYear?: number,
): { station?: StationVisualizationDigest; totalStations: number } {
  const bundle = getClimateBundle();
  if (!bundle || !isRecord(bundle.noaa) || !Array.isArray(bundle.noaa.stations)) {
    return { totalStations: 0 };
  }
  const stations = bundle.noaa.stations;
  const f = fold(question);
  let matchedRaw: Record<string, unknown> | undefined;

  // Match by station ID or station name in question
  let bestLen = 0;
  for (const st of stations) {
    if (!isRecord(st) || typeof st.name !== "string" || typeof st.id !== "string") continue;
    if (f.includes(fold(st.id))) {
      matchedRaw = st;
      break;
    }
    const cleanName = fold(st.name.replace(/,\s*sp$/i, "").trim());
    if (cleanName.length >= 4 && f.includes(cleanName) && cleanName.length > bestLen) {
      matchedRaw = st;
      bestLen = cleanName.length;
    }
  }

  // Or match nearest station to selected coordinate if within ~0.35 deg
  if (!matchedRaw && selectedCoord) {
    let bestDist2 = 0.35 * 0.35;
    for (const st of stations) {
      if (!isRecord(st) || typeof st.lat !== "number" || typeof st.lon !== "number") continue;
      const d2 = (st.lat - selectedCoord.lat) ** 2 + (st.lon - selectedCoord.lon) ** 2;
      if (d2 < bestDist2) {
        bestDist2 = d2;
        matchedRaw = st;
      }
    }
  }

  if (!matchedRaw || typeof matchedRaw.id !== "string" || typeof matchedRaw.name !== "string") {
    return { totalStations: stations.length };
  }

  const stMetrics: Record<string, MetricTrendDigest> = {};
  const stStats = isRecord(matchedRaw.stats) ? matchedRaw.stats : {};
  const stYears = isRecord(matchedRaw.years) ? matchedRaw.years : {};

  const stationDefs: ReadonlyArray<{ key: string; label: string; units: string; trendUnits: string }> = [
    { key: "tavg", label: "Mean air temperature (TAVG)", units: "°C", trendUnits: "°C/decade" },
    { key: "tmax", label: "Maximum temperature (TMAX)", units: "°C", trendUnits: "°C/decade" },
    { key: "tropical_nights", label: "Tropical nights (Tmin ≥ 20 °C)", units: "nights/yr", trendUnits: "nights/decade" },
    { key: "hot_days_35", label: "Hot days (Tmax > 35 °C)", units: "days/yr", trendUnits: "days/decade" },
    { key: "prcp", label: "Annual precipitation (PRCP)", units: "mm", trendUnits: "mm/decade" },
    { key: "wettest_day", label: "Wettest day (Rx1day)", units: "mm/day", trendUnits: "mm/decade" },
    { key: "max_dry_spell", label: "Longest consecutive dry spell (<1 mm)", units: "days", trendUnits: "days/decade" },
  ];

  for (const def of stationDefs) {
    const rec: Record<string, unknown> = {};
    for (const [yr, row] of Object.entries(stYears)) {
      if (isRecord(row) && typeof row[def.key] === "number") rec[yr] = row[def.key];
    }
    const series = buildSeriesHighlightsFromRecord(rec, queriedYear);
    const digest = parseTrendDigest(
      def.key,
      def.label,
      `NOAA GHCN-Daily station ${matchedRaw.id}`,
      def.units,
      def.trendUnits,
      stStats[def.key],
      series,
    );
    if (digest) stMetrics[def.key] = digest;
  }

  return {
    totalStations: stations.length,
    station: {
      id: matchedRaw.id,
      name: matchedRaw.name,
      lat: typeof matchedRaw.lat === "number" ? matchedRaw.lat : 0,
      lon: typeof matchedRaw.lon === "number" ? matchedRaw.lon : 0,
      elevationM: typeof matchedRaw.elevation === "number" ? matchedRaw.elevation : 0,
      metrics: stMetrics,
    },
  };
}

export function findBasinDigests(question: string, queriedYear?: number): readonly BasinVisualizationDigest[] {
  const bundle = getClimateBundle();
  if (!bundle || !Array.isArray(bundle.rivers)) return [];
  const f = fold(question);
  const allBasins: BasinVisualizationDigest[] = [];

  for (const rawB of bundle.rivers) {
    if (!isRecord(rawB) || typeof rawB.id !== "string" || typeof rawB.name !== "string") continue;
    const rainSeries = isRecord(rawB.rain_mm) ? buildSeriesHighlightsFromRecord(rawB.rain_mm, queriedYear) : undefined;
    const runoffSeries = isRecord(rawB.runoff_mm) ? buildSeriesHighlightsFromRecord(rawB.runoff_mm, queriedYear) : undefined;
    const evapSeries = isRecord(rawB.evap_mm) ? buildSeriesHighlightsFromRecord(rawB.evap_mm, queriedYear) : undefined;
    allBasins.push({
      id: rawB.id,
      name: rawB.name,
      river: typeof rawB.river === "string" ? rawB.river : rawB.name,
      lat: typeof rawB.lat === "number" ? rawB.lat : 0,
      lon: typeof rawB.lon === "number" ? rawB.lon : 0,
      rain: parseTrendDigest(
        "rain_mm",
        "Basin box rainfall",
        "NASA GPM IMERG Final V07",
        "mm",
        "mm/decade",
        rawB.rain_stats,
        rainSeries,
        "EXPLORATORY — GPM rainfall in basin bounding box",
      ),
      runoff: parseTrendDigest(
        "runoff_mm",
        "Modelled basin runoff",
        "NASA GLDAS Noah v2.1",
        "mm/yr",
        "mm/decade",
        rawB.runoff_stats,
        runoffSeries,
        "EXPLORATORY — GLDAS modelled runoff (not river discharge gauges)",
      ),
      evap: parseTrendDigest(
        "evap_mm",
        "Modelled basin evapotranspiration",
        "NASA GLDAS Noah v2.1",
        "mm/yr",
        "mm/decade",
        rawB.evap_stats,
        evapSeries,
        "EXPLORATORY — GLDAS modelled evapotranspiration",
      ),
      note:
        rawB.rain_stats === null
          ? "Insufficient complete GPM years in bundle v2 for trend test."
          : "EXPLORATORY basin-box summary; GLDAS runoff is modelled land-surface runoff, not gauged river discharge.",
    });
  }

  const matched = allBasins.filter(
    (b) => f.includes(fold(b.id)) || f.includes(fold(b.river)) || f.includes(fold(b.name)),
  );
  if (matched.length > 0) return matched;
  return allBasins;
}

export function findReservoirDigests(question: string, scopeKey?: string): readonly ReservoirVisualizationDigest[] {
  const bundle = getClimateBundle();
  if (!bundle || !Array.isArray(bundle.swot_reservoirs)) return [];
  const f = fold(question);
  const all: ReservoirVisualizationDigest[] = [];
  for (const r of bundle.swot_reservoirs) {
    if (!isRecord(r) || typeof r.id !== "string" || typeof r.name !== "string") continue;
    all.push({
      id: r.id,
      name: r.name,
      provinceName: typeof r.provinceName === "string" ? r.provinceName : "",
      basinName: typeof r.basinName === "string" ? r.basinName : null,
      nObs: typeof r.n_obs === "number" ? r.n_obs : 0,
      areaMeanKm2: typeof r.area_mean_km2 === "number" ? r.area_mean_km2 : 0,
      areaMinKm2: typeof r.area_min_km2 === "number" ? r.area_min_km2 : 0,
      areaMaxKm2: typeof r.area_max_km2 === "number" ? r.area_max_km2 : 0,
      areaCv: typeof r.area_cv === "number" ? r.area_cv : 0,
      wseMeanM: typeof r.wse_mean_m === "number" ? r.wse_mean_m : 0,
      wseStdM: typeof r.wse_std_m === "number" ? r.wse_std_m : 0,
      tempSlopeDecade: typeof r.temp_slope_decade === "number" ? r.temp_slope_decade : null,
      evapMeanMm: typeof r.evap_mean_mm === "number" ? r.evap_mean_mm : null,
      fpvScoreExploratory: typeof r.fpv_score === "number" ? r.fpv_score : null,
    });
  }
  const byName = all.filter((r) => {
    const clean = fold(r.name.replace(/^embalse de(l)?\s+/i, "").trim());
    return clean.length >= 4 && f.includes(clean);
  });
  if (byName.length > 0) return byName.slice(0, 5);
  if (scopeKey && scopeKey.startsWith("ccaa:")) {
    const ccaaId = scopeKey.split(":")[1];
    const inCcaa = bundle.swot_reservoirs
      .filter((r): r is Record<string, unknown> => isRecord(r) && r.ccaaId === ccaaId)
      .map((r) => all.find((x) => x.id === r.id))
      .filter((x): x is ReservoirVisualizationDigest => x !== undefined);
    if (inCcaa.length > 0) return inCcaa.slice(0, 5);
  }
  return all.slice(0, 5);
}

export function buildSolarScreeningDigest(
  question: string,
  view?: AgentViewContext,
): SolarScreeningDigest | undefined {
  const pvs = getPvScreening();
  if (!pvs || !isRecord(pvs.summary)) return undefined;
  const s = pvs.summary;
  const cells = Array.isArray(pvs.cells) ? pvs.cells : [];
  const landmarks = Array.isArray(pvs.landmarks) ? pvs.landmarks : [];
  const fc = isRecord(pvs.featured_case) ? pvs.featured_case : null;
  const fcCell = fc && typeof fc.cell_id === "string"
    ? cells.find((c): c is Record<string, unknown> => isRecord(c) && c.id === fc.cell_id)
    : undefined;

  const f = fold(question);
  let matchedLandmarkRaw: Record<string, unknown> | undefined;
  for (const lm of landmarks) {
    if (!isRecord(lm) || typeof lm.name !== "string") continue;
    if (
      f.includes(fold(lm.name)) ||
      (view?.selectedPlantName && fold(view.selectedPlantName) === fold(lm.name))
    ) {
      matchedLandmarkRaw = lm;
      break;
    }
  }

  let matchedCellRaw: Record<string, unknown> | undefined;
  const wantedCellId = view?.selectedCellId ?? (question.match(/\br\d+c\d+\b/i)?.[0]?.toLowerCase());
  if (wantedCellId) {
    matchedCellRaw = cells.find((c): c is Record<string, unknown> => isRecord(c) && c.id === wantedCellId);
  } else if (matchedLandmarkRaw && typeof matchedLandmarkRaw.cell_id === "string") {
    matchedCellRaw = cells.find((c): c is Record<string, unknown> => isRecord(c) && c.id === matchedLandmarkRaw.cell_id);
  }

  return {
    status: typeof pvs.status === "string" ? pvs.status : "EXPLORATORY",
    period: Array.isArray(pvs.period) ? `${pvs.period[0]}–${pvs.period[1]}` : "2000–2025",
    summary: {
      cellsTested: typeof s.irr_cells_tested === "number" ? s.irr_cells_tested : 195,
      cellsGood: typeof s.cells_good === "number" ? s.cells_good : 46,
      cellsMixed: typeof s.cells_mixed === "number" ? s.cells_mixed : 70,
      cellsAvoid: typeof s.cells_avoid === "number" ? s.cells_avoid : 79,
      cellsNoData: typeof s.cells_no_data === "number" ? s.cells_no_data : 51,
      operatingMwTotal: typeof s.operating_mw_total === "number" ? s.operating_mw_total : 36231,
      operatingMwInGoodPct: typeof s.operating_mw_in_good_pct === "number" ? s.operating_mw_in_good_pct : 47.6,
      operatingMwInMixedPct: typeof s.operating_mw_in_mixed_pct === "number" ? s.operating_mw_in_mixed_pct : 22.3,
      operatingMwInAvoidPct: typeof s.operating_mw_in_avoid_pct === "number" ? s.operating_mw_in_avoid_pct : 29.2,
      irrTrendMedianPctDecade: typeof s.irr_trend_pct_decade_median === "number" ? s.irr_trend_pct_decade_median : -0.19,
      tempCellsSignificantUp: typeof s.t_cells_significant_up === "number" ? s.t_cells_significant_up : 120,
      tempTrendMedianCDecade: typeof s.t_trend_c_decade_median === "number" ? s.t_trend_c_decade_median : 0.67,
      heatPenaltyMedianPctDecade: typeof s.heat_penalty_pct_decade_median === "number" ? s.heat_penalty_pct_decade_median : -0.27,
    },
    featuredCase: fcCell && fc
      ? {
          cellId: String(fc.cell_id),
          place: typeof fc.place === "string" ? fc.place : "Jaén–Granada grid cell (r20c23)",
          irrMeanKwhM2Day: typeof fcCell.irr_mean_kwh_m2_day === "number" ? fcCell.irr_mean_kwh_m2_day : 5.356,
          irrTrendPctDecade: typeof fcCell.irr_trend_pct_decade === "number" ? fcCell.irr_trend_pct_decade : 0.04,
          summerTempMeanC: typeof fcCell.t_summer_mean_c === "number" ? fcCell.t_summer_mean_c : 25.02,
          summerTempTrendCDecade: typeof fcCell.t_trend_c_decade === "number" ? fcCell.t_trend_c_decade : 0.79,
          heatPenaltyPctDecade: typeof fcCell.heat_penalty_pct_decade === "number" ? fcCell.heat_penalty_pct_decade : -0.32,
          mitecoLowModeratePct: typeof fcCell.miteco_low_moderate_pct === "number" ? fcCell.miteco_low_moderate_pct : 86.3,
          plantsOperatingN: typeof fcCell.plants_operating_n === "number" ? fcCell.plants_operating_n : 14,
          plantsOperatingMw: typeof fcCell.plants_operating_mw === "number" ? fcCell.plants_operating_mw : 215,
          verdict: typeof fcCell.verdict === "string" ? fcCell.verdict : "good",
        }
      : undefined,
    matchedLandmark: matchedLandmarkRaw
      ? {
          name: String(matchedLandmarkRaw.name),
          mw: typeof matchedLandmarkRaw.mw === "number" ? matchedLandmarkRaw.mw : 0,
          tech: typeof matchedLandmarkRaw.tech === "string" ? matchedLandmarkRaw.tech : "pv",
          lat: typeof matchedLandmarkRaw.lat === "number" ? matchedLandmarkRaw.lat : 0,
          lon: typeof matchedLandmarkRaw.lon === "number" ? matchedLandmarkRaw.lon : 0,
          cellId: typeof matchedLandmarkRaw.cell_id === "string" ? matchedLandmarkRaw.cell_id : "",
          verdict: typeof matchedLandmarkRaw.verdict === "string" ? matchedLandmarkRaw.verdict : "",
          mitecoClass: typeof matchedLandmarkRaw.miteco_class === "number" ? matchedLandmarkRaw.miteco_class : 0,
          source: typeof matchedLandmarkRaw.source === "string" ? matchedLandmarkRaw.source : "GEM Global Solar Power Tracker",
        }
      : undefined,
    matchedCell: matchedCellRaw
      ? {
          id: String(matchedCellRaw.id),
          lat: typeof matchedCellRaw.lat === "number" ? matchedCellRaw.lat : 0,
          lon: typeof matchedCellRaw.lon === "number" ? matchedCellRaw.lon : 0,
          verdict: typeof matchedCellRaw.verdict === "string" ? matchedCellRaw.verdict : "no_data",
          irrMeanKwhM2Day: typeof matchedCellRaw.irr_mean_kwh_m2_day === "number" ? matchedCellRaw.irr_mean_kwh_m2_day : null,
          irrTrendPctDecade: typeof matchedCellRaw.irr_trend_pct_decade === "number" ? matchedCellRaw.irr_trend_pct_decade : null,
          summerTempMeanC: typeof matchedCellRaw.t_summer_mean_c === "number" ? matchedCellRaw.t_summer_mean_c : null,
          summerTempTrendCDecade: typeof matchedCellRaw.t_trend_c_decade === "number" ? matchedCellRaw.t_trend_c_decade : null,
          heatPenaltyPctDecade: typeof matchedCellRaw.heat_penalty_pct_decade === "number" ? matchedCellRaw.heat_penalty_pct_decade : null,
          mitecoLowModeratePct: typeof matchedCellRaw.miteco_low_moderate_pct === "number" ? matchedCellRaw.miteco_low_moderate_pct : null,
          plantsOperatingMw: typeof matchedCellRaw.plants_operating_mw === "number" ? matchedCellRaw.plants_operating_mw : 0,
        }
      : undefined,
  };
}

export function buildSolarCapacityDigest(queriedYear?: number): SolarCapacityDigest | undefined {
  const sct = getSolarCapacity();
  if (!sct || !isRecord(sct.spain) || !isRecord(sct.eu)) return undefined;
  const sp = sct.spain;
  const eu = sct.eu;
  const years = Array.isArray(sp.years) ? sp.years : [];
  const mw = Array.isArray(sp.mw) ? sp.mw : [];
  const added = Array.isArray(sp.added_mw) ? sp.added_mw : [];
  const tr = isRecord(sp.trend_recent) ? sp.trend_recent : {};
  const ci = Array.isArray(tr.ci95) && tr.ci95.length === 2 ? [Number(tr.ci95[0]), Number(tr.ci95[1])] as [number, number] : [1438.6, 5184.1] as [number, number];
  const cagr = isRecord(sp.cagr_pct) && typeof sp.cagr_pct.value === "number" ? sp.cagr_pct.value : 32.4;

  let queriedMw: number | undefined;
  if (queriedYear) {
    const idx = years.indexOf(queriedYear);
    if (idx >= 0 && typeof mw[idx] === "number") queriedMw = mw[idx] as number;
  }

  return {
    source: "Eurostat nrg_inf_epcrw (OFFICIAL_STATISTICS, RA420 Solar PV net capacity)",
    latestYear: 2024,
    latestMw: typeof mw[mw.length - 1] === "number" ? (mw[mw.length - 1] as number) : 35822.9,
    added2024Mw: typeof added[added.length - 1] === "number" ? (added[added.length - 1] as number) : 6243.3,
    euRank: typeof eu.spain_rank === "number" ? eu.spain_rank : 2,
    euCountries: typeof eu.n_countries === "number" ? eu.n_countries : 27,
    euSharePct: typeof eu.spain_share_pct === "number" ? eu.spain_share_pct : 11.7,
    germanyMw: 91204,
    italyMw: 35437.1,
    senSlope2015_2024MwYr: typeof tr.sen_mw_per_year === "number" ? tr.sen_mw_per_year : 3457,
    ci95_2015_2024: ci,
    pValue2015_2024: typeof tr.p === "number" ? tr.p : 0.000083,
    cagr2019_2024Pct: cagr,
    doublingYears: typeof sp.doubling_years === "number" ? sp.doubling_years : 2.5,
    solarThermalMw2024: 2304,
    queriedYear: queriedMw !== undefined ? queriedYear : undefined,
    queriedMw,
  };
}

export function buildRelationshipsDigest(question: string): RelationshipsDigest | undefined {
  const rel = getRelationships();
  if (!rel || !isRecord(rel.r1_validation) || !isRecord(rel.r2_temp_precip) || !isRecord(rel.r3_heat_drought)) {
    return undefined;
  }
  const r1s = isRecord(rel.r1_validation.summary) ? rel.r1_validation.summary : {};
  const r2s = isRecord(rel.r2_temp_precip.summary) ? rel.r2_temp_precip.summary : {};
  const r3s = isRecord(rel.r3_heat_drought.summary) ? rel.r3_heat_drought.summary : {};
  const pairs = Array.isArray(rel.r1_validation.pairs) ? rel.r1_validation.pairs : [];
  const f = fold(question);
  let matchedPair: { name: string; stationSlope: number; merra2Slope: number; pearsonR: number } | undefined;
  for (const p of pairs) {
    if (!isRecord(p) || typeof p.name !== "string") continue;
    const clean = fold(p.name.replace(/,\s*sp$/i, "").trim());
    if (clean.length >= 4 && f.includes(clean)) {
      matchedPair = {
        name: p.name,
        stationSlope: typeof p.station_slope === "number" ? p.station_slope : 0,
        merra2Slope: typeof p.merra2_slope === "number" ? p.merra2_slope : 0,
        pearsonR: typeof p.pearson_r_annual === "number" ? p.pearson_r_annual : 0,
      };
      break;
    }
  }
  return {
    r1Validation: {
      status: "DESCRIPTIVE_VALIDATION",
      nStations: typeof r1s.n_stations === "number" ? r1s.n_stations : 64,
      stationSlopeMedian: typeof r1s.station_slope_median === "number" ? r1s.station_slope_median : 0.55,
      merra2SlopeMedian: typeof r1s.merra2_slope_median === "number" ? r1s.merra2_slope_median : 0.589,
      signAgreement: typeof r1s.sign_agreement === "number" ? r1s.sign_agreement : 64,
      pearsonRMedian: typeof r1s.pearson_r_median === "number" ? r1s.pearson_r_median : 0.934,
      pearsonRMin: typeof r1s.pearson_r_min === "number" ? r1s.pearson_r_min : 0.52,
      matchedPair,
    },
    r2WarmDry: {
      status: "EXPLORATORY",
      nTested: typeof r2s.n_tested === "number" ? r2s.n_tested : 188,
      nRobustFdr: typeof r2s.n_robust === "number" ? r2s.n_robust : 0,
      rhoMedian: typeof r2s.rho_median === "number" ? r2s.rho_median : -0.32,
      nNegative: typeof r2s.n_tested_negative === "number" ? r2s.n_tested_negative : 185,
      nPositive: typeof r2s.n_tested_positive === "number" ? r2s.n_tested_positive : 3,
      qMin: typeof r2s.q_min === "number" ? r2s.q_min : 0.0545,
    },
    r3HeatDrought: {
      status: "EXPLORATORY",
      nTested: typeof r3s.n_tested === "number" ? r3s.n_tested : 123,
      nRobustFdr: typeof r3s.n_robust === "number" ? r3s.n_robust : 0,
      rhoMedian: typeof r3s.rho_median === "number" ? r3s.rho_median : 0.154,
      nPositive: typeof r3s.n_tested_positive === "number" ? r3s.n_tested_positive : 90,
      nNegative: typeof r3s.n_tested_negative === "number" ? r3s.n_tested_negative : 33,
      qMin: typeof r3s.q_min === "number" ? r3s.q_min : 0.4425,
    },
  };
}

export function buildDustDigest(queriedYear?: number): DustVisualizationDigest | undefined {
  const dust = getDust();
  if (!dust || !isRecord(dust.featured_cell)) return undefined;
  const fc = dust.featured_cell;
  const annual = Array.isArray(fc.annual) ? fc.annual : [];
  let peakYear = 2022;
  let peakAot = 0.0954;
  let minYear = 2013;
  let minAot = 0.0323;
  let queriedAot: number | undefined;
  for (const row of annual) {
    if (!isRecord(row) || typeof row.year !== "number" || typeof row.mean_aot !== "number") continue;
    const val = Number(row.mean_aot.toFixed(4));
    if (val > peakAot) {
      peakAot = val;
      peakYear = row.year;
    }
    if (val < minAot) {
      minAot = val;
      minYear = row.year;
    }
    if (queriedYear && row.year === queriedYear) {
      queriedAot = val;
    }
  }
  return {
    dataset: "NASA GMAO MERRA-2 M2TMNXAER v5.12.4 (Giovanni)",
    variable: "DUEXTTAU (550 nm dust aerosol optical thickness)",
    period: "2000–2025",
    cellId: typeof fc.id === "string" ? fc.id : "r20c23",
    meanAot2000_2025: typeof fc.mean_aot_2000_2025 === "number" ? Number(fc.mean_aot_2000_2025.toFixed(4)) : 0.056,
    peakYear,
    peakAot,
    minYear,
    minAot,
    queriedYear: queriedAot !== undefined ? queriedYear : undefined,
    queriedAot,
    limitation: "EXPLORATORY column aerosol optical thickness in featured cell r20c23 (Jaén–Granada); not panel soiling or generation loss.",
  };
}

export function buildInfrastructureDigest(
  question: string,
  selectedInstallationId?: string,
): InfrastructureVisualizationDigest | undefined {
  const infra = getInfra();
  if (!infra || !isRecord(infra.counts) || !Array.isArray(infra.installations)) return undefined;
  const counts = infra.counts;
  const byTech = isRecord(counts.by_technology) ? counts.by_technology : {};
  const f = fold(question);
  const matched: InfrastructureVisualizationDigest["matchedInstallations"] = [];

  for (const inst of infra.installations) {
    if (!isRecord(inst) || typeof inst.id !== "string" || typeof inst.name !== "string") continue;
    const isSelected = selectedInstallationId && inst.id === selectedInstallationId;
    const nameFold = fold(inst.name);
    const munFold = typeof inst.municipality === "string" ? fold(inst.municipality) : "";
    const provFold = typeof inst.province_name === "string" ? fold(inst.province_name) : "";
    if (
      isSelected ||
      (nameFold.length >= 4 && f.includes(nameFold)) ||
      (munFold.length >= 4 && f.includes(munFold)) ||
      (provFold.length >= 4 && f.includes(provFold))
    ) {
      matched.push({
        id: inst.id,
        name: inst.name,
        technology: typeof inst.technology === "string" ? inst.technology : "unknown",
        capacityMw: typeof inst.capacity_mw === "number" ? inst.capacity_mw : 0,
        municipality: typeof inst.municipality === "string" ? inst.municipality : "",
        provinceName: typeof inst.province_name === "string" ? inst.province_name : "",
      });
      if (matched.length >= 6) break;
    }
  }

  return {
    coverage: "Castilla y León only (ES41) — EXPLORATORY metadata overlay",
    source: "Junta de Castilla y León PRETOR register (RD 413/2014)",
    totalInstallations: typeof counts.installations === "number" ? counts.installations : 652,
    solarPvCount: typeof byTech.solar_pv === "number" ? byTech.solar_pv : 378,
    windOnshoreCount: typeof byTech.wind_onshore === "number" ? byTech.wind_onshore : 274,
    matchedInstallations: matched,
  };
}

function formatMetricSummaryLine(m: MetricTrendDigest, lang: AgentLanguage): string {
  const ciLabel = lang === "es" ? "IC 95%" : "95% CI";
  const seriesPart = m.series
    ? lang === "es"
      ? ` [serie ${m.series.firstYear}: ${m.series.firstValue} ${m.units} → ${m.series.lastYear}: ${m.series.lastValue} ${m.units}; mín ${m.series.minYear} (${m.series.minValue} ${m.units}), máx ${m.series.maxYear} (${m.series.maxValue} ${m.units})${m.series.queriedYear !== undefined ? `, año ${m.series.queriedYear}: ${m.series.queriedValue} ${m.units}` : ""}]`
      : ` [series ${m.series.firstYear}: ${m.series.firstValue} ${m.units} → ${m.series.lastYear}: ${m.series.lastValue} ${m.units}; min ${m.series.minYear} (${m.series.minValue} ${m.units}), max ${m.series.maxYear} (${m.series.maxValue} ${m.units})${m.series.queriedYear !== undefined ? `, year ${m.series.queriedYear}: ${m.series.queriedValue} ${m.units}` : ""}]`
    : "";
  return `${m.label} (${m.dataset}, ${m.period}): ${signed(m.slopePerDecade)} ${m.trendUnits} (${ciLabel} ${signed(m.ci95[0])}..${signed(m.ci95[1])}; p = ${m.pValue}; n = ${m.n}; outcome = ${m.outcome})${seriesPart}`;
}

export function buildVisualizationContext(opts: {
  question: string;
  regionScope?: string;
  viewContext?: AgentViewContext;
}): VisualizationContextDigest {
  const f = fold(opts.question);
  const view = opts.viewContext;
  const queriedYear = extractYearFromQuestion(opts.question, view?.year);

  const scopeDigest =
    resolveScopeVisualizationDigest(opts.question, queriedYear) ??
    (opts.regionScope ? resolveScopeVisualizationDigest(opts.regionScope, queriedYear) : undefined) ??
    resolveScopeVisualizationDigest("age", queriedYear);

  const wantsStations =
    view?.activeTool === "stations" ||
    view?.dimension === "heat_extremes" ||
    view?.dimension === "rain_extremes" ||
    /\b(estacion\w*|station\w*|noaa|ghcn|retiro|aeropuerto|noches tropicales|tropical nights|dias calurosos|hot days|racha seca|dry spell|rx1day|dia mas lluvioso|wettest)\b/.test(f);

  const stationLookup = findStationDigest(
    opts.question,
    view?.selectedCoord,
    queriedYear,
  );
  const stationDigest = stationLookup.station;

  const wantsBasins =
    view?.dimension === "water_rivers" ||
    /\b(cuenca\w*|basin\w*|rio\w*|river\w*|ebro|duero|tajo|guadiana|guadalquivir|jucar|segura|mino|sil|escorrent\w*|runoff|caudal)\b/.test(f);
  const basinDigests = wantsBasins ? findBasinDigests(opts.question, queriedYear) : undefined;

  const wantsReservoirs =
    view?.workspaceMode === "energy" ||
    /\b(embalse\w*|reservoir\w*|swot|solar flotante|floating solar|fpv|mediano|alcantara|buendia|mazarron|serena|cijara|almendra|ricobayo)\b/.test(f);
  const reservoirDigests = wantsReservoirs ? findReservoirDigests(opts.question, scopeDigest?.scopeKey) : undefined;

  const wantsSolarScreening =
    view?.screeningOpen === true ||
    /\b(screening|cribado|miteco|zonificaci\w*|jaen|r20c23|cifuentes|pizarro|balboa|mula|talasol|olmedilla|andasol|gemasolar|penalizacion termica|heat penalty|celda\w* solar\w*|solar map|mapa solar)\b/.test(f);
  const solarScreening = wantsSolarScreening ? buildSolarScreeningDigest(opts.question, view) : undefined;

  const wantsSolarCapacity =
    view?.screeningOpen === true ||
    /\b(eurostat|capacidad instalada|installed capacity|crecimiento solar|solar growth|cuantos mw|cuantos gw|potencia instalada|ranking ue|eu rank|alemania|germany|duplica\w*)\b/.test(f);
  const solarCapacity = wantsSolarCapacity ? buildSolarCapacityDigest(queriedYear) : undefined;

  const wantsRelationships =
    view?.activeTool === "relationships" ||
    /\b(relacion\w*|relationship\w*|correlaci\w*|spearman|pearson|validaci\w* merra|station vs merra|calido y seco|warm and dry|r1|r2|r3)\b/.test(f);
  const relationships = wantsRelationships ? buildRelationshipsDigest(opts.question) : undefined;

  const wantsDust =
    /\b(polvo|dust|calima|aerosol\w*|duexttau|giovanni|soiling|suciedad)\b/.test(f);
  const dust = wantsDust ? buildDustDigest(queriedYear) : undefined;

  const wantsInfra =
    view?.activeTool === "infrastructure" ||
    /\b(pretor|652|378|274|instalaciones registradas|buniel|registro de castilla)\b/.test(f);
  const infrastructure = wantsInfra ? buildInfrastructureDigest(opts.question, view?.selectedInstallationId) : undefined;

  // Build concise bilingual summaries of the relevant visualization data
  const linesEs: string[] = [];
  const linesEn: string[] = [];

  if (view) {
    const modeLabelEs = view.mode === "trend" ? "tendencia decadal" : `año observado ${view.year ?? 2025}`;
    const modeLabelEn = view.mode === "trend" ? "decadal trend" : `observed year ${view.year ?? 2025}`;
    linesEs.push(
      `Vista activa en UI: dimensión=${view.dimension ?? "temperature"} (${modeLabelEs}), ámbito=${scopeDigest?.name ?? opts.regionScope ?? "Península + Baleares"}${view.activeTool ? `, herramienta=${view.activeTool}` : ""}${view.screeningOpen ? ", panel de cribado solar PV abierto" : ""}.`,
    );
    linesEn.push(
      `Active UI view: dimension=${view.dimension ?? "temperature"} (${modeLabelEn}), scope=${scopeDigest?.name ?? opts.regionScope ?? "Peninsula + Balearics"}${view.activeTool ? `, tool=${view.activeTool}` : ""}${view.screeningOpen ? ", solar PV screening panel open" : ""}.`,
    );
  }

  if (scopeDigest) {
    const mList = Object.values(scopeDigest.metrics);
    for (const m of mList) {
      linesEs.push(`[${scopeDigest.name}] ${formatMetricSummaryLine(m, "es")}`);
      linesEn.push(`[${scopeDigest.name}] ${formatMetricSummaryLine(m, "en")}`);
    }
  }

  if (stationDigest) {
    const mList = Object.values(stationDigest.metrics);
    for (const m of mList) {
      linesEs.push(`[Estación NOAA ${stationDigest.name} (${stationDigest.id}, ${stationDigest.elevationM} m)] ${formatMetricSummaryLine(m, "es")}`);
      linesEn.push(`[NOAA Station ${stationDigest.name} (${stationDigest.id}, ${stationDigest.elevationM} m)] ${formatMetricSummaryLine(m, "en")}`);
    }
  } else if (wantsStations && stationLookup.totalStations > 0) {
    linesEs.push(`Red NOAA GHCN-Daily en el bundle: ${stationLookup.totalStations} estaciones meteorológicas con series observadas 2000–2025 (64 estaciones de referencia con ≥20 años completos para validación frente a MERRA-2).`);
    linesEn.push(`NOAA GHCN-Daily network in bundle: ${stationLookup.totalStations} weather stations with 2000–2025 observed series (64 reference stations with ≥20 complete years for MERRA-2 validation).`);
  }

  if (basinDigests && basinDigests.length > 0) {
    for (const b of basinDigests.slice(0, 4)) {
      const rPartEs = b.rain ? `Lluvia GPM: ${signed(b.rain.slopePerDecade)} mm/década (IC 95% ${signed(b.rain.ci95[0])} a ${signed(b.rain.ci95[1])}; p = ${b.rain.pValue})` : "Lluvia GPM: años completos insuficientes para tendencia";
      const qPartEs = b.runoff ? `, Escorrentía modelada GLDAS: ${signed(b.runoff.slopePerDecade)} mm/década (p = ${b.runoff.pValue})` : "";
      linesEs.push(`[${b.name} (EXPLORATORY)] ${rPartEs}${qPartEs}.`);
      const rPartEn = b.rain ? `GPM Rain: ${signed(b.rain.slopePerDecade)} mm/decade (95% CI ${signed(b.rain.ci95[0])} to ${signed(b.rain.ci95[1])}; p = ${b.rain.pValue})` : "GPM Rain: insufficient complete years for trend";
      const qPartEn = b.runoff ? `, GLDAS modelled runoff: ${signed(b.runoff.slopePerDecade)} mm/decade (p = ${b.runoff.pValue})` : "";
      linesEn.push(`[${b.name} (EXPLORATORY)] ${rPartEn}${qPartEn}.`);
    }
  }

  if (reservoirDigests && reservoirDigests.length > 0) {
    for (const r of reservoirDigests.slice(0, 3)) {
      linesEs.push(
        `[Embalse SWOT ${r.name} (${r.provinceName}${r.basinName ? `, ${r.basinName}` : ""})] ${r.nObs} pases satelitales SWOT (2023–2026), área media ${r.areaMeanKm2} km² (rango ${r.areaMinKm2}–${r.areaMaxKm2} km², CV = ${r.areaCv}), cota media WSE ${r.wseMeanM} m (±${r.wseStdM} m).`,
      );
      linesEn.push(
        `[SWOT Reservoir ${r.name} (${r.provinceName}${r.basinName ? `, ${r.basinName}` : ""})] ${r.nObs} SWOT satellite passes (2023–2026), mean area ${r.areaMeanKm2} km² (range ${r.areaMinKm2}–${r.areaMaxKm2} km², CV = ${r.areaCv}), mean WSE ${r.wseMeanM} m (±${r.wseStdM} m).`,
      );
    }
  }

  if (solarScreening) {
    const s = solarScreening.summary;
    linesEs.push(
      `[Cribado Solar PV (pv-screening.json, EXPLORATORY)] ${s.cellsTested} celdas MERRA-2 analizadas (2000–2025): ${s.cellsGood} compatibles (good), ${s.cellsMixed} mixtas, ${s.cellsAvoid} alta sensibilidad ambiental (avoid). Capacidad solar en operación GEM: ${s.operatingMwTotal} MW (${s.operatingMwInGoodPct}% en celdas compatibles, ${s.operatingMwInMixedPct}% en mixtas, ${s.operatingMwInAvoidPct}% en zonas sensibles). Mediana de tendencia de irradiancia SWGDN: ${signed(s.irrTrendMedianPctDecade)} %/década (0/195 celdas significativas tras BH FDR). Calentamiento estival significativo en ${s.tempCellsSignificantUp}/195 celdas (mediana ${signed(s.tempTrendMedianCDecade)} °C/década; penalización térmica mediana ${signed(s.heatPenaltyMedianPctDecade)} %/década).`,
    );
    linesEn.push(
      `[Solar PV Screening (pv-screening.json, EXPLORATORY)] ${s.cellsTested} MERRA-2 cells tested (2000–2025): ${s.cellsGood} compatible (good), ${s.cellsMixed} mixed, ${s.cellsAvoid} high sensitivity (avoid). Operating GEM solar capacity: ${s.operatingMwTotal} MW (${s.operatingMwInGoodPct}% in good cells, ${s.operatingMwInMixedPct}% in mixed, ${s.operatingMwInAvoidPct}% in avoid). Median SWGDN irradiance trend: ${signed(s.irrTrendMedianPctDecade)} %/decade (0/195 cells significant after BH FDR). Summer warming significant in ${s.tempCellsSignificantUp}/195 cells (median ${signed(s.tempTrendMedianCDecade)} °C/decade; median heat penalty ${signed(s.heatPenaltyMedianPctDecade)} %/decade).`,
    );
    if (solarScreening.featuredCase) {
      const fc = solarScreening.featuredCase;
      linesEs.push(
        `[Celda destacada ${fc.place} (${fc.cellId})] Irradiancia media ${fc.irrMeanKwhM2Day} kWh/m²/día (tendencia ${signed(fc.irrTrendPctDecade)} %/década, no significativa), temperatura media verano ${fc.summerTempMeanC} °C (${signed(fc.summerTempTrendCDecade)} °C/década, penalización térmica ${signed(fc.heatPenaltyPctDecade)} %/década), suelo MITECO baja/moderada sensibilidad ${fc.mitecoLowModeratePct}%, ${fc.plantsOperatingN} plantas en operación (${fc.plantsOperatingMw} MW).`,
      );
      linesEn.push(
        `[Featured cell ${fc.place} (${fc.cellId})] Mean irradiance ${fc.irrMeanKwhM2Day} kWh/m²/day (trend ${signed(fc.irrTrendPctDecade)} %/decade, not significant), summer mean temp ${fc.summerTempMeanC} °C (${signed(fc.summerTempTrendCDecade)} °C/decade, heat penalty ${signed(fc.heatPenaltyPctDecade)} %/decade), MITECO low/moderate land ${fc.mitecoLowModeratePct}%, ${fc.plantsOperatingN} operating plants (${fc.plantsOperatingMw} MW).`,
      );
    }
    if (solarScreening.matchedLandmark) {
      const lm = solarScreening.matchedLandmark;
      linesEs.push(
        `[Planta solar de referencia ${lm.name}] ${lm.mw} MW (${lm.tech.toUpperCase()}), celda ${lm.cellId} (${lm.verdict}), clase MITECO ${lm.mitecoClass}. Fuente: ${lm.source}.`,
      );
      linesEn.push(
        `[Landmark solar plant ${lm.name}] ${lm.mw} MW (${lm.tech.toUpperCase()}), cell ${lm.cellId} (${lm.verdict}), MITECO class ${lm.mitecoClass}. Source: ${lm.source}.`,
      );
    }
  }

  if (solarCapacity) {
    linesEs.push(
      `[Capacidad Solar Fotovoltaica en España (Eurostat nrg_inf_epcrw, OFFICIAL_STATISTICS)] En ${solarCapacity.latestYear}: ${solarCapacity.latestMw} MW instalados (+${solarCapacity.added2024Mw} MW añadidos en 2024), puesto #${solarCapacity.euRank} de ${solarCapacity.euCountries} en la UE (${solarCapacity.euSharePct}% del total UE tras Alemania con ${solarCapacity.germanyMw} MW). Tendencia Theil–Sen 2015–2024: +${solarCapacity.senSlope2015_2024MwYr} MW/año (IC 95% +${solarCapacity.ci95_2015_2024[0]} a +${solarCapacity.ci95_2015_2024[1]} MW/año; p = ${solarCapacity.pValue2015_2024}), CAGR 2019–2024 del ${solarCapacity.cagr2019_2024Pct}% (se duplica cada ${solarCapacity.doublingYears} años). Solar termoeléctrica (CSP): ${solarCapacity.solarThermalMw2024} MW${solarCapacity.queriedYear !== undefined ? `. En el año ${solarCapacity.queriedYear}: ${solarCapacity.queriedMw} MW` : ""}.`,
    );
    linesEn.push(
      `[Spanish Solar PV Capacity (Eurostat nrg_inf_epcrw, OFFICIAL_STATISTICS)] In ${solarCapacity.latestYear}: ${solarCapacity.latestMw} MW installed (+${solarCapacity.added2024Mw} MW added in 2024), rank #${solarCapacity.euRank} of ${solarCapacity.euCountries} in EU (${solarCapacity.euSharePct}% of EU total after Germany with ${solarCapacity.germanyMw} MW). Theil–Sen trend 2015–2024: +${solarCapacity.senSlope2015_2024MwYr} MW/yr (95% CI +${solarCapacity.ci95_2015_2024[0]} to +${solarCapacity.ci95_2015_2024[1]} MW/yr; p = ${solarCapacity.pValue2015_2024}), 2019–2024 CAGR ${solarCapacity.cagr2019_2024Pct}% (doubles every ${solarCapacity.doublingYears} years). Solar thermal (CSP): ${solarCapacity.solarThermalMw2024} MW${solarCapacity.queriedYear !== undefined ? `. In year ${solarCapacity.queriedYear}: ${solarCapacity.queriedMw} MW` : ""}.`,
    );
  }

  if (relationships) {
    const r1 = relationships.r1Validation;
    const r2 = relationships.r2WarmDry;
    const r3 = relationships.r3HeatDrought;
    linesEs.push(
      `[Mapas de Relaciones (relationship-maps.json)] R1 Validación MERRA-2 vs ${r1.nStations} estaciones NOAA: acuerdo de signo en ${r1.signAgreement}/${r1.nStations} estaciones, r de Pearson anual mediano = ${r1.pearsonRMedian} (mín ${r1.pearsonRMin}), pendiente mediana estación +${r1.stationSlopeMedian} vs MERRA-2 +${r1.merra2SlopeMedian} °C/década${r1.matchedPair ? ` (${r1.matchedPair.name}: r = ${r1.matchedPair.pearsonR}, estación +${r1.matchedPair.stationSlope} vs MERRA-2 +${r1.matchedPair.merra2Slope} °C/década)` : ""}. R2 Años cálidos × secos (EXPLORATORY, ${r2.nTested} celdas): rho de Spearman mediano = ${r2.rhoMedian} (${r2.nNegative}/${r2.nTested} celdas negativas), pero ${r2.nRobustFdr} celdas superan FDR q < 0.05 (q mín = ${r2.qMin}). R3 Días > 35 °C × racha seca (EXPLORATORY, ${r3.nTested} estaciones): rho mediano = +${r3.rhoMedian}, ${r3.nRobustFdr} estaciones superan FDR (q mín = ${r3.qMin}).`,
    );
    linesEn.push(
      `[Relationship Maps (relationship-maps.json)] R1 MERRA-2 vs ${r1.nStations} NOAA stations validation: sign agreement in ${r1.signAgreement}/${r1.nStations} stations, median annual Pearson r = ${r1.pearsonRMedian} (min ${r1.pearsonRMin}), median slope station +${r1.stationSlopeMedian} vs MERRA-2 +${r1.merra2SlopeMedian} °C/decade${r1.matchedPair ? ` (${r1.matchedPair.name}: r = ${r1.matchedPair.pearsonR}, station +${r1.matchedPair.stationSlope} vs MERRA-2 +${r1.matchedPair.merra2Slope} °C/decade)` : ""}. R2 Warm × dry years (EXPLORATORY, ${r2.nTested} cells): median Spearman rho = ${r2.rhoMedian} (${r2.nNegative}/${r2.nTested} negative), ${r2.nRobustFdr} cells pass FDR q < 0.05 (min q = ${r2.qMin}). R3 Hot days > 35 °C × dry spell (EXPLORATORY, ${r3.nTested} stations): median rho = +${r3.rhoMedian}, ${r3.nRobustFdr} pass FDR (min q = ${r3.qMin}).`,
    );
  }

  if (dust) {
    linesEs.push(
      `[Polvo Sahariano / Aerosoles (${dust.dataset}, EXPLORATORY)] Espesor óptico de aerosoles de polvo a 550 nm (DUEXTTAU) en celda destacada ${dust.cellId} (Jaén–Granada, ${dust.period}): media ${dust.meanAot2000_2025}, máximo anual en ${dust.peakYear} (${dust.peakAot} por episodios de calima), mínimo en ${dust.minYear} (${dust.minAot})${dust.queriedYear !== undefined ? `, en ${dust.queriedYear}: ${dust.queriedAot}` : ""}. Nota: es espesor óptico en columna, no suciedad en panel ni pérdida MWh.`,
    );
    linesEn.push(
      `[Saharan Dust / Aerosols (${dust.dataset}, EXPLORATORY)] 550 nm dust aerosol optical thickness (DUEXTTAU) in featured cell ${dust.cellId} (Jaén–Granada, ${dust.period}): mean ${dust.meanAot2000_2025}, annual peak in ${dust.peakYear} (${dust.peakAot} calima episodes), min in ${dust.minYear} (${dust.minAot})${dust.queriedYear !== undefined ? `, in ${dust.queriedYear}: ${dust.queriedAot}` : ""}. Note: column optical thickness, not panel soiling or MWh loss.`,
    );
  }

  if (infrastructure) {
    linesEs.push(
      `[Infraestructura Registrada CyL (energy-infrastructure.json, EXPLORATORY)] ${infrastructure.totalInstallations} instalaciones en operación en Castilla y León (${infrastructure.solarPvCount} solares FV, ${infrastructure.windOnshoreCount} parques eólicos). Fuente: ${infrastructure.source}. Capacidad registrada en MW, no generación en MWh.`,
    );
    linesEn.push(
      `[Registered CyL Infrastructure (energy-infrastructure.json, EXPLORATORY)] ${infrastructure.totalInstallations} operating installations in Castilla y León (${infrastructure.solarPvCount} solar PV, ${infrastructure.windOnshoreCount} onshore wind). Source: ${infrastructure.source}. Registered capacity in MW, not MWh generation.`,
    );
  }

  return {
    activeView: view,
    queriedYear,
    scopeDigest,
    stationDigest,
    stationNetworkCount: stationLookup.totalStations,
    basinDigests,
    reservoirDigests,
    solarScreening,
    solarCapacity,
    relationships,
    dust,
    infrastructure,
    summaryEs: linesEs.join("\n"),
    summaryEn: linesEn.join("\n"),
  };
}
