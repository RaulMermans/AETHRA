import { createLlmProviderFromEnv, llmFlagsFromEnv } from "@/lib/agent/llm/openai-compatible";
import { AGENT_SKILLS } from "@/lib/agent/skills/catalog";
import { AGENT_TOOL_NAMES } from "@/lib/agent/tools/catalog";

export const runtime = "nodejs";

export async function GET(): Promise<Response> {
  const llm = createLlmProviderFromEnv();
  const flags = llmFlagsFromEnv();
  return Response.json({
    name: "TARO",
    llm: { configured: llm.configured, intent: flags.intent, paraphrase: flags.paraphrase, provider: llm.id },
    tools: AGENT_TOOL_NAMES,
    skills: AGENT_SKILLS.map((s) => s.id),
    evals: { offline: "/api/aethra/evals", runtime: "attached to each /api/aethra/ask" },
    face: "slot-ready",
  });
}
