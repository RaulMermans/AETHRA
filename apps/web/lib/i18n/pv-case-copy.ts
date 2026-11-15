import type { PvCaseOutcome, PvCaseVariableId } from "@/lib/globe/pv-case";
import type { Locale } from "./messages";

/** EN + ES wording for the Seville PV case study. Values come from pv-case-sevilla.json only. */
export interface PvCaseCopy {
  teaserHeading: string;
  teaserText: string;
  open: string;
  heading: string;
  selection: string;
  devHeading: string;
  devFinding: (phases: number, locations: number, firstYear: number, lastYear: number) => string;
  devHowToRead: string;
  explicit: string;
  assumed: string;
  devStats: (exact: number, total: number, lowModerate: number, notRecommended: number, construction: number, preConstruction: number) => string;
  mwByRating: string;
  mwNote: string;
  devOutcome: string;
  devOutcomeMeaning: string;
  climateHeading: string;
  climateIntro: (first: number, last: number) => string;
  variableName: Record<PvCaseVariableId, string>;
  variableWhy: Record<PvCaseVariableId, string>;
  outcome: Record<PvCaseOutcome, string>;
  perDecade: string;
  mean: string;
  ciLabel: string;
  qLabel: string;
  climateTakeaway: string;
  limitsHeading: string;
  limits: string[];
  source: string;
}

const EN: PvCaseCopy = {
  teaserHeading: "Case study · Seville countryside",
  teaserText: "The green cell with the most operating solar PV phases in the GEM register: how the build-out and the sector's key climate variables evolved side by side.",
  open: "Open case study",
  heading: "Case study · Seville countryside (EXPLORATORY)",
  selection: "Chosen after viewing the screening: the green cell with the most operating GEM PV phases. Not the best site in Spain and not a parcel recommendation.",
  devHeading: "Solar PV development recorded in this cell",
  devFinding: (phases, locations, first, last) => `${phases} operating PV project phases at ${locations} locations, with reported start years from ${first} to ${last}. Solar-thermal (CSP) phases are excluded.`,
  devHowToRead: "Bars count operating phases in the February 2026 register by reported start year. Phases that closed or are missing from the register are not shown.",
  explicit: "PV",
  assumed: "Assumed PV",
  devStats: (exact, total, lowMod, notRec, con, pre) => `${exact} of ${total} points are exact locations. ${lowMod} phases sit in MITECO low/moderate sensitivity (classes 3–4) and ${notRec} in class 0 "not recommended". Pipeline: ${con} under construction, ${pre} in pre-construction.`,
  mwByRating: "Registered capacity by rating basis",
  mwNote: "Nameplate MW, not electricity. The three bases are not added together.",
  devOutcome: "Insufficient evidence for an installation trend",
  devOutcomeMeaning: "The register is a 2026 inventory, not an annual commissioning census; the 2017 spike is catalogue-driven (Assumed PV). No slope or p-value is computed.",
  climateHeading: "PV-relevant climate variables · NASA POWER",
  climateIntro: (first, last) => `Four variables fixed before download, ${first}–${last}, at the cell centre. Theil–Sen slope with 95% CI; Mann–Kendall test; Benjamini–Hochberg FDR across the four.`,
  variableName: {
    ghi: "Solar irradiance (GHI)",
    t_summer: "Summer air temperature (Jun–Aug)",
    hot_days: "Days above 35 °C",
    aod: "Aerosol optical depth (550 nm)",
  },
  variableWhy: {
    ghi: "The solar resource itself.",
    t_summer: "Hotter modules convert sunlight less efficiently.",
    hot_days: "Heat-stress days for modules and inverters.",
    aod: "Dust and haze dim incoming sunlight. Not panel soiling.",
  },
  outcome: {
    supported_increase: "Supported increase",
    supported_decrease: "Supported decrease",
    no_robust_trend: "No robust trend detected",
    insufficient_evidence: "Insufficient evidence",
  },
  perDecade: "per decade",
  mean: "Mean",
  ciLabel: "95% CI",
  qLabel: "FDR q",
  climateTakeaway: "The point estimates lean towards more heat, slightly more sun and less haze, but none of the four passes the pre-registered FDR test. Honest reading: the build-out happened where sunlight is high, with no robust trend in it; heat is the variable to keep watching, not yet a supported trend in this cell.",
  limitsHeading: "Do not conclude",
  limits: [
    "That the climate caused the plants to be built here.",
    "Any electricity output, revenue or future (2030) effect.",
    "That this is the optimal site in Spain or that a parcel is buildable.",
  ],
  source: "Source",
};

const ES: PvCaseCopy = {
  teaserHeading: "Caso de estudio · campiña de Sevilla",
  teaserText: "La celda verde con más fases fotovoltaicas operativas en el registro GEM: cómo evolucionaron a la vez el despliegue y las variables climáticas clave del sector.",
  open: "Abrir caso de estudio",
  heading: "Caso de estudio · campiña de Sevilla (EXPLORATORIO)",
  selection: "Elegida tras ver el cribado: la celda verde con más fases FV operativas en GEM. No es el mejor sitio de España ni una recomendación de parcela.",
  devHeading: "Desarrollo fotovoltaico registrado en esta celda",
  devFinding: (phases, locations, first, last) => `${phases} fases FV operativas en ${locations} ubicaciones, con años de inicio declarados de ${first} a ${last}. Se excluyen las fases termosolares (CSP).`,
  devHowToRead: "Las barras cuentan fases operativas del registro de febrero de 2026 por año de inicio declarado. No aparecen las que cerraron o faltan en el registro.",
  explicit: "FV",
  assumed: "FV supuesta",
  devStats: (exact, total, lowMod, notRec, con, pre) => `${exact} de ${total} puntos tienen ubicación exacta. ${lowMod} fases están en sensibilidad MITECO baja/moderada (clases 3–4) y ${notRec} en clase 0 «no recomendada». En cartera: ${con} en construcción, ${pre} en preconstrucción.`,
  mwByRating: "Potencia registrada por tipo de dato",
  mwNote: "MW nominales, no electricidad. Las tres bases no se suman.",
  devOutcome: "Evidencia insuficiente para una tendencia de instalación",
  devOutcomeMeaning: "El registro es un inventario de 2026, no un censo anual de puestas en marcha; el pico de 2017 se debe a la catalogación (FV supuesta). No se calcula pendiente ni p-valor.",
  climateHeading: "Variables climáticas clave para FV · NASA POWER",
  climateIntro: (first, last) => `Cuatro variables fijadas antes de descargar, ${first}–${last}, en el centro de la celda. Pendiente de Theil–Sen con IC 95 %; test de Mann–Kendall; FDR de Benjamini–Hochberg entre las cuatro.`,
  variableName: {
    ghi: "Irradiancia solar (GHI)",
    t_summer: "Temperatura del aire en verano (jun–ago)",
    hot_days: "Días por encima de 35 °C",
    aod: "Espesor óptico de aerosoles (550 nm)",
  },
  variableWhy: {
    ghi: "El propio recurso solar.",
    t_summer: "Los módulos más calientes convierten peor la luz.",
    hot_days: "Días de estrés térmico para módulos e inversores.",
    aod: "Polvo y calima atenúan la luz incidente. No es suciedad en paneles.",
  },
  outcome: {
    supported_increase: "Aumento respaldado",
    supported_decrease: "Descenso respaldado",
    no_robust_trend: "No se detecta una tendencia robusta",
    insufficient_evidence: "Evidencia insuficiente",
  },
  perDecade: "por década",
  mean: "Media",
  ciLabel: "IC 95 %",
  qLabel: "q FDR",
  climateTakeaway: "Las estimaciones apuntan a más calor, algo más de sol y menos calima, pero ninguna de las cuatro supera el test FDR prerregistrado. Lectura honesta: el despliegue ocurrió donde el sol es alto, sin tendencia robusta; el calor es la variable a vigilar, aún no una tendencia respaldada en esta celda.",
  limitsHeading: "No concluir",
  limits: [
    "Que el clima causó que se construyeran aquí las plantas.",
    "Ninguna producción eléctrica, ingreso ni efecto futuro (2030).",
    "Que sea el sitio óptimo de España o que una parcela sea edificable.",
  ],
  source: "Fuente",
};

export function pvCaseCopy(locale: Locale): PvCaseCopy {
  return locale === "es" ? ES : EN;
}
