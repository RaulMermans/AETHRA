import {
  AGENT_ACTION_TYPES,
  AGENT_INTENTS,
  AGENT_STATUSES,
  type AgentAnswer,
  type AgentActionType,
  type AgentIntent,
  type AgentLanguage,
  type AgentStatus,
  type AgentTraceStep,
} from "./types.ts";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function isStatus(v: unknown): v is AgentStatus {
  return typeof v === "string" && (AGENT_STATUSES as readonly string[]).includes(v);
}

function isIntent(v: unknown): v is AgentIntent {
  return typeof v === "string" && (AGENT_INTENTS as readonly string[]).includes(v);
}

function isActionType(v: unknown): v is AgentActionType {
  return typeof v === "string" && (AGENT_ACTION_TYPES as readonly string[]).includes(v);
}

export function parseAgentAnswer(raw: unknown): AgentAnswer {
  if (!isRecord(raw) || !isStatus(raw.status) || !isIntent(raw.intent)) {
    throw new Error("TARO returned an invalid answer");
  }
  if (typeof raw.question !== "string" || typeof raw.responseText !== "string") {
    throw new Error("TARO returned an invalid answer");
  }
  const language: AgentLanguage = raw.language === "es" ? "es" : "en";
  if (!isRecord(raw.scope) || !Array.isArray(raw.findings) || !Array.isArray(raw.limitations) || !Array.isArray(raw.suggestedActions)) {
    throw new Error("TARO returned an invalid answer");
  }
  const findings = [];
  for (const item of raw.findings) {
    if (!isRecord(item) || typeof item.claim !== "string" || typeof item.evidenceId !== "string" || typeof item.provenanceId !== "string") {
      throw new Error("TARO returned an invalid finding");
    }
    findings.push({
      claim: item.claim,
      variable: typeof item.variable === "string" ? item.variable : undefined,
      units: typeof item.units === "string" ? item.units : undefined,
      period: typeof item.period === "string" ? item.period : undefined,
      evidenceId: item.evidenceId,
      provenanceId: item.provenanceId,
    });
  }
  const suggestedActions = [];
  for (const item of raw.suggestedActions) {
    if (!isRecord(item) || !isActionType(item.type) || typeof item.targetId !== "string") {
      throw new Error("TARO returned an invalid action");
    }
    suggestedActions.push({
      type: item.type,
      targetId: item.targetId,
      label: typeof item.label === "string" ? item.label : undefined,
      latitude: typeof item.latitude === "number" ? item.latitude : undefined,
      longitude: typeof item.longitude === "number" ? item.longitude : undefined,
    });
  }
  return {
    status: raw.status,
    intent: raw.intent,
    question: raw.question,
    language,
    scope: {
      regionId: typeof raw.scope.regionId === "string" ? raw.scope.regionId : undefined,
      regionName: typeof raw.scope.regionName === "string" ? raw.scope.regionName : undefined,
      spatialSupport: typeof raw.scope.spatialSupport === "string" ? raw.scope.spatialSupport : undefined,
    },
    findings,
    limitations: raw.limitations.filter((line): line is string => typeof line === "string"),
    suggestedActions,
    responseText: raw.responseText,
    sessionId: typeof raw.sessionId === "string" ? raw.sessionId : undefined,
    skillsApplied: Array.isArray(raw.skillsApplied)
      ? raw.skillsApplied.filter((id): id is string => typeof id === "string")
      : undefined,
    toolsInvoked: Array.isArray(raw.toolsInvoked)
      ? raw.toolsInvoked.filter((id): id is string => typeof id === "string")
      : undefined,
    llm: isRecord(raw.llm)
      ? {
          configured: raw.llm.configured === true,
          usedFor:
            raw.llm.usedFor === "intent" || raw.llm.usedFor === "paraphrase" ? raw.llm.usedFor : "none",
          fallback: typeof raw.llm.fallback === "string" ? raw.llm.fallback : undefined,
        }
      : undefined,
    evals: parseEvals(raw.evals),
    trace: parseTrace(raw.trace),
  };
}

function parseTrace(raw: unknown): AgentAnswer["trace"] {
  if (!Array.isArray(raw)) return undefined;
  const steps: AgentTraceStep[] = [];
  for (const item of raw) {
    if (!isRecord(item) || (item.kind !== "think" && item.kind !== "tool")) continue;
    if (typeof item.title !== "string" || typeof item.detail !== "string") continue;
    steps.push({ kind: item.kind, title: item.title, detail: item.detail });
  }
  return steps;
}

function parseEvals(raw: unknown): AgentAnswer["evals"] {
  if (!isRecord(raw) || typeof raw.passed !== "number" || typeof raw.total !== "number" || !Array.isArray(raw.checks)) {
    return undefined;
  }
  const checks = [];
  for (const item of raw.checks) {
    if (!isRecord(item) || typeof item.id !== "string" || typeof item.pass !== "boolean" || typeof item.detail !== "string") {
      continue;
    }
    checks.push({ id: item.id, pass: item.pass, detail: item.detail });
  }
  return { passed: raw.passed, total: raw.total, checks };
}
