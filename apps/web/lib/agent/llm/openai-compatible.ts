import { disabledLlmProvider, type LlmJson, type LlmProvider } from "./provider.ts";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function extractJson(text: string): LlmJson {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("LLM returned no JSON object");
  const raw: unknown = JSON.parse(text.slice(start, end + 1));
  if (!isRecord(raw)) throw new Error("LLM JSON was not an object");
  return raw;
}

export function createOpenAiCompatibleProvider(opts: {
  baseUrl: string;
  apiKey: string;
  model: string;
}): LlmProvider {
  return {
    id: "openai-compatible",
    configured: true,
    completeJson: async (request) => {
      const url = `${opts.baseUrl.replace(/\/$/, "")}/chat/completions`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${opts.apiKey}`,
        },
        body: JSON.stringify({
          model: opts.model,
          temperature: 0,
          messages: [
            { role: "system", content: request.system },
            { role: "user", content: request.user },
          ],
        }),
      });
      if (!res.ok) throw new Error(`LLM HTTP ${res.status}`);
      const body: unknown = await res.json();
      if (!isRecord(body) || !Array.isArray(body.choices) || !isRecord(body.choices[0])) {
        throw new Error("LLM response missing choices");
      }
      const message = isRecord(body.choices[0].message) ? body.choices[0].message : null;
      if (!message || typeof message.content !== "string") throw new Error("LLM response missing content");
      return extractJson(message.content);
    },
  };
}

export function createLlmProviderFromEnv(): LlmProvider {
  const baseUrl = process.env.AETHRA_LLM_BASE_URL?.trim();
  const apiKey = process.env.AETHRA_LLM_API_KEY?.trim();
  const model = process.env.AETHRA_LLM_MODEL?.trim();
  if (!baseUrl || !apiKey || !model) return disabledLlmProvider;
  return createOpenAiCompatibleProvider({ baseUrl, apiKey, model });
}

export function llmFlagsFromEnv(): { intent: boolean; paraphrase: boolean } {
  return {
    intent: process.env.AETHRA_LLM_ENABLE_INTENT === "1",
    paraphrase: process.env.AETHRA_LLM_ENABLE_PARAPHRASE === "1",
  };
}
