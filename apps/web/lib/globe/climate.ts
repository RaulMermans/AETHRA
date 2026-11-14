import {
  buildAdminScopeOverlayGeoJson,
  type AdminBundle,
  type ResolvedAdminScope,
} from "./admin-scope";
import { buildStationCatalog, stationMetricFor } from "./stations";
import type { GeoBounds, GeoCoordinate } from "./types";

export type DimensionId =
  | "temperature"
  | "precipitation"
  | "drought"
  | "snow"
  | "water_rivers"
  | "heat_extremes"
  | "rain_extremes";

/** Observed values or the decadal trend. No projection mode (D38: no 2030 extrapolation on the demo path). */
export type ClimateDisplayMode = "value" | "trend";
export type ProjectionScenario = "central" | "high" | "low";

export type HeatSubMetric = "tropical_nights" | "hot_days_35";
export type RainSubMetric = "max_dry_spell" | "wettest_day";
export type VegSubMetric = "ndvi" | "evi";

/** Trend result computed by scripts/build_climate_bundle.py (packages/science/trends.py). */
export interface TrendStats {
  slope_decade: number;
  ci_low_decade: number;
  ci_high_decade: number;
  intercept_2000: number;
  p_value: number;
  /** p < 0.05 AND 95% CI excludes 0. */
  significant: boolean;
  n: number;
  outcome?: "supported_increase" | "supported_decrease" | "not_significant";
  first_year?: number;
  last_year?: number;
  lag1_autocorr?: number;
  hamed_rao_applied?: boolean;
  /** Benjamini–Hochberg q within its family (map cells, station network). */
  q_value_bh?: number;
  significant_fdr?: boolean;
}

export interface ScopeSeries {
  readonly series: Readonly<Record<string, number | null>>;
  readonly stats: TrendStats | null;
}

export interface NoaaStationYearRecord {
  tavg: number | null;
  tmax: number | null;
  dtr?: number | null;
  tropical_nights: number | null;
  hot_days_35: number | null;
  prcp: number | null;
  wettest_day: number | null;
  max_dry_spell: number | null;
  snow_days: number | null;
  max_snwd: number | null;
}

export interface NoaaStation {
  id: string;
  name: string;
  lat: number;
  lon: number;
  elevation: number;
  /** Observed NOAA AWND mean; null when the station has no wind record (most of them). */
  wind_mean_ms: number | null;
  wind_source: string;
  has_snow: boolean;
  years: Record<string, NoaaStationYearRecord>;
  stats: Record<string, TrendStats>;
}

export interface RiverBasin {
  id: string;
  name: string;
  river: string;
  lat: number;
  lon: number;
  bbox: [number, number, number, number];
  coords: [number, number][];
  /** Not in the v2 bundle (no sourced value); kept optional for older bundles. */
  reservoir_capacity_hm3?: number;
  hydro_mw?: number;
  rain_mm: Record<string, number>;
  /** GLDAS Noah model output over the basin box (modelled runoff, not gauged discharge). */
  runoff_mm?: Record<string, number | null>;
  evap_mm?: Record<string, number | null>;
  soil_mm?: Record<string, number | null>;
  rain_stats: TrendStats;
  runoff_stats?: TrendStats | null;
  evap_stats?: TrendStats | null;
  soil_stats?: TrendStats | null;
}

export interface SwotReservoir {
  id: string;
  name: string;
  lat: number;
  lon: number;
  provinceId: string;
  provinceName: string;
  ccaaId: string;
  province_match?: "inside_polygon" | "nearest_centre";
  basinId: string | null;
  basinName: string | null;
  n_obs: number;
  area_mean_km2: number;
  area_min_km2: number;
  area_max_km2: number;
  area_cv: number;
  wse_mean_m: number;
  wse_std_m: number;
  temp_mean_c: number | null;
  temp_slope_decade: number | null;
  evap_mean_mm: number | null;
  evap_slope_decade: number | null;
  rain_mean_mm: number | null;
  rain_slope_decade: number | null;
  /** EXPLORATORY heuristic (hand-picked weights), not a validated suitability result. */
  fpv_score: number | null;
  swot_series: Array<{
    ym: string;
    area_km2: number;
    wse_m: number;
  }>;
}

export interface AdminClimateProfile {
  id: string;
  name: string;
  lat: number;
  lon: number;
  ccaaId: string;
  ccaaName: string;
  series: {
    temp_c: (number | null)[];
    summer_temp_c: (number | null)[];
    rain_mm: (number | null)[];
    runoff_mm: (number | null)[];
    evap_mm: (number | null)[];
    soil_mm: (number | null)[];
    swe_mm: (number | null)[];
    hot_days_35: (number | null)[];
    tropical_nights: (number | null)[];
    max_dry_spell: (number | null)[];
    dtr_c: (number | null)[];
  };
  stats: {
    temp_c: TrendStats | null;
    summer_temp_c: TrendStats | null;
    rain_mm: TrendStats | null;
    runoff_mm: TrendStats | null;
    evap_mm: TrendStats | null;
    soil_mm: TrendStats | null;
    swe_mm: TrendStats | null;
    hot_days_35: TrendStats | null;
    tropical_nights: TrendStats | null;
    max_dry_spell: TrendStats | null;
    dtr_c: TrendStats | null;
  };
  noaa_station_count?: number;
  /** Observed NOAA AWND mean of stations in the unit; null when none observe wind. */
  wind_mean_ms: number | null;
  wind_slope_decade: number | null;
  wind_source?: string;
  /** No MODIS NDVI series in the v2 bundle (D29): always null. */
  ndvi_mean: number | null;
  ndvi_slope_decade: number | null;
  swot_count: number;
  swot_area_km2: number;
  swot_cv: number | null;
  swot_fpv_score: number | null;
}

export interface ClimateBundle {
  bundle_version: string;
  scope: string;
  method: string;
  last_complete_year: Record<string, number>;
  /** Precomputed series + trend per scope key: "age" (Peninsula + Balearics), "ccaa:<id>", "provincia:<id>". */
  scopes: Record<
    string,
    { name: string; temperature?: ScopeSeries; precipitation?: ScopeSeries; drought?: ScopeSeries; water_rivers?: ScopeSeries }
  >;
  provenance: Record<string, unknown>;
  merra2: {
    dataset: string;
    doi: string;
    variable: string;
    units: string;
    resolution: string;
    note: string;
    n_lat: number;
    n_lon: number;
    lats: number[];
    lons: number[];
    years: number[];
    valid_indices: number[];
    annual_by_year: Record<string, number[]>;
    summer_by_year: Record<string, number[]>;
    cell_slope_decade: number[];
    cell_ci_low_decade: number[];
    cell_ci_high_decade: number[];
    cell_p_value: number[];
    cell_intercept_2000: number[];
    cell_q_value: number[];
    spain_annual: Record<string, number | null>;
    spain_stats: TrendStats;
    canarias_annual: Record<string, number | null>;
    canarias_stats: TrendStats | null;
  };
  gpm: {
    dataset: string;
    doi: string;
    variable: string;
    units: string;
    resolution: string;
    n_lat: number;
    n_lon: number;
    lats: number[];
    lons: number[];
    years: number[];
    valid_indices: number[];
    annual_by_year: Record<string, number[]>;
    spi_by_year: Record<string, number[]>;
    max_month_by_year: Record<string, number[]>;
    cell_mean: number[];
    cell_std: number[];
    cell_slope_decade: number[];
    cell_p_value: number[];
    cell_intercept_2000: number[];
    cell_max_slope_decade: number[];
    cell_max_intercept_2000: number[];
    cell_q_value: number[];
    spi_definition: string;
    spain_annual: Record<string, number | null>;
    spain_stats: TrendStats;
    anomaly_spain_annual: Record<string, number | null>;
    anomaly_spain_stats: TrendStats | null;
  };
  gldas: {
    dataset: string;
    doi: string;
    coverage: string;
    units: string;
    years: number[];
    annual: Record<
      string,
      {
        evapotranspiration_mm: number;
        surface_runoff_mm: number;
        groundwater_runoff_mm: number;
        total_runoff_mm: number;
        snow_water_equivalent_mm: number;
        soil_moisture_0_10cm_mm: number;
      }
    >;
    stats: Record<string, TrendStats | null>;
    grid?: {
      n_lat: number;
      n_lon: number;
      lats: number[];
      lons: number[];
      valid_indices: number[];
      runoff_mean: number[];
      runoff_slope_decade: number[];
      runoff_p_value: number[];
      runoff_intercept_2000: number[];
      evap_mean: number[];
      evap_slope_decade: number[];
      evap_p_value: number[];
      evap_intercept_2000: number[];
      soil_mean: number[];
      soil_slope_decade: number[];
      soil_p_value: number[];
      soil_intercept_2000: number[];
      swe_mean: number[];
      swe_slope_decade: number[];
    };
  };
  noaa: {
    dataset: string;
    coverage: string;
    count: number;
    stations: NoaaStation[];
  };
  rivers: RiverBasin[];
  swot_reservoirs?: SwotReservoir[];
  /** EXPLORATORY (Energy Tech Lab, D44). */
  admin_profiles?: {
    status?: string;
    note?: string;
    years: number[];
    provinces: Record<string, AdminClimateProfile>;
    ccaa: Record<string, AdminClimateProfile>;
  };
}

export interface DimensionMeta {
  id: DimensionId;
  label: string;
  shortLabel: string;
  badge?: string;
  description: string;
  datasets: string;
  units: string;
  trendUnits: string;
  spatialNote: string;
  synthetic?: boolean;
  valueDomain: [number, number];
  trendDomain: [number, number];
  palette: PaletteId;
  trendPalette: PaletteId;
}

export type PaletteId =
  | "thermal"
  | "precip"
  | "drought_spi"
  | "vegetation"
  | "snow"
  | "runoff"
  | "heat_extreme"
  | "wind"
  | "rdbu_rev"
  | "brbg";

export const DIMENSIONS: DimensionMeta[] = [
  {
    id: "temperature",
    label: "Temperature",
    shortLabel: "Temp",
    description: "2 m air temperature (NASA MERRA-2 grid + ~175 NOAA weather stations).",
    datasets: "NASA MERRA-2 M2TMNXSLV v5.12.4 + NOAA GHCN-Daily",
    units: "°C",
    trendUnits: "°C/decade",
    spatialNote: "0.5° × 0.625° grid + station points",
    valueDomain: [6, 22],
    trendDomain: [-0.2, 0.9],
    palette: "thermal",
    trendPalette: "rdbu_rev",
  },
  {
    id: "precipitation",
    label: "Precipitation",
    shortLabel: "Rain",
    description: "Annual accumulated precipitation from space (NASA GPM IMERG) and rain gauges (NOAA).",
    datasets: "NASA GPM IMERG Final V07 + NOAA GHCN-Daily",
    units: "mm",
    trendUnits: "mm/decade",
    spatialNote: "0.2° GPM grid (native 0.1° subsampled) + station points",
    valueDomain: [40, 2100],
    trendDomain: [-120, 120],
    palette: "precip",
    trendPalette: "brbg",
  },
  {
    id: "drought",
    label: "Dry / wet years",
    shortLabel: "Drought",
    description: "Standardized annual precipitation anomaly from NASA GPM IMERG (z-score vs 2000–2024; not the gamma-fitted SPI). NASA GLDAS topsoil moisture is a model companion curve.",
    datasets: "NASA GPM IMERG V07 (anomaly map + series) + NASA GLDAS v2.1 (soil companion)",
    units: "σ (z-score)",
    trendUnits: "σ/decade",
    spatialNote: "GPM anomaly map + GLDAS national curve",
    valueDomain: [-2.2, 2.2],
    trendDomain: [-0.6, 0.6],
    palette: "drought_spi",
    trendPalette: "brbg",
  },
  // "snow" hidden (hardening 14 Nov): no NOAA station-year has >= 330 valid SNWD days, so station snow
  // days cannot be computed; GLDAS SWE alone does not support a snow-cover dimension.
  {
    id: "water_rivers",
    label: "Water & Rivers",
    shortLabel: "Rivers",
    description: "Map: GPM rainfall in each major basin box. Chart: Spain-average GLDAS runoff (no river gauges).",
    datasets: "NASA GPM IMERG V07 (basin map) + NASA GLDAS v2.1 (runoff series)",
    units: "mm/yr",
    trendUnits: "mm/decade",
    spatialNote: "Eight basin boxes (GPM rain); GLDAS runoff is Spain-average only",
    valueDomain: [30, 420],
    trendDomain: [-80, 40],
    palette: "runoff",
    trendPalette: "brbg",
  },
  {
    id: "heat_extremes",
    label: "Heat Extremes",
    shortLabel: "Heat Ext.",
    description: "Tropical nights (Tmin ≥ 20 °C) and extreme hot days (Tmax > 35 °C) from NOAA weather stations.",
    datasets: "NOAA GHCN-Daily (~175 stations)",
    units: "days/yr",
    trendUnits: "days/decade",
    spatialNote: "NOAA stations; map is a ~50 km halo around each gauge",
    valueDomain: [0, 65],
    trendDomain: [-5, 18],
    palette: "heat_extreme",
    trendPalette: "rdbu_rev",
  },
  {
    id: "rain_extremes",
    label: "Rain Extremes",
    shortLabel: "Rain Ext.",
    description: "Longest consecutive dry spell (<1 mm/day) and wettest day of the year (NOAA + GPM).",
    datasets: "NOAA GHCN-Daily + NASA GPM IMERG V07",
    units: "days",
    trendUnits: "days/decade",
    spatialNote: "NOAA stations; map is a ~50 km halo around each gauge",
    valueDomain: [15, 110],
    trendDomain: [-12, 18],
    palette: "heat_extreme",
    trendPalette: "rdbu_rev",
  },
];

// --- Colorblind-safe scientific palettes (RGB stops 0..1) -------------------------------

type RGB = [number, number, number];

const PALETTES: Record<PaletteId, RGB[]> = {
  // Cool blue -> cyan -> yellow -> orange -> deep crimson
  thermal: [
    [33, 102, 172],
    [67, 147, 195],
    [146, 197, 222],
    [253, 219, 136],
    [244, 109, 67],
    [215, 48, 39],
    [165, 0, 38],
  ],
  // Dry sand -> teal -> deep ocean blue -> indigo
  precip: [
    [216, 179, 101],
    [246, 232, 195],
    [127, 205, 187],
    [65, 182, 196],
    [29, 145, 192],
    [34, 94, 168],
    [12, 44, 132],
  ],
  // Brown (severe drought) -> neutral cream -> emerald teal (wet)
  drought_spi: [
    [140, 81, 10],
    [216, 179, 101],
    [246, 232, 195],
    [235, 240, 238],
    [199, 234, 229],
    [90, 180, 172],
    [1, 102, 94],
  ],
  // Bare soil ochre -> light olive -> lush forest green
  vegetation: [
    [166, 97, 26],
    [223, 194, 125],
    [217, 240, 163],
    [120, 198, 121],
    [49, 163, 84],
    [0, 104, 55],
  ],
  // Slate -> ice blue -> bright snow white/cyan
  snow: [
    [30, 41, 59],
    [56, 118, 176],
    [116, 182, 232],
    [186, 228, 255],
    [240, 249, 255],
  ],
  // Amber stress -> aqua -> river blue
  runoff: [
    [180, 83, 9],
    [234, 179, 8],
    [134, 209, 197],
    [45, 156, 219],
    [29, 78, 216],
  ],
  // Dark violet/navy -> amber -> fiery red/magenta
  heat_extreme: [
    [35, 39, 77],
    [108, 63, 145],
    [204, 71, 120],
    [248, 149, 64],
    [240, 249, 33],
  ],
  // Viridis-inspired teal/emerald/gold for wind speed
  wind: [
    [44, 62, 115],
    [33, 113, 140],
    [39, 173, 129],
    [144, 215, 67],
    [253, 231, 37],
  ],
  // Diverging Blue (negative) -> White (0) -> Red (positive warming/drying)
  rdbu_rev: [
    [33, 102, 172],
    [103, 169, 207],
    [209, 229, 240],
    [247, 247, 247],
    [253, 219, 199],
    [239, 138, 98],
    [178, 24, 43],
  ],
  // Diverging Brown (drying) -> White (0) -> Teal-Blue (wetting)
  brbg: [
    [140, 81, 10],
    [216, 179, 101],
    [246, 232, 195],
    [245, 245, 245],
    [199, 234, 229],
    [90, 180, 172],
    [1, 102, 94],
  ],
};

export function samplePalette(palette: PaletteId, t: number): RGB {
  const stops = PALETTES[palette] ?? PALETTES.thermal;
  const clamped = Math.max(0, Math.min(1, Number.isFinite(t) ? t : 0.5));
  const pos = clamped * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(pos));
  const f = pos - i;
  const a = stops[i];
  const b = stops[i + 1];
  return [
    Math.round(a[0] + (b[0] - a[0]) * f),
    Math.round(a[1] + (b[1] - a[1]) * f),
    Math.round(a[2] + (b[2] - a[2]) * f),
  ];
}

export function samplePaletteCss(palette: PaletteId, value: number, domain: [number, number]): string {
  const [min, max] = domain;
  const t = max > min ? (value - min) / (max - min) : 0.5;
  const [r, g, b] = samplePalette(palette, t);
  return `rgb(${r},${g},${b})`;
}

export function paletteGradientCss(palette: PaletteId, axis: "x" | "y" = "x"): string {
  const stops = PALETTES[palette] ?? PALETTES.thermal;
  const parts = stops.map(([r, g, b], i) => `rgb(${r},${g},${b}) ${Math.round((i / (stops.length - 1)) * 100)}%`);
  return `linear-gradient(${axis === "y" ? "to top" : "to right"}, ${parts.join(", ")})`;
}

// --- Extrapolation helper (2000..2030) --------------------------------------------------

export function extrapolateValue(
  intercept2000: number,
  slopeDecade: number,
  year: number,
  scenario: ProjectionScenario = "central",
  ciLowDecade?: number,
  ciHighDecade?: number,
): number {
  const effSlope =
    scenario === "high"
      ? (ciHighDecade ?? slopeDecade * 1.35)
      : scenario === "low"
        ? (ciLowDecade ?? slopeDecade * 0.65)
        : slopeDecade;
  return intercept2000 + (effSlope / 10.0) * (year - 2000);
}

// --- Load static bundle & boundary polygon once in browser memory -----------------------

let bundlePromise: Promise<ClimateBundle> | null = null;
let boundaryPromise: Promise<number[][][][]> | null = null;

export function loadClimateBundle(): Promise<ClimateBundle> {
  if (!bundlePromise) {
    bundlePromise = fetch("/data/climate-bundle.json").then((r) => {
      if (!r.ok) throw new Error(`Failed to load climate-bundle.json (${r.status})`);
      return r.json() as Promise<ClimateBundle>;
    });
  }
  return bundlePromise;
}

export function loadSpainMultiPolygon(): Promise<number[][][][]> {
  if (!boundaryPromise) {
    boundaryPromise = fetch("/data/spain-boundary.geojson")
      .then((r) => r.json())
      .then((fc) => fc.features[0].geometry.coordinates as number[][][][]);
  }
  return boundaryPromise;
}

// --- Heatmap Bounds covering Mainland + Balearics + Canarias ----------------------------

export const HEATMAP_BOUNDS: GeoBounds = {
  west: -18.5,
  south: 27.3,
  east: 4.6,
  north: 44.1,
};

/** Last full calendar year in the compiled bundle (2026 files are partial: MERRA-2 Jan–Sep, GLDAS through Jul, GHCN through Nov). */
export const FIRST_OBSERVED_YEAR = 2000;
export const LAST_COMPLETE_YEAR = 2025;

export function dimensionHasSpatialGrid(_id: DimensionId): boolean {
  return true;
}

/** Local halo around NOAA stations (~50 km). Not a national interpolated climate field. */
const STATION_HALO_DEG = 0.55;

function collectSampleValues(samples: {
  kind: "grid" | "idw" | "basins";
  grid?: Float32Array;
  points?: { val: number }[];
  basins?: { val: number }[];
}): number[] {
  const out: number[] = [];
  if (samples.kind === "grid" && samples.grid) {
    for (const v of samples.grid) if (Number.isFinite(v)) out.push(v);
  } else if (samples.kind === "basins" && samples.basins) {
    for (const b of samples.basins) if (Number.isFinite(b.val)) out.push(b.val);
  } else if (samples.points) {
    for (const p of samples.points) if (Number.isFinite(p.val)) out.push(p.val);
  }
  return out;
}

function domainFromValues(vals: number[], diverging: boolean, fallback: [number, number]): [number, number] {
  if (vals.length < 8) return fallback;
  const sorted = [...vals].sort((a, b) => a - b);
  const at = (t: number) => sorted[Math.min(sorted.length - 1, Math.max(0, Math.round(t * (sorted.length - 1))))];
  const lo = at(0.02);
  const hi = at(0.98);
  if (!(hi > lo)) return fallback;
  if (diverging) {
    const m = Math.max(Math.abs(lo), Math.abs(hi), 0.4);
    return [Number((-m).toFixed(2)), Number(m.toFixed(2))];
  }
  const pad = (hi - lo) * 0.05;
  return [Number((lo - pad).toFixed(2)), Number((hi + pad).toFixed(2))];
}

export interface ActiveClimateConfig {
  dimension: DimensionId;
  year: number;
  mode: ClimateDisplayMode;
  scenario: ProjectionScenario;
  heatMetric: HeatSubMetric;
  rainMetric: RainSubMetric;
  vegMetric: VegSubMetric;
}

export function getEffectiveMeta(cfg: ActiveClimateConfig, bundle?: ClimateBundle | null): {
  title: string;
  units: string;
  domain: [number, number];
  palette: PaletteId;
  subtitle: string;
} {
  const base = DIMENSIONS.find((d) => d.id === cfg.dimension) ?? DIMENSIONS[0];
  let units = base.units;
  let valueDomain = base.valueDomain;
  let trendDomain = base.trendDomain;
  let title = base.label;

  if (cfg.dimension === "heat_extremes") {
    if (cfg.heatMetric === "tropical_nights") {
      title = "Tropical Nights (Tmin ≥ 20 °C)";
      valueDomain = [0, 70];
      trendDomain = [-4, 16];
    } else {
      title = "Hot Days (Tmax > 35 °C)";
      valueDomain = [0, 45];
      trendDomain = [-3, 12];
    }
  } else if (cfg.dimension === "rain_extremes") {
    if (cfg.rainMetric === "max_dry_spell") {
      title = "Longest Dry Spell (<1 mm)";
      units = "days";
      valueDomain = [15, 105];
      trendDomain = [-10, 15];
    } else {
      title = "Wettest Day (Rx1day)";
      units = "mm/day";
      valueDomain = [20, 120];
      trendDomain = [-12, 12];
    }
  }

  const diverging = cfg.mode !== "value" || base.palette === "drought_spi";
  if (
    bundle &&
    cfg.dimension !== "water_rivers" &&
    (cfg.mode === "trend" || cfg.mode === "value")
  ) {
    const fromData = domainFromValues(
      collectSampleValues(buildDimensionSamples(bundle, cfg)),
      diverging,
      cfg.mode === "value" ? valueDomain : trendDomain,
    );
    if (cfg.mode === "value") valueDomain = fromData;
    else if (cfg.mode === "trend") trendDomain = fromData;
  }

  if (cfg.mode === "trend") {
    return {
      title: `${title} · Decadal Trend`,
      units: `${units}/decade`,
      domain: trendDomain,
      palette: base.trendPalette,
      subtitle: "Theil–Sen slope per cell/station, complete years. Colour = slope only, not significance",
    };
  }
  return {
    title: `${title} · ${cfg.year}`,
    units,
    domain: valueDomain,
    palette: base.palette,
    subtitle: `${base.datasets.split("+")[0]?.trim() ?? "Observed"} (${cfg.year}). Blank = no complete-year data`,
  };
}

const periodDomainCache = new Map<string, [number, number]>();

/** Colour-scale domain over 2000–2025 for playback. Visual only — not a new statistic. */
export function periodColorDomain(bundle: ClimateBundle, cfg: ActiveClimateConfig): [number, number] {
  const key = `${cfg.dimension}|${cfg.mode}|${cfg.heatMetric}|${cfg.rainMetric}|${cfg.vegMetric}`;
  const cached = periodDomainCache.get(key);
  if (cached) return cached;
  const fallback = getEffectiveMeta({ ...cfg, year: LAST_COMPLETE_YEAR }, null).domain;
  const vals: number[] = [];
  for (let year = FIRST_OBSERVED_YEAR; year <= LAST_COMPLETE_YEAR; year++) {
    vals.push(...collectSampleValues(buildDimensionSamples(bundle, { ...cfg, year })));
  }
  const domain = domainFromValues(vals, cfg.mode !== "value", fallback);
  periodDomainCache.set(key, domain);
  return domain;
}

export function getMapLegendMeta(cfg: ActiveClimateConfig, bundle?: ClimateBundle | null) {
  const base = getEffectiveMeta(cfg, bundle);
  if (cfg.dimension !== "water_rivers") return base;
  const fallback: [number, number] = cfg.mode === "value" ? [40, 2100] : [-120, 120];
  const fromData =
    bundle != null
      ? domainFromValues(collectSampleValues(buildDimensionSamples(bundle, cfg)), cfg.mode !== "value", fallback)
      : fallback;
  return {
    ...base,
    palette: (cfg.mode === "value" ? "precip" : "brbg") as PaletteId,
    domain: fromData,
    units: cfg.mode === "value" ? "mm" : cfg.mode === "trend" ? "mm/decade" : "Δ mm",
    subtitle: "GPM rainfall in each basin box — not river discharge",
  };
}

// --- Compute 2D field + render smooth Spain-clipped Canvas Heatmap ----------------------

interface SamplePoint {
  lat: number;
  lon: number;
  val: number;
}

function stationMetricValue(
  st: NoaaStation,
  key: keyof NoaaStationYearRecord,
  cfg: ActiveClimateConfig,
): number | null {
  const stStats = st.stats[key];
  const rec = st.years[String(Math.min(cfg.year, LAST_COMPLETE_YEAR))];
  if (cfg.mode === "trend") return stStats ? stStats.slope_decade : null;
  if (cfg.mode !== "value") return null;
  // Observed complete years only; a missing year stays missing (never filled with a trend line).
  if (cfg.year <= LAST_COMPLETE_YEAR && rec && rec[key] !== null && rec[key] !== undefined) {
    return Number(rec[key]);
  }
  return null;
}

function buildDimensionSamples(bundle: ClimateBundle, cfg: ActiveClimateConfig): {
  kind: "grid" | "idw" | "basins";
  nLat?: number;
  nLon?: number;
  lats?: number[];
  lons?: number[];
  grid?: Float32Array;
  points?: SamplePoint[];
  basins?: { bbox: [number, number, number, number]; lat: number; lon: number; val: number }[];
  haloDeg?: number;
} {
  const { dimension, year, mode } = cfg;

  // 1. MERRA-2 grid (Temperature). Value mode shows observed complete years only; no extrapolation.
  if (dimension === "temperature") {
    const m = bundle.merra2;
    const grid = new Float32Array(m.n_lat * m.n_lon).fill(Number.NaN);
    const yrStr = String(year);
    const hist = m.annual_by_year[yrStr];

    for (let k = 0; k < m.valid_indices.length; k++) {
      const idx = m.valid_indices[k];
      let v: number;
      if (mode === "trend") v = m.cell_slope_decade[k];
      else if (mode === "value" && hist) v = hist[k];
      else v = Number.NaN; // no observed data for this year
      grid[idx] = v;
    }
    return { kind: "grid", nLat: m.n_lat, nLon: m.n_lon, lats: m.lats, lons: m.lons, grid };
  }

  if (dimension === "water_rivers") {
    const basins: { bbox: [number, number, number, number]; lat: number; lon: number; val: number }[] = [];
    for (const b of bundle.rivers) {
      const obs = b.rain_mm[String(year)];
      let val: number;
      if (mode === "trend") val = b.rain_stats ? b.rain_stats.slope_decade : Number.NaN;
      else if (mode === "value" && obs !== null && obs !== undefined) val = obs;
      else val = Number.NaN;
      if (!Number.isFinite(val)) continue;
      basins.push({ bbox: b.bbox, lat: b.lat, lon: b.lon, val });
    }
    return { kind: "basins", basins };
  }

  // 2. GPM 0.2° grid (Precipitation, standardized dry/wet anomaly)
  if (dimension === "precipitation" || dimension === "drought") {
    const g = bundle.gpm;
    const grid = new Float32Array(g.n_lat * g.n_lon).fill(Number.NaN);
    const yrKey = String(year);

    for (let k = 0; k < g.valid_indices.length; k++) {
      const idx = g.valid_indices[k];
      let v = 0;

      if (dimension === "precipitation") {
        if (mode === "trend") v = g.cell_slope_decade[k];
        else if (mode === "value" && g.annual_by_year[yrKey]) v = g.annual_by_year[yrKey][k];
        else v = Number.NaN;
      } else if (dimension === "drought") {
        // Trend map: the pipeline's precipitation slope divided by the cell SD (display unit only).
        if (mode === "trend") v = g.cell_std[k] > 0 ? g.cell_slope_decade[k] / g.cell_std[k] : Number.NaN;
        else if (mode === "value" && g.spi_by_year[yrKey]) v = g.spi_by_year[yrKey][k];
        else v = Number.NaN;
      }

      grid[idx] = v;
    }

    return { kind: "grid", nLat: g.n_lat, nLon: g.n_lon, lats: g.lats, lons: g.lons, grid };
  }

  const mKey: keyof NoaaStationYearRecord =
    dimension === "snow" ? "snow_days" : dimension === "heat_extremes" ? cfg.heatMetric : cfg.rainMetric;
  const points: SamplePoint[] = [];
  for (const st of bundle.noaa.stations) {
    if (dimension === "snow" && !st.has_snow) continue;
    const val = stationMetricValue(st, mKey, cfg);
    if (val !== null && Number.isFinite(val)) points.push({ lat: st.lat, lon: st.lon, val });
  }
  return { kind: "idw", points, haloDeg: STATION_HALO_DEG };
}

function bilinearSample(
  grid: Float32Array,
  nLat: number,
  nLon: number,
  lats: number[],
  lons: number[],
  lat: number,
  lon: number,
): number {
  const lat0 = lats[0];
  const latStep = lats.length > 1 ? lats[1] - lats[0] : 0.5;
  const lon0 = lons[0];
  const lonStep = lons.length > 1 ? lons[1] - lons[0] : 0.5;

  const fy = (lat - lat0) / latStep;
  const fx = (lon - lon0) / lonStep;
  const r0 = Math.floor(fy);
  const c0 = Math.floor(fx);
  if (r0 < -1 || r0 >= nLat || c0 < -1 || c0 >= nLon) return Number.NaN;

  const dy = fy - r0;
  const dx = fx - c0;

  let sum = 0;
  let wSum = 0;
  const weights = [
    [0, 0, (1 - dy) * (1 - dx)],
    [0, 1, (1 - dy) * dx],
    [1, 0, dy * (1 - dx)],
    [1, 1, dy * dx],
  ];

  for (const [dr, dc, w] of weights) {
    const r = r0 + dr;
    const c = c0 + dc;
    if (r >= 0 && r < nLat && c >= 0 && c < nLon) {
      const v = grid[r * nLon + c];
      if (Number.isFinite(v)) {
        sum += v * w;
        wSum += w;
      }
    }
  }
  return wSum > 0.05 ? sum / wSum : Number.NaN;
}

const heatmapCache = new Map<string, string>();

export async function renderDimensionHeatmapDataUrl(
  bundle: ClimateBundle,
  cfg: ActiveClimateConfig,
  resolvedScope?: ResolvedAdminScope | null,
  colorDomain?: readonly [number, number],
): Promise<string> {
  const scopeKey =
    resolvedScope && resolvedScope.level !== "age" && resolvedScope.clipToScope
      ? `${resolvedScope.level}:${resolvedScope.id}`
      : "all-spain";
  const domainKey = colorDomain ? `${colorDomain[0]}:${colorDomain[1]}` : "year";
  const cacheKey = `${cfg.dimension}|${cfg.year}|${cfg.mode}|${cfg.scenario}|${cfg.heatMetric}|${cfg.rainMetric}|${cfg.vegMetric}|${scopeKey}|${domainKey}`;
  const cached = heatmapCache.get(cacheKey);
  if (cached) return cached;

  const multiPoly = await loadSpainMultiPolygon();
  const meta = getMapLegendMeta(cfg, bundle);
  const [dMin, dMax] = colorDomain ?? meta.domain;
  const samples = buildDimensionSamples(bundle, cfg);

  const width = 460;
  const height = 340;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  const { west, south, east, north } = HEATMAP_BOUNDS;
  const lonSpan = east - west;
  const latSpan = north - south;

  // 1. Paint raw heatmap pixels
  const img = ctx.createImageData(width, height);
  const data = img.data;
  const dSpan = dMax - dMin || 1;

  for (let py = 0; py < height; py++) {
    const lat = north - ((py + 0.5) / height) * latSpan;
    for (let px = 0; px < width; px++) {
      const lon = west + ((px + 0.5) / width) * lonSpan;
      // Fast bbox skip for empty Atlantic between mainland and Canarias
      if (lat < 35.0 && lon > -13.1) continue;
      if (lat > 30.0 && lon < -10.0) continue;

      let val = Number.NaN;
      let alpha = 168;
      if (samples.kind === "grid" && samples.grid && samples.lats && samples.lons && samples.nLat && samples.nLon) {
        val = bilinearSample(samples.grid, samples.nLat, samples.nLon, samples.lats, samples.lons, lat, lon);
      } else if (samples.kind === "basins" && samples.basins && samples.basins.length > 0) {
        let bestD = Infinity;
        for (const b of samples.basins) {
          const [bw, bs, be, bn] = b.bbox;
          if (lon < bw || lon > be || lat < bs || lat > bn) continue;
          const d = (lat - b.lat) ** 2 + (lon - b.lon) ** 2;
          if (d < bestD) {
            bestD = d;
            val = b.val;
          }
        }
        alpha = 150;
      } else if (samples.kind === "idw" && samples.points && samples.points.length > 0) {
        const halo = samples.haloDeg ?? STATION_HALO_DEG;
        const maxD2 = halo * halo;
        let num = 0;
        let den = 0;
        let minDist2 = Infinity;
        for (let i = 0; i < samples.points.length; i++) {
          const p = samples.points[i];
          const dLat = lat - p.lat;
          const dLon = (lon - p.lon) * 0.8;
          const d2 = dLat * dLat + dLon * dLon;
          if (d2 > maxD2) continue;
          if (d2 < minDist2) minDist2 = d2;
          const w = 1.0 / (d2 + 0.02);
          num += p.val * w;
          den += w;
        }
        if (minDist2 <= maxD2 && den > 0) {
          val = num / den;
          alpha = Math.round(40 + 150 * (1 - Math.sqrt(minDist2) / halo));
        }
      }

      if (Number.isFinite(val)) {
        const t = (val - dMin) / dSpan;
        const [r, g, b] = samplePalette(meta.palette, t);
        const offset = (py * width + px) * 4;
        data[offset] = r;
        data[offset + 1] = g;
        data[offset + 2] = b;
        data[offset + 3] = alpha;
      }
    }
  }
  ctx.putImageData(img, 0, 0);

  // 2. Clip strictly to Spain land polygons (Peninsula, Balearics, Canarias, Ceuta, Melilla)
  ctx.globalCompositeOperation = "destination-in";
  ctx.beginPath();
  for (const poly of multiPoly) {
    for (const ring of poly) {
      for (let i = 0; i < ring.length; i++) {
        const [lon, lat] = ring[i];
        const x = ((lon - west) / lonSpan) * width;
        const y = ((north - lat) / latSpan) * height;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
    }
  }
  ctx.fillStyle = "#ffffff";
  ctx.fill();

  // 3. When an administrative scope is active (CCAA, Provincia, Municipio) and clipToScope is true,
  //    clip the heatmap strictly to that jurisdiction's boundary polygon.
  if (
    resolvedScope &&
    resolvedScope.level !== "age" &&
    resolvedScope.clipToScope &&
    resolvedScope.multiPolygon &&
    resolvedScope.multiPolygon.length > 0
  ) {
    ctx.beginPath();
    for (const poly of resolvedScope.multiPolygon) {
      for (const ring of poly) {
        for (let i = 0; i < ring.length; i++) {
          const [lon, lat] = ring[i];
          const x = ((lon - west) / lonSpan) * width;
          const y = ((north - lat) / latSpan) * height;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
      }
    }
    ctx.fillStyle = "#ffffff";
    ctx.fill();
  }

  ctx.globalCompositeOperation = "source-over";

  const url = canvas.toDataURL("image/png");
  if (heatmapCache.size > 90) {
    const firstKey = heatmapCache.keys().next().value;
    if (firstKey) heatmapCache.delete(firstKey);
  }
  heatmapCache.set(cacheKey, url);
  return url;
}

// --- Build overlay GeoJSON (NOAA Stations, Rivers, Administrative Borders) ---------------

export function buildDimensionOverlayGeoJson(
  bundle: ClimateBundle,
  cfg: ActiveClimateConfig,
  resolvedScope?: ResolvedAdminScope | null,
  adminBundle?: AdminBundle | null,
): {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    properties: Record<string, unknown>;
    geometry: { type: "Point"; coordinates: [number, number] } | { type: "LineString"; coordinates: number[][] };
  }>;
} {
  const meta = getEffectiveMeta(cfg, bundle);
  const features: Array<{
    type: "Feature";
    properties: Record<string, unknown>;
    geometry: { type: "Point"; coordinates: [number, number] } | { type: "LineString"; coordinates: number[][] };
  }> = [];

  const filterByScope = Boolean(resolvedScope && resolvedScope.level !== "age" && resolvedScope.clipToScope);

  // Basin hubs: GPM rainfall in the basin box (real grid mean). Not gauged runoff.
  if (cfg.dimension === "water_rivers") {
    const rainDomain: [number, number] = [40, 2100];
    for (const b of bundle.rivers) {
      if (filterByScope && resolvedScope) {
        const [bw, bs, be, bn] = b.bbox;
        const [sw, ss, se, sn] = resolvedScope.bbox;
        const overlaps = !(be < sw || bw > se || bn < ss || bs > sn);
        if (!overlaps) continue;
      }
      const obs = b.rain_mm[String(cfg.year)];
      let val: number;
      if (cfg.mode === "trend") val = b.rain_stats ? b.rain_stats.slope_decade : Number.NaN;
      else if (cfg.mode === "value" && obs !== null && obs !== undefined) val = obs;
      else val = Number.NaN;
      if (!Number.isFinite(val)) continue; // no observed value: draw nothing

      const rainPalette = cfg.mode === "value" ? "precip" : "brbg";
      const rainUnits = cfg.mode === "value" ? "mm" : cfg.mode === "trend" ? "mm/decade" : "Δ mm";
      features.push({
        type: "Feature",
        properties: {
          kind: "basin-hub",
          id: b.id,
          name: b.name,
          river: b.river,
          basin: b.name,
          value: val,
          units: rainUnits,
          color: samplePaletteCss(rainPalette, val, cfg.mode === "value" ? rainDomain : [-120, 120]),
          pixelSize: 11,
          latitude: b.lat,
          longitude: b.lon,
        },
        geometry: {
          type: "Point",
          coordinates: [b.lon, b.lat],
        },
      });
    }
  }

  // 2. NOAA station markers. National view: provincial reference network (1 per province, longest
  // record). CCAA / province scope: every station inside it. Full list: station catalog panel.
  const stMetric = stationMetricFor(cfg.dimension, cfg.heatMetric, cfg.rainMetric);
  if (stMetric) {
    const catalog = buildStationCatalog(bundle.noaa.stations, adminBundle ?? null, stMetric);
    const referenceIds = new Set(catalog.filter((e) => e.reference).map((e) => e.station.id));
    const pool = catalog.map((e) => e.station);
    let candidateStations = filterByScope && resolvedScope
      ? pool.filter((st) => resolvedScope.contains(st.lat, st.lon))
      : pool.filter((st) => referenceIds.has(st.id));

    // Ensure at least the 2 closest stations are shown when zoomed into a small municipality/province
    if (filterByScope && resolvedScope && candidateStations.length === 0) {
      candidateStations = [...pool]
        .sort(
          (a, b) =>
            haversineKm(resolvedScope.center.latitude, resolvedScope.center.longitude, a.lat, a.lon) -
            haversineKm(resolvedScope.center.latitude, resolvedScope.center.longitude, b.lat, b.lon),
        )
        .slice(0, 2);
    }

    for (const st of candidateStations) {
      let val: number | null = null;
      if (stMetric) {
        const stStats = st.stats[stMetric];
        const rec = st.years[String(Math.min(cfg.year, LAST_COMPLETE_YEAR))];
        if (cfg.mode === "trend" && stStats) {
          val = stStats.slope_decade;
        } else if (cfg.mode === "value" && rec) {
          const obs = rec[stMetric as keyof NoaaStationYearRecord];
          if (obs !== null && obs !== undefined) val = Number(obs); // missing years stay missing
        }
      }

      if (val === null || !Number.isFinite(val)) continue;
      const color = samplePaletteCss(meta.palette, val, meta.domain);
      features.push({
        type: "Feature",
        properties: {
          kind: "station",
          id: st.id,
          name: st.name,
          value: Number(val.toFixed(1)),
          units: meta.units,
          elevation: st.elevation,
          reference: referenceIds.has(st.id),
          color,
          pixelSize:
            cfg.dimension === "snow"
              ? Math.min(16, 7 + val * 0.28)
              : cfg.dimension === "heat_extremes" || cfg.dimension === "rain_extremes"
                ? Math.min(14, 6.5 + Math.abs(val) * 0.12)
                : 7.5,
          latitude: st.lat,
          longitude: st.lon,
        },
        geometry: {
          type: "Point",
          coordinates: [st.lon, st.lat],
        },
      });
    }
  }

  // 3. Append active administrative boundary lines & center marker when a sub-national scope is active
  if (resolvedScope && resolvedScope.level !== "age") {
    const scopeOverlay = buildAdminScopeOverlayGeoJson(adminBundle ?? null, resolvedScope);
    features.push(...scopeOverlay.features);
  }

  return { type: "FeatureCollection", features };
}

// --- Location evidence (render-only; ADR-002) ---------------------------------------------
// Every slope, CI, p-value and significance label below is read from climate-bundle.json, where
// scripts/build_climate_bundle.py computed it with the tested kernels in packages/science.
// Nothing here fits, averages or extrapolates statistics. When no precomputed result exists for the
// requested place, `stats` is null and the UI says so.

export interface TimeSeriesPoint {
  year: number;
  observed?: number;
  /** Theil–Sen line at this year, drawn only across the fitted (observed) period. */
  trend?: number;
}

export type EvidenceOutcome = "supported_increase" | "supported_decrease" | "not_significant" | "not_computed";

export interface LocationEvidence {
  locationLabel: string;
  subLabel: string;
  dimensionMeta: DimensionMeta;
  effectiveTitle: string;
  units: string;
  trendUnits: string;
  currentYear: number;
  currentValue: number | null;
  stats: TrendStats | null;
  outcome: EvidenceOutcome;
  /** Which series the stats describe, e.g. "MERRA-2, Peninsula + Balearics, area-weighted". */
  statsSource: string;
  /** Why stats are missing, when they are. */
  notComputedReason?: string;
  series: TimeSeriesPoint[];
  gldasSeries?: {
    title: string;
    units: string;
    stats: TrendStats | null;
    points: Array<{ year: number; primary: number; secondary?: number }>;
    primaryLabel: string;
    secondaryLabel?: string;
  };
  nearestStation: {
    station: NoaaStation;
    distanceKm: number;
  } | null;
  basin: RiverBasin | null;
  adminScope?: ResolvedAdminScope | null;
  stationsInScopeCount?: number;
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = Math.PI / 180;
  const dLat = (lat2 - lat1) * toRad;
  const dLon = (lon2 - lon1) * toRad;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * toRad) * Math.cos(lat2 * toRad) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function scopeKey(scope: ResolvedAdminScope | null | undefined): string {
  if (!scope || scope.level === "age") return "age";
  return `${scope.level}:${scope.id}`;
}

function fromSeries(series: Record<string, number | null> | undefined): Record<number, number> {
  const out: Record<number, number> = {};
  if (!series) return out;
  for (const [k, v] of Object.entries(series)) if (v !== null && v !== undefined) out[Number(k)] = v;
  return out;
}

function stationSeries(st: NoaaStation, key: keyof NoaaStationYearRecord): Record<number, number> {
  const out: Record<number, number> = {};
  for (const [k, rec] of Object.entries(st.years)) {
    const v = rec[key];
    if (v !== null && v !== undefined) out[Number(k)] = Number(v);
  }
  return out;
}

function outcomeOf(stats: TrendStats | null): EvidenceOutcome {
  if (!stats) return "not_computed";
  return stats.outcome ?? (stats.significant ? (stats.slope_decade > 0 ? "supported_increase" : "supported_decrease") : "not_significant");
}

export function queryClimateAtLocation(
  bundle: ClimateBundle,
  cfg: ActiveClimateConfig,
  selected: GeoCoordinate | null,
  resolvedScope?: ResolvedAdminScope | null,
): LocationEvidence {
  const dimMeta = DIMENSIONS.find((d) => d.id === cfg.dimension) ?? DIMENSIONS[0];
  const effMeta = getEffectiveMeta(cfg, bundle);
  const hasSubNationalScope = Boolean(resolvedScope && resolvedScope.level !== "age");
  const effectiveTarget: GeoCoordinate | null =
    selected ?? (hasSubNationalScope && resolvedScope ? resolvedScope.center : null);
  const stationsInScope: NoaaStation[] =
    hasSubNationalScope && resolvedScope
      ? bundle.noaa.stations.filter((st) => resolvedScope.contains(st.lat, st.lon))
      : bundle.noaa.stations;

  let nearest: { station: NoaaStation; distanceKm: number } | null = null;
  let basin: RiverBasin | null = null;
  if (effectiveTarget) {
    let bestDist = Infinity;
    for (const st of bundle.noaa.stations) {
      const d = haversineKm(effectiveTarget.latitude, effectiveTarget.longitude, st.lat, st.lon);
      if (d < bestDist) {
        bestDist = d;
        nearest = { station: st, distanceKm: Math.round(d * 10) / 10 };
      }
    }
    for (const b of bundle.rivers) {
      const [w, s, e, n] = b.bbox;
      const { latitude: la, longitude: lo } = effectiveTarget;
      if (lo >= w && lo <= e && la >= s && la <= n) {
        basin = b;
        break;
      }
    }
  }

  const sk = scopeKey(resolvedScope);
  const scope = bundle.scopes?.[sk];
  const scopeName = scope?.name ?? "Peninsula + Balearics";
  let stats: TrendStats | null = null;
  let observed: Record<number, number> = {};
  let statsSource = "";
  let notComputedReason: string | undefined;

  const takeStation = (key: keyof NoaaStationYearRecord, maxKm: number): boolean => {
    if (!selected || !nearest || nearest.distanceKm > maxKm) return false;
    stats = nearest.station.stats[key] ?? null;
    observed = stationSeries(nearest.station, key);
    statsSource = `NOAA GHCN-Daily station ${nearest.station.name} (complete years only; not homogenized)`;
    if (!stats) notComputedReason = "This station has fewer than 15 complete years for this metric.";
    return true;
  };
  const takeScope = (dim: "temperature" | "precipitation" | "drought" | "water_rivers", source: string) => {
    const block = scope?.[dim];
    stats = block?.stats ?? null;
    observed = fromSeries(block?.series);
    statsSource = `${source}, ${scopeName}, area-weighted`;
    if (!block) notComputedReason = "No precomputed series for this area.";
  };

  switch (cfg.dimension) {
    case "temperature":
      if (!takeStation("tavg", 25)) takeScope("temperature", "NASA MERRA-2 T2M (reanalysis)");
      break;
    case "precipitation":
      if (selected && basin) {
        stats = basin.rain_stats ?? null;
        observed = fromSeries(basin.rain_mm);
        statsSource = `NASA GPM IMERG, ${basin.name} bounding box (not the watershed)`;
      } else {
        takeScope("precipitation", "NASA GPM IMERG V07");
      }
      break;
    case "drought":
      takeScope("drought", "NASA GPM IMERG standardized annual precipitation anomaly");
      break;
    case "water_rivers":
      takeScope("water_rivers", "NASA GLDAS v2.1 modelled total runoff");
      break;
    default: {
      const key: keyof NoaaStationYearRecord =
        cfg.dimension === "snow" ? "snow_days" : cfg.dimension === "heat_extremes" ? cfg.heatMetric : cfg.rainMetric;
      if (!takeStation(key, 25)) {
        statsSource = "NOAA GHCN-Daily stations";
        notComputedReason =
          "Area trends are not computed for station metrics (the network changes over time). Pick a station on the map or in the Station catalog.";
      }
    }
  }

  const s = stats as TrendStats | null;
  const years = Object.keys(observed).map(Number).sort((a, b) => a - b);
  const series: TimeSeriesPoint[] = years.map((y) => ({
    year: y,
    observed: observed[y],
    trend: s && y >= (s.first_year ?? years[0]) && y <= (s.last_year ?? years[years.length - 1])
      ? Number((s.intercept_2000 + (s.slope_decade / 10) * (y - 2000)).toFixed(3))
      : undefined,
  }));
  const currentValue = observed[cfg.year] ?? null;

  let gldasSeries: LocationEvidence["gldasSeries"] = undefined;
  const g = bundle.gldas;
  const gPoints = (k: keyof (typeof g.annual)[string], k2?: keyof (typeof g.annual)[string]) =>
    g.years.map((y) => ({ year: y, primary: g.annual[String(y)][k], secondary: k2 ? g.annual[String(y)][k2] : undefined }));
  if (cfg.dimension === "drought") {
    gldasSeries = {
      title: "Topsoil moisture 0–10 cm (NASA GLDAS v2.1 model, Peninsula + Balearics)",
      units: "mm",
      stats: g.stats.soil_moisture_0_10cm_mm ?? null,
      primaryLabel: "Topsoil moisture (0–10 cm)",
      points: gPoints("soil_moisture_0_10cm_mm"),
    };
  } else if (cfg.dimension === "water_rivers" || cfg.dimension === "precipitation") {
    gldasSeries = {
      title: "Modelled runoff vs evapotranspiration (NASA GLDAS v2.1, Peninsula + Balearics)",
      units: "mm/yr",
      stats: g.stats.total_runoff_mm ?? null,
      primaryLabel: "Total runoff (model)",
      secondaryLabel: "Evapotranspiration (model)",
      points: gPoints("total_runoff_mm", "evapotranspiration_mm"),
    };
  }

  const stationName = nearest?.station.name.replace(/, SP$/i, "") ?? null;
  const basinName = basin ? basin.name.replace(/^Cuenca del /i, "") : null;
  const locationLabel = selected
    ? nearest && nearest.distanceKm < 2
      ? stationName!
      : basinName && cfg.dimension === "precipitation"
        ? `${basinName} basin box`
        : nearest && nearest.distanceKm < 25
          ? `Near ${stationName}`
          : "This place"
    : hasSubNationalScope && resolvedScope
      ? resolvedScope.name
      : "Peninsula + Balearics";
  const subLabel = selected
    ? [stationName && nearest ? `${stationName} · ${nearest.distanceKm} km` : null].filter(Boolean).join(" · ") ||
      "Clicked on the map"
    : hasSubNationalScope && resolvedScope
      ? resolvedScope.institution
      : "National view (Canarias reported separately)";

  return {
    locationLabel,
    subLabel,
    dimensionMeta: dimMeta,
    effectiveTitle: effMeta.title,
    units: dimMeta.units,
    trendUnits: dimMeta.trendUnits,
    currentYear: cfg.year,
    currentValue,
    stats: s,
    outcome: outcomeOf(s),
    statsSource,
    notComputedReason,
    series,
    gldasSeries,
    nearestStation: nearest,
    basin,
    adminScope: resolvedScope ?? null,
    stationsInScopeCount: stationsInScope.length,
  };
}
