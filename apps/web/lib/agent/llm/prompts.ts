import { readRecentResearchNotes, readTaroMarkdown, type RegionalScopeDigest } from "../markdown-brain.ts";
import { skillPromptBlock } from "../skills/catalog.ts";
import { AGENT_TOOL_NAMES } from "../tools/catalog.ts";
import { AGENT_INTENTS, type AgentAnswer } from "../types.ts";
import type { VisualizationContextDigest } from "../visualization-context.ts";

export function intentSystemPrompt(): string {
  return [
    "Propose an intent for TARO. Return JSON only: {\"intent\":\"...\",\"regionScope\":\"age\"}.",
    `intent must be one of: ${AGENT_INTENTS.join(", ")}.`,
    "regionScope is optional and must be age or ccaa:ES11|ES41|ES24|ES61.",
    "You cannot invent evidence. You cannot call tools that are not listed.",
    `Allowed tools (do not call them here): ${AGENT_TOOL_NAMES.join(", ")}.`,
    skillPromptBlock(),
  ].join("\n\n");
}

export function paraphraseSystemPrompt(): string {
  return [
    "You are TARO speaking after a tool loop. Return JSON only: {\"responseText\":\"...\"}.",
    "Sound like an investigator handing someone a pin on a globe, not a policy FAQ. First person. Short. Keep every number, unit and outcome. Do not add numbers. Do not say where to build. You may invite them to inspect a research case.",
    skillPromptBlock(),
  ].join("\n\n");
}

export function agenticReasoningPrompt(opts: {
  truth: AgentAnswer;
  regionalScope?: RegionalScopeDigest;
  visualizationContext?: VisualizationContextDigest;
}): string {
  const soul = readTaroMarkdown("SOUL.md");
  const knowledge = readTaroMarkdown("KNOWLEDGE.md");
  const recentNotes = readRecentResearchNotes(8);
  const scopeBlock = opts.regionalScope
    ? `\n## Precomputed Regional Climate Scope (climate-bundle.json)\n${JSON.stringify(opts.regionalScope)}`
    : "";
  const vizSummary =
    opts.visualizationContext
      ? opts.truth.language === "es"
        ? opts.visualizationContext.summaryEs
        : opts.visualizationContext.summaryEn
      : "";
  const vizBlock = vizSummary
    ? `\n## Transformed Visualization Data Context (Real Precomputed Bundle Data)\n${vizSummary}`
    : "";
  return [
    soul,
    "## Knowledge Base Reference",
    knowledge,
    "## Recent Research Notes (RESEARCH_NOTES.md)",
    recentNotes || "(No notes recorded yet)",
    scopeBlock,
    vizBlock,
    "## Output Contract (Strict JSON)",
    "Think like TARO and return a single JSON object with keys:",
    '- "thought": 1 short sentence describing your reasoning and which Markdown/bundle/visualization sources you consulted.',
    '- "responseText": Write an intelligent, natural, conversational answer in "' + opts.truth.language + '" directly addressing the user\'s question using your Knowledge Base, the Baseline Evidence Payload, and the Transformed Visualization Data Context. Do NOT copy-paste the baseline responseText verbatim—synthesize and explain clearly like an expert field scientist.',
    '  CRITICAL NUMERICAL RULE: If the Baseline Evidence Payload has findings (findings.length > 0), you MUST include every exact number from findings[].claim verbatim in your responseText, and you MUST NOT introduce any new digits that do not appear in the Baseline Evidence Payload, the Transformed Visualization Data Context, or the question. Keep strict provenance and EXPLORATORY labels where indicated.',
    '- "noteToSave": A concise 1-sentence research note to append to data/taro/RESEARCH_NOTES.md summarizing what the user asked and what was concluded (or "" if trivial).',
  ].join("\n\n");
}
