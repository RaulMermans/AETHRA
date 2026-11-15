import type { EvidenceCard } from "./cards.ts";
import type { AgentLanguage } from "./types.ts";

function signed(n: number, digits = 2): string {
  const mag = Math.abs(n).toFixed(digits);
  if (n > 0) return `+${mag}`;
  if (n < 0) return `−${mag}`;
  return mag;
}

// Spanish wording for the English strings published in evidence-cards.json. Text only: values are
// never touched. Unknown strings fall back to the card's English text rather than being invented.
const UNITS_ES: Readonly<Record<string, string>> = {
  "°C per decade": "°C por década",
  "days per decade": "días por década",
};
const DO_NOT_CONCLUDE_ES: Readonly<Record<string, string>> = {
  "Not a cause of warming, not a forecast, not evidence about energy production.":
    "No es una causa del calentamiento, ni una predicción, ni evidencia sobre producción de energía.",
  "Not electricity generation, not grid reliability or outage risk, not site suitability, not a forecast.":
    "No es generación eléctrica, ni fiabilidad de red o riesgo de apagón, ni idoneidad de emplazamientos, ni una predicción.",
};
const OUTCOME_LABEL_ES: Readonly<Record<string, string>> = {
  "Supported increase": "Aumento respaldado",
  "Supported decrease": "Descenso respaldado",
  "Insufficient evidence": "Evidencia insuficiente",
  "No robust trend detected": "No se detecta una tendencia robusta",
};

export function unitsText(card: EvidenceCard, language: AgentLanguage): string {
  const units = card.how_much.units;
  return language === "es" ? (UNITS_ES[units] ?? units) : units;
}

export function outcomeLabelText(card: EvidenceCard, language: AgentLanguage): string {
  const label = card.outcome_label;
  return language === "es" ? (OUTCOME_LABEL_ES[label] ?? label) : label;
}

/** "lo to hi" with the card's signed values; only the connector word is localised. */
export function ciRangeText(card: EvidenceCard, language: AgentLanguage): string {
  const [lo, hi] = card.how_much.ci95_per_decade;
  return `${signed(lo)} ${language === "es" ? "a" : "to"} ${signed(hi)}`;
}

function doNotConcludeText(card: EvidenceCard, language: AgentLanguage): string {
  const text = card.do_not_conclude;
  return language === "es" ? (DO_NOT_CONCLUDE_ES[text] ?? text) : text;
}

export function interpretOutcome(card: EvidenceCard, language: AgentLanguage): string {
  const lo = card.how_much.ci95_per_decade[0];
  const hi = card.how_much.ci95_per_decade[1];
  const crossesZero = lo < 0 && hi > 0;
  const reading = crossesZero
    ? language === "es"
      ? "El IC 95% incluye signo positivo y negativo: el pipeline etiquetó evidencia insuficiente de tendencia, no una prueba de cambio cero. El valor p no mide importancia."
      : "The 95% CI includes both signs: the pipeline labelled this insufficient evidence of a trend, not a proof of zero change. The p-value is not importance."
    : language === "es"
      ? "El IC 95% publicado no incluye cero; el desenlace de la card es el que hay que citar, no un recálculo en el navegador."
      : "The published 95% CI does not include zero; cite the card outcome — the browser does not recompute it.";
  return `${reading} ${doNotConcludeText(card, language)}`;
}

/** Read a published card like a data scientist. Does not recompute slope, CI, p or n. */
export function interpretCard(card: EvidenceCard, language: AgentLanguage): string {
  const slope = `${signed(card.how_much.slope_per_decade)} ${unitsText(card, language)}`;
  const ci = ciRangeText(card, language);
  const quote =
    language === "es"
      ? `Card ${card.id}: ${card.region.name}, ${card.what}. ${outcomeLabelText(card, language)}. ${slope} (IC 95% ${ci}; n = ${card.evidence.n_years}; p = ${card.evidence.p}; método ${card.evidence.method}). Periodo ${card.when}.`
      : `Card ${card.id}: ${card.region.name}, ${card.what}. ${card.outcome_label}. ${slope} (95% CI ${ci}; n = ${card.evidence.n_years}; p = ${card.evidence.p}; method ${card.evidence.method}). Period ${card.when}.`;
  return `${quote} ${interpretOutcome(card, language)} Fuente: ${card.provenance.bundle}.`;
}
