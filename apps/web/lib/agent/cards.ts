export const EVIDENCE_TOPICS = ["temperature", "joint_low"] as const;
export type EvidenceTopic = (typeof EVIDENCE_TOPICS)[number];

export const EVIDENCE_OUTCOMES = [
  "supported_increase",
  "supported_decrease",
  "no_robust_trend",
  "insufficient_evidence",
] as const;
export type EvidenceOutcome = (typeof EVIDENCE_OUTCOMES)[number];

export type EvidenceCard = {
  id: string;
  topic: EvidenceTopic;
  headline: boolean;
  region: { scope: string; name: string };
  status: string;
  question: string;
  outcome: EvidenceOutcome;
  outcome_label: string;
  what: string;
  where: string;
  when: string;
  how_much: {
    slope_per_decade: number;
    ci95_per_decade: [number, number];
    units: string;
  };
  evidence: {
    method: string;
    n_years: number;
    p: number;
    p_adjusted_bh?: number;
  };
  do_not_conclude: string;
  limitations: string[];
  provenance: { bundle: string; bundle_sha256: string };
  /** Temperature card only: NOAA station comparison copied by export_evidence_cards.py (D52, D76). */
  external_check?: ExternalCheck;
};

export type ExternalCheck = {
  n_stations: number;
  stations_warming: number;
  within_0_2_per_decade: number;
  slope_diff_median_per_decade: number;
  period: string;
  status: string;
  bundle: string;
};

/** Validates the optional `external_check` block; returns undefined when absent or malformed. */
export function parseExternalCheck(v: unknown): ExternalCheck | undefined {
  if (!isRecord(v)) return undefined;
  const nums = ["n_stations", "stations_warming", "within_0_2_per_decade", "slope_diff_median_per_decade"] as const;
  if (!nums.every((k) => typeof v[k] === "number")) return undefined;
  if (typeof v.period !== "string" || typeof v.status !== "string" || typeof v.bundle !== "string") return undefined;
  return {
    n_stations: Number(v.n_stations),
    stations_warming: Number(v.stations_warming),
    within_0_2_per_decade: Number(v.within_0_2_per_decade),
    slope_diff_median_per_decade: Number(v.slope_diff_median_per_decade),
    period: v.period,
    status: v.status,
    bundle: v.bundle,
  };
}

export type EvidenceCatalog = {
  cards: readonly EvidenceCard[];
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function isTopic(v: unknown): v is EvidenceTopic {
  return v === "temperature" || v === "joint_low";
}

function isOutcome(v: unknown): v is EvidenceOutcome {
  return (
    v === "supported_increase" ||
    v === "supported_decrease" ||
    v === "no_robust_trend" ||
    v === "insufficient_evidence"
  );
}

function parseHowMuch(v: unknown): EvidenceCard["how_much"] | null {
  if (!isRecord(v)) return null;
  const ci = v.ci95_per_decade;
  if (!Array.isArray(ci) || ci.length !== 2) return null;
  if (typeof ci[0] !== "number" || typeof ci[1] !== "number") return null;
  if (typeof v.slope_per_decade !== "number" || typeof v.units !== "string") return null;
  return { slope_per_decade: v.slope_per_decade, ci95_per_decade: [ci[0], ci[1]], units: v.units };
}

export function parseEvidenceCard(v: unknown): EvidenceCard | null {
  if (!isRecord(v) || !isTopic(v.topic) || !isOutcome(v.outcome)) return null;
  if (typeof v.id !== "string" || typeof v.headline !== "boolean") return null;
  if (!isRecord(v.region) || typeof v.region.scope !== "string" || typeof v.region.name !== "string") return null;
  const how = parseHowMuch(v.how_much);
  if (!how || !isRecord(v.evidence) || !isRecord(v.provenance)) return null;
  if (typeof v.evidence.method !== "string" || typeof v.evidence.n_years !== "number" || typeof v.evidence.p !== "number") {
    return null;
  }
  if (typeof v.provenance.bundle !== "string" || typeof v.provenance.bundle_sha256 !== "string") return null;
  if (typeof v.what !== "string" || typeof v.where !== "string" || typeof v.when !== "string") return null;
  if (typeof v.outcome_label !== "string" || typeof v.do_not_conclude !== "string") return null;
  if (typeof v.status !== "string" || typeof v.question !== "string" || !Array.isArray(v.limitations)) return null;
  if (!v.limitations.every((line) => typeof line === "string")) return null;
  const pAdj = v.evidence.p_adjusted_bh;
  return {
    id: v.id,
    topic: v.topic,
    headline: v.headline,
    region: { scope: v.region.scope, name: v.region.name },
    status: v.status,
    question: v.question,
    outcome: v.outcome,
    outcome_label: v.outcome_label,
    what: v.what,
    where: v.where,
    when: v.when,
    how_much: how,
    evidence: {
      method: v.evidence.method,
      n_years: v.evidence.n_years,
      p: v.evidence.p,
      p_adjusted_bh: typeof pAdj === "number" ? pAdj : undefined,
    },
    do_not_conclude: v.do_not_conclude,
    limitations: v.limitations,
    provenance: { bundle: v.provenance.bundle, bundle_sha256: v.provenance.bundle_sha256 },
    external_check: parseExternalCheck(v.external_check),
  };
}

export function parseEvidenceCatalog(raw: unknown): EvidenceCatalog {
  if (!isRecord(raw) || !Array.isArray(raw.cards)) {
    throw new Error("evidence-cards.json: missing cards array");
  }
  const cards: EvidenceCard[] = [];
  for (const item of raw.cards) {
    const card = parseEvidenceCard(item);
    if (!card) throw new Error("evidence-cards.json: a card failed validation");
    cards.push(card);
  }
  return { cards };
}

export function cardById(catalog: EvidenceCatalog, id: string): EvidenceCard | undefined {
  return catalog.cards.find((c) => c.id === id);
}

export function cardFor(catalog: EvidenceCatalog, topic: EvidenceTopic, scope: string): EvidenceCard | undefined {
  return catalog.cards.find((c) => c.topic === topic && c.region.scope === scope);
}
