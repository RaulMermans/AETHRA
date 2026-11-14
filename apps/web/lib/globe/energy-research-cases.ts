/**
 * Energy research cases (D54). Wrappers around existing Python EvidenceCards.
 * All five Gate B regions: insufficient evidence of a joint-low-day trend.
 * No slopes or significance are computed here. Not site suitability.
 */

export interface QuotedTrend {
  slopePerDecade: number;
  ciLow: number;
  ciHigh: number;
  units: string;
  p: number;
  pAdjustedBh: number;
  nYears: number;
  medianPerYear: number;
  outcomeLabel: "Insufficient evidence";
  cardId: string;
  bundle: string;
}

export interface QuotedComplementarity {
  observed: number;
  expectedMean: number;
  expectedRange95: [number, number];
  ratio: number;
  nullModel: string;
  source: string;
}

export type CaseTechFrame = "hybrid" | "wind_focus" | "solar_focus";

export interface EnergyResearchCase {
  id: string;
  title: string;
  regionName: string;
  nuts2: string;
  /** Admin picker: "age" or a NUTS-2 id. */
  adminCcaaId: string | null;
  comparisonName: string;
  comparisonCardId: string;
  comparisonCaseId: string;
  researchQuestion: string;
  whySelected: string;
  where: string;
  nasaWhat: string;
  when: string;
  techFrame: CaseTechFrame;
  techFrameNote: string;
  historicalEvidence: string;
  currentContext: string;
  futureHorizon: string;
  significanceNote: string;
  limitations: readonly string[];
  doNotConclude: string;
  primary: QuotedTrend;
  complementarityPrimary: QuotedComplementarity;
  solarContext: string;
  windContext: string;
  /** Only CyL has a plant register in this app. */
  hasPlantRegister: boolean;
  installationsNote: string;
}

const SHARED_WHAT =
  "Days per year when both daily ALLSKY_SFC_SW_DWN (CERES SYN1deg, kWh m⁻² day⁻¹) and daily WS50M (MERRA-2, m s⁻¹) fall below their own monthly 20th percentile (reference 2001–2020).";
const SHARED_WHEN = "2001–2025, calendar years, daily data in local solar time. 25 complete years. 2026 POWER excluded.";
const BUNDLE = "data/results/energy_gap/analysis_bundle.json";
const COMP_SRC = "data/results/energy_gap/independence_check.json";
const OUT: QuotedTrend["outcomeLabel"] = "Insufficient evidence";

export const ENERGY_RESEARCH_CASES: readonly EnergyResearchCase[] = [
  {
    id: "case-r0-joint-low",
    title: "Peninsula + Balearics",
    regionName: "Peninsula + Balearics",
    nuts2: "R0",
    adminCcaaId: null,
    comparisonName: "Castilla y León",
    comparisonCardId: "energy-gap-ES41",
    comparisonCaseId: "case-es41-joint-low",
    researchQuestion: "Have jointly low solar-and-wind days become more or less frequent since 2001?",
    whySelected: "Pre-registered national aggregate (ENERGY_RESEARCH.md §0), before regional data were downloaded.",
    where: "Peninsula + Balearics — NASA POWER regional mean (solar 1°, wind 0.5° × 0.625°).",
    nasaWhat: SHARED_WHAT,
    when: SHARED_WHEN,
    techFrame: "hybrid",
    techFrameNote: "Research framing for solar PV, onshore wind, or hybrid resource questions. Resource ≠ generation.",
    historicalEvidence:
      "Slope 0.0 days/decade (CI −1.85 to +2.16). Insufficient evidence of a trend. Joint lows about half as often as independence would suggest (descriptive, not a trend).",
    currentContext: "No national plant inventory in this app. Do not read this map as Spain’s full fleet.",
    futureHorizon:
      "2032–2040 is a planning discussion window only. This series does not predict 2040 weather, generation, or where to build.",
    significanceNote:
      "Not statistically significant. The honest Gate B result is insufficient evidence in 5/5 pre-registered regions (BH q = 0.10 family).",
    limitations: [
      "Coarse grids; 25 years, limited power.",
      "Complementarity is descriptive.",
      "Cards remain EXPLORATORY until second-person review.",
    ],
    doNotConclude: "Not generation, not grid reliability, not site suitability, not a forecast.",
    primary: {
      slopePerDecade: 0.0,
      ciLow: -1.85,
      ciHigh: 2.16,
      units: "days per decade",
      p: 0.759,
      pAdjustedBh: 0.794,
      nYears: 25,
      medianPerYear: 8.0,
      outcomeLabel: OUT,
      cardId: "energy-gap-R0",
      bundle: BUNDLE,
    },
    complementarityPrimary: {
      observed: 183,
      expectedMean: 369.6,
      expectedRange95: [343.3, 404.6],
      ratio: 0.5,
      nullModel: "year-shift surrogates",
      source: COMP_SRC,
    },
    solarContext: "+0.032 (CI −0.018 to +0.097; p = 0.13) kWh m⁻² day⁻¹ per decade",
    windContext: "−0.043 (CI −0.127 to +0.033; p = 0.34) m s⁻¹ per decade",
    hasPlantRegister: false,
    installationsNote: "Plant points are not shown: this case is national, and the register is CyL-only.",
  },
  {
    id: "case-es11-joint-low",
    title: "Galicia",
    regionName: "Galicia",
    nuts2: "ES11",
    adminCcaaId: "ES11",
    comparisonName: "Peninsula + Balearics",
    comparisonCardId: "energy-gap-R0",
    comparisonCaseId: "case-r0-joint-low",
    researchQuestion: "Have jointly low solar-and-wind days become more or less frequent in Galicia since 2001?",
    whySelected: "Pre-registered Atlantic cloudy/windy NW contrast, before seeing results. Not chosen for installed capacity.",
    where: "Galicia (NUTS-2 ES11). NASA POWER regional mean — not a plant or parcel.",
    nasaWhat: SHARED_WHAT,
    when: SHARED_WHEN,
    techFrame: "wind_focus",
    techFrameNote: "Framing: onshore wind resource questions. Not a ranking vs other CCAA. Resource ≠ generation.",
    historicalEvidence:
      "Slope −0.87 days/decade (CI −2.92 to +1.33). Insufficient evidence. Complementarity ratio 0.51 (descriptive).",
    currentContext: "No Galicia plant register in this app. Existing turbines elsewhere must not be inferred from NASA cells.",
    futureHorizon:
      "2032–2040 may be discussed as a planning horizon. Historical slope is not a 2040 wind forecast.",
    significanceNote: "Not significant (p = 0.44, BH p = 0.79). CI includes zero. Do not call Galicia ‘improving’.",
    limitations: ["Coarse grids.", "Difference vs other CCAA not tested.", "EXPLORATORY pending review."],
    doNotConclude: "Not generation, not site suitability, not a forecast.",
    primary: {
      slopePerDecade: -0.87,
      ciLow: -2.92,
      ciHigh: 1.33,
      units: "days per decade",
      p: 0.438,
      pAdjustedBh: 0.794,
      nYears: 25,
      medianPerYear: 7.0,
      outcomeLabel: OUT,
      cardId: "energy-gap-ES11",
      bundle: BUNDLE,
    },
    complementarityPrimary: {
      observed: 177,
      expectedMean: 348.0,
      expectedRange95: [322.5, 372.7],
      ratio: 0.51,
      nullModel: "year-shift surrogates",
      source: COMP_SRC,
    },
    solarContext: "+0.018 (CI −0.025 to +0.077; p = 0.44) kWh m⁻² day⁻¹ per decade",
    windContext: "+0.002 (CI −0.084 to +0.060; p = 0.98) m s⁻¹ per decade",
    hasPlantRegister: false,
    installationsNote: "No plant-level layer for Galicia in this product.",
  },
  {
    id: "case-es41-joint-low",
    title: "Castilla y León",
    regionName: "Castilla y León",
    nuts2: "ES41",
    adminCcaaId: "ES41",
    comparisonName: "Aragón",
    comparisonCardId: "energy-gap-ES24",
    comparisonCaseId: "case-es24-joint-low",
    researchQuestion: "Have jointly low solar-and-wind days become more or less frequent in Castilla y León since 2001?",
    whySelected: "Pre-registered continental high-plateau contrast, before data. Not chosen because plants are dense.",
    where: "Castilla y León (NUTS-2 ES41). NASA POWER mean over ~10 solar cells and ~33 wind cells — not parcel scale.",
    nasaWhat: SHARED_WHAT,
    when: SHARED_WHEN,
    techFrame: "hybrid",
    techFrameNote: "Framing: solar PV, onshore wind, or hybrid. The 652 register points are context, not NASA proof of ‘fruitfulness’.",
    historicalEvidence:
      "Slope 0.0 days/decade (CI −1.55 to +1.67). Insufficient evidence. Complementarity ratio 0.43 (descriptive).",
    currentContext:
      "This app only has a plant register for CyL (652 operating wind + PV). That is not a national inventory and does not mean CyL is uniquely crowded.",
    futureHorizon:
      "2032–2040 is not predicted here. Existing plants do not validate future output or new sites.",
    significanceNote:
      "The NASA finding is not significant. Plant density on the map is an administrative layer, not the trend result.",
    limitations: [
      "Register is CyL-only — cannot compare plant density to Galicia or Andalucía.",
      "Difference vs Aragón not tested.",
      "EXPLORATORY pending review.",
    ],
    doNotConclude: "Not generation, not site suitability, not ‘this region will be fruitful’.",
    primary: {
      slopePerDecade: 0.0,
      ciLow: -1.55,
      ciHigh: 1.67,
      units: "days per decade",
      p: 0.794,
      pAdjustedBh: 0.794,
      nYears: 25,
      medianPerYear: 7.0,
      outcomeLabel: OUT,
      cardId: "energy-gap-ES41",
      bundle: BUNDLE,
    },
    complementarityPrimary: {
      observed: 160,
      expectedMean: 367.9,
      expectedRange95: [340.6, 403.3],
      ratio: 0.43,
      nullModel: "year-shift surrogates",
      source: COMP_SRC,
    },
    solarContext: "+0.032 (CI −0.026 to +0.105; p = 0.22) kWh m⁻² day⁻¹ per decade",
    windContext: "−0.024 (CI −0.128 to +0.064; p = 0.69) m s⁻¹ per decade",
    hasPlantRegister: true,
    installationsNote: "652 registered in-operation installations (378 PV, 274 wind). MW registered ≠ MWh. CyL only.",
  },
  {
    id: "case-es24-joint-low",
    title: "Aragón",
    regionName: "Aragón",
    nuts2: "ES24",
    adminCcaaId: "ES24",
    comparisonName: "Castilla y León",
    comparisonCardId: "energy-gap-ES41",
    comparisonCaseId: "case-es41-joint-low",
    researchQuestion: "Have jointly low solar-and-wind days become more or less frequent in Aragón since 2001?",
    whySelected: "Pre-registered Ebro-valley / cierzo contrast, before seeing results.",
    where: "Aragón (NUTS-2 ES24). NASA POWER regional mean — not a plant.",
    nasaWhat: SHARED_WHAT,
    when: SHARED_WHEN,
    techFrame: "wind_focus",
    techFrameNote: "Framing: onshore wind resource questions (Ebro corridor). Not a siting recommendation.",
    historicalEvidence:
      "Slope +0.52 days/decade (CI −1.88 to +2.50). Insufficient evidence. Complementarity ratio 0.79 — still below independence, higher than CyL (descriptive; difference not tested).",
    currentContext: "No Aragón plant register in this app.",
    futureHorizon: "A higher historical joint-low count is not a 2040 forecast and not ‘worse for hybrid plants’ as a tested claim.",
    significanceNote: "Not significant. Do not read the +0.52 slope as an increase — the CI includes zero and negative values.",
    limitations: ["Difference vs CyL not tested.", "EXPLORATORY pending review."],
    doNotConclude: "Not generation, not site suitability, not a forecast.",
    primary: {
      slopePerDecade: 0.52,
      ciLow: -1.88,
      ciHigh: 2.5,
      units: "days per decade",
      p: 0.638,
      pAdjustedBh: 0.794,
      nYears: 25,
      medianPerYear: 11.0,
      outcomeLabel: OUT,
      cardId: "energy-gap-ES24",
      bundle: BUNDLE,
    },
    complementarityPrimary: {
      observed: 295,
      expectedMean: 371.8,
      expectedRange95: [335.1, 403.4],
      ratio: 0.79,
      nullModel: "year-shift surrogates",
      source: COMP_SRC,
    },
    solarContext: "+0.028 (CI −0.023 to +0.087; p = 0.32) kWh m⁻² day⁻¹ per decade",
    windContext: "−0.119 (CI −0.200 to +0.020; p = 0.09) m s⁻¹ per decade",
    hasPlantRegister: false,
    installationsNote: "No plant-level layer for Aragón in this product.",
  },
  {
    id: "case-es61-joint-low",
    title: "Andalucía",
    regionName: "Andalucía",
    nuts2: "ES61",
    adminCcaaId: "ES61",
    comparisonName: "Peninsula + Balearics",
    comparisonCardId: "energy-gap-R0",
    comparisonCaseId: "case-r0-joint-low",
    researchQuestion: "Have jointly low solar-and-wind days become more or less frequent in Andalucía since 2001?",
    whySelected: "Pre-registered high-insolation south contrast, before seeing results.",
    where: "Andalucía (NUTS-2 ES61). NASA POWER regional mean — not a plant. Mulhacén fly-tos here are parks, not sites.",
    nasaWhat: SHARED_WHAT,
    when: SHARED_WHEN,
    techFrame: "solar_focus",
    techFrameNote: "Framing: solar PV resource questions. Not ‘best solar region’ — that comparison was not tested.",
    historicalEvidence:
      "Slope −1.14 days/decade (CI −3.33 to +0.75). Insufficient evidence. Complementarity ratio 0.52 (descriptive).",
    currentContext: "No Andalucía plant register in this app. Do not treat park landmarks as energy candidates.",
    futureHorizon: "2032–2040 is not a solar-yield forecast. Historical Sen slope must not be extended to 2040.",
    significanceNote: "Not significant (CI includes zero). A negative slope is not a supported decrease.",
    limitations: ["Parks are navigation-only.", "EXPLORATORY pending review."],
    doNotConclude: "Not generation, not site suitability, not a forecast.",
    primary: {
      slopePerDecade: -1.14,
      ciLow: -3.33,
      ciHigh: 0.75,
      units: "days per decade",
      p: 0.231,
      pAdjustedBh: 0.794,
      nYears: 25,
      medianPerYear: 7.0,
      outcomeLabel: OUT,
      cardId: "energy-gap-ES61",
      bundle: BUNDLE,
    },
    complementarityPrimary: {
      observed: 191,
      expectedMean: 369.3,
      expectedRange95: [345.3, 384.1],
      ratio: 0.52,
      nullModel: "year-shift surrogates",
      source: COMP_SRC,
    },
    solarContext: "+0.042 (CI −0.018 to +0.104; p = 0.12) kWh m⁻² day⁻¹ per decade",
    windContext: "−0.089 (CI −0.166 to +0.025; p = 0.10) m s⁻¹ per decade",
    hasPlantRegister: false,
    installationsNote: "No plant-level layer for Andalucía in this product.",
  },
];

export const CASTILLA_Y_LEON_CASE = ENERGY_RESEARCH_CASES.find((c) => c.id === "case-es41-joint-low") ?? ENERGY_RESEARCH_CASES[2];

export function caseById(id: string): EnergyResearchCase | undefined {
  return ENERGY_RESEARCH_CASES.find((c) => c.id === id);
}
