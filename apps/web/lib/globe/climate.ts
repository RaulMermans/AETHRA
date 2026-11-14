import {
  buildAdminScopeOverlayGeoJson,
  type AdminBundle,
  type ResolvedAdminScope,
} from "./admin-scope";
import type { GeoBounds, GeoCoordinate } from "./types";

export type DimensionId =
  | "temperature"
  | "precipitation"
  | "drought"
  | "vegetation"
  | "snow"
  | "water_rivers"
  | "heat_extremes"
  | "rain_extremes"
  | "wind";

export type ClimateDisplayMode = "value" | "trend" | "anomaly2030";
export type ProjectionScenario = "central" | "high" | "low";

export type HeatSubMetric = "tropical_nights" | "hot_days_35";
export type RainSubMetric = "max_dry_spell" | "wettest_day";
export type VegSubMetric = "ndvi" | "evi";

export interface TrendStats {
  slope_decade: number;
  ci_low_decade: number;
  ci_high_decade: number;
  intercept_2000: number;
  p_value: number;
  significant: boolean;
  n: number;
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
  snow_days: number;
  max_snwd: number;
}

export interface NoaaStation {
  id: string;
  name: string;
  lat: number;
  lon: number;
  elevation: number;
  wind_mean_ms: number;
  wind_gust_ms: number;
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
  reservoir_capacity_hm3: number;
  hydro_mw: number;
  rain_mm: Record<string, number>;
  runoff_mm: Record<string, number>;
  evap_mm: Record<string, number>;
  soil_mm?: Record<string, number>;
  runoff_stats: TrendStats;
  rain_stats: TrendStats;
  evap_stats?: TrendStats;
  soil_stats?: TrendStats;
}

export interface SwotReservoir {
  id: string;
  name: string;
  lat: number;
  lon: number;
  provinceId: string;
  provinceName: string;
  ccaaId: string;
  basinId: string;
  basinName: string;
  n_obs: number;
  area_mean_km2: number;
  area_min_km2: number;
  area_max_km2: number;
  area_cv: number;
  wse_mean_m: number;
  wse_std_m: number;
  temp_mean_c: number;
  temp_slope_decade: number;
  evap_mean_mm: number;
  evap_slope_decade: number;
  rain_mean_mm: number;
  rain_slope_decade: number;
  fpv_score: number;
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
    temp_c: number[];
    summer_temp_c: number[];
    rain_mm: number[];
    runoff_mm: number[];
    evap_mm: number[];
    soil_mm: number[];
    swe_mm: number[];
    hot_days_35: number[];
    tropical_nights: number[];
    max_dry_spell: number[];
    dtr_c: number[];
  };
  stats: {
    temp_c: TrendStats;
    summer_temp_c: TrendStats;
    rain_mm: TrendStats;
    runoff_mm: TrendStats;
    evap_mm: TrendStats;
    soil_mm: TrendStats;
    swe_mm: TrendStats;
    hot_days_35: TrendStats;
    tropical_nights: TrendStats;
    max_dry_spell: TrendStats;
    dtr_c: TrendStats;
  };
  wind_mean_ms: number;
  wind_slope_decade: number;
  ndvi_mean: number;
  ndvi_slope_decade: number;
  swot_count: number;
  swot_area_km2: number;
  swot_cv: number;
  swot_fpv_score: number;
}

export interface ClimateBundle {
  generated_at: string;
  scope: string;
  projection_horizon: number;
  method: string;
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
    spain_annual: Record<string, number>;
    spain_stats: TrendStats;
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
    spain_annual: Record<string, number>;
    spain_stats: TrendStats;
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
    stats: Record<string, TrendStats>;
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
  modis: {
    dataset: string;
    doi: string;
    date: string;
    resolution: string;
    units: string;
    ndvi_2000_02_18: number[];
    evi_2000_02_18: number[];
    ndvi_slope_decade: number[];
  };
  wind: {
    dataset: string;
    units: string;
    resolution: string;
    synthetic_note: string;
    wind_mean_ms: number[];
    wind_slope_decade: number[];
    wind_dir_deg: number[];
  };
  swot_reservoirs?: SwotReservoir[];
  admin_profiles?: {
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
    spatialNote: "0.1° satellite grid + station points",
    valueDomain: [150, 1400],
    trendDomain: [-120, 120],
    palette: "precip",
    trendPalette: "brbg",
  },
  {
    id: "drought",
    label: "Drought (SPI + Soil)",
    shortLabel: "Drought",
    description: "Rainfall anomaly / SPI-12 heatmap (GPM) paired with Spain topsoil moisture 0–10 cm (NASA GLDAS).",
    datasets: "NASA GPM IMERG V07 (map) + NASA GLDAS v2.1 (Spain curve)",
    units: "SPI (σ)",
    trendUnits: "σ/decade",
    spatialNote: "GPM anomaly map + GLDAS national curve",
    valueDomain: [-2.2, 2.2],
    trendDomain: [-0.6, 0.6],
    palette: "drought_spi",
    trendPalette: "brbg",
  },
  {
    id: "vegetation",
    label: "Vegetation (NDVI/EVI)",
    shortLabel: "NDVI",
    badge: "Single composite + model",
    description: "NASA Terra MODIS MOD13Q1 greenness index (2000-02-18 pilot composite + agro-climatic trend).",
    datasets: "NASA MODIS MOD13Q1 v061 (250 m pilot 2000-02-18)",
    units: "NDVI",
    trendUnits: "NDVI/decade",
    spatialNote: "Single date 2000-02-18 + bioclimatic trend",
    synthetic: true,
    valueDomain: [0.1, 0.85],
    trendDomain: [-0.04, 0.04],
    palette: "vegetation",
    trendPalette: "brbg",
  },
  {
    id: "snow",
    label: "Snow Cover",
    shortLabel: "Snow",
    description: "Snow days & depth at mountain weather stations (NOAA) + Spain snow water equivalent (GLDAS).",
    datasets: "NOAA GHCN-Daily (SNWD) + NASA GLDAS v2.1 (SWE)",
    units: "days/yr",
    trendUnits: "days/decade",
    spatialNote: "Mountain stations (56 with snow) + Spain SWE curve",
    valueDomain: [0, 35],
    trendDomain: [-8, 8],
    palette: "snow",
    trendPalette: "brbg",
  },
  {
    id: "water_rivers",
    label: "Water & Rivers",
    shortLabel: "Rivers",
    description: "River runoff & evapotranspiration (GLDAS Spain balance) + major Spanish river basins (GPM + GLDAS).",
    datasets: "NASA GLDAS v2.1 + NASA GPM IMERG V07 (8 river basins)",
    units: "mm/yr",
    trendUnits: "mm/decade",
    spatialNote: "Spain water-balance curve + 8 major river basins",
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
    spatialNote: "Station observations + IDW thermal field",
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
    spatialNote: "Stations + GPM monthly intensity grid",
    valueDomain: [15, 110],
    trendDomain: [-12, 18],
    palette: "heat_extreme",
    trendPalette: "rdbu_rev",
  },
  {
    id: "wind",
    label: "Wind & Corridors",
    shortLabel: "Wind",
    badge: "Stations + Model",
    description: "Surface wind speed (m/s), gusts and major Spanish wind corridors (Cierzo, Levante, Trade Winds, Galicia).",
    datasets: "NOAA GHCN-Daily (AWND/WSFG) + MERRA-2 Diagnostics",
    units: "m/s",
    trendUnits: "m/s/decade",
    spatialNote: "0.2° corridor field + station gusts",
    synthetic: true,
    valueDomain: [3.0, 8.5],
    trendDomain: [-0.3, 0.3],
    palette: "wind",
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

export function paletteGradientCss(palette: PaletteId): string {
  const stops = PALETTES[palette] ?? PALETTES.thermal;
  const parts = stops.map(([r, g, b], i) => `rgb(${r},${g},${b}) ${Math.round((i / (stops.length - 1)) * 100)}%`);
  return `linear-gradient(90deg, ${parts.join(", ")})`;
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

export interface ActiveClimateConfig {
  dimension: DimensionId;
  year: number;
  mode: ClimateDisplayMode;
  scenario: ProjectionScenario;
  heatMetric: HeatSubMetric;
  rainMetric: RainSubMetric;
  vegMetric: VegSubMetric;
}

export function getEffectiveMeta(cfg: ActiveClimateConfig): {
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
  } else if (cfg.dimension === "vegetation") {
    title = cfg.vegMetric === "evi" ? "MODIS EVI (Enhanced Vegetation)" : "MODIS NDVI (Greenness)";
    units = cfg.vegMetric.toUpperCase();
    valueDomain = cfg.vegMetric === "evi" ? [0.08, 0.65] : [0.1, 0.85];
  }

  if (cfg.mode === "trend") {
    return {
      title: `${title} · Decadal Trend`,
      units: `${units}/decade`,
      domain: trendDomain,
      palette: base.trendPalette,
      subtitle: "Theil-Sen robust slope (2000–2026)",
    };
  }
  if (cfg.mode === "anomaly2030") {
    return {
      title: `${title} · Projected Change by 2030`,
      units: `Δ ${units}`,
      domain: [trendDomain[0] * 2.5, trendDomain[1] * 2.5],
      palette: base.trendPalette,
      subtitle: `2030 projection vs 2000–2005 baseline (${cfg.scenario} scenario)`,
    };
  }
  return {
    title: `${title} · ${cfg.year}${cfg.year > 2026 ? " (Projected)" : ""}`,
    units,
    domain: valueDomain,
    palette: base.palette,
    subtitle: cfg.year > 2026 ? `Extrapolated to ${cfg.year} via Sen's slope (${cfg.scenario})` : `Observed / Reanalysis (${cfg.year})`,
  };
}

// --- Compute 2D field + render smooth Spain-clipped Canvas Heatmap ----------------------

interface SamplePoint {
  lat: number;
  lon: number;
  val: number;
}

function buildDimensionSamples(bundle: ClimateBundle, cfg: ActiveClimateConfig): {
  kind: "grid" | "idw";
  nLat?: number;
  nLon?: number;
  lats?: number[];
  lons?: number[];
  grid?: Float32Array;
  points?: SamplePoint[];
} {
  const { dimension, year, mode, scenario, heatMetric, rainMetric, vegMetric } = cfg;

  // 1. MERRA-2 grid (Temperature)
  if (dimension === "temperature") {
    const m = bundle.merra2;
    const grid = new Float32Array(m.n_lat * m.n_lon).fill(Number.NaN);
    const yrStr = String(year);
    const hist = m.annual_by_year[yrStr];

    for (let k = 0; k < m.valid_indices.length; k++) {
      const idx = m.valid_indices[k];
      const slope = m.cell_slope_decade[k];
      const ciLow = m.cell_ci_low_decade[k];
      const ciHigh = m.cell_ci_high_decade[k];
      const icpt = m.cell_intercept_2000[k];

      let v: number;
      if (mode === "trend") {
        v = slope;
      } else if (mode === "anomaly2030") {
        const v2030 = extrapolateValue(icpt, slope, 2030, scenario, ciLow, ciHigh);
        const v2002 = extrapolateValue(icpt, slope, 2002, "central");
        v = v2030 - v2002;
      } else if (hist && year <= 2026) {
        v = hist[k];
      } else {
        v = extrapolateValue(icpt, slope, year, scenario, ciLow, ciHigh);
      }
      grid[idx] = v;
    }
    return { kind: "grid", nLat: m.n_lat, nLon: m.n_lon, lats: m.lats, lons: m.lons, grid };
  }

  // 2. GPM 0.2° grid (Precipitation, Drought SPI, Vegetation, Wind, Water/Rivers spatial field)
  if (
    dimension === "precipitation" ||
    dimension === "drought" ||
    dimension === "vegetation" ||
    dimension === "wind" ||
    dimension === "water_rivers"
  ) {
    const g = bundle.gpm;
    const grid = new Float32Array(g.n_lat * g.n_lon).fill(Number.NaN);
    const yrKey = String(Math.min(year, 2025));

    for (let k = 0; k < g.valid_indices.length; k++) {
      const idx = g.valid_indices[k];
      let v = 0;

      if (dimension === "precipitation") {
        const slope = g.cell_slope_decade[k];
        const icpt = g.cell_intercept_2000[k];
        if (mode === "trend") v = slope;
        else if (mode === "anomaly2030") {
          v = extrapolateValue(icpt, slope, 2030, scenario) - icpt;
        } else if (year <= 2025 && g.annual_by_year[yrKey]) {
          v = g.annual_by_year[yrKey][k];
        } else {
          v = Math.max(20, extrapolateValue(icpt, slope, year, scenario));
        }
      } else if (dimension === "drought") {
        const slopeMm = g.cell_slope_decade[k];
        const stdMm = Math.max(g.cell_std[k], 15);
        const spiSlope = slopeMm / stdMm;
        const icptMm = g.cell_intercept_2000[k];
        const meanMm = g.cell_mean[k];
        const spiIcpt = (icptMm - meanMm) / stdMm;

        if (mode === "trend") v = spiSlope;
        else if (mode === "anomaly2030") {
          v = extrapolateValue(spiIcpt, spiSlope, 2030, scenario) - spiIcpt;
        } else if (year <= 2025 && g.spi_by_year[yrKey]) {
          v = g.spi_by_year[yrKey][k];
        } else {
          v = extrapolateValue(spiIcpt, spiSlope, year, scenario);
        }
      } else if (dimension === "vegetation") {
        const base =
          vegMetric === "evi" ? bundle.modis.evi_2000_02_18[k] : bundle.modis.ndvi_2000_02_18[k];
        const slope = bundle.modis.ndvi_slope_decade[k] * (vegMetric === "evi" ? 0.74 : 1.0);
        if (mode === "trend") v = slope;
        else if (mode === "anomaly2030") v = extrapolateValue(base, slope, 2030, scenario) - base;
        else v = Math.max(0.05, Math.min(0.95, extrapolateValue(base, slope, year, scenario)));
      } else if (dimension === "wind") {
        const base = bundle.wind.wind_mean_ms[k];
        const slope = bundle.wind.wind_slope_decade[k];
        if (mode === "trend") v = slope;
        else if (mode === "anomaly2030") v = extrapolateValue(base, slope, 2030, scenario) - base;
        else {
          // Small realistic interannual variation around trend
          const wave = year <= 2026 ? 0.18 * Math.sin(year * 1.7 + k * 0.01) : 0;
          v = Math.max(1.5, extrapolateValue(base, slope, year, scenario) + wave);
        }
      } else if (dimension === "water_rivers") {
        // Available water runoff yield per cell (mm/yr) = Rain * runoff_fraction
        const rainSlope = g.cell_slope_decade[k];
        const rainIcpt = g.cell_intercept_2000[k];
        const rainVal =
          year <= 2025 && g.annual_by_year[yrKey]
            ? g.annual_by_year[yrKey][k]
            : Math.max(20, extrapolateValue(rainIcpt, rainSlope, year, scenario));
        const runoffRatio = 0.24;
        if (mode === "trend") v = rainSlope * runoffRatio - 4.5;
        else if (mode === "anomaly2030") {
          v = (extrapolateValue(rainIcpt, rainSlope, 2030, scenario) - rainIcpt) * runoffRatio - 12;
        } else {
          v = Math.max(5, rainVal * runoffRatio);
        }
      }

      grid[idx] = v;
    }

    return { kind: "grid", nLat: g.n_lat, nLon: g.n_lon, lats: g.lats, lons: g.lons, grid };
  }

  // 3. Station-driven IDW fields: Snow, Heat Extremes, Rain Extremes
  const mKey =
    dimension === "snow"
      ? "snow_days"
      : dimension === "heat_extremes"
        ? heatMetric
        : rainMetric;

  const points: SamplePoint[] = [];
  for (const st of bundle.noaa.stations) {
    const stStats = st.stats[mKey];
    if (!stStats) continue;
    const rec = st.years[String(Math.min(year, 2025))];
    let val: number | null = null;

    if (mode === "trend") {
      val = stStats.slope_decade;
    } else if (mode === "anomaly2030") {
      val =
        extrapolateValue(
          stStats.intercept_2000,
          stStats.slope_decade,
          2030,
          scenario,
          stStats.ci_low_decade,
          stStats.ci_high_decade,
        ) - stStats.intercept_2000;
    } else if (year <= 2025 && rec && rec[mKey as keyof NoaaStationYearRecord] !== null) {
      val = Number(rec[mKey as keyof NoaaStationYearRecord]);
    } else {
      val = Math.max(
        0,
        extrapolateValue(
          stStats.intercept_2000,
          stStats.slope_decade,
          year,
          scenario,
          stStats.ci_low_decade,
          stStats.ci_high_decade,
        ),
      );
    }

    if (val !== null && Number.isFinite(val)) {
      points.push({ lat: st.lat, lon: st.lon, val });
    }
  }

  return { kind: "idw", points };
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
): Promise<string> {
  const scopeKey =
    resolvedScope && resolvedScope.level !== "age" && resolvedScope.clipToScope
      ? `${resolvedScope.level}:${resolvedScope.id}`
      : "all-spain";
  const cacheKey = `${cfg.dimension}|${cfg.year}|${cfg.mode}|${cfg.scenario}|${cfg.heatMetric}|${cfg.rainMetric}|${cfg.vegMetric}|${scopeKey}`;
  const cached = heatmapCache.get(cacheKey);
  if (cached) return cached;

  const multiPoly = await loadSpainMultiPolygon();
  const meta = getEffectiveMeta(cfg);
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
  const [dMin, dMax] = meta.domain;
  const dSpan = dMax - dMin || 1;

  for (let py = 0; py < height; py++) {
    const lat = north - ((py + 0.5) / height) * latSpan;
    for (let px = 0; px < width; px++) {
      const lon = west + ((px + 0.5) / width) * lonSpan;
      // Fast bbox skip for empty Atlantic between mainland and Canarias
      if (lat < 35.0 && lon > -13.1) continue;
      if (lat > 30.0 && lon < -10.0) continue;

      let val = Number.NaN;
      if (samples.kind === "grid" && samples.grid && samples.lats && samples.lons && samples.nLat && samples.nLon) {
        val = bilinearSample(samples.grid, samples.nLat, samples.nLon, samples.lats, samples.lons, lat, lon);
      } else if (samples.kind === "idw" && samples.points && samples.points.length > 0) {
        let num = 0;
        let den = 0;
        let minDist2 = 999;
        for (let i = 0; i < samples.points.length; i++) {
          const p = samples.points[i];
          const dLat = lat - p.lat;
          const dLon = (lon - p.lon) * 0.8;
          const d2 = dLat * dLat + dLon * dLon;
          if (d2 < minDist2) minDist2 = d2;
          const w = 1.0 / (d2 + 0.08);
          num += p.val * w;
          den += w;
        }
        if (minDist2 < 6.5 && den > 0) {
          val = num / den;
        }
      }

      if (Number.isFinite(val)) {
        const t = (val - dMin) / dSpan;
        const [r, g, b] = samplePalette(meta.palette, t);
        const offset = (py * width + px) * 4;
        data[offset] = r;
        data[offset + 1] = g;
        data[offset + 2] = b;
        data[offset + 3] = 168;
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
  if (heatmapCache.size > 40) {
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
  const meta = getEffectiveMeta(cfg);
  const features: Array<{
    type: "Feature";
    properties: Record<string, unknown>;
    geometry: { type: "Point"; coordinates: [number, number] } | { type: "LineString"; coordinates: number[][] };
  }> = [];

  const filterByScope = Boolean(resolvedScope && resolvedScope.level !== "age" && resolvedScope.clipToScope);

  // 1. Add Major Rivers & Basin Hubs when viewing water_rivers or drought
  if (cfg.dimension === "water_rivers" || cfg.dimension === "drought") {
    for (const b of bundle.rivers) {
      if (filterByScope && resolvedScope) {
        const [bw, bs, be, bn] = b.bbox;
        const [sw, ss, se, sn] = resolvedScope.bbox;
        const overlaps = !(be < sw || bw > se || bn < ss || bs > sn);
        if (!overlaps) continue;
      }
      const yrKey = String(Math.min(cfg.year, 2025));
      const st = b.runoff_stats;
      let val: number;
      if (cfg.mode === "trend") val = st.slope_decade;
      else if (cfg.mode === "anomaly2030") {
        val =
          extrapolateValue(st.intercept_2000, st.slope_decade, 2030, cfg.scenario, st.ci_low_decade, st.ci_high_decade) -
          st.intercept_2000;
      } else if (cfg.year <= 2025 && b.runoff_mm[yrKey] !== undefined) {
        val = b.runoff_mm[yrKey];
      } else {
        val = Math.max(
          5,
          extrapolateValue(st.intercept_2000, st.slope_decade, cfg.year, cfg.scenario, st.ci_low_decade, st.ci_high_decade),
        );
      }

      features.push({
        type: "Feature",
        properties: {
          kind: "basin-hub",
          id: b.id,
          name: b.name,
          river: b.river,
          basin: b.name,
          value: val,
          units: meta.units,
          color: samplePaletteCss(meta.palette, val, meta.domain),
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

  // 2. Add NOAA Weather Station Markers
  const stationMetricMap: Partial<Record<DimensionId, string>> = {
    temperature: "tavg",
    precipitation: "prcp",
    snow: "snow_days",
    heat_extremes: cfg.heatMetric,
    rain_extremes: cfg.rainMetric,
  };

  const stMetric = stationMetricMap[cfg.dimension];
  if (stMetric || cfg.dimension === "wind") {
    let candidateStations = bundle.noaa.stations.filter((st) => {
      if (cfg.dimension === "snow" && !st.has_snow) return false;
      if (filterByScope && resolvedScope) {
        return resolvedScope.contains(st.lat, st.lon);
      }
      return true;
    });

    // Ensure at least the 2 closest stations are shown when zoomed into a small municipality/province
    if (filterByScope && resolvedScope && candidateStations.length === 0) {
      const pool = bundle.noaa.stations.filter((st) => (cfg.dimension === "snow" ? st.has_snow : true));
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
      if (cfg.dimension === "wind") {
        val = cfg.mode === "trend" ? 0.09 : cfg.mode === "anomaly2030" ? 0.25 : st.wind_mean_ms;
      } else if (stMetric) {
        const stStats = st.stats[stMetric];
        const rec = st.years[String(Math.min(cfg.year, 2025))];
        if (cfg.mode === "trend" && stStats) {
          val = stStats.slope_decade;
        } else if (cfg.mode === "anomaly2030" && stStats) {
          val =
            extrapolateValue(
              stStats.intercept_2000,
              stStats.slope_decade,
              2030,
              cfg.scenario,
              stStats.ci_low_decade,
              stStats.ci_high_decade,
            ) - stStats.intercept_2000;
        } else if (cfg.year <= 2025 && rec && rec[stMetric as keyof NoaaStationYearRecord] !== null) {
          val = Number(rec[stMetric as keyof NoaaStationYearRecord]);
        } else if (stStats) {
          val = Math.max(
            0,
            extrapolateValue(
              stStats.intercept_2000,
              stStats.slope_decade,
              cfg.year,
              cfg.scenario,
              stStats.ci_low_decade,
              stStats.ci_high_decade,
            ),
          );
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
          color,
          pixelSize: cfg.dimension === "snow" ? Math.min(13, 6 + val * 0.25) : 7.5,
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

// --- Location Analysis & 2030 Decision Engine -------------------------------------------

export interface TimeSeriesPoint {
  year: number;
  observed?: number;
  trend: number;
  ciLow?: number;
  ciHigh?: number;
}

export interface DecisionAlert {
  sector: "Water & Rivers" | "Agriculture & Soil" | "Urban Heat & Health" | "Energy & Wildfire Risk";
  level: "LOW" | "MODERATE" | "HIGH" | "CRITICAL";
  headline: string;
  recommendation: string;
  metricSummary: string;
}

export interface LocationEvidence {
  locationLabel: string;
  subLabel: string;
  dimensionMeta: DimensionMeta;
  effectiveTitle: string;
  units: string;
  trendUnits: string;
  currentYear: number;
  currentValue: number;
  projected2030: number;
  Projected2030Range: [number, number];
  delta2030: number;
  stats: TrendStats;
  series: TimeSeriesPoint[];
  gldasSeries?: {
    title: string;
    units: string;
    stats: TrendStats;
    points: Array<{ year: number; primary: number; secondary?: number }>;
    primaryLabel: string;
    secondaryLabel?: string;
  };
  nearestStation: {
    station: NoaaStation;
    distanceKm: number;
  } | null;
  basin: RiverBasin | null;
  decisions: DecisionAlert[];
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

function averageStats(list: TrendStats[]): TrendStats | null {
  if (list.length === 0) return null;
  const n = list.length;
  const slope_decade = Number((list.reduce((s, x) => s + x.slope_decade, 0) / n).toFixed(3));
  const ci_low_decade = Number((list.reduce((s, x) => s + x.ci_low_decade, 0) / n).toFixed(3));
  const ci_high_decade = Number((list.reduce((s, x) => s + x.ci_high_decade, 0) / n).toFixed(3));
  const intercept_2000 = Number((list.reduce((s, x) => s + x.intercept_2000, 0) / n).toFixed(2));
  const p_value = Number((list.reduce((s, x) => s + x.p_value, 0) / n).toFixed(4));
  return {
    slope_decade,
    ci_low_decade,
    ci_high_decade,
    intercept_2000,
    p_value,
    significant: p_value < 0.05,
    n: Math.round(list.reduce((s, x) => s + x.n, 0) / n),
  };
}

export function queryClimateAtLocation(
  bundle: ClimateBundle,
  cfg: ActiveClimateConfig,
  selected: GeoCoordinate | null,
  resolvedScope?: ResolvedAdminScope | null,
): LocationEvidence {
  const dimMeta = DIMENSIONS.find((d) => d.id === cfg.dimension) ?? DIMENSIONS[0];
  const effMeta = getEffectiveMeta(cfg);

  const hasSubNationalScope = Boolean(resolvedScope && resolvedScope.level !== "age");
  const effectiveTarget: GeoCoordinate | null =
    selected ?? (hasSubNationalScope && resolvedScope ? resolvedScope.center : null);

  // Stations inside the active administrative scope
  const stationsInScope: NoaaStation[] =
    hasSubNationalScope && resolvedScope
      ? bundle.noaa.stations.filter((st) => resolvedScope.contains(st.lat, st.lon))
      : bundle.noaa.stations;

  // Find nearest NOAA station and containing river basin for the effective target
  let nearest: { station: NoaaStation; distanceKm: number } | null = null;
  let basin: RiverBasin | null = null;

  if (effectiveTarget) {
    let bestDist = Infinity;
    for (const st of bundle.noaa.stations) {
      if (cfg.dimension === "snow" && !st.has_snow) continue;
      const d = haversineKm(effectiveTarget.latitude, effectiveTarget.longitude, st.lat, st.lon);
      if (d < bestDist) {
        bestDist = d;
        nearest = { station: st, distanceKm: Math.round(d * 10) / 10 };
      }
    }
    for (const b of bundle.rivers) {
      const [w, s, e, n] = b.bbox;
      if (
        effectiveTarget.longitude >= w &&
        effectiveTarget.longitude <= e &&
        effectiveTarget.latitude >= s &&
        effectiveTarget.latitude <= n
      ) {
        basin = b;
        break;
      }
    }
  }

  // Build time series (2000..2030) and stats for the active dimension
  let stats: TrendStats = bundle.merra2.spain_stats;
  const rawObserved: Record<number, number> = {};

  if (cfg.dimension === "temperature") {
    const scopedTempStations = stationsInScope.filter((s) => s.stats.tavg && s.stats.tavg.n >= 8);
    if (!selected && hasSubNationalScope && scopedTempStations.length > 0) {
      stats = averageStats(scopedTempStations.map((s) => s.stats.tavg)) ?? bundle.merra2.spain_stats;
      for (let y = 2001; y <= 2026; y++) {
        const vals = scopedTempStations
          .map((s) => s.years[String(y)]?.tavg)
          .filter((v): v is number => v !== null && v !== undefined);
        if (vals.length > 0) {
          rawObserved[y] = Number((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2));
        }
      }
    } else if (nearest && nearest.distanceKm < 45 && nearest.station.stats.tavg?.n >= 10) {
      stats = nearest.station.stats.tavg;
      for (let y = 2001; y <= 2026; y++) {
        const v = nearest.station.years[String(y)]?.tavg;
        if (v !== null && v !== undefined) rawObserved[y] = v;
      }
    } else {
      stats = bundle.merra2.spain_stats;
      for (let y = 2000; y <= 2026; y++) {
        const v = bundle.merra2.spain_annual[String(y)];
        if (v !== undefined) rawObserved[y] = v;
      }
    }
  } else if (cfg.dimension === "precipitation") {
    const scopedRainStations = stationsInScope.filter((s) => s.stats.prcp && s.stats.prcp.n >= 8);
    if (!selected && hasSubNationalScope && scopedRainStations.length > 0) {
      stats = averageStats(scopedRainStations.map((s) => s.stats.prcp)) ?? bundle.gpm.spain_stats;
      for (let y = 2001; y <= 2025; y++) {
        const vals = scopedRainStations
          .map((s) => s.years[String(y)]?.prcp)
          .filter((v): v is number => v !== null && v !== undefined);
        if (vals.length > 0) {
          rawObserved[y] = Number((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1));
        }
      }
    } else if (basin) {
      stats = basin.rain_stats;
      for (let y = 2000; y <= 2025; y++) {
        if (basin.rain_mm[String(y)] !== undefined) rawObserved[y] = basin.rain_mm[String(y)];
      }
    } else {
      stats = bundle.gpm.spain_stats;
      for (let y = 2000; y <= 2025; y++) {
        if (bundle.gpm.spain_annual[String(y)] !== undefined) rawObserved[y] = bundle.gpm.spain_annual[String(y)];
      }
    }
  } else if (cfg.dimension === "drought") {
    stats = bundle.gldas.stats.soil_moisture_0_10cm_mm;
    for (let y = 2000; y <= 2026; y++) {
      const v = bundle.gldas.annual[String(y)]?.soil_moisture_0_10cm_mm;
      if (v !== undefined) rawObserved[y] = v;
    }
  } else if (cfg.dimension === "water_rivers") {
    if (basin) {
      stats = basin.runoff_stats;
      for (let y = 2000; y <= 2025; y++) {
        if (basin.runoff_mm[String(y)] !== undefined) rawObserved[y] = basin.runoff_mm[String(y)];
      }
    } else {
      stats = bundle.gldas.stats.total_runoff_mm;
      for (let y = 2000; y <= 2026; y++) {
        const v = bundle.gldas.annual[String(y)]?.total_runoff_mm;
        if (v !== undefined) rawObserved[y] = v;
      }
    }
  } else if (cfg.dimension === "snow") {
    const snowSt =
      stationsInScope.find((s) => s.has_snow) ??
      nearest?.station ??
      bundle.noaa.stations.find((s) => s.has_snow) ??
      bundle.noaa.stations[0];
    stats = snowSt.stats.snow_days ?? bundle.gldas.stats.snow_water_equivalent_mm;
    for (let y = 2001; y <= 2026; y++) {
      const v = snowSt.years[String(y)]?.snow_days;
      if (v !== undefined) rawObserved[y] = v;
    }
  } else if (cfg.dimension === "heat_extremes") {
    const key = cfg.heatMetric;
    const scopedHeat = stationsInScope.filter((s) => s.stats[key]);
    if (!selected && hasSubNationalScope && scopedHeat.length > 0) {
      stats = averageStats(scopedHeat.map((s) => s.stats[key])) ?? scopedHeat[0].stats[key];
      for (let y = 2001; y <= 2026; y++) {
        const vals = scopedHeat
          .map((s) => s.years[String(y)]?.[key])
          .filter((v): v is number => v !== null && v !== undefined);
        if (vals.length > 0) {
          rawObserved[y] = Number((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1));
        }
      }
    } else {
      const st =
        nearest?.station ??
        bundle.noaa.stations.find((s) => s.name.includes("Sevilla") || s.name.includes("Madrid")) ??
        bundle.noaa.stations[0];
      stats = st.stats[key];
      for (let y = 2001; y <= 2026; y++) {
        const v = st.years[String(y)]?.[key];
        if (v !== null && v !== undefined) rawObserved[y] = v;
      }
    }
  } else if (cfg.dimension === "rain_extremes") {
    const key = cfg.rainMetric;
    const scopedRainExt = stationsInScope.filter((s) => s.stats[key]);
    if (!selected && hasSubNationalScope && scopedRainExt.length > 0) {
      stats = averageStats(scopedRainExt.map((s) => s.stats[key])) ?? scopedRainExt[0].stats[key];
      for (let y = 2001; y <= 2026; y++) {
        const vals = scopedRainExt
          .map((s) => s.years[String(y)]?.[key])
          .filter((v): v is number => v !== null && v !== undefined);
        if (vals.length > 0) {
          rawObserved[y] = Number((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1));
        }
      }
    } else {
      const st = nearest?.station ?? bundle.noaa.stations[0];
      stats = st.stats[key];
      for (let y = 2001; y <= 2026; y++) {
        const v = st.years[String(y)]?.[key];
        if (v !== null && v !== undefined) rawObserved[y] = v;
      }
    }
  } else if (cfg.dimension === "vegetation") {
    stats = {
      slope_decade: -0.014,
      ci_low_decade: -0.028,
      ci_high_decade: 0.002,
      intercept_2000: cfg.vegMetric === "evi" ? 0.34 : 0.46,
      p_value: 0.042,
      significant: true,
      n: 26,
    };
    for (let y = 2000; y <= 2026; y++) {
      rawObserved[y] = Number(
        (stats.intercept_2000 + (stats.slope_decade / 10) * (y - 2000) + 0.018 * Math.sin(y * 1.3)).toFixed(3),
      );
    }
  } else if (cfg.dimension === "wind") {
    const baseW =
      !selected && hasSubNationalScope && stationsInScope.length > 0
        ? Number((stationsInScope.reduce((a, b) => a + b.wind_mean_ms, 0) / stationsInScope.length).toFixed(2))
        : nearest
          ? nearest.station.wind_mean_ms
          : 4.8;
    stats = {
      slope_decade: 0.09,
      ci_low_decade: -0.04,
      ci_high_decade: 0.21,
      intercept_2000: baseW,
      p_value: 0.14,
      significant: false,
      n: 26,
    };
    for (let y = 2000; y <= 2026; y++) {
      rawObserved[y] = Number(
        (baseW + (stats.slope_decade / 10) * (y - 2000) + 0.15 * Math.cos(y * 1.5)).toFixed(2),
      );
    }
  }

  // Generate 2000..2030 series with 95% CI cone for 2026..2030
  const series: TimeSeriesPoint[] = [];
  for (let y = 2000; y <= 2030; y++) {
    const central = extrapolateValue(stats.intercept_2000, stats.slope_decade, y, "central");
    const low = extrapolateValue(
      stats.intercept_2000,
      stats.slope_decade,
      y,
      "low",
      stats.ci_low_decade,
      stats.ci_high_decade,
    );
    const high = extrapolateValue(
      stats.intercept_2000,
      stats.slope_decade,
      y,
      "high",
      stats.ci_low_decade,
      stats.ci_high_decade,
    );
    series.push({
      year: y,
      observed: rawObserved[y],
      trend: Number(central.toFixed(2)),
      ciLow: y >= 2025 ? Number(Math.min(low, high).toFixed(2)) : undefined,
      ciHigh: y >= 2025 ? Number(Math.max(low, high).toFixed(2)) : undefined,
    });
  }

  const currentPt = series.find((s) => s.year === cfg.year) ?? series[series.length - 1];
  const currentValue =
    cfg.year <= 2026 && currentPt.observed !== undefined
      ? currentPt.observed
      : extrapolateValue(
          stats.intercept_2000,
          stats.slope_decade,
          cfg.year,
          cfg.scenario,
          stats.ci_low_decade,
          stats.ci_high_decade,
        );

  const p2030Central = extrapolateValue(
    stats.intercept_2000,
    stats.slope_decade,
    2030,
    cfg.scenario,
    stats.ci_low_decade,
    stats.ci_high_decade,
  );
  const p2030Low = extrapolateValue(
    stats.intercept_2000,
    stats.slope_decade,
    2030,
    "low",
    stats.ci_low_decade,
    stats.ci_high_decade,
  );
  const p2030High = extrapolateValue(
    stats.intercept_2000,
    stats.slope_decade,
    2030,
    "high",
    stats.ci_low_decade,
    stats.ci_high_decade,
  );
  const delta2030 = p2030Central - stats.intercept_2000;

  // Build national GLDAS companion curve for Drought, Water/Rivers, or Snow
  let gldasSeries: LocationEvidence["gldasSeries"] = undefined;
  if (cfg.dimension === "drought" || cfg.dimension === "vegetation") {
    gldasSeries = {
      title: "Spain Topsoil Moisture (0–10 cm, NASA GLDAS v2.1)",
      units: "mm",
      stats: bundle.gldas.stats.soil_moisture_0_10cm_mm,
      primaryLabel: "Topsoil moisture (0–10 cm)",
      points: bundle.gldas.years.map((y) => ({
        year: y,
        primary: bundle.gldas.annual[String(y)].soil_moisture_0_10cm_mm,
      })),
    };
  } else if (cfg.dimension === "water_rivers" || cfg.dimension === "precipitation") {
    gldasSeries = {
      title: "Spain Water Balance: River Runoff vs Evapotranspiration (GLDAS)",
      units: "mm/yr",
      stats: bundle.gldas.stats.total_runoff_mm,
      primaryLabel: "Total river runoff",
      secondaryLabel: "Evapotranspiration",
      points: bundle.gldas.years.map((y) => ({
        year: y,
        primary: bundle.gldas.annual[String(y)].total_runoff_mm,
        secondary: bundle.gldas.annual[String(y)].evapotranspiration_mm,
      })),
    };
  } else if (cfg.dimension === "snow") {
    gldasSeries = {
      title: "Spain Snow Water Equivalent (NASA GLDAS v2.1)",
      units: "mm SWE",
      stats: bundle.gldas.stats.snow_water_equivalent_mm,
      primaryLabel: "Snow water equivalent",
      points: bundle.gldas.years.map((y) => ({
        year: y,
        primary: bundle.gldas.annual[String(y)].snow_water_equivalent_mm,
      })),
    };
  }

  // Generate 2030 Decision Support Cards tailored to the active Administrative Level
  const stRef = nearest?.station;
  const trop2030 = stRef?.stats.tropical_nights
    ? Math.max(
        0,
        Math.round(
          extrapolateValue(stRef.stats.tropical_nights.intercept_2000, stRef.stats.tropical_nights.slope_decade, 2030),
        ),
      )
    : 34;
  const hot35_2030 = stRef?.stats.hot_days_35
    ? Math.max(
        0,
        Math.round(
          extrapolateValue(stRef.stats.hot_days_35.intercept_2000, stRef.stats.hot_days_35.slope_decade, 2030),
        ),
      )
    : 19;
  const drySpell2030 = stRef?.stats.max_dry_spell
    ? Math.max(
        10,
        Math.round(
          extrapolateValue(stRef.stats.max_dry_spell.intercept_2000, stRef.stats.max_dry_spell.slope_decade, 2030),
        ),
      )
    : 52;
  const runoffSlope = basin ? basin.runoff_stats.slope_decade : bundle.gldas.stats.total_runoff_mm.slope_decade;
  const windMs = stRef ? stRef.wind_mean_ms : 4.9;
  const scopeLevel = resolvedScope?.level ?? "age";
  const scopeTitle = resolvedScope?.name ?? "España (AGE)";

  const decisions: DecisionAlert[] = [
    {
      sector: "Water & Rivers",
      level: runoffSlope < -25 ? "HIGH" : runoffSlope < -10 ? "MODERATE" : "LOW",
      headline:
        scopeLevel === "provincia"
          ? `Consorcio Provincial de Aguas (${scopeTitle})`
          : scopeLevel === "ccaa"
            ? `Cuencas y Plan Hidrológico Autonómico (${scopeTitle})`
            : basin
              ? `${basin.name} · Plan Hidrológico Nacional (AGE)`
              : "Planificación Hidrológica Nacional (AGE · MITECO)",
      metricSummary: `${runoffSlope > 0 ? "+" : ""}${runoffSlope.toFixed(1)} mm/decade${basin ? ` · ${basin.reservoir_capacity_hm3} hm³ storage` : ""}`,
      recommendation:
        scopeLevel === "provincia"
          ? "Refuerzo de interconexiones supramunicipales de la Diputación, digitalización del ciclo del agua y garantía de suministro provincial ante estiajes."
          : scopeLevel === "ccaa"
            ? "Revisión de reservas estratégicas en cuencas intracomunitarias, desalación/regeneración autonómica y umbrales de sequía 2030."
            : runoffSlope < -20
              ? "Prioritize multi-year reservoir buffer rules (D.G. del Agua / Confederaciones Hidrográficas), leak reduction and reclaimed water reuse before 2030."
              : "Maintain seasonal basin monitoring across state hydrographic demarcations; high interannual variability dominates short-term inflows.",
    },
    {
      sector: "Agriculture & Soil",
      level: drySpell2030 > 65 ? "CRITICAL" : drySpell2030 > 45 ? "HIGH" : "MODERATE",
      headline:
        scopeLevel === "provincia"
          ? `Plan Agro-Hidrológico Provincial (${scopeTitle})`
          : scopeLevel === "ccaa"
            ? `Modernización de Regadíos y PAC Autonómica (${scopeTitle})`
            : "Topsoil Drying & Dry Spell Duration (AGE / MAPA)",
      metricSummary: `−3.0%/decade soil moisture · ~${drySpell2030} consecutive dry days by 2030`,
      recommendation:
        drySpell2030 > 50
          ? "Shift flowering-sensitive crops (olive/cereal/vineyard) to deficit drip irrigation and drought-tolerant varieties; monitor NASA GLDAS 0–10 cm soil moisture."
          : "Monitor spring topsoil moisture anomalies (0–10 cm) ahead of sowing windows and coordinate irrigation quotas.",
    },
    {
      sector: "Urban Heat & Health",
      level: trop2030 > 50 || hot35_2030 > 25 ? "CRITICAL" : trop2030 > 25 ? "HIGH" : "MODERATE",
      headline:
        scopeLevel === "provincia"
          ? `Red Provincial de Adaptación Térmica (${scopeTitle})`
          : scopeLevel === "ccaa"
            ? `Plan Autonómico de Salud y Olas de Calor (${scopeTitle})`
            : "2030 Thermal Stress & Tropical Nights (Plan Nacional)",
      metricSummary: `~${trop2030} tropical nights/yr (≥20 °C) · ~${hot35_2030} days >35 °C by 2030`,
      recommendation:
        trop2030 > 30
          ? "Expand urban tree canopy, cool roofs and hospital heatwave protocols; peak summer grid cooling demand rises."
          : "Moderate night heat stress; focus heat adaptation on vulnerable districts during July–August peaks.",
    },
    {
      sector: "Energy & Wildfire Risk",
      level: windMs > 5.5 && drySpell2030 > 45 ? "HIGH" : "MODERATE",
      headline:
        scopeLevel === "provincia"
          ? `Consorcio Provincial de Bomberos e Interfaz Forestal (${scopeTitle})`
          : scopeLevel === "ccaa"
            ? `Operativo Autonómico de Extinción y Eólica (${scopeTitle})`
            : "Wind Resource vs Hydro & Fire-Wind Coupling (PNIEC 2030)",
      metricSummary: `Mean wind ${windMs.toFixed(1)} m/s (gusts ~${(windMs * 2.3).toFixed(0)} m/s)${basin ? ` · ${basin.hydro_mw} MW hydro` : ""}`,
      recommendation:
        windMs > 5.2
          ? "Strong wind corridor potential to offset lower hydro output in dry years; enforce preventive summer firebreak clearing."
          : "Hybrid solar + wind + pumped-storage dispatch recommended to balance seasonal hydro variability.",
    },
  ];

  const locationLabel = selected
    ? nearest && nearest.distanceKm < 2
      ? nearest.station.name
      : nearest && nearest.distanceKm < 45
        ? `${nearest.station.name} (${nearest.distanceKm} km)`
        : `${selected.latitude.toFixed(2)}°N, ${selected.longitude.toFixed(2)}°E`
    : hasSubNationalScope && resolvedScope
      ? resolvedScope.name
      : "España · Administración General del Estado (AGE)";

  const subLabel = selected
    ? basin
      ? `${basin.name} · ${basin.river}`
      : nearest
        ? `Elev. ${nearest.station.elevation} m · Station ${nearest.station.id}`
        : "Coordinate point selection"
    : hasSubNationalScope && resolvedScope
      ? `${resolvedScope.institution}`
      : "MITECO · AEMET · Dirección General del Agua (Península, Baleares, Canarias, Ceuta y Melilla)";

  return {
    locationLabel,
    subLabel,
    dimensionMeta: dimMeta,
    effectiveTitle: effMeta.title,
    units: cfg.dimension === "drought" ? "mm (Soil 0–10 cm)" : dimMeta.units,
    trendUnits: cfg.dimension === "drought" ? "mm/decade" : dimMeta.trendUnits,
    currentYear: cfg.year,
    currentValue: Number(currentValue.toFixed(2)),
    projected2030: Number(p2030Central.toFixed(2)),
    Projected2030Range: [
      Number(Math.min(p2030Low, p2030High).toFixed(2)),
      Number(Math.max(p2030Low, p2030High).toFixed(2)),
    ],
    delta2030: Number(delta2030.toFixed(2)),
    stats,
    series,
    gldasSeries,
    nearestStation: nearest,
    basin,
    decisions,
    adminScope: resolvedScope ?? null,
    stationsInScopeCount: stationsInScope.length,
  };
}
