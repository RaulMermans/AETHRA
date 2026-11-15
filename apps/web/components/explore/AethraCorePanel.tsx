"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { parseAgentAnswer } from "@/lib/agent/parse-answer";
import type { AgentAnswer, AgentSuggestedAction, ConversationTurn } from "@/lib/agent/types";
import { useLocale } from "@/lib/i18n/locale";
import type { Messages } from "@/lib/i18n/messages";
import { AethraCoreFace } from "./AethraCoreFace";
import type { CoreVisualState } from "./AethraCoreMark";
import { Icon } from "./Icon";

const CHAT_STORAGE_KEY = "aethra.taro.chat.v1";

type ChatItem = {
  id: string;
  role: "user" | "core";
  text: string;
  answer?: AgentAnswer;
};

type StoredTaroChat = {
  sessionId: string;
  items: ChatItem[];
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function loadStoredChat(): StoredTaroChat | null {
  try {
    const rawStr = localStorage.getItem(CHAT_STORAGE_KEY);
    if (!rawStr) return null;
    const raw: unknown = JSON.parse(rawStr);
    if (!isRecord(raw) || typeof raw.sessionId !== "string" || !Array.isArray(raw.items)) {
      return null;
    }
    const items: ChatItem[] = [];
    for (const entry of raw.items) {
      if (!isRecord(entry)) continue;
      if (typeof entry.id !== "string" || typeof entry.text !== "string") continue;
      if (entry.role !== "user" && entry.role !== "core") continue;
      let answer: AgentAnswer | undefined;
      if (entry.answer !== undefined) {
        try {
          answer = parseAgentAnswer(entry.answer);
        } catch {
          answer = undefined;
        }
      }
      items.push({ id: entry.id, role: entry.role, text: entry.text, answer });
    }
    return { sessionId: raw.sessionId, items };
  } catch {
    return null;
  }
}

function saveStoredChat(sessionId: string, items: readonly ChatItem[]): void {
  try {
    const payload: StoredTaroChat = { sessionId, items: [...items] };
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* ignore storage quota or private browsing errors */
  }
}

function visualState(loading: boolean, error: string | null, last?: AgentAnswer): CoreVisualState {
  if (loading) return "investigating";
  if (error) return "insufficient";
  if (!last) return "idle";
  if (
    last.status === "SUPPORTED" ||
    last.status === "DESCRIPTIVE" ||
    (last.status === "NOT_AVAILABLE" && (last.toolsInvoked ?? []).includes("query_regional_climate"))
  ) {
    return "ready";
  }
  return "insufficient";
}

function stateLabel(state: CoreVisualState, t: Messages["taro"]): string {
  switch (state) {
    case "idle":
      return t.ready;
    case "investigating":
      return t.investigating;
    case "insufficient":
      return t.insufficient;
    case "ready":
      return t.answerReady;
    default: {
      const exhaustive: never = state;
      return exhaustive;
    }
  }
}

function actionLabel(type: AgentSuggestedAction["type"], t: Messages["taro"]): string {
  switch (type) {
    case "OPEN_EVIDENCE_CARD":
      return t.openEvidence;
    case "FLY_TO_REGION":
      return t.showMap;
    case "SHOW_TIME_SERIES":
      return t.showSeries;
    default: {
      const exhaustive: never = type;
      return exhaustive;
    }
  }
}

export function AethraCorePanel({
  open,
  regionScope,
  onClose,
  onAction,
}: {
  open: boolean;
  regionScope: string | undefined;
  onClose: () => void;
  onAction: (action: AgentSuggestedAction) => void;
}) {
  const { locale, m } = useLocale();
  const t = m.taro;
  const inputId = useId();
  const listRef = useRef<HTMLDivElement>(null);
  const turnRefs = useRef<Map<string, HTMLElement>>(new Map());
  const sessionRef = useRef<string>("");
  const hydratedRef = useRef(false);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<ChatItem[]>([]);
  const [activeTurnIdx, setActiveTurnIdx] = useState(0);

  const userTurnIds = useMemo(
    () => items.filter((i) => i.role === "user").map((i) => i.id),
    [items],
  );

  useEffect(() => {
    const stored = loadStoredChat();
    if (stored && stored.sessionId) {
      sessionRef.current = stored.sessionId;
      if (stored.items.length > 0) {
        setItems(stored.items);
        const userCount = stored.items.filter((i) => i.role === "user").length;
        setActiveTurnIdx(Math.max(0, userCount - 1));
      }
    } else if (!sessionRef.current) {
      sessionRef.current = crypto.randomUUID();
    }
    hydratedRef.current = true;
  }, []);

  useEffect(() => {
    if (!hydratedRef.current) return;
    if (!sessionRef.current) sessionRef.current = crypto.randomUUID();
    saveStoredChat(sessionRef.current, items);
  }, [items]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [items.length, loading, open]);

  const lastAnswer = [...items].reverse().find((i) => i.answer)?.answer;
  const state = visualState(loading, error, lastAnswer);

  const conversation: ConversationTurn[] = items.map((i) => ({ role: i.role, text: i.text }));

  const jumpToTurn = (nextIdx: number) => {
    if (userTurnIds.length === 0) return;
    const bounded = Math.max(0, Math.min(userTurnIds.length - 1, nextIdx));
    setActiveTurnIdx(bounded);
    const id = userTurnIds[bounded];
    if (!id) return;
    const el = turnRefs.current.get(id);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleNewChat = () => {
    const nextSession = crypto.randomUUID();
    sessionRef.current = nextSession;
    setItems([]);
    setError(null);
    setQuestion("");
    setActiveTurnIdx(0);
    saveStoredChat(nextSession, []);
  };

  const ask = async (text: string) => {
    const q = text.trim();
    if (!q || loading) return;
    setQuestion("");
    setLoading(true);
    setError(null);
    const nextTurnIndex = userTurnIds.length;
    setItems((prev) => [...prev, { id: crypto.randomUUID(), role: "user", text: q }]);
    setActiveTurnIdx(nextTurnIndex);
    try {
      const res = await fetch("/api/aethra/ask", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          question: q,
          session: { regionScope, sessionId: sessionRef.current },
          conversation,
          language: locale,
        }),
      });
      const raw: unknown = await res.json();
      if (!res.ok) {
        const message =
          typeof raw === "object" && raw && "error" in raw && typeof raw.error === "string"
            ? raw.error
            : t.requestFailed;
        setError(message);
        return;
      }
      const answer = parseAgentAnswer(raw);
      setItems((prev) => [...prev, { id: crypto.randomUUID(), role: "core", text: answer.responseText, answer }]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t.unavailable);
    } finally {
      setLoading(false);
    }
  };

  const clampedTurnIdx =
    userTurnIds.length === 0 ? 0 : Math.min(activeTurnIdx, userTurnIds.length - 1);

  return (
    <section
      id="taro"
      aria-label={t.aria}
      aria-hidden={!open}
      className={`panel pointer-events-auto flex h-full min-h-0 w-full flex-col overflow-hidden p-3 ${
        open ? "" : "hidden"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2 text-ink">
          <AethraCoreFace />
          <div className="min-w-0">
            <h2 className="text-[12px] font-medium tracking-wide">TARO</h2>
            <p className="truncate font-mono text-[10px] text-faint uppercase">{stateLabel(state, t)}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {userTurnIds.length > 0 && (
            <div className="flex items-center gap-0.5 rounded-md border border-line/70 bg-black/25 px-1 py-0.5">
              <button
                type="button"
                onClick={() => jumpToTurn(clampedTurnIdx - 1)}
                disabled={clampedTurnIdx <= 0}
                aria-label={t.prevTurn}
                title={t.prevTurn}
                className="focus-ring grid size-5 place-items-center rounded text-muted hover:bg-white/8 hover:text-ink disabled:opacity-35"
              >
                <Icon name="chevron" className="size-3 rotate-180" />
              </button>
              <span className="px-1 font-mono text-[10px] text-faint select-none">
                {clampedTurnIdx + 1}/{userTurnIds.length}
              </span>
              <button
                type="button"
                onClick={() => jumpToTurn(clampedTurnIdx + 1)}
                disabled={clampedTurnIdx >= userTurnIds.length - 1}
                aria-label={t.nextTurn}
                title={t.nextTurn}
                className="focus-ring grid size-5 place-items-center rounded text-muted hover:bg-white/8 hover:text-ink disabled:opacity-35"
              >
                <Icon name="chevron" className="size-3" />
              </button>
            </div>
          )}
          {items.length > 0 && (
            <button
              type="button"
              onClick={handleNewChat}
              disabled={loading}
              aria-label={t.newChat}
              title={t.newChat}
              className="focus-ring inline-flex items-center gap-1 rounded-md border border-line/70 bg-black/25 px-2 py-1 text-[10px] font-medium text-muted hover:bg-white/8 hover:text-ink disabled:opacity-40"
            >
              <Icon name="plus" className="size-3" />
              <span>{t.newChat}</span>
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label={t.close}
            title={t.close}
            className="focus-ring grid size-7 place-items-center rounded-md text-muted hover:bg-white/6 hover:text-ink"
          >
            <Icon name="close" className="size-3.5" />
          </button>
        </div>
      </div>

      <div ref={listRef} className="mt-2 min-h-0 flex-1 space-y-2 overflow-y-auto" role="log" aria-live="polite">
        {items.length === 0 ? (
          <div className="space-y-2">
            <p className="text-[11px] text-muted">{t.intro}</p>
            <div className="flex flex-col gap-1">
              {t.starters.map((starter) => (
                <button
                  key={starter}
                  type="button"
                  onClick={() => void ask(starter)}
                  className="focus-ring rounded-md border border-line px-2 py-1.5 text-left text-[11px] text-ink hover:bg-white/6"
                >
                  {starter}
                </button>
              ))}
            </div>
          </div>
        ) : null}
        {items.map((item) => (
          <article
            key={item.id}
            ref={(el) => {
              if (el) turnRefs.current.set(item.id, el);
              else turnRefs.current.delete(item.id);
            }}
            className={
              item.role === "user"
                ? "ml-6 rounded-md bg-white/8 px-2 py-1.5"
                : "mr-2 rounded-md bg-black/25 px-2 py-1.5"
            }
          >
            <p className="text-[10px] tracking-[0.12em] text-faint uppercase">
              {item.role === "user" ? t.you : "TARO"}
            </p>
            <p className="mt-1 text-[12px] leading-relaxed text-ink">{item.text}</p>
            {item.answer?.trace?.length ? (
              <details className="mt-1.5 rounded border border-line/60 bg-black/30 px-2 py-1 text-[10px] text-muted">
                <summary className="cursor-pointer font-mono uppercase tracking-wider text-faint select-none">
                  TARO Brain · {item.answer.toolsInvoked?.length ?? 0} tools ·{" "}
                  {item.answer.llm?.usedFor === "paraphrase" ? "LLM active" : "Markdown Core"}
                </summary>
                <ul className="mt-1 space-y-0.5 text-[10px] leading-snug">
                  {item.answer.trace.map((step, idx) => (
                    <li key={`${item.id}-trace-${idx}`}>
                      <span className="font-mono text-ink/90">
                        [{step.kind}] {step.title}:
                      </span>{" "}
                      {step.detail}
                    </li>
                  ))}
                </ul>
              </details>
            ) : null}
            {item.answer?.suggestedActions.length ? (
              <div className="mt-1 flex flex-wrap gap-1">
                {item.answer.suggestedActions.map((action) => (
                  <button
                    key={`${item.id}-${action.type}-${action.targetId}`}
                    type="button"
                    onClick={() => onAction(action)}
                    className="focus-ring rounded-md border border-line px-2 py-1 text-[11px] text-ink hover:bg-white/6"
                  >
                    {action.label ?? actionLabel(action.type, t)}
                  </button>
                ))}
              </div>
            ) : null}
          </article>
        ))}
        {loading ? <p className="text-[11px] text-faint">{t.investigatingLine}</p> : null}
        {error ? (
          <p role="alert" className="text-[12px] text-amber-100">
            {error}. {t.noInvention}
          </p>
        ) : null}
      </div>

      <form
        className="mt-2 flex gap-1"
        onSubmit={(e) => {
          e.preventDefault();
          void ask(question);
        }}
      >
        <label htmlFor={inputId} className="sr-only">
          {t.question}
        </label>
        <input
          id={inputId}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={t.placeholder}
          className="focus-ring min-w-0 flex-1 rounded-md border border-line bg-black/30 px-2 py-1.5 text-[12px] text-ink"
        />
        <button
          type="submit"
          disabled={loading || question.trim().length === 0}
          className="focus-ring rounded-md bg-accent/90 px-2.5 py-1.5 text-[12px] font-medium text-accent-ink hover:bg-accent disabled:opacity-40"
        >
          {t.ask}
        </button>
      </form>
    </section>
  );
}
