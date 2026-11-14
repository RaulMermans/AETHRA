import type { EvidenceCard } from "./cards.ts";
import type { AgentLanguage } from "./types.ts";

function signed(n: number, digits = 2): string {
  const mag = Math.abs(n).toFixed(digits);
  if (n > 0) return `+${mag}`;
  if (n < 0) return `−${mag}`;
  return mag;
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
  return `${reading} ${card.do_not_conclude}`;
}

/** Read a published card like a data scientist. Does not recompute slope, CI, p or n. */
export function interpretCard(card: EvidenceCard, language: AgentLanguage): string {
  const slope = `${signed(card.how_much.slope_per_decade)} ${card.how_much.units}`;
  const lo = card.how_much.ci95_per_decade[0];
  const hi = card.how_much.ci95_per_decade[1];
  const ci = `${signed(lo)} to ${signed(hi)}`;
  const quote =
    language === "es"
      ? `Card ${card.id}: ${card.region.name}, ${card.what}. ${card.outcome_label}. ${slope} (IC 95% ${ci}; n = ${card.evidence.n_years}; p = ${card.evidence.p}; método ${card.evidence.method}). Periodo ${card.when}.`
      : `Card ${card.id}: ${card.region.name}, ${card.what}. ${card.outcome_label}. ${slope} (95% CI ${ci}; n = ${card.evidence.n_years}; p = ${card.evidence.p}; method ${card.evidence.method}). Period ${card.when}.`;
  return `${quote} ${interpretOutcome(card, language)} Fuente: ${card.provenance.bundle}.`;
}
