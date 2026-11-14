import type { AgentIntent, ConversationTurn } from "../types.ts";

export type SessionMemory = {
  id: string;
  regionScope?: string;
  lastIntent?: AgentIntent;
  lastEvidenceIds: string[];
  turns: ConversationTurn[];
  updatedAt: number;
};

const MAX_TURNS = 12;
const sessions = new Map<string, SessionMemory>();

export function getSession(id: string): SessionMemory | undefined {
  return sessions.get(id);
}

export function rememberTurn(
  id: string,
  patch: Partial<Pick<SessionMemory, "regionScope" | "lastIntent" | "lastEvidenceIds">> & {
    turns?: ConversationTurn[];
  },
): SessionMemory {
  const prev = sessions.get(id) ?? { id, lastEvidenceIds: [], turns: [], updatedAt: Date.now() };
  const turns = [...prev.turns, ...(patch.turns ?? [])].slice(-MAX_TURNS);
  const next: SessionMemory = {
    ...prev,
    ...patch,
    lastEvidenceIds: patch.lastEvidenceIds ?? prev.lastEvidenceIds,
    turns,
    updatedAt: Date.now(),
  };
  sessions.set(id, next);
  return next;
}

export function sessionSnapshot(id: string): Pick<SessionMemory, "regionScope" | "lastIntent" | "lastEvidenceIds"> | undefined {
  const s = sessions.get(id);
  if (!s) return undefined;
  return { regionScope: s.regionScope, lastIntent: s.lastIntent, lastEvidenceIds: s.lastEvidenceIds };
}
