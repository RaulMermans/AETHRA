import { KNOWLEDGE_CLAIMS, claimById } from "./claims.ts";
import { KNOWLEDGE_CONCEPTS } from "./concepts.ts";
import { KNOWLEDGE_SOURCES, sourceById } from "./sources.ts";

export function lookupKnowledge(id: string): {
  ok: boolean;
  claimId: string;
  text?: string;
  scientificStatus?: string;
  evidenceId?: string;
  sources?: string[];
  error?: string;
} {
  const claim = claimById(id);
  if (!claim) return { ok: false, claimId: id, error: "Unknown knowledge claim" };
  return {
    ok: true,
    claimId: claim.id,
    text: claim.text,
    scientificStatus: claim.scientificStatus,
    evidenceId: claim.evidenceId,
    sources: claim.sourceIds.map((sid) => sourceById(sid)?.locator ?? sid),
  };
}

export function knowledgeInventory(): {
  sources: number;
  concepts: number;
  claims: number;
  tierA: number;
} {
  return {
    sources: KNOWLEDGE_SOURCES.length,
    concepts: KNOWLEDGE_CONCEPTS.length,
    claims: KNOWLEDGE_CLAIMS.length,
    tierA: KNOWLEDGE_SOURCES.filter((s) => s.tier === "A").length,
  };
}
