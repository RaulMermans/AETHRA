import { answerQuestion, parseAskBody } from "./ask.ts";
import type { EvidenceCatalog } from "./cards.ts";
import { scoreRuntimeEval } from "./evals/runtime.ts";
import { selectClaim } from "./knowledge/select.ts";
import { createLlmProviderFromEnv, llmFlagsFromEnv } from "./llm/openai-compatible.ts";
import { agenticReasoningPrompt, intentSystemPrompt } from "./llm/prompts.ts";
import type { LlmProvider } from "./llm/provider.ts";
import { paraphraseIsFaithful } from "./llm/validate-paraphrase.ts";
import { findRegionalScope, type RegionalScopeDigest } from "./markdown-brain.ts";
import { getSession, rememberTurn } from "./memory/session-store.ts";
import { selectSkills } from "./skills/catalog.ts";
import { runAgentTool, type ToolResult } from "./tools/catalog.ts";
import {
  AGENT_INTENTS,
  type AgentAnswer,
  type AgentIntent,
  type AgentTraceStep,
  type ConversationTurn,
} from "./types.ts";

function isIntent(v: unknown): v is AgentIntent {
  return typeof v === "string" && (AGENT_INTENTS as readonly string[]).includes(v);
}

function toolsForIntent(intent: AgentIntent, hasRegionalScope: boolean): string[] {
  const base: string[] = ["read_markdown_brain"];
  if (intent === "temperature_trend" || intent === "nasa_evidence") base.push("retrieve_evidence");
  if (intent === "joint_low_trend") base.push("retrieve_evidence", "list_study_regions", "get_map_focus");
  if (intent === "compare_joint_low") base.push("get_evidence_card", "list_study_regions");
  if (intent === "research_gap" || intent === "research_case" || intent === "infrastructure_metadata") {
    base.push("list_study_regions", "lookup_knowledge");
  }
  if (intent === "explain_mechanism") base.push("lookup_knowledge");
  if (intent === "mixed_warming_pv") base.push("retrieve_evidence", "lookup_knowledge");
  if (intent === "precipitation_trend") base.push("get_map_focus");
  if (hasRegionalScope) base.push("query_regional_climate");
  return base;
}

async function maybeProposeIntent(
  question: string,
  llm: LlmProvider,
  enabled: boolean,
): Promise<AgentIntent | undefined> {
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

async function maybeReasonAndSynthesize(opts: {
  truth: AgentAnswer;
  conversation: readonly ConversationTurn[];
  regionalScope?: RegionalScopeDigest;
  llm: LlmProvider;
  enabled: boolean;
}): Promise<{
  text: string;
  used: boolean;
  thought?: string;
  noteToSave?: string;
  fallback?: string;
}> {
  if (!opts.llm.configured || !opts.enabled) {
    return { text: opts.truth.responseText, used: false };
  }
  try {
    const json = await opts.llm.completeJson({
      system: agenticReasoningPrompt({ truth: opts.truth, regionalScope: opts.regionalScope }),
      user: JSON.stringify({
        question: opts.truth.question,
        language: opts.truth.language,
        conversationHistory: opts.conversation.slice(-6),
        baselineEvidencePayload: {
          status: opts.truth.status,
          intent: opts.truth.intent,
          scope: opts.truth.scope,
          findings: opts.truth.findings,
          limitations: opts.truth.limitations,
          responseText: opts.truth.responseText,
        },
      }),
      schemaName: "taro_agent_turn",
    });
    const text = typeof json.responseText === "string" ? json.responseText.trim() : "";
    const thought = typeof json.thought === "string" ? json.thought.trim() : undefined;
    const noteToSave = typeof json.noteToSave === "string" ? json.noteToSave.trim() : undefined;
    const extraText = opts.regionalScope ? JSON.stringify(opts.regionalScope) : undefined;
    if (!paraphraseIsFaithful(opts.truth, text, extraText)) {
      return {
        text: opts.truth.responseText,
        used: false,
        thought,
        noteToSave,
        fallback: "paraphrase failed faithfulness check",
      };
    }
    return { text, used: true, thought, noteToSave };
  } catch {
    return { text: opts.truth.responseText, used: false, fallback: "paraphrase request failed" };
  }
}

export async function orchestrateAsk(
  raw: unknown,
  catalog: EvidenceCatalog,
  llm: LlmProvider = createLlmProviderFromEnv(),
): Promise<AgentAnswer> {
  const request = parseAskBody(raw);
  const flags = llmFlagsFromEnv();
  const sessionId = request.session.sessionId;
  const sessionMem = sessionId ? getSession(sessionId) : undefined;
  const mergedConversation: ConversationTurn[] = [
    ...(sessionMem?.turns ?? []),
    ...(request.conversation ?? []),
  ].slice(-10);

  let truth = answerQuestion(request, catalog);
  const isSafetyRefusal =
    truth.intent === "prompt_injection" ||
    truth.intent === "invent_source" ||
    truth.intent === "investment_advice";

  // Only invoke the LLM intent classifier when the deterministic regex returned out_of_domain
  // and it is not a hard safety refusal—cutting latency in half!
  const proposed =
    !isSafetyRefusal && truth.intent === "out_of_domain"
      ? await maybeProposeIntent(request.question, llm, flags.intent)
      : undefined;

  if (
    !isSafetyRefusal &&
    truth.intent === "out_of_domain" &&
    proposed &&
    proposed !== "out_of_domain"
  ) {
    truth = {
      ...truth,
      intent: proposed,
      status: "DESCRIPTIVE",
      limitations: ["Answered using TARO Markdown knowledge base; not a new AETHRA measurement."],
    };
  }

  const regionalScope =
    findRegionalScope(request.question) ??
    (truth.scope.regionId ? findRegionalScope(truth.scope.regionId) : undefined) ??
    (truth.scope.regionName ? findRegionalScope(truth.scope.regionName) : undefined);

  const toolsInvoked: string[] = [];
  const trace: AgentTraceStep[] = [];
  const recordTool = (result: ToolResult, detail: string) => {
    if (result.ok && !toolsInvoked.includes(result.tool)) {
      toolsInvoked.push(result.tool);
    }
    if (result.ok) {
      trace.push({ kind: "tool", title: result.tool, detail });
    }
  };

  for (const name of toolsForIntent(truth.intent, Boolean(regionalScope))) {
    if (name === "read_markdown_brain") {
      recordTool(
        runAgentTool(name, { file: "KNOWLEDGE.md" }, catalog),
        "Loaded data/taro/SOUL.md + KNOWLEDGE.md + RESEARCH_NOTES.md",
      );
    } else if (name === "retrieve_evidence") {
      const topic = truth.intent === "joint_low_trend" ? "joint_low" : "temperature";
      const scope = truth.scope.regionId ?? "age";
      recordTool(runAgentTool(name, { topic, scope }, catalog), `Queried ${topic} card for ${scope}`);
    } else if (name === "get_map_focus") {
      const fly = truth.suggestedActions.find((a) => a.type === "FLY_TO_REGION");
      const targetId = fly?.targetId ?? "case-es24-joint-low";
      recordTool(runAgentTool(name, { id: targetId }, catalog), `Resolved globe target ${targetId}`);
    } else if (name === "get_evidence_card") {
      for (const finding of truth.findings) {
        recordTool(runAgentTool(name, { id: finding.evidenceId }, catalog), `Read card ${finding.evidenceId}`);
      }
    } else if (name === "lookup_knowledge") {
      const id =
        truth.intent === "mixed_warming_pv"
          ? "claim-warming-not-pv-generation"
          : truth.intent === "research_case"
            ? "claim-cyl-register-scope"
            : selectClaim(request.question).id;
      recordTool(runAgentTool(name, { id }, catalog), `Matched curriculum claim ${id}`);
    } else if (name === "query_regional_climate" && regionalScope) {
      recordTool(
        runAgentTool(name, { query: regionalScope.scopeKey }, catalog),
        `Loaded precomputed Python scope ${regionalScope.name} (${regionalScope.scopeKey})`,
      );
    } else {
      recordTool(runAgentTool(name, {}, catalog), `Ran ${name}`);
    }
  }

  const reasoned = await maybeReasonAndSynthesize({
    truth,
    conversation: mergedConversation,
    regionalScope,
    llm,
    enabled: flags.paraphrase,
  });

  if (reasoned.thought) {
    trace.unshift({ kind: "think", title: "TARO Reasoning", detail: reasoned.thought });
  } else {
    trace.unshift({
      kind: "think",
      title: "TARO Reasoning",
      detail: `Evaluated intent=${truth.intent} (${truth.status}) over scope=${truth.scope.regionName ?? "general"}`,
    });
  }

  // Record research note into data/taro/RESEARCH_NOTES.md when the user asks a substantive domain question
  if (truth.status !== "OUT_OF_DOMAIN") {
    const summaryNote =
      reasoned.noteToSave ||
      `${truth.status} (${truth.intent}): ${reasoned.text.slice(0, 160)}`;
    const noteRes = runAgentTool(
      "append_research_note",
      {
        scope: truth.scope.regionName ?? truth.scope.regionId ?? "Spain",
        question: request.question,
        summary: summaryNote,
      },
      catalog,
    );
    if (noteRes.ok && noteRes.data.saved === true) {
      recordTool(noteRes, "Appended research note to data/taro/RESEARCH_NOTES.md");
    }
  }

  const skillsApplied = selectSkills(truth.intent, truth.status, truth.suggestedActions.length > 0);
  if (sessionId) {
    rememberTurn(sessionId, {
      regionScope: truth.scope.regionId ?? request.session.regionScope,
      lastIntent: truth.intent,
      lastEvidenceIds: truth.findings.map((f) => f.evidenceId),
      turns: [
        { role: "user", text: request.question },
        { role: "core", text: reasoned.text },
      ],
    });
  }

  const answered: AgentAnswer = {
    ...truth,
    responseText: reasoned.text,
    sessionId,
    skillsApplied,
    toolsInvoked,
    trace,
    llm: {
      configured: llm.configured,
      usedFor: reasoned.used ? "paraphrase" : proposed ? "intent" : "none",
      fallback: reasoned.fallback,
    },
  };
  return {
    ...answered,
    evals: scoreRuntimeEval(
      answered,
      catalog,
       `${truth.responseText} ${regionalScope ? JSON.stringify(regionalScope) : ""}`,
    ),
  };
}
