import { findMapPinById, STUDY_REGIONS } from "../ask.ts";
import { cardById, cardFor, type EvidenceCatalog } from "../cards.ts";
import { lookupKnowledge } from "../knowledge/catalog.ts";
import {
  appendResearchNote,
  findRegionalScope,
  readRecentResearchNotes,
  readTaroMarkdown,
} from "../markdown-brain.ts";
import { buildVisualizationContext } from "../visualization-context.ts";

export const AGENT_TOOL_NAMES = [
  "retrieve_evidence",
  "list_study_regions",
  "get_evidence_card",
  "get_map_focus",
  "lookup_knowledge",
  "query_regional_climate",
  "query_visualization_data",
  "read_markdown_brain",
  "append_research_note",
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
    case "query_regional_climate": {
      const query = typeof a.query === "string" ? a.query : "";
      const hit = findRegionalScope(query);
      if (!hit) return { ok: false, tool: name, data: { error: "No regional scope matched" } };
      return { ok: true, tool: name, data: { ...hit } };
    }
    case "query_visualization_data": {
      const question = typeof a.question === "string" ? a.question : "";
      const regionScope = typeof a.regionScope === "string" ? a.regionScope : undefined;
      const digest = buildVisualizationContext({ question, regionScope });
      return {
        ok: true,
        tool: name,
        data: {
          scopeKey: digest.scopeDigest?.scopeKey ?? "age",
          scopeName: digest.scopeDigest?.name ?? "Peninsula + Balearics",
          metricsCount: Object.keys(digest.scopeDigest?.metrics ?? {}).length,
          hasStation: Boolean(digest.stationDigest),
          hasBasins: Boolean(digest.basinDigests?.length),
          hasReservoirs: Boolean(digest.reservoirDigests?.length),
          hasSolarScreening: Boolean(digest.solarScreening),
          hasSolarCapacity: Boolean(digest.solarCapacity),
          hasRelationships: Boolean(digest.relationships),
          hasDust: Boolean(digest.dust),
          hasInfrastructure: Boolean(digest.infrastructure),
        },
      };
    }
    case "read_markdown_brain": {
      const file =
        a.file === "SOUL.md" || a.file === "KNOWLEDGE.md" || a.file === "RESEARCH_NOTES.md"
          ? a.file
          : "KNOWLEDGE.md";
      const content = file === "RESEARCH_NOTES.md" ? readRecentResearchNotes(15) : readTaroMarkdown(file).slice(0, 1200);
      return { ok: true, tool: name, data: { file, excerptLength: content.length } };
    }
    case "append_research_note": {
      const scope = typeof a.scope === "string" ? a.scope : "general";
      const question = typeof a.question === "string" ? a.question : "";
      const summary = typeof a.summary === "string" ? a.summary : "";
      const saved = appendResearchNote({ scope, question, summary });
      return { ok: true, tool: name, data: { saved, file: "data/taro/RESEARCH_NOTES.md" } };
    }
    default: {
      const exhaustive: never = name;
      return exhaustive;
    }
  }
}
