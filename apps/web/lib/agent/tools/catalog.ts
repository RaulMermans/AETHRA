import { findMapPinById, STUDY_REGIONS } from "../ask.ts";
import { cardById, cardFor, type EvidenceCatalog } from "../cards.ts";
import { lookupKnowledge } from "../knowledge/catalog.ts";

export const AGENT_TOOL_NAMES = [
  "retrieve_evidence",
  "list_study_regions",
  "get_evidence_card",
  "get_map_focus",
  "lookup_knowledge",
] as const;
export type AgentToolName = (typeof AGENT_TOOL_NAMES)[number];

export type ToolJson = Record<string, unknown>;

export type ToolResult = {
  ok: boolean;
  tool: string;
  data: ToolJson;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

export function isAgentToolName(v: unknown): v is AgentToolName {
  return typeof v === "string" && (AGENT_TOOL_NAMES as readonly string[]).includes(v);
}

export function runAgentTool(name: unknown, args: unknown, catalog: EvidenceCatalog): ToolResult {
  if (!isAgentToolName(name)) {
    return { ok: false, tool: typeof name === "string" ? name : "unknown", data: { error: "Tool is not on the allowlist." } };
  }
  const a = isRecord(args) ? args : {};
  switch (name) {
    case "list_study_regions":
      return {
        ok: true,
        tool: name,
        data: {
          regions: STUDY_REGIONS.map((r) => {
            return {
              scope: r.scope,
              name: r.name,
              dest: r.dest,
              latitude: r.latitude,
              longitude: r.longitude,
            };
          }),
        },
      };
    case "get_map_focus": {
      const id = typeof a.id === "string" ? a.id : "";
      const region = STUDY_REGIONS.find((r) => r.dest === id || r.scope === id);
      const pin = findMapPinById(id);
      const hit = region
        ? { id: region.dest, name: region.name, latitude: region.latitude, longitude: region.longitude }
        : pin
          ? { id: pin.id, name: pin.name, latitude: pin.latitude, longitude: pin.longitude }
          : undefined;
      if (!hit) return { ok: false, tool: name, data: { error: "Unknown map focus id" } };
      return {
        ok: true,
        tool: name,
        data: {
          ...hit,
          note: "Camera centre, not a recommended construction site.",
        },
      };
    }
    case "get_evidence_card": {
      if (typeof a.id !== "string") return { ok: false, tool: name, data: { error: "id is required" } };
      const card = cardById(catalog, a.id);
      if (!card) return { ok: false, tool: name, data: { error: "Unknown evidence id" } };
      return { ok: true, tool: name, data: { id: card.id, scope: card.region.scope, outcome: card.outcome } };
    }
    case "lookup_knowledge": {
      const id = typeof a.id === "string" ? a.id : "";
      const hit = lookupKnowledge(id);
      if (!hit.ok) return { ok: false, tool: name, data: { error: hit.error ?? "Unknown knowledge claim" } };
      return { ok: true, tool: name, data: { ...hit } };
    }
    case "retrieve_evidence": {
      const topic = a.topic === "temperature" || a.topic === "joint_low" ? a.topic : null;
      const scope = typeof a.scope === "string" ? a.scope : "age";
      if (!topic) return { ok: false, tool: name, data: { error: "topic must be temperature or joint_low" } };
      const card = cardFor(catalog, topic, scope);
      if (!card) return { ok: false, tool: name, data: { error: "No card for that topic and scope" } };
      return { ok: true, tool: name, data: { id: card.id, scope: card.region.scope, outcome: card.outcome } };
    }
    default: {
      const exhaustive: never = name;
      return exhaustive;
    }
  }
}
