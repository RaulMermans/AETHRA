"use client";

import { useEffect, useRef, useState } from "react";
import { isSpeaking, onSpeech, speak, stopSpeaking } from "@/lib/a11y/speak";
import { useAccessibility } from "@/lib/a11y/accessibility";
import { useLocale } from "@/lib/i18n/locale";
import { blindCopy } from "@/lib/i18n/a11y-blind-copy";

/**
 * Reads a plain-language text with the browser voice in the current language (lib/a11y/speak.ts,
 * which also shows it as a caption). Press again to stop. State changes are announced politely.
 */
export function ReadAloudButton({ text, what, className = "" }: { text: string | (() => string); what: string; className?: string }) {
  const { locale } = useLocale();
  const { announce } = useAccessibility();
  const c = blindCopy(locale);
  const [active, setActive] = useState(false);
  const mine = useRef("");
  const activeRef = useRef(false);
  activeRef.current = active;

  useEffect(
    () =>
      onSpeech((e) => {
        if (e.text === mine.current) setActive(e.state === "start");
        else if (e.state === "start") setActive(false);
      }),
    [],
  );
  // Leaving the card stops its voice.
  useEffect(
    () => () => {
      if (activeRef.current && isSpeaking()) stopSpeaking();
    },
    [],
  );

  return (
    <button
      type="button"
      data-read-aloud
      aria-label={active ? c.stopReading : c.readAloudAria(what)}
      title={active ? c.stopReading : c.readAloud}
      aria-pressed={active}
      onClick={() => {
        if (active) {
          stopSpeaking();
          setActive(false);
          announce(c.readingStopped);
          return;
        }
        const raw = (typeof text === "function" ? text() : text).replace(/\s+/g, " ").trim();
        if (!raw) return;
        mine.current = raw;
        announce(c.readingStarted);
        speak(raw, { lang: locale });
      }}
      className={`focus-ring inline-grid size-7 shrink-0 place-items-center rounded-md border border-line text-muted hover:bg-white/6 hover:text-ink aria-pressed:border-accent aria-pressed:text-accent ${className}`}
    >
      {active ? (
        <svg viewBox="0 0 24 24" fill="currentColor" className="size-3.5" aria-hidden>
          <path d="M7 7h10v10H7z" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="size-3.5" aria-hidden>
          <path d="M4 9v6h4l5 4V5L8 9H4z" />
          <path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" />
        </svg>
      )}
    </button>
  );
}
