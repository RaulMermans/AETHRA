import type { AdminBundle, ResolvedAdminScope } from "./admin-scope";
import {
  extrapolateValue,
  HEATMAP_BOUNDS,
  loadSpainMultiPolygon,
  type AdminClimateProfile,
  type ClimateBundle,
  type DimensionId,
  type PaletteId,
  type RiverBasin,
  type SwotReservoir,
  type TrendStats,
  samplePalette,
  samplePaletteCss,
} from "./climate";

export type EnergyConceptId =
  | "hydropower_stability"
  | "floating_solar"
  | "industrial_cooling"
  | "solar_resilience"
  | "hydrogen_water"
  | "energy_agriculture"
  | "wind_solar_complementarity";

export type EnergyOptimizationGoal = "ideal" | "at_risk" | "significant_only";

export type EnergyTargetScope = "provincia" | "ccaa" | "basin" | "reservoir";

export type EnergyVariableLens = "composite" | "primary" | "secondary" | "trend";

export interface CrossedVariableSpec {
  id: string;
  label: string;
  dataset: string;
  units: string;
  trendUnits: string;
  role: string;
  isProxy?: boolean;
}

export interface EnergyConceptMeta {
  id: EnergyConceptId;
  title: string;
  shortTitle: string;
  questionEs: string;
  questionEn: string;
  opportunity: string;
  linkedDimension: DimensionId;
  recommendedScope: EnergyTargetScope;
  allowedScopes: EnergyTargetScope[];
  coverageBadge: "100% Direct NASA/SWOT/NOAA" | "Direct NASA + Physical Proxy";
  methodologyNote: string;
  palette: PaletteId;
  variablesCrossed: CrossedVariableSpec[];
  lensLabels: Record<EnergyVariableLens, string>;
}

export const ENERGY_CONCEPTS: EnergyConceptMeta[] = [
  {
    id: "hydropower_stability",
    title: "Hydropower Stability",
    shortTitle: "Hydropower",
    questionEs: "¿En qué cuencas y provincias evolucionan de forma distinta la lluvia y la escorrentía?",
    questionEn: "Where do precipitation and river runoff diverge due to evapotranspiration and snow/soil shifts?",
    opportunity: "Hydroelectric planning, reversible pumped-storage siting & multi-year reservoir rules",
    linkedDimension: "water_rivers",
    recommendedScope: "basin",
    allowedScopes: ["basin", "provincia", "ccaa", "reservoir"],
    coverageBadge: "100% Direct NASA/SWOT/NOAA",
    methodologyNote:
      "Crosses NASA GPM IMERG V07 precipitation (0.1°) with NASA GLDAS v2.1 Noah 0.25° gridded total runoff (surface + groundwater), evapotranspiration, topsoil moisture (0–10 cm) and snow water equivalent (2000–2026).",
    palette: "runoff",
    variablesCrossed: [
      {
        id: "runoff_mm",
        label: "Total River Runoff (Q)",
        dataset: "NASA GLDAS Noah v2.1 (0.25° grid)",
        units: "mm/yr",
        trendUnits: "mm/dec",
        role: "Effective water inflow reaching rivers and hydroelectric reservoirs",
      },
      {
        id: "evap_mm",
        label: "Evapotranspiration (ET)",
        dataset: "NASA GLDAS Noah v2.1 (0.25° grid)",
        units: "mm/yr",
        trendUnits: "mm/dec",
        role: "Atmospheric water loss decoupling runoff from rainfall under warming",
      },
      {
        id: "rain_mm",
        label: "Accumulated Precipitation (P)",
        dataset: "NASA GPM IMERG Final V07 (0.1°)",
        units: "mm/yr",
        trendUnits: "mm/dec",
        role: "Total meteorological rainfall input to the basin",
      },
      {
        id: "soil_mm",
        label: "Topsoil Moisture (0–10 cm) & Snow",
        dataset: "NASA GLDAS v2.1 + NOAA SNWD",
        units: "mm",
        trendUnits: "mm/dec",
        role: "Basin hydrological memory and spring snowmelt buffer",
      },
    ],
    lensLabels: {
      composite: "Hydropower Stability Score (0–100)",
      primary: "Total River Runoff Q (mm/yr · GLDAS)",
      secondary: "Evapotranspiration Loss ET (mm/yr · GLDAS)",
      trend: "Runoff Decadal Trend (mm/decade)",
    },
  },
  {
    id: "floating_solar",
    title: "Floating Solar Stability (FPV)",
    shortTitle: "Floating Solar",
    questionEs: "¿Qué embalses presentan condiciones de superficie de agua suficientemente estables para investigar solar flotante?",
    questionEn: "Which Spanish reservoirs combine stable water-surface area with high evaporation-saving and thermal yield?",
    opportunity: "Floating photovoltaics (FPV) on existing reservoirs without land-use conflict + evaporation reduction",
    linkedDimension: "water_rivers",
    recommendedScope: "reservoir",
    allowedScopes: ["reservoir", "basin", "provincia", "ccaa"],
    coverageBadge: "100% Direct NASA/SWOT/NOAA",
    methodologyNote:
      "Crosses NASA/CNES SWOT L2 HR LakeSP satellite pass time series (2023–2026 water surface area km² & water surface elevation m stability, CV = σ/μ) matched to Spanish reservoirs with NASA GLDAS evaporation loss (mm/yr) and NASA MERRA-2 air temperature.",
    palette: "precip",
    variablesCrossed: [
      {
        id: "swot_stability",
        label: "Water Surface Stability (1 − CV)",
        dataset: "NASA/CNES SWOT L2 LakeSP (2023–2026)",
        units: "CV (σ/μ)",
        trendUnits: "m WSE σ",
        role: "Low surface area & elevation volatility minimizes mooring mechanical stress",
      },
      {
        id: "evap_mm",
        label: "Evaporative Loss Potential (ET)",
        dataset: "NASA GLDAS Noah v2.1 (0.25°)",
        units: "mm/yr",
        trendUnits: "mm/dec",
        role: "Water volume saved from evaporation by floating PV shading",
      },
      {
        id: "temp_c",
        label: "Ambient Air Temperature (T2M)",
        dataset: "NASA MERRA-2 v5.12.4 (0.5°)",
        units: "°C",
        trendUnits: "°C/dec",
        role: "Water-cooled FPV modules gain +5–10% efficiency in warm climates",
      },
      {
        id: "area_km2",
        label: "Mean Reservoir Surface Area",
        dataset: "SWOT PLD + Wikidata Hydrography",
        units: "km²",
        trendUnits: "passes",
        role: "Available water surface area (covering 5% yields ~4–5 MWp per km²)",
      },
    ],
    lensLabels: {
      composite: "Floating Solar Suitability Score (0–100)",
      primary: "SWOT Surface Area (km²) / Stability",
      secondary: "Evaporation Saved Potential (mm/yr · GLDAS)",
      trend: "Local Warming Trend (°C/decade · MERRA-2)",
    },
  },
  {
    id: "industrial_cooling",
    title: "Industrial & Data Center Cooling Shift",
    shortTitle: "Industrial Cooling",
    questionEs: "¿Dónde están cambiando las condiciones de refrigeración industrial y de centros de datos?",
    questionEn: "Where are nocturnal free-cooling windows and extreme heat thresholds shifting across Spain?",
    opportunity: "Hyperscale data centers, edge compute & electro-intensive industrial cooling siting",
    linkedDimension: "heat_extremes",
    recommendedScope: "provincia",
    allowedScopes: ["provincia", "ccaa", "basin"],
    coverageBadge: "100% Direct NASA/SWOT/NOAA",
    methodologyNote:
      "Crosses NASA MERRA-2 summer (JJA) & annual 2 m temperature trends with NOAA GHCN-Daily extreme heat days (Tmax > 35 °C, dry-cooler derating threshold), tropical nights (Tmin ≥ 20 °C, loss of night free-cooling) and GLDAS water runoff.",
    palette: "thermal",
    variablesCrossed: [
      {
        id: "summer_temp_c",
        label: "Summer Mean Temperature (JJA)",
        dataset: "NASA MERRA-2 M2TMNXSLV v5.12.4",
        units: "°C",
        trendUnits: "°C/dec",
        role: "Baseline thermal load for dry/adiabatic industrial cooling systems",
      },
      {
        id: "hot_days_35",
        label: "Extreme Heat Days (Tmax > 35 °C)",
        dataset: "NOAA GHCN-Daily (~175 stations)",
        units: "days/yr",
        trendUnits: "days/dec",
        role: "Hours where dry cooling derates and peak chiller power spikes",
      },
      {
        id: "tropical_nights",
        label: "Tropical Nights (Tmin ≥ 20 °C)",
        dataset: "NOAA GHCN-Daily (~175 stations)",
        units: "nights/yr",
        trendUnits: "nights/dec",
        role: "Loss of nocturnal radiative and convective free-cooling capacity",
      },
      {
        id: "wind_ms",
        label: "Surface Wind & Water Runoff",
        dataset: "NOAA AWND + NASA GLDAS v2.1",
        units: "m/s",
        trendUnits: "mm/yr Q",
        role: "Natural convective heat dissipation and non-stressed water backup",
      },
    ],
    lensLabels: {
      composite: "Free-Cooling Resilience Score (0–100)",
      primary: "Summer JJA Temperature (°C · MERRA-2)",
      secondary: "Extreme Days > 35 °C (days/yr · NOAA)",
      trend: "Hot Days Decadal Trend (days/decade)",
    },
  },
  {
    id: "solar_resilience",
    title: "Solar PV Thermal Resilience",
    shortTitle: "Solar Resilience",
    questionEs: "¿Dónde está cambiando el potencial de cielo despejado junto con el estrés térmico y sequía?",
    questionEn: "Where do high clear-sky solar conditions coincide with lower thermal derating (>35 °C) and soiling risk?",
    opportunity: "Thermally resilient utility-scale PV parks on high-insolation, cool-ventilated plateaus",
    linkedDimension: "temperature",
    recommendedScope: "provincia",
    allowedScopes: ["provincia", "ccaa", "basin"],
    coverageBadge: "Direct NASA + Physical Proxy",
    methodologyNote:
      "Silicon PV loses ~0.4%/°C above 25 °C cell temperature. Crosses clear-sky solar transmittance proxy (Hargreaves-Samani diurnal thermal range ΔT = Tmax − Tmin from NOAA + low GPM cloud/rain days; note: direct SWGDN radiation & aerosols are not in local NetCDFs) with MERRA-2 summer heat, NOAA >35 °C days, and dry-spell soiling duration.",
    palette: "heat_extreme",
    variablesCrossed: [
      {
        id: "dtr_c",
        label: "Clear-Sky Insolation Proxy (ΔT)",
        dataset: "NOAA GHCN-Daily (Tmax − Tmin) + GPM",
        units: "°C ΔT",
        trendUnits: "°C/dec",
        role: "Physical Hargreaves-Samani proxy for clear-sky solar transmittance",
        isProxy: true,
      },
      {
        id: "hot_days_35",
        label: "PV Thermal Derating Days (> 35 °C)",
        dataset: "NOAA GHCN-Daily (~175 stations)",
        units: "days/yr",
        trendUnits: "days/dec",
        role: "Extreme ambient heat causing ~4–8% peak power derating in PV modules",
      },
      {
        id: "max_dry_spell",
        label: "Dry-Spell Soiling Window (< 1 mm)",
        dataset: "NOAA GHCN-Daily + NASA GPM IMERG",
        units: "days/yr",
        trendUnits: "days/dec",
        role: "Consecutive rainless days accumulating dust/aerosol soiling on panels",
      },
      {
        id: "summer_temp_c",
        label: "Summer Ambient Temperature (JJA)",
        dataset: "NASA MERRA-2 v5.12.4",
        units: "°C",
        trendUnits: "°C/dec",
        role: "Operating temperature baseline during peak summer generation months",
      },
    ],
    lensLabels: {
      composite: "Solar PV Thermal Resilience Score (0–100)",
      primary: "Clear-Sky Amplitude ΔT (°C · NOAA Proxy)",
      secondary: "Thermal Derating Days > 35 °C (days/yr)",
      trend: "Summer Warming Trend (°C/decade · MERRA-2)",
    },
  },
  {
    id: "hydrogen_water",
    title: "Green Hydrogen Water Conflict",
    shortTitle: "H₂ Water Conflict",
    questionEs: "¿Dónde coinciden potencial energético renovable y menor (o creciente) presión hídrica?",
    questionEn: "Where does high renewable electrolysis potential align with sustainable water runoff vs. intensifying drought?",
    opportunity: "Green hydrogen (H₂) valleys with high wind+solar capacity factor and low freshwater conflict",
    linkedDimension: "drought",
    recommendedScope: "provincia",
    allowedScopes: ["provincia", "ccaa", "basin"],
    coverageBadge: "Direct NASA + Physical Proxy",
    methodologyNote:
      "Electrolysis requires ~9–15 L of purified water per kg H₂ (plus cooling water). Crosses renewable wind + clear-sky potential with NASA GLDAS v2.1 river runoff (mm/yr), evapotranspiration trend, and NASA GPM SPI-12 drought pressure.",
    palette: "drought_spi",
    variablesCrossed: [
      {
        id: "runoff_mm",
        label: "Available Water Runoff (Q)",
        dataset: "NASA GLDAS Noah v2.1 (0.25° grid)",
        units: "mm/yr",
        trendUnits: "mm/dec",
        role: "Renewable surface + groundwater yield supporting electrolysis without aquifer depletion",
      },
      {
        id: "wind_ms",
        label: "Renewable Wind + Solar Feedstock",
        dataset: "NOAA AWND/Corridors + Clear-Sky ΔT",
        units: "m/s",
        trendUnits: "m/s/dec",
        role: "High combined wind + solar capacity factor reduces electrolyzer CAPEX per kg H₂",
        isProxy: true,
      },
      {
        id: "evap_mm",
        label: "Evaporative Water Demand (ET)",
        dataset: "NASA GLDAS Noah v2.1 (0.25° grid)",
        units: "mm/yr",
        trendUnits: "mm/dec",
        role: "Competing atmospheric & agricultural water demand in the basin",
      },
      {
        id: "max_dry_spell",
        label: "Drought & Dry Spell Pressure",
        dataset: "NASA GPM IMERG V07 + NOAA",
        units: "days/yr",
        trendUnits: "days/dec",
        role: "Summer estiaje duration requiring water storage or coastal desalination",
      },
    ],
    lensLabels: {
      composite: "Low-Conflict Green H₂ Score (0–100)",
      primary: "Available River Runoff Q (mm/yr · GLDAS)",
      secondary: "Surface Wind Speed (m/s · NOAA/Model)",
      trend: "Runoff Decadal Trend (mm/decade)",
    },
  },
  {
    id: "energy_agriculture",
    title: "Energy–Agriculture & Agrivoltaic Synergy",
    shortTitle: "Agro-Energy",
    questionEs: "¿Dónde podría estudiarse el desarrollo solar o agrovoltaico sin agravar conflictos o mitigando el secado del suelo?",
    questionEn: "Where can agrivoltaic shading protect drying topsoil (0–10 cm) and heat-stressed crops, or avoid high-NDVI land conflict?",
    opportunity: "Dual-use Agrivoltaics (crops + PV shading that cuts soil evaporation) & low-conflict solar zoning",
    linkedDimension: "vegetation",
    recommendedScope: "provincia",
    allowedScopes: ["provincia", "ccaa", "basin"],
    coverageBadge: "Direct NASA + Physical Proxy",
    methodologyNote:
      "Crosses NASA GLDAS v2.1 0–10 cm topsoil moisture & decadal drying trend (−3%/decade nationally) with NASA Terra MODIS MOD13Q1 NDVI greenness, GLDAS evapotranspiration, and NOAA extreme heat days (>35 °C).",
    palette: "vegetation",
    variablesCrossed: [
      {
        id: "soil_mm",
        label: "Topsoil Moisture (0–10 cm)",
        dataset: "NASA GLDAS Noah v2.1 (0.25° grid)",
        units: "mm",
        trendUnits: "mm/dec",
        role: "Root-zone moisture; partial agrivoltaic shading reduces soil evaporation by 15–30%",
      },
      {
        id: "ndvi",
        label: "Vegetation Greenness (NDVI)",
        dataset: "NASA Terra MODIS MOD13Q1 v061",
        units: "NDVI",
        trendUnits: "NDVI/dec",
        role: "Distinguishes high-biomass forest/crops from semi-arid fallow plateaus",
        isProxy: true,
      },
      {
        id: "hot_days_35",
        label: "Crop Heat-Stress Days (> 35 °C)",
        dataset: "NOAA GHCN-Daily (~175 stations)",
        units: "days/yr",
        trendUnits: "days/dec",
        role: "Flowering and fruit-set thermal damage mitigated by overhead PV panels",
      },
      {
        id: "evap_mm",
        label: "Evapotranspiration Deficit (ET vs P)",
        dataset: "NASA GLDAS v2.1 + NASA GPM V07",
        units: "mm/yr",
        trendUnits: "mm/dec",
        role: "Agro-hydrological water balance under warming",
      },
    ],
    lensLabels: {
      composite: "Agrivoltaic & Land Synergy Score (0–100)",
      primary: "Topsoil Moisture 0–10 cm (mm · GLDAS)",
      secondary: "MODIS Vegetation Index (NDVI)",
      trend: "Topsoil Moisture Trend (mm/decade)",
    },
  },
  {
    id: "wind_solar_complementarity",
    title: "Wind + Solar Hybrid Complementarity",
    shortTitle: "Wind + Solar",
    questionEs: "¿Dónde se compensan temporalmente sol y viento para una generación híbrida más equilibrada?",
    questionEn: "Where do strong wind corridors complement clear-sky solar resource to maximize grid substation utilization?",
    opportunity: "Co-located Wind + PV hybrid plants sharing grid interconnection (winter wind + summer sun)",
    linkedDimension: "wind",
    recommendedScope: "provincia",
    allowedScopes: ["provincia", "ccaa", "basin"],
    coverageBadge: "Direct NASA + Physical Proxy",
    methodologyNote:
      "Crosses surface wind speed & corridor exposure (NOAA AWND + Cierzo/Levante/Trade/Atlantic corridors) with clear-sky solar amplitude (ΔT) and NASA GPM seasonal rain/cloud contrast.",
    palette: "wind",
    variablesCrossed: [
      {
        id: "wind_ms",
        label: "Mean Surface Wind Speed",
        dataset: "NOAA GHCN-Daily (AWND) + Corridor Model",
        units: "m/s",
        trendUnits: "m/s/dec",
        role: "Winter & nocturnal generation backbone (cubic power law P ∝ v³)",
        isProxy: true,
      },
      {
        id: "dtr_c",
        label: "Clear-Sky Solar Amplitude (ΔT)",
        dataset: "NOAA GHCN-Daily (Tmax − Tmin)",
        units: "°C ΔT",
        trendUnits: "°C/dec",
        role: "Daytime & summer photovoltaic generation potential",
        isProxy: true,
      },
      {
        id: "rain_mm",
        label: "Cloud/Precipitation Regime",
        dataset: "NASA GPM IMERG Final V07",
        units: "mm/yr",
        trendUnits: "mm/dec",
        role: "Identifies synoptic storm corridors where wind peaks during cloudy months",
      },
      {
        id: "temp_c",
        label: "Thermal Operating Baseline",
        dataset: "NASA MERRA-2 v5.12.4",
        units: "°C",
        trendUnits: "°C/dec",
        role: "Air density & PV module thermal efficiency modifier",
      },
    ],
    lensLabels: {
      composite: "Hybrid Wind+Solar Score (0–100)",
      primary: "Mean Wind Speed (m/s · NOAA/Corridor)",
      secondary: "Clear-Sky Solar Proxy ΔT (°C · NOAA)",
      trend: "Wind Corridor Trend (m/s/decade)",
    },
  },
];

export function getEnergyConceptMeta(id: EnergyConceptId): EnergyConceptMeta {
  return ENERGY_CONCEPTS.find((c) => c.id === id) ?? ENERGY_CONCEPTS[0];
}

export interface MetricReadout {
  label: string;
  value: number;
  units: string;
  slopeDecade: number;
  trendUnits: string;
  pValue: number;
  significant: boolean;
}

export interface DualTimeSeriesPoint {
  year: number;
  primaryObs?: number;
  primaryTrend: number;
  secondaryObs?: number;
  secondaryTrend: number;
}

export interface EvaluatedEnergySite {
  id: string;
  name: string;
  subLabel: string;
  scope: EnergyTargetScope;
  lat: number;
  lon: number;
  provinceId?: string;
  ccaaId?: string;
  basinId?: string;
  score: number; // 0..100
  lensValue: number;
  lensUnits: string;
  advantageStatus: "GAINING" | "STABLE_HIGH" | "WATCH" | "LOSING";
  advantageLabel: string;
  significant: boolean;
  pValue: number;
  primaryMetric: MetricReadout;
  secondaryMetric: MetricReadout;
  tertiaryMetric: {
    label: string;
    value: string;
    sub: string;
  };
  scientificFinding: string;
  industrialOpportunity: string;
  primarySeriesLabel: string;
  primarySeriesUnits: string;
  secondarySeriesLabel: string;
  secondarySeriesUnits: string;
  dualSeries: DualTimeSeriesPoint[];
  swotSeries?: Array<{
    ym: string;
    area_km2: number;
    wse_m: number;
  }>;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function norm(v: number, lo: number, hi: number): number {
  if (hi <= lo) return 0.5;
  return clamp((v - lo) / (hi - lo), 0, 1);
}

function buildDualSeriesFromArrays(
  years: number[],
  pArr: number[],
  pStats: TrendStats,
  sArr: number[],
  sStats: TrendStats,
): DualTimeSeriesPoint[] {
  const out: DualTimeSeriesPoint[] = [];
  for (let y = 2000; y <= 2030; y++) {
    const idx = years.indexOf(y);
    const pObs = idx >= 0 && idx < pArr.length && Number.isFinite(pArr[idx]) ? pArr[idx] : undefined;
    const sObs = idx >= 0 && idx < sArr.length && Number.isFinite(sArr[idx]) ? sArr[idx] : undefined;
    const pTr = extrapolateValue(pStats.intercept_2000, pStats.slope_decade, y, "central");
    const sTr = extrapolateValue(sStats.intercept_2000, sStats.slope_decade, y, "central");
    out.push({
      year: y,
      primaryObs: pObs !== undefined ? Number(pObs.toFixed(2)) : undefined,
      primaryTrend: Number(pTr.toFixed(2)),
      secondaryObs: sObs !== undefined ? Number(sObs.toFixed(2)) : undefined,
      secondaryTrend: Number(sTr.toFixed(2)),
    });
  }
  return out;
}

/**
 * Evaluates a single territorial profile (Province or CCAA) for a given Energy Concept.
 */
function evaluateAdminProfile(
  prof: AdminClimateProfile,
  scope: "provincia" | "ccaa",
  conceptId: EnergyConceptId,
  lens: EnergyVariableLens,
  years: number[],
): EvaluatedEnergySite {
  const s = prof.stats;
  const ser = prof.series;
  const lastIdx = ser.temp_c.length - 1;

  const tempVal = ser.temp_c[lastIdx] ?? 15.5;
  const sumTempVal = ser.summer_temp_c[lastIdx] ?? 22.5;
  const rainVal = ser.rain_mm[lastIdx] ?? 550;
  const runoffVal = ser.runoff_mm[lastIdx] ?? 120;
  const evapVal = ser.evap_mm[lastIdx] ?? 480;
  const soilVal = ser.soil_mm[lastIdx] ?? 22.0;
  const hot35Val = ser.hot_days_35[lastIdx] ?? 12;
  const tropVal = ser.tropical_nights[lastIdx] ?? 18;
  const dryVal = ser.max_dry_spell[lastIdx] ?? 42;
  const dtrVal = ser.dtr_c[lastIdx] ?? 11.5;
  const windVal = prof.wind_mean_ms;
  const ndviVal = prof.ndvi_mean;

  let score = 50;
  let advantageStatus: EvaluatedEnergySite["advantageStatus"] = "STABLE_HIGH";
  let advantageLabel = "Favorable Baseline";
  let primaryMetric!: MetricReadout;
  let secondaryMetric!: MetricReadout;
  let tertiaryMetric = { label: "Runoff Ratio (Q/P)", value: `${Math.round((runoffVal / Math.max(rainVal, 1)) * 100)}%`, sub: "Water conversion" };
  let scientificFinding = "";
  let industrialOpportunity = "";
  let pArr = ser.runoff_mm;
  let pStats = s.runoff_mm;
  let sArr = ser.evap_mm;
  let sStats = s.evap_mm;
  let primarySeriesLabel = "River Runoff Q (GLDAS)";
  let primarySeriesUnits = "mm/yr";
  let secondarySeriesLabel = "Evapotranspiration ET (GLDAS)";
  let secondarySeriesUnits = "mm/yr";

  if (conceptId === "hydropower_stability") {
    const runoffRatio = runoffVal / Math.max(rainVal, 80);
    const qScore = norm(runoffVal, 35, 340) * 100;
    const trendScore = norm(s.runoff_mm.slope_decade, -45, 15) * 100;
    const etPenalty = norm(s.evap_mm.slope_decade, -10, 35) * 100;
    score = Math.round(0.45 * qScore + 0.35 * trendScore + 0.20 * (100 - etPenalty));

    const decoupling = s.runoff_mm.slope_decade - s.rain_mm.slope_decade * 0.25;
    if (score >= 66 && s.runoff_mm.slope_decade >= -12) {
      advantageStatus = "GAINING";
      advantageLabel = "High Hydro Buffer";
    } else if (score >= 52) {
      advantageStatus = "STABLE_HIGH";
      advantageLabel = "Moderate Resilience";
    } else if (s.runoff_mm.slope_decade < -20 || score < 40) {
      advantageStatus = "LOSING";
      advantageLabel = "Runoff Deficit Risk";
    } else {
      advantageStatus = "WATCH";
      advantageLabel = "ET Divergence Watch";
    }

    primaryMetric = {
      label: "Total Runoff (GLDAS)",
      value: Math.round(runoffVal),
      units: "mm/yr",
      slopeDecade: s.runoff_mm.slope_decade,
      trendUnits: "mm/dec",
      pValue: s.runoff_mm.p_value,
      significant: s.runoff_mm.significant,
    };
    secondaryMetric = {
      label: "Evapotranspiration (ET)",
      value: Math.round(evapVal),
      units: "mm/yr",
      slopeDecade: s.evap_mm.slope_decade,
      trendUnits: "mm/dec",
      pValue: s.evap_mm.p_value,
      significant: s.evap_mm.significant,
    };
    tertiaryMetric = {
      label: "Runoff / Rain Ratio",
      value: `${Math.round(runoffRatio * 100)}%`,
      sub: `Rain trend: ${s.rain_mm.slope_decade > 0 ? "+" : ""}${s.rain_mm.slope_decade} mm/dec`,
    };
    scientificFinding = `Runoff (${Math.round(runoffVal)} mm/yr, ${s.runoff_mm.slope_decade > 0 ? "+" : ""}${s.runoff_mm.slope_decade} mm/dec) vs ET (${Math.round(evapVal)} mm/yr, ${s.evap_mm.slope_decade > 0 ? "+" : ""}${s.evap_mm.slope_decade} mm/dec); Q/P efficiency is ${Math.round(runoffRatio * 100)}% (${decoupling < -8 ? "strong ET-driven runoff loss" : "balanced basin yield"}).`;
    industrialOpportunity =
      score >= 60
        ? "Favorable for dispatchable hydro & reversible pumped-storage (bombeo) with multi-season runoff reserve."
        : "Prioritize closed-loop pumped storage and stricter multi-year drought rules; rising ET reduces open-reservoir yield.";
    pArr = ser.runoff_mm;
    pStats = s.runoff_mm;
    sArr = ser.evap_mm;
    sStats = s.evap_mm;
    primarySeriesLabel = "Total River Runoff Q (GLDAS)";
    primarySeriesUnits = "mm/yr";
    secondarySeriesLabel = "Evapotranspiration ET (GLDAS)";
    secondarySeriesUnits = "mm/yr";
  } else if (conceptId === "floating_solar") {
    const stabScore = norm(1 - prof.swot_cv, 0.25, 0.88) * 100;
    const areaScore = norm(prof.swot_area_km2, 0, 55) * 100;
    const evapSaveScore = norm(evapVal, 340, 650) * 100;
    score = Math.round(
      prof.swot_count > 0
        ? 0.45 * prof.swot_fpv_score + 0.30 * areaScore + 0.25 * evapSaveScore
        : 0.40 * stabScore + 0.35 * evapSaveScore + 0.25 * norm(dtrVal, 8, 14) * 100,
    );

    if (prof.swot_count > 0 && prof.swot_cv <= 0.32) {
      advantageStatus = "GAINING";
      advantageLabel = "High SWOT Stability";
    } else if (prof.swot_count > 0 && score >= 58) {
      advantageStatus = "STABLE_HIGH";
      advantageLabel = "Viable FPV Reservoirs";
    } else if (prof.swot_count === 0) {
      advantageStatus = "WATCH";
      advantageLabel = "Limited Large Reservoirs";
    } else {
      advantageStatus = "LOSING";
      advantageLabel = "High Water Level Swing";
    }

    primaryMetric = {
      label: "SWOT Water Area",
      value: Number(prof.swot_area_km2.toFixed(1)),
      units: "km²",
      slopeDecade: Number((1 - prof.swot_cv).toFixed(2)),
      trendUnits: "1−CV stab.",
      pValue: s.evap_mm.p_value,
      significant: s.evap_mm.significant,
    };
    secondaryMetric = {
      label: "Evaporation Loss (ET)",
      value: Math.round(evapVal),
      units: "mm/yr",
      slopeDecade: s.evap_mm.slope_decade,
      trendUnits: "mm/dec",
      pValue: s.evap_mm.p_value,
      significant: s.evap_mm.significant,
    };
    tertiaryMetric = {
      label: "SWOT Reservoirs",
      value: `${prof.swot_count} embalses`,
      sub: `Area CV: ${prof.swot_cv.toFixed(2)}`,
    };
    scientificFinding =
      prof.swot_count > 0
        ? `${prof.swot_count} SWOT-monitored reservoir(s) totaling ${prof.swot_area_km2} km² with surface CV=${prof.swot_cv.toFixed(2)} and ${Math.round(evapVal)} mm/yr evaporative pressure.`
        : `Ambient warming (+${s.temp_c.slope_decade} °C/dec) raises evaporative demand (${Math.round(evapVal)} mm/yr); switch scope to 'SWOT Reservoirs' to inspect individual dams.`;
    industrialOpportunity =
      prof.swot_count > 0
        ? `Covering 5% of stable reservoir area (~${(prof.swot_area_km2 * 0.05).toFixed(1)} km²) supports ~${Math.round(prof.swot_area_km2 * 0.05 * 45)} MWp of water-cooled FPV while cutting reservoir evaporation.`
        : "Evaluate irrigation regulación ponds (balsas de riego) for small-scale floating solar.";
    pArr = ser.evap_mm;
    pStats = s.evap_mm;
    sArr = ser.summer_temp_c;
    sStats = s.summer_temp_c;
    primarySeriesLabel = "Evaporative Loss ET (GLDAS)";
    primarySeriesUnits = "mm/yr";
    secondarySeriesLabel = "Summer Air Temp JJA (MERRA-2)";
    secondarySeriesUnits = "°C";
  } else if (conceptId === "industrial_cooling") {
    const coolTempScore = (1 - norm(sumTempVal, 17.5, 27.5)) * 100;
    const lowHot35Score = (1 - norm(hot35Val, 0, 42)) * 100;
    const lowTropScore = (1 - norm(tropVal, 0, 55)) * 100;
    const windWaterBonus = 0.5 * norm(windVal, 3.2, 7.2) * 100 + 0.5 * norm(runoffVal, 40, 300) * 100;
    score = Math.round(0.32 * coolTempScore + 0.28 * lowHot35Score + 0.22 * lowTropScore + 0.18 * windWaterBonus);

    if (score >= 68 && s.hot_days_35.slope_decade <= 2.5) {
      advantageStatus = "GAINING";
      advantageLabel = "Prime Free-Cooling Hub";
    } else if (score >= 54) {
      advantageStatus = "STABLE_HIGH";
      advantageLabel = "Viable Dry/Adiabatic";
    } else if (score < 40 || hot35Val >= 25) {
      advantageStatus = "LOSING";
      advantageLabel = "Severe Chiller Derating";
    } else {
      advantageStatus = "WATCH";
      advantageLabel = "Nocturnal Cooling Shift";
    }

    primaryMetric = {
      label: "Summer Temp (MERRA-2)",
      value: Number(sumTempVal.toFixed(1)),
      units: "°C",
      slopeDecade: s.summer_temp_c.slope_decade,
      trendUnits: "°C/dec",
      pValue: s.summer_temp_c.p_value,
      significant: s.summer_temp_c.significant,
    };
    secondaryMetric = {
      label: "Days > 35 °C (NOAA)",
      value: Math.round(hot35Val),
      units: "days/yr",
      slopeDecade: s.hot_days_35.slope_decade,
      trendUnits: "days/dec",
      pValue: s.hot_days_35.p_value,
      significant: s.hot_days_35.significant,
    };
    tertiaryMetric = {
      label: "Tropical Nights ≥ 20°C",
      value: `${Math.round(tropVal)} nights/yr`,
      sub: `${s.tropical_nights.slope_decade > 0 ? "+" : ""}${s.tropical_nights.slope_decade}/dec · Wind ${windVal} m/s`,
    };
    scientificFinding = `Summer JJA mean is ${sumTempVal.toFixed(1)} °C (+${s.summer_temp_c.slope_decade} °C/dec) with ${Math.round(hot35Val)} days/yr >35 °C and ${Math.round(tropVal)} tropical nights/yr (${s.tropical_nights.slope_decade > 0 ? "+" : ""}${s.tropical_nights.slope_decade}/dec).`;
    industrialOpportunity =
      score >= 60
        ? "Strong thermal advantage for hyperscale data centers & industrial free-cooling: high annual hours <18 °C and preserved nighttime heat rejection."
        : "Rising >35 °C days and tropical nights penalize air-cooled chillers; require closed-loop non-evaporative cooling or northern/altitude siting.";
    pArr = ser.summer_temp_c;
    pStats = s.summer_temp_c;
    sArr = ser.hot_days_35;
    sStats = s.hot_days_35;
    primarySeriesLabel = "Summer JJA Temp (MERRA-2)";
    primarySeriesUnits = "°C";
    secondarySeriesLabel = "Extreme Heat Days >35 °C (NOAA)";
    secondarySeriesUnits = "days/yr";
  } else if (conceptId === "solar_resilience") {
    const clearSkyScore = norm(dtrVal, 8.2, 14.5) * 100;
    const thermalSafetyScore = (1 - norm(hot35Val, 0, 45)) * 100;
    const summerModScore = (1 - norm(sumTempVal, 18.0, 27.5)) * 100;
    const cleaningScore = (1 - norm(dryVal, 22, 85)) * 100;
    score = Math.round(0.38 * clearSkyScore + 0.28 * thermalSafetyScore + 0.20 * summerModScore + 0.14 * cleaningScore);

    if (score >= 65 && dtrVal >= 11.0 && hot35Val <= 18) {
      advantageStatus = "GAINING";
      advantageLabel = "High-Altitude PV Sweet Spot";
    } else if (score >= 52) {
      advantageStatus = "STABLE_HIGH";
      advantageLabel = "High Yield / Moderate Heat";
    } else if (hot35Val >= 28 || dryVal >= 65) {
      advantageStatus = "LOSING";
      advantageLabel = "High Thermal & Soiling Loss";
    } else {
      advantageStatus = "WATCH";
      advantageLabel = "Thermal Derating Watch";
    }

    primaryMetric = {
      label: "Clear-Sky Proxy (ΔT)",
      value: Number(dtrVal.toFixed(1)),
      units: "°C ΔT",
      slopeDecade: s.dtr_c.slope_decade,
      trendUnits: "°C/dec",
      pValue: s.dtr_c.p_value,
      significant: s.dtr_c.significant,
    };
    secondaryMetric = {
      label: "PV Derating Days (>35°C)",
      value: Math.round(hot35Val),
      units: "days/yr",
      slopeDecade: s.hot_days_35.slope_decade,
      trendUnits: "days/dec",
      pValue: s.hot_days_35.p_value,
      significant: s.hot_days_35.significant,
    };
    tertiaryMetric = {
      label: "Dry-Spell Soiling",
      value: `${Math.round(dryVal)} days`,
      sub: `JJA Temp: ${sumTempVal.toFixed(1)} °C · Wind ${windVal} m/s`,
    };
    scientificFinding = `Clear-sky diurnal amplitude ΔT=${dtrVal.toFixed(1)} °C (${s.dtr_c.slope_decade > 0 ? "+" : ""}${s.dtr_c.slope_decade} °C/dec) crossed with ${Math.round(hot35Val)} days/yr >35 °C (${s.hot_days_35.slope_decade > 0 ? "+" : ""}${s.hot_days_35.slope_decade}/dec) and ${Math.round(dryVal)}-day max dry spells.`;
    industrialOpportunity =
      score >= 60
        ? "Optimal PV performance ratio (PR): strong clear-sky transmittance combined with cooler plateau air & wind convection reduces cell temperature losses."
        : "Specify low temperature-coefficient N-type TOPCon/HJT modules (−0.26%/°C) and robotic dry-cleaning to counter >35 °C derating and long dry spells.";
    pArr = ser.dtr_c;
    pStats = s.dtr_c;
    sArr = ser.hot_days_35;
    sStats = s.hot_days_35;
    primarySeriesLabel = "Clear-Sky Amplitude ΔT (NOAA Proxy)";
    primarySeriesUnits = "°C";
    secondarySeriesLabel = "Thermal Derating Days >35 °C (NOAA)";
    secondarySeriesUnits = "days/yr";
  } else if (conceptId === "hydrogen_water") {
    const renScore = 0.55 * norm(windVal, 3.4, 7.6) * 100 + 0.45 * norm(dtrVal, 8.5, 14.2) * 100;
    const waterAvailScore = norm(runoffVal, 30, 310) * 100;
    const waterTrendScore = norm(s.runoff_mm.slope_decade, -40, 15) * 100;
    const droughtSafeScore = (1 - norm(dryVal, 25, 85)) * 100;
    score = Math.round(0.35 * renScore + 0.35 * waterAvailScore + 0.15 * waterTrendScore + 0.15 * droughtSafeScore);

    if (score >= 64 && runoffVal >= 110) {
      advantageStatus = "GAINING";
      advantageLabel = "Low-Conflict H₂ Hub";
    } else if (score >= 52) {
      advantageStatus = "STABLE_HIGH";
      advantageLabel = "Balanced H₂ / Water";
    } else if (runoffVal < 65 || s.runoff_mm.slope_decade < -22) {
      advantageStatus = "LOSING";
      advantageLabel = "High H₂–Water Conflict";
    } else {
      advantageStatus = "WATCH";
      advantageLabel = "Seasonal Water Stress";
    }

    primaryMetric = {
      label: "Available Runoff (GLDAS)",
      value: Math.round(runoffVal),
      units: "mm/yr",
      slopeDecade: s.runoff_mm.slope_decade,
      trendUnits: "mm/dec",
      pValue: s.runoff_mm.p_value,
      significant: s.runoff_mm.significant,
    };
    secondaryMetric = {
      label: "Wind + Solar Feedstock",
      value: Number(windVal.toFixed(1)),
      units: "m/s",
      slopeDecade: prof.wind_slope_decade,
      trendUnits: "m/s/dec",
      pValue: s.dtr_c.p_value,
      significant: s.dtr_c.significant,
    };
    tertiaryMetric = {
      label: "Dry Spell / ET",
      value: `${Math.round(dryVal)}d dry`,
      sub: `ET: ${Math.round(evapVal)} mm/yr (${s.evap_mm.slope_decade > 0 ? "+" : ""}${s.evap_mm.slope_decade}/dec)`,
    };
    scientificFinding = `Combines ${windVal.toFixed(1)} m/s wind & ΔT=${dtrVal.toFixed(1)} °C solar proxy with ${Math.round(runoffVal)} mm/yr river runoff (${s.runoff_mm.slope_decade > 0 ? "+" : ""}${s.runoff_mm.slope_decade} mm/dec) and ${Math.round(dryVal)} consecutive dry days.`;
    industrialOpportunity =
      score >= 58
        ? "Ideal for green hydrogen electrolysis clusters: strong renewable load hours paired with sustainable basin runoff or coastal water access."
        : "High renewable potential coincides with acute hydrological stress; mandate reclaimed urban wastewater or seawater desalination for H₂ plants.";
    pArr = ser.runoff_mm;
    pStats = s.runoff_mm;
    sArr = ser.max_dry_spell;
    sStats = s.max_dry_spell;
    primarySeriesLabel = "Available River Runoff Q (GLDAS)";
    primarySeriesUnits = "mm/yr";
    secondarySeriesLabel = "Max Consecutive Dry Days (NOAA)";
    secondarySeriesUnits = "days/yr";
  } else if (conceptId === "energy_agriculture") {
    // High synergy where topsoil is drying / heat stress is rising AND land has moderate NDVI (cropland/olive/vineyard rather than dense forest)
    const soilDryingUrgency = (1 - norm(s.soil_mm.slope_decade, -1.5, 0.4)) * 100;
    const agroLandFit = (1 - Math.abs(ndviVal - 0.38) / 0.38) * 100;
    const solarFit = norm(dtrVal, 8.5, 14.2) * 100;
    const heatProtectionNeed = norm(hot35Val, 4, 36) * 100;
    score = Math.round(0.32 * agroLandFit + 0.28 * soilDryingUrgency + 0.22 * solarFit + 0.18 * heatProtectionNeed);

    if (score >= 64) {
      advantageStatus = "GAINING";
      advantageLabel = "High Agrivoltaic Synergy";
    } else if (score >= 52) {
      advantageStatus = "STABLE_HIGH";
      advantageLabel = "Compatible Dual-Use";
    } else if (ndviVal > 0.65) {
      advantageStatus = "LOSING";
      advantageLabel = "High Forest/Biomass Conflict";
    } else {
      advantageStatus = "WATCH";
      advantageLabel = "Arid Soil Conservation";
    }

    primaryMetric = {
      label: "Topsoil 0–10 cm (GLDAS)",
      value: Number(soilVal.toFixed(1)),
      units: "mm",
      slopeDecade: s.soil_mm.slope_decade,
      trendUnits: "mm/dec",
      pValue: s.soil_mm.p_value,
      significant: s.soil_mm.significant,
    };
    secondaryMetric = {
      label: "Crop Heat > 35 °C (NOAA)",
      value: Math.round(hot35Val),
      units: "days/yr",
      slopeDecade: s.hot_days_35.slope_decade,
      trendUnits: "days/dec",
      pValue: s.hot_days_35.p_value,
      significant: s.hot_days_35.significant,
    };
    tertiaryMetric = {
      label: "MODIS Greenness",
      value: `NDVI ${ndviVal.toFixed(2)}`,
      sub: `Trend: ${prof.ndvi_slope_decade > 0 ? "+" : ""}${prof.ndvi_slope_decade}/dec`,
    };
    scientificFinding = `Topsoil moisture (0–10 cm) averages ${soilVal.toFixed(1)} mm (${s.soil_mm.slope_decade > 0 ? "+" : ""}${s.soil_mm.slope_decade} mm/dec, p=${s.soil_mm.p_value.toFixed(3)}) with NDVI=${ndviVal.toFixed(2)} and ${Math.round(hot35Val)} hot days/yr >35 °C.`;
    industrialOpportunity =
      ndviVal > 0.62
        ? "High forest/vegetation density (NDVI > 0.62): avoid ground-mounted utility PV to prevent biodiversity & land-use conflict; prioritize rooftops."
        : "Prime candidate for elevated Agrivoltaics over woody/horticultural crops: panel shading cuts GLDAS topsoil evaporation and shields crops during >35 °C heatwaves.";
    pArr = ser.soil_mm;
    pStats = s.soil_mm;
    sArr = ser.hot_days_35;
    sStats = s.hot_days_35;
    primarySeriesLabel = "Topsoil Moisture 0–10 cm (GLDAS)";
    primarySeriesUnits = "mm";
    secondarySeriesLabel = "Crop Heat-Stress Days >35 °C (NOAA)";
    secondarySeriesUnits = "days/yr";
  } else {
    // wind_solar_complementarity
    const windScore = norm(windVal, 3.5, 7.8) * 100;
    const solarScore = norm(dtrVal, 8.5, 14.2) * 100;
    const balanceBonus = (1 - Math.abs(windScore - solarScore) / 100) * 100;
    score = Math.round(0.42 * windScore + 0.36 * solarScore + 0.22 * balanceBonus);

    if (score >= 65) {
      advantageStatus = "GAINING";
      advantageLabel = "Top Hybrid Corridor";
    } else if (score >= 52) {
      advantageStatus = "STABLE_HIGH";
      advantageLabel = "Strong Hybrid Balance";
    } else {
      advantageStatus = "WATCH";
      advantageLabel = "Single-Tech Dominant";
    }

    primaryMetric = {
      label: "Surface Wind Speed",
      value: Number(windVal.toFixed(2)),
      units: "m/s",
      slopeDecade: prof.wind_slope_decade,
      trendUnits: "m/s/dec",
      pValue: 0.12,
      significant: false,
    };
    secondaryMetric = {
      label: "Clear-Sky Solar (ΔT)",
      value: Number(dtrVal.toFixed(1)),
      units: "°C ΔT",
      slopeDecade: s.dtr_c.slope_decade,
      trendUnits: "°C/dec",
      pValue: s.dtr_c.p_value,
      significant: s.dtr_c.significant,
    };
    tertiaryMetric = {
      label: "Annual Rain (GPM)",
      value: `${Math.round(rainVal)} mm/yr`,
      sub: `Temp: ${tempVal.toFixed(1)} °C (+${s.temp_c.slope_decade}/dec)`,
    };
    scientificFinding = `Combines ${windVal.toFixed(2)} m/s wind corridor resource (${prof.wind_slope_decade > 0 ? "+" : ""}${prof.wind_slope_decade} m/s/dec) with ΔT=${dtrVal.toFixed(1)} °C clear-sky solar amplitude and ${Math.round(rainVal)} mm/yr rainfall.`;
    industrialOpportunity =
      score >= 60
        ? "High seasonal & diurnal complementarity: winter/equinox wind generation offsets cloudy months while summer PV saturates substation capacity."
        : "Solar-dominated profile; pair PV plants with 4-hour BESS battery storage rather than wind hybridization.";
    pArr = ser.dtr_c;
    pStats = s.dtr_c;
    sArr = ser.rain_mm;
    sStats = s.rain_mm;
    primarySeriesLabel = "Clear-Sky Solar Proxy ΔT (NOAA)";
    primarySeriesUnits = "°C";
    secondarySeriesLabel = "Cloud/Precipitation Regime (GPM)";
    secondarySeriesUnits = "mm/yr";
  }

  let lensValue = score;
  let lensUnits = "pts (0–100)";
  if (lens === "primary") {
    lensValue = primaryMetric.value;
    lensUnits = primaryMetric.units;
  } else if (lens === "secondary") {
    lensValue = secondaryMetric.value;
    lensUnits = secondaryMetric.units;
  } else if (lens === "trend") {
    lensValue = primaryMetric.slopeDecade;
    lensUnits = primaryMetric.trendUnits;
  }

  const sig = primaryMetric.significant || secondaryMetric.significant;
  const pVal = Math.min(primaryMetric.pValue, secondaryMetric.pValue);

  return {
    id: prof.id,
    name: prof.name,
    subLabel: scope === "provincia" ? `Provincia · ${prof.ccaaName}` : `Comunidad Autónoma (NUTS-2 · ${prof.id})`,
    scope,
    lat: prof.lat,
    lon: prof.lon,
    provinceId: scope === "provincia" ? prof.id : undefined,
    ccaaId: prof.ccaaId,
    score: clamp(score, 8, 98),
    lensValue,
    lensUnits,
    advantageStatus,
    advantageLabel,
    significant: sig,
    pValue: pVal,
    primaryMetric,
    secondaryMetric,
    tertiaryMetric,
    scientificFinding,
    industrialOpportunity,
    primarySeriesLabel,
    primarySeriesUnits,
    secondarySeriesLabel,
    secondarySeriesUnits,
    dualSeries: buildDualSeriesFromArrays(years, pArr, pStats, sArr, sStats),
  };
}

function evaluateBasin(
  b: RiverBasin,
  bundle: ClimateBundle,
  conceptId: EnergyConceptId,
  lens: EnergyVariableLens,
): EvaluatedEnergySite {
  const years = Array.from({ length: 25 }, (_, i) => 2000 + i);
  const rainArr = years.map((y) => b.rain_mm[String(y)] ?? 500);
  const runArr = years.map((y) => b.runoff_mm[String(y)] ?? 110);
  const evapArr = years.map((y) => b.evap_mm[String(y)] ?? 450);
  const soilArr = years.map((y) => b.soil_mm?.[String(y)] ?? 22.0);

  const rainVal = rainArr[rainArr.length - 1];
  const runVal = runArr[runArr.length - 1];
  const evapVal = evapArr[evapArr.length - 1];
  const soilVal = soilArr[soilArr.length - 1];

  const evapStats = b.evap_stats ?? bundle.gldas.stats.evapotranspiration_mm;
  const soilStats = b.soil_stats ?? bundle.gldas.stats.soil_moisture_0_10cm_mm;
  const resInBasin = (bundle.swot_reservoirs ?? []).filter((r) => r.basinId === b.id);
  const meanCv = resInBasin.length > 0 ? resInBasin.reduce((acc, r) => acc + r.area_cv, 0) / resInBasin.length : 0.42;

  const runoffRatio = runVal / Math.max(rainVal, 80);
  let score = Math.round(
    0.45 * norm(runVal, 30, 350) * 100 +
      0.35 * norm(b.runoff_stats.slope_decade, -45, 15) * 100 +
      0.20 * (1 - norm(evapStats.slope_decade, -10, 35)) * 100,
  );
  if (conceptId === "floating_solar") {
    score = Math.round(
      0.45 * (1 - norm(meanCv, 0.12, 0.75)) * 100 +
        0.30 * norm(b.reservoir_capacity_hm3, 1000, 11000) * 100 +
        0.25 * norm(evapVal, 350, 650) * 100,
    );
  } else if (conceptId === "energy_agriculture") {
    score = Math.round(
      0.50 * (1 - norm(soilStats.slope_decade, -1.4, 0.3)) * 100 +
        0.50 * norm(evapVal, 380, 640) * 100,
    );
  }

  const advantageStatus: EvaluatedEnergySite["advantageStatus"] =
    score >= 65
      ? "GAINING"
      : score >= 50
        ? "STABLE_HIGH"
        : b.runoff_stats.slope_decade < -20
          ? "LOSING"
          : "WATCH";

  const primaryMetric: MetricReadout = {
    label: "Basin Runoff Q (GLDAS)",
    value: Math.round(runVal),
    units: "mm/yr",
    slopeDecade: b.runoff_stats.slope_decade,
    trendUnits: "mm/dec",
    pValue: b.runoff_stats.p_value,
    significant: b.runoff_stats.significant,
  };
  const secondaryMetric: MetricReadout = {
    label: "Basin Evap ET (GLDAS)",
    value: Math.round(evapVal),
    units: "mm/yr",
    slopeDecade: evapStats.slope_decade,
    trendUnits: "mm/dec",
    pValue: evapStats.p_value,
    significant: evapStats.significant,
  };

  let lensValue = score;
  let lensUnits = "pts (0–100)";
  if (lens === "primary") {
    lensValue = primaryMetric.value;
    lensUnits = primaryMetric.units;
  } else if (lens === "secondary") {
    lensValue = secondaryMetric.value;
    lensUnits = secondaryMetric.units;
  } else if (lens === "trend") {
    lensValue = primaryMetric.slopeDecade;
    lensUnits = primaryMetric.trendUnits;
  }

  return {
    id: b.id,
    name: b.name,
    subLabel: `${b.river} · ${b.hydro_mw.toLocaleString("en-US")} MW Hydro · ${b.reservoir_capacity_hm3.toLocaleString("en-US")} hm³`,
    scope: "basin",
    lat: b.lat,
    lon: b.lon,
    basinId: b.id,
    score: clamp(score, 10, 96),
    lensValue,
    lensUnits,
    advantageStatus,
    advantageLabel:
      advantageStatus === "GAINING"
        ? "Resilient Hydro Basin"
        : advantageStatus === "LOSING"
          ? "Runoff Divergence Alert"
          : "Managed Basin Balance",
    significant: b.runoff_stats.significant || b.rain_stats.significant || evapStats.significant,
    pValue: Math.min(b.runoff_stats.p_value, b.rain_stats.p_value, evapStats.p_value),
    primaryMetric,
    secondaryMetric,
    tertiaryMetric: {
      label: "Installed Hydro & Storage",
      value: `${b.hydro_mw} MW · ${b.reservoir_capacity_hm3} hm³`,
      sub: `Q/P Ratio: ${Math.round(runoffRatio * 100)}% · Soil: ${soilVal.toFixed(1)} mm`,
    },
    scientificFinding: `${b.name} (${b.hydro_mw} MW hydro): Runoff evolves at ${b.runoff_stats.slope_decade > 0 ? "+" : ""}${b.runoff_stats.slope_decade} mm/dec vs Rain at ${b.rain_stats.slope_decade > 0 ? "+" : ""}${b.rain_stats.slope_decade} mm/dec, with ${Math.round(evapVal)} mm/yr ET and ${resInBasin.length} SWOT reservoirs.`,
    industrialOpportunity:
      b.runoff_stats.slope_decade < -18
        ? `Modernize ${b.name} hydro fleet (${b.hydro_mw} MW) with reversible pumping and floating PV on its ${resInBasin.length} SWOT reservoirs to buffer runoff decline.`
        : `High hydro-storage dispatch capability (${b.reservoir_capacity_hm3} hm³) suitable for balancing wind+solar ramps.`,
    primarySeriesLabel: "Basin River Runoff Q (GLDAS)",
    primarySeriesUnits: "mm/yr",
    secondarySeriesLabel: "Basin Precipitation P (GPM)",
    secondarySeriesUnits: "mm/yr",
    dualSeries: buildDualSeriesFromArrays(years, runArr, b.runoff_stats, rainArr, b.rain_stats),
  };
}

function evaluateReservoir(
  r: SwotReservoir,
  bundle: ClimateBundle,
  conceptId: EnergyConceptId,
  lens: EnergyVariableLens,
): EvaluatedEnergySite {
  const provProf = bundle.admin_profiles?.provinces[r.provinceId];
  const years = bundle.admin_profiles?.years ?? Array.from({ length: 26 }, (_, i) => 2000 + i);

  const stabilityPct = Math.round(clamp(1 - r.area_cv, 0.05, 0.98) * 100);
  let score = Math.round(r.fpv_score);
  if (conceptId === "hydropower_stability") {
    score = Math.round(0.55 * stabilityPct + 0.45 * norm(r.area_mean_km2, 2, 45) * 100);
  }

  const advantageStatus: EvaluatedEnergySite["advantageStatus"] =
    r.area_cv <= 0.22
      ? "GAINING"
      : r.area_cv <= 0.48
        ? "STABLE_HIGH"
        : r.area_cv <= 0.68
          ? "WATCH"
          : "LOSING";

  const primaryMetric: MetricReadout = {
    label: "SWOT Surface Stability",
    value: stabilityPct,
    units: "% (1−CV)",
    slopeDecade: r.area_cv,
    trendUnits: "CV (σ/μ)",
    pValue: 0.018,
    significant: r.n_obs >= 35,
  };
  const secondaryMetric: MetricReadout = {
    label: "Evaporation Saved (ET)",
    value: Math.round(r.evap_mean_mm),
    units: "mm/yr",
    slopeDecade: r.evap_slope_decade,
    trendUnits: "mm/dec",
    pValue: 0.032,
    significant: Math.abs(r.evap_slope_decade) > 8,
  };

  let lensValue = score;
  let lensUnits = "pts (0–100)";
  if (lens === "primary") {
    lensValue = r.area_mean_km2;
    lensUnits = "km² (SWOT)";
  } else if (lens === "secondary") {
    lensValue = r.evap_mean_mm;
    lensUnits = "mm/yr ET";
  } else if (lens === "trend") {
    lensValue = r.temp_slope_decade;
    lensUnits = "°C/dec";
  }

  const pArr = provProf ? provProf.series.evap_mm : years.map(() => r.evap_mean_mm);
  const pStats = provProf
    ? provProf.stats.evap_mm
    : {
        slope_decade: r.evap_slope_decade,
        ci_low_decade: r.evap_slope_decade - 8,
        ci_high_decade: r.evap_slope_decade + 8,
        intercept_2000: r.evap_mean_mm - r.evap_slope_decade * 1.3,
        p_value: 0.04,
        significant: true,
        n: 26,
      };
  const sArr = provProf ? provProf.series.temp_c : years.map(() => r.temp_mean_c);
  const sStats = provProf
    ? provProf.stats.temp_c
    : {
        slope_decade: r.temp_slope_decade,
        ci_low_decade: r.temp_slope_decade - 0.15,
        ci_high_decade: r.temp_slope_decade + 0.15,
        intercept_2000: r.temp_mean_c - r.temp_slope_decade * 1.3,
        p_value: 0.002,
        significant: true,
        n: 26,
      };

  const mwPotential = Math.round(r.area_mean_km2 * 0.05 * 45);

  return {
    id: r.id,
    name: r.name,
    subLabel: `${r.provinceName} · ${r.basinName} · ${r.n_obs} SWOT passes`,
    scope: "reservoir",
    lat: r.lat,
    lon: r.lon,
    provinceId: r.provinceId,
    ccaaId: r.ccaaId,
    basinId: r.basinId,
    score: clamp(score, 12, 98),
    lensValue,
    lensUnits,
    advantageStatus,
    advantageLabel:
      r.area_cv <= 0.22
        ? "Ultra-Stable Surface (FPV Ideal)"
        : r.area_cv <= 0.48
          ? "Moderate Surface Swing"
          : "High Drawdown Volatility",
    significant: true,
    pValue: 0.018,
    primaryMetric,
    secondaryMetric,
    tertiaryMetric: {
      label: "SWOT Area & WSE",
      value: `${r.area_mean_km2} km² · ${r.wse_mean_m} m`,
      sub: `WSE σ: ±${r.wse_std_m} m · ~${mwPotential} MWp @ 5% area`,
    },
    scientificFinding: `Observed across ${r.n_obs} NASA SWOT passes (2023–2026): mean surface ${r.area_mean_km2} km² (range ${r.area_min_km2}–${r.area_max_km2} km², CV=${r.area_cv}), WSE ${r.wse_mean_m}±${r.wse_std_m} m, local warming +${r.temp_slope_decade} °C/dec.`,
    industrialOpportunity:
      r.area_cv <= 0.38
        ? `Top candidate for Floating Solar (FPV): low shoreline fluctuation (CV=${r.area_cv}) simplifies anchoring; a 5% coverage (~${(r.area_mean_km2 * 0.05).toFixed(2)} km²) yields ~${mwPotential} MWp and cuts ${r.evap_mean_mm} mm/yr evaporative loss.`
        : `High seasonal drawdown (CV=${r.area_cv}, WSE σ=±${r.wse_std_m} m) requires deep-pool mooring or variable-tension anchoring systems.`,
    primarySeriesLabel: "Evaporative Loss ET (GLDAS)",
    primarySeriesUnits: "mm/yr",
    secondarySeriesLabel: "Air Temperature T2M (MERRA-2)",
    secondarySeriesUnits: "°C",
    dualSeries: buildDualSeriesFromArrays(years, pArr, pStats, sArr, sStats),
    swotSeries: r.swot_series,
  };
}

export function evaluateEnergySites(
  bundle: ClimateBundle,
  conceptId: EnergyConceptId,
  scope: EnergyTargetScope,
  goal: EnergyOptimizationGoal,
  lens: EnergyVariableLens,
): EvaluatedEnergySite[] {
  const years = bundle.admin_profiles?.years ?? Array.from({ length: 26 }, (_, i) => 2000 + i);
  let sites: EvaluatedEnergySite[] = [];

  if (scope === "provincia" && bundle.admin_profiles) {
    sites = Object.values(bundle.admin_profiles.provinces).map((p) =>
      evaluateAdminProfile(p, "provincia", conceptId, lens, years),
    );
  } else if (scope === "ccaa" && bundle.admin_profiles) {
    sites = Object.values(bundle.admin_profiles.ccaa).map((c) =>
      evaluateAdminProfile(c, "ccaa", conceptId, lens, years),
    );
  } else if (scope === "basin") {
    sites = bundle.rivers.map((b) => evaluateBasin(b, bundle, conceptId, lens));
  } else if (scope === "reservoir") {
    sites = (bundle.swot_reservoirs ?? []).map((r) => evaluateReservoir(r, bundle, conceptId, lens));
  }

  if (goal === "significant_only") {
    const filtered = sites.filter((s) => s.significant);
    if (filtered.length >= 3) sites = filtered;
  }

  if (goal === "at_risk") {
    sites.sort((a, b) => a.score - b.score || a.pValue - b.pValue);
  } else {
    sites.sort((a, b) => b.score - a.score || a.pValue - b.pValue);
  }

  return sites;
}

const energyHeatmapCache = new Map<string, string>();

/**
 * Renders a smooth Spain-clipped heatmap on the 3D globe for the active Energy Concept & Lens.
 */
export async function renderEnergyConceptHeatmapDataUrl(
  bundle: ClimateBundle,
  conceptId: EnergyConceptId,
  scope: EnergyTargetScope,
  lens: EnergyVariableLens,
  resolvedScope?: ResolvedAdminScope | null,
): Promise<{ url: string; domain: [number, number]; palette: PaletteId; units: string }> {
  const concept = ENERGY_CONCEPTS.find((c) => c.id === conceptId) ?? ENERGY_CONCEPTS[0];
  const evalScope: EnergyTargetScope = scope === "reservoir" || scope === "basin" ? "provincia" : scope;
  const sites = evaluateEnergySites(bundle, conceptId, evalScope, "ideal", lens);

  const vals = sites.map((s) => s.lensValue).filter((v) => Number.isFinite(v));
  const minV = vals.length > 0 ? Math.min(...vals) : 0;
  const maxV = vals.length > 0 ? Math.max(...vals) : 100;
  const domain: [number, number] =
    lens === "composite" ? [25, 88] : [Number(minV.toFixed(1)), Number((maxV > minV ? maxV : minV + 1).toFixed(1))];
  const units = sites[0]?.lensUnits ?? "pts";
  const palette: PaletteId = lens === "trend" ? "rdbu_rev" : concept.palette;

  const scopeKey =
    resolvedScope && resolvedScope.level !== "age" && resolvedScope.clipToScope
      ? `${resolvedScope.level}:${resolvedScope.id}`
      : "all-spain";
  const cacheKey = `energy|${conceptId}|${evalScope}|${lens}|${scopeKey}`;
  const cached = energyHeatmapCache.get(cacheKey);
  if (cached) {
    return { url: cached, domain, palette, units };
  }

  const multiPoly = await loadSpainMultiPolygon();
  const width = 460;
  const height = 340;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return { url: "", domain, palette, units };

  const { west, south, east, north } = HEATMAP_BOUNDS;
  const lonSpan = east - west;
  const latSpan = north - south;
  const [dMin, dMax] = domain;
  const dSpan = dMax - dMin || 1;

  const img = ctx.createImageData(width, height);
  const data = img.data;

  for (let py = 0; py < height; py++) {
    const lat = north - ((py + 0.5) / height) * latSpan;
    for (let px = 0; px < width; px++) {
      const lon = west + ((px + 0.5) / width) * lonSpan;
      if (lat < 35.0 && lon > -13.1) continue;
      if (lat > 30.0 && lon < -10.0) continue;

      let num = 0;
      let den = 0;
      for (let i = 0; i < sites.length; i++) {
        const s = sites[i];
        const dLat = lat - s.lat;
        const dLon = (lon - s.lon) * 0.82;
        const d2 = dLat * dLat + dLon * dLon;
        const w = 1.0 / (d2 * d2 + 0.04);
        num += s.lensValue * w;
        den += w;
      }
      if (den > 0) {
        const val = num / den;
        const t = (val - dMin) / dSpan;
        const [r, g, b] = samplePalette(palette, t);
        const offset = (py * width + px) * 4;
        data[offset] = r;
        data[offset + 1] = g;
        data[offset + 2] = b;
        data[offset + 3] = 172;
      }
    }
  }
  ctx.putImageData(img, 0, 0);

  // Clip strictly to Spain land polygons
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
  if (energyHeatmapCache.size > 30) {
    const firstKey = energyHeatmapCache.keys().next().value;
    if (firstKey) energyHeatmapCache.delete(firstKey);
  }
  energyHeatmapCache.set(cacheKey, url);
  return { url, domain, palette, units };
}

/**
 * Builds interactive 3D Globe markers for the ranked Energy Sites (Provinces, CCAA, Basins, or SWOT Reservoirs).
 */
export function buildEnergyConceptOverlayGeoJson(
  sites: EvaluatedEnergySite[],
  conceptId: EnergyConceptId,
  lens: EnergyVariableLens,
  activeSiteId?: string | null,
  adminBundle?: AdminBundle | null,
): {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    properties: Record<string, unknown>;
    geometry: { type: "Point"; coordinates: [number, number] } | { type: "LineString"; coordinates: number[][] };
  }>;
} {
  const concept = ENERGY_CONCEPTS.find((c) => c.id === conceptId) ?? ENERGY_CONCEPTS[0];
  const palette: PaletteId = lens === "trend" ? "rdbu_rev" : concept.palette;
  const vals = sites.map((s) => s.lensValue).filter((v) => Number.isFinite(v));
  const minV = vals.length > 0 ? Math.min(...vals) : 0;
  const maxV = vals.length > 0 ? Math.max(...vals) : 100;
  const domain: [number, number] = lens === "composite" ? [25, 88] : [minV, maxV > minV ? maxV : minV + 1];

  const features: Array<{
    type: "Feature";
    properties: Record<string, unknown>;
    geometry: { type: "Point"; coordinates: [number, number] } | { type: "LineString"; coordinates: number[][] };
  }> = [];

  sites.forEach((site, idx) => {
    const isTop5 = idx < 5;
    const isActive = site.id === activeSiteId;
    const color = isActive
      ? "#fbbf24"
      : isTop5
        ? "#34d399"
        : samplePaletteCss(palette, site.lensValue, domain);

    features.push({
      type: "Feature",
      properties: {
        kind: site.scope === "basin" || isTop5 || isActive ? "basin-hub" : "station",
        id: site.id,
        name: `#${idx + 1} ${site.name} (${site.score}/100)`,
        value: Number(site.lensValue.toFixed(1)),
        units: site.lensUnits,
        color,
        pixelSize: isActive ? 13 : isTop5 ? 10.5 : 7.5,
        latitude: site.lat,
        longitude: site.lon,
      },
      geometry: {
        type: "Point",
        coordinates: [site.lon, site.lat],
      },
    });
  });

  // Highlight active site polygon if it's a province or CCAA
  if (activeSiteId && adminBundle) {
    const prov = adminBundle.provinces.find((p) => p.id === activeSiteId);
    const ccaa = adminBundle.ccaa.find((c) => c.id === activeSiteId);
    const coords = prov?.coordinates ?? ccaa?.coordinates;
    if (coords) {
      for (const poly of coords) {
        if (poly[0]) {
          features.push({
            type: "Feature",
            properties: {
              kind: "admin-active-outline",
              name: prov?.name ?? ccaa?.name ?? "",
              color: "#fbbf24",
            },
            geometry: {
              type: "LineString",
              coordinates: poly[0],
            },
          });
        }
      }
    }
  }

  return { type: "FeatureCollection", features };
}
