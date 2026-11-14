import { answerQuestion } from "../ask.ts";
import type { EvidenceCatalog } from "../cards.ts";
import { EXECUTABLE_BANK } from "../knowledge/question-bank.ts";
import { POLICY_CASES, type PolicyCase } from "../policy-cases.ts";

export type SuiteCaseResult = {
  id: string;
  pass: boolean;
  problems: string[];
};

export function evalPolicyCase(c: PolicyCase, catalog: EvidenceCatalog): SuiteCaseResult {
  const answer = answerQuestion({ question: c.question, session: { regionScope: c.regionScope } }, catalog);
  const ids = answer.findings.map((f) => f.evidenceId);
  const problems: string[] = [];
  if (answer.status !== c.expectStatus) problems.push(`status ${answer.status} != ${c.expectStatus}`);
  if (answer.intent !== c.expectIntent) problems.push(`intent ${answer.intent} != ${c.expectIntent}`);
  for (const id of c.expectEvidenceIds ?? []) {
    if (!ids.includes(id)) problems.push(`missing evidence ${id}`);
  }
  for (const id of c.forbidEvidenceIds ?? []) {
    if (ids.includes(id)) problems.push(`forbidden evidence ${id}`);
  }
  if (answer.status === "SUPPORTED" && answer.findings.length === 0) problems.push("SUPPORTED without findings");
  if (answer.status === "OUT_OF_DOMAIN" && answer.findings.length > 0) {
    problems.push("OUT_OF_DOMAIN must not carry findings");
  }
  return { id: c.id, pass: problems.length === 0, problems };
}

export function runEvalSuite(catalog: EvidenceCatalog): {
  passed: number;
  total: number;
  cases: SuiteCaseResult[];
} {
  const fromBank: PolicyCase[] = [];
  for (const c of EXECUTABLE_BANK) {
    if (!c.expectStatus || !c.expectIntent) continue;
    fromBank.push({
      id: `bank:${c.id}`,
      question: c.question,
      expectStatus: c.expectStatus,
      expectIntent: c.expectIntent,
      expectEvidenceIds: c.expectEvidenceIds,
      forbidEvidenceIds: c.forbidEvidenceIds,
    });
  }
  const cases = [...POLICY_CASES, ...fromBank].map((c) => evalPolicyCase(c, catalog));
  return { passed: cases.filter((c) => c.pass).length, total: cases.length, cases };
}
