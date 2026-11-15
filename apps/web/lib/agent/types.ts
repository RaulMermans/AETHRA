export const AGENT_STATUSES = [
  "SUPPORTED",
  "DESCRIPTIVE",
  "INSUFFICIENT_EVIDENCE",
  "NOT_AVAILABLE",
  "OUT_OF_DOMAIN",
] as const;

export type AgentStatus = (typeof AGENT_STATUSES)[number];

export const AGENT_INTENTS = [
  "temperature_trend",
  "joint_low_trend",
  "compare_joint_low",
  "nasa_evidence",
  "precipitation_trend",
  "research_gap",
  "research_case",
  "explain_mechanism",
  "mixed_warming_pv",
  "infrastructure_metadata",
  "unsupported_forecast",
  "investment_advice",
  "prompt_injection",
  "invent_source",
  "out_of_domain",
] as const;

export type AgentIntent = (typeof AGENT_INTENTS)[number];

export const AGENT_ACTION_TYPES = [
  "OPEN_EVIDENCE_CARD",
  "FLY_TO_REGION",
  "SHOW_TIME_SERIES",
] as const;

export type AgentActionType = (typeof AGENT_ACTION_TYPES)[number];

export type AgentLanguage = "en" | "es";

export type AgentFinding = {
  claim: string;
  variable?: string;
  units?: string;
  period?: string;
  evidenceId: string;
  provenanceId: string;
};

export type AgentSuggestedAction = {
  type: AgentActionType;
  targetId: string;
  label?: string;
  latitude?: number;
  longitude?: number;
};

export type AgentLlmTrace = {
  configured: boolean;
  usedFor: "none" | "intent" | "paraphrase";
  fallback?: string;
};

export type AgentTraceStep = {
  kind: "think" | "tool";
  title: string;
  detail: string;
};

export type AgentAnswer = {
  status: AgentStatus;
  intent: AgentIntent;
  question: string;
  language: AgentLanguage;
  scope: {
    regionId?: string;
    regionName?: string;
    spatialSupport?: string;
  };
  findings: AgentFinding[];
  limitations: string[];
  suggestedActions: AgentSuggestedAction[];
  responseText: string;
  sessionId?: string;
  skillsApplied?: string[];
  toolsInvoked?: string[];
  llm?: AgentLlmTrace;
  evals?: AgentRuntimeEval;
  trace?: readonly AgentTraceStep[];
};

export type AgentEvalCheck = {
  id: string;
  pass: boolean;
  detail: string;
};

export type AgentRuntimeEval = {
  passed: number;
  total: number;
  checks: AgentEvalCheck[];
};

export type ConversationTurn = {
  role: "user" | "core";
  text: string;
};

export type AgentViewContext = {
  dimension?: string;
  year?: number;
  mode?: "value" | "trend";
  workspaceMode?: "climate" | "energy";
  activeTool?: string | null;
  screeningOpen?: boolean;
  selectedCoord?: { lat: number; lon: number };
  selectedCellId?: string;
  selectedPlantName?: string;
  selectedInstallationId?: string;
  energyConcept?: string;
};

export type AgentSession = {
  sessionId?: string;
  regionScope?: string;
  viewContext?: AgentViewContext;
};

export type AskRequest = {
  question: string;
  session: AgentSession;
  conversation?: readonly ConversationTurn[];
  /** Interface language. When set, it overrides detection from the question text. */
  language?: AgentLanguage;
};
