import { KNOWLEDGE_CLAIMS, claimById } from "./claims.ts";
import type { KnowledgeClaim } from "./types.ts";

type Rule = {
  id: string;
  terms: readonly RegExp[];
  /** Minimum term hits before the claim is eligible. */
  need: number;
};

const RULES: readonly Rule[] = [
  { id: "claim-theil-sen-vs-ols", terms: [/\btheil[- ]?sen\b/, /\bols\b/, /\bordinary least squares\b/, /\bautocorrelat/], need: 1 },
  { id: "claim-autocorrelation-n", terms: [/\bautocorrelat/, /\beffective sample/, /\btamano efectivo/], need: 1 },
  { id: "claim-two-datasets-temperature", terms: [/\btwo datasets\b/, /\bdifferent temperatur/, /\bpor que .*temperatur/], need: 1 },
  { id: "claim-warming-not-pv-generation", terms: [/\bimply\b/, /\bimplica\b/, /\bprove\b/, /\bfewer\b/, /\bmenos generacion\b/], need: 1 },
  { id: "claim-pv-temperature-mechanism", terms: [/\bpv\b/, /\bphotovolta/, /\bfotovolta/, /\beficiencia\b/, /\befficiency\b/, /\bmodule temperature\b/], need: 1 },
  { id: "claim-ghi-dni", terms: [/\bghi\b/, /\bdni\b/, /\bdhi\b/, /\bplane-of-array\b/, /\bplano del array\b/, /\ballsky_sfc_sw_dwn\b/], need: 1 },
  { id: "claim-radiation-not-electricity", terms: [/\balways better\b/, /\bsiempre mejor\b/, /\bmore radiation\b/, /\bmas radiacion\b/, /\belectricity\b/], need: 1 },
  { id: "claim-ghi-commercial", terms: [/\bcommercial\b/, /\blcoe\b/, /\bppa\b/, /\bcapture price\b/, /\bprofit\b/], need: 1 },
  { id: "claim-power-lineage", terms: [/\bgate b\b/, /\b2001\b/, /\bflashflux\b/, /\bceres\b/, /\bsyn1deg\b/, /\bpyranometer\b/, /\breanalysis\b/, /\breanalisis\b/, /\bpower\b/], need: 1 },
  { id: "claim-power-curve", terms: [/\bpower curve\b/, /\bcurva de potencia\b/, /\bhub height\b/, /\bbuje\b/, /\bcut-in\b/, /\bcut-out\b/, /\bwake\b/, /\bturbine\b/, /\bws50m\b/], need: 1 },
  { id: "claim-rain-not-hydro", terms: [/\brunoff\b/, /\bescorrent/, /\bhydro\b/, /\bhidro/, /\breservoir\b/, /\bembalse\b/, /\bgldas\b/, /\bgpm\b/, /\bimerg\b/], need: 1 },
  { id: "claim-mw-vs-mwh", terms: [/\bmwh\b/, /\bmw\b/, /\bcapacity factor\b/, /\bfactor de capacidad\b/, /\bcurtailment\b/, /\bvertido\b/], need: 1 },
  { id: "claim-joint-low-not-blackout", terms: [/\bblackout/, /\bapagon/, /\badequacy\b/, /\benergy gap\b/], need: 1 },
  { id: "claim-complementarity-levels", terms: [/\bcomplement/, /\bhibrid/, /\bhybrid\b/], need: 1 },
  { id: "claim-ci-not-forecast", terms: [/\bforecast\b/, /\bpronostic/, /\bprediction interval\b/, /\bnex-gddp\b/, /\bcmip\b/], need: 1 },
  { id: "claim-confidence-interval", terms: [/\bconfidence interval\b/, /\bintervalo de confianza\b/], need: 1 },
  { id: "claim-pvalue-not-importance", terms: [/\bp-value\b/, /\bvalor p\b/, /\binsignificant\b/, /\binsufficient evidence\b/, /\binsuficiente evidencia\b/], need: 1 },
  { id: "claim-correlation-not-causation", terms: [/\bcausation\b/, /\bcausalidad\b/, /\bcorrelat/], need: 1 },
  { id: "claim-weather-vs-climate", terms: [/\bweather\b/, /\bclimate\b/, /\btiempo meteorologic/, /\bclimatolog/], need: 2 },
  { id: "claim-merra-vs-nex", terms: [/\bnex-gddp\b/, /\bmerra-2 and\b/, /\bdifference between merra\b/], need: 1 },
  { id: "claim-nasa-not-parcel", terms: [/\bproperty\b/, /\bparcela\b/, /\bland availability\b/, /\bsuelo disponible\b/], need: 1 },
  { id: "claim-spain-institutions", terms: [/\bred electrica\b/, /\bomie\b/, /\bcnmc\b/, /\bmiteco\b/, /\bidae\b/, /\bwholesale\b/], need: 1 },
  { id: "claim-studied-regions", terms: [/\bwhich regions\b/, /\bque regiones\b/, /\bcanary\b/, /\bcanarias\b/], need: 1 },
  { id: "claim-cyl-register-scope", terms: [/\bregister\b/, /\b652\b/, /\binstalaciones registradas\b/], need: 1 },
  { id: "claim-recommendation-levels", terms: [/\bresearch candidate\b/, /\blevel-4\b/, /\blevel 5\b/, /\binversion\b/], need: 1 },
  { id: "claim-other-tech-not-modules", terms: [/\bcsp\b/, /\boffshore\b/, /\bbattery\b/, /\bhidrogen/, /\bhydrogen\b/, /\bbiomass\b/, /\bgeotherm/, /\bnuclear\b/], need: 1 },
];

function fold(s: string): string {
  return s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

function scoreRule(folded: string, rule: Rule): number {
  return rule.terms.reduce((n, term) => n + (term.test(folded) ? 1 : 0), 0);
}

export function selectClaims(question: string): readonly KnowledgeClaim[] {
  const f = fold(question);
  const ranked = RULES.map((rule) => ({ rule, score: scoreRule(f, rule) }))
    .filter((row) => row.score >= row.rule.need)
    .sort((a, b) => b.score - a.score || RULES.indexOf(a.rule) - RULES.indexOf(b.rule));
  const out: KnowledgeClaim[] = [];
  for (const row of ranked) {
    const hit = claimById(row.rule.id);
    if (!hit || out.some((c) => c.id === hit.id)) continue;
    out.push(hit);
    if (out.length >= 3) break;
  }
  return out;
}

export function matchesCurriculum(question: string): boolean {
  return selectClaims(question).length > 0;
}

export function selectClaim(question: string): KnowledgeClaim {
  const hits = selectClaims(question);
  if (hits[0]) return hits[0];
  const f = fold(question);
  if (/\b(resource|recurso|generat|power|wind|solar)\b/.test(f)) {
    return claimById("claim-resource-not-generation") ?? KNOWLEDGE_CLAIMS[0];
  }
  return KNOWLEDGE_CLAIMS[0];
}
