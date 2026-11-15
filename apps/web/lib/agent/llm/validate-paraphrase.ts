import type { AgentAnswer } from "../types.ts";

function numbersIn(text: string): string[] {
  return text.match(/-?\d+(?:\.\d+)?/g) ?? [];
}

const DOMAIN_SAFE_CONSTANTS = new Set([
  "0",
  "1",
  "2",
  "3",
  "4",
  "5",
  "19",
  "20",
  "25",
  "26",
  "50",
  "52",
  "64",
  "72",
  "95",
  "652",
  "2000",
  "2001",
  "2020",
  "2024",
  "2025",
  "2030",
  "2038",
  "2040",
]);

/** Paraphrase may reword, but it may not add numbers or drop finding magnitudes. */
export function paraphraseIsFaithful(
  truth: AgentAnswer,
  paraphrase: string,
  extraAllowedText?: string,
): boolean {
  const trimmed = paraphrase.trim();
  if (trimmed.length < 12 || trimmed.length > 1600) return false;
  const allowed = new Set(numbersIn(truth.responseText));
  for (const n of numbersIn(truth.question)) allowed.add(n);
  if (extraAllowedText) {
    for (const n of numbersIn(extraAllowedText)) allowed.add(n);
  }
  for (const finding of truth.findings) {
    for (const n of numbersIn(finding.claim)) allowed.add(n);
  }
  for (const c of DOMAIN_SAFE_CONSTANTS) allowed.add(c);
  for (const finding of truth.findings) {
    const needed = numbersIn(finding.claim);
    if (needed.some((n) => !trimmed.includes(n))) return false;
  }
  return numbersIn(trimmed).every((n) => allowed.has(n));
}
