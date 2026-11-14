import { AGENT_INTENTS } from "../types.ts";
import { skillPromptBlock } from "../skills/catalog.ts";
import { AGENT_TOOL_NAMES } from "../tools/catalog.ts";

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
