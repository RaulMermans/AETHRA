import { answerQuestion, parseAskBody } from "./ask.ts";
import type { EvidenceCatalog } from "./cards.ts";
import { scoreRuntimeEval } from "./evals/runtime.ts";
import { rememberTurn } from "./memory/session-store.ts";
import { AGENT_INTENTS, type AgentAnswer, type AgentIntent } from "./types.ts";
import type { ToolResult } from "./tools/catalog.ts";
import { createLlmProviderFromEnv, llmFlagsFromEnv } from "./llm/openai-compatible.ts";
import { intentSystemPrompt, paraphraseSystemPrompt } from "./llm/prompts.ts";
import type { LlmProvider } from "./llm/provider.ts";
import { paraphraseIsFaithful } from "./llm/validate-paraphrase.ts";
import { selectSkills } from "./skills/catalog.ts";
import { runAgentTool } from "./tools/catalog.ts";
import { selectClaim } from "./knowledge/select.ts";

function isIntent(v: unknown): v is AgentIntent {
  return typeof v === "string" && (AGENT_INTENTS as readonly string[]).includes(v);
}

function toolsForIntent(intent: AgentIntent): string[] {
  if (intent === "temperature_trend" || intent === "nasa_evidence") return ["retrieve_evidence"];
  if (intent === "joint_low_trend") return ["retrieve_evidence", "list_study_regions", "get_map_focus"];
  if (intent === "compare_joint_low") return ["get_evidence_card", "list_study_regions"];
  if (intent === "research_gap" || intent === "research_case" || intent === "infrastructure_metadata") {
    return ["list_study_regions", "lookup_knowledge"];
  }
  if (intent === "explain_mechanism") return ["lookup_knowledge"];
  if (intent === "mixed_warming_pv") return ["retrieve_evidence", "lookup_knowledge"];
  if (intent === "precipitation_trend") return ["get_map_focus"];
  return [];
}

async function maybeProposeIntent(question: string, llm: LlmProvider, enabled: boolean): Promise<AgentIntent | undefined> {
  if (!llm.configured || !enabled) return undefined;
  try {
    const json = await llm.completeJson({
      system: intentSystemPrompt(),
      user: question,
      schemaName: "intent",
    });
    return isIntent(json.intent) ? json.intent : undefined;
  } catch {
    return undefined;
  }
}

async function maybeParaphrase(truth: AgentAnswer, llm: LlmProvider, enabled: boolean): Promise<{ text: string; used: boolean; fallback?: string }> {
  if (!llm.configured || !enabled) return { text: truth.responseText, used: false };
  try {
    const json = await llm.completeJson({
      system: paraphraseSystemPrompt(),
      user: JSON.stringify({ status: truth.status, responseText: truth.responseText, findings: truth.findings }),
      schemaName: "paraphrase",
    });
    const text = typeof json.responseText === "string" ? json.responseText : "";
    if (!paraphraseIsFaithful(truth, text)) {
      return { text: truth.responseText, used: false, fallback: "paraphrase failed faithfulness check" };
    }
    return { text, used: true };
  } catch {
    return { text: truth.responseText, used: false, fallback: "paraphrase request failed" };
  }
}

export async function orchestrateAsk(
  raw: unknown,
  catalog: EvidenceCatalog,
  llm: LlmProvider = createLlmProviderFromEnv(),
): Promise<AgentAnswer> {
  const request = parseAskBody(raw);
  const flags = llmFlagsFromEnv();
  const proposed = await maybeProposeIntent(request.question, llm, flags.intent);

  const truth = answerQuestion(request, catalog);
  const toolsInvoked: string[] = [];
  const recordTool = (result: ToolResult) => {
    if (result.ok && !toolsInvoked.includes(result.tool)) toolsInvoked.push(result.tool);
  };
  for (const name of toolsForIntent(truth.intent)) {
    if (name === "retrieve_evidence") {
      const topic = truth.intent === "joint_low_trend" ? "joint_low" : "temperature";
      recordTool(runAgentTool(name, { topic, scope: truth.scope.regionId ?? "age" }, catalog));
    } else if (name === "get_map_focus") {
      const fly = truth.suggestedActions.find((a) => a.type === "FLY_TO_REGION");
      recordTool(runAgentTool(name, { id: fly?.targetId ?? "case-es24-joint-low" }, catalog));
    } else if (name === "get_evidence_card") {
      for (const finding of truth.findings) {
        recordTool(runAgentTool(name, { id: finding.evidenceId }, catalog));
      }
    } else if (name === "lookup_knowledge") {
      const id =
        truth.intent === "mixed_warming_pv"
          ? "claim-warming-not-pv-generation"
          : truth.intent === "research_case"
            ? "claim-cyl-register-scope"
            : selectClaim(request.question).id;
      recordTool(runAgentTool(name, { id }, catalog));
    } else {
      recordTool(runAgentTool(name, {}, catalog));
    }
  }
  const paraphrased = await maybeParaphrase(truth, llm, flags.paraphrase);
  const sessionId = request.session.sessionId;
  const skillsApplied = selectSkills(truth.intent, truth.status, truth.suggestedActions.length > 0);
  if (sessionId) {
    rememberTurn(sessionId, {
      regionScope: truth.scope.regionId ?? request.session.regionScope,
      lastIntent: truth.intent,
      lastEvidenceIds: truth.findings.map((f) => f.evidenceId),
      turns: [
        { role: "user", text: request.question },
        { role: "core", text: paraphrased.text },
      ],
    });
  }

  const answered: AgentAnswer = {
    ...truth,
    responseText: paraphrased.text,
    sessionId,
    skillsApplied,
    toolsInvoked,
    llm: {
      configured: llm.configured,
      usedFor: paraphrased.used ? "paraphrase" : proposed ? "intent" : "none",
      fallback: paraphrased.fallback,
    },
  };
  return {
    ...answered,
    evals: scoreRuntimeEval(answered, catalog, truth.responseText),
  };
}
