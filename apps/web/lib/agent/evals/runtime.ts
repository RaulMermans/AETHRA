import type { EvidenceCatalog } from "../cards.ts";
import { paraphraseIsFaithful } from "../llm/validate-paraphrase.ts";
import { AGENT_SKILLS } from "../skills/catalog.ts";
import { isAgentToolName } from "../tools/catalog.ts";
import type { AgentAnswer, AgentEvalCheck, AgentRuntimeEval } from "../types.ts";

const RANK_CLAIM = /\b(best site is|construye en|compra (tierra|terreno)|optimal (site|region) is)\b/i;

function check(id: string, pass: boolean, detail: string): AgentEvalCheck {
  return { id, pass, detail };
}

export function scoreRuntimeEval(
  answer: AgentAnswer,
  catalog: EvidenceCatalog,
  truthText: string,
): AgentRuntimeEval {
  const skillIds = new Set(AGENT_SKILLS.map((s) => s.id));
  const checks: AgentEvalCheck[] = [
    check(
      "evidence-grounded",
      answer.findings.every((f) => catalog.cards.some((c) => c.id === f.evidenceId && c.provenance.bundle_sha256 === f.provenanceId)),
      answer.findings.length === 0 ? "No findings to ground" : "Every finding maps to an EvidenceCard",
    ),
    check(
      "out-of-domain-empty",
      answer.status !== "OUT_OF_DOMAIN" || answer.findings.length === 0,
      "OUT_OF_DOMAIN answers must not carry findings",
    ),
    check(
      "paraphrase-faithful",
      paraphraseIsFaithful({ ...answer, responseText: truthText }, answer.responseText),
      "Numbers in the reply exist on the deterministic answer",
    ),
    check(
      "tools-allowlisted",
      (answer.toolsInvoked ?? []).every((name) => isAgentToolName(name)),
      "Only allowlisted tools ran",
    ),
    check(
      "skills-known",
      (answer.skillsApplied ?? []).every((id) => skillIds.has(id)),
      "Only catalogued skills ran",
    ),
    check(
      "no-site-rank-claim",
      !RANK_CLAIM.test(answer.responseText),
      "Reply does not name a site to build",
    ),
  ];
  const passed = checks.filter((c) => c.pass).length;
  return { passed, total: checks.length, checks };
}
