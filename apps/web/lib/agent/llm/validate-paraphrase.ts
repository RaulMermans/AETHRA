import type { AgentAnswer } from "../types.ts";

function numbersIn(text: string): string[] {
  return text.match(/-?\d+(?:\.\d+)?/g) ?? [];
}

/** Paraphrase may reword, but it may not add numbers or drop finding magnitudes. */
export function paraphraseIsFaithful(truth: AgentAnswer, paraphrase: string): boolean {
  const trimmed = paraphrase.trim();
  if (trimmed.length < 12 || trimmed.length > 1200) return false;
  const allowed = new Set(numbersIn(truth.responseText));
  for (const finding of truth.findings) {
    for (const n of numbersIn(finding.claim)) allowed.add(n);
  }
  for (const finding of truth.findings) {
    const needed = numbersIn(finding.claim);
    if (needed.some((n) => !trimmed.includes(n))) return false;
  }
  return numbersIn(trimmed).every((n) => allowed.has(n));
}
