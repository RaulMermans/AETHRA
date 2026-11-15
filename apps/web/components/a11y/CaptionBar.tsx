"use client";

/**
 * On-screen captions for everything AETHRA says out loud (lib/a11y/speak.ts).
 *
 * - Shows the exact text passed to speak() the moment speech starts — for everyone, because captions
 *   help in noisy rooms too — and keeps it readable after speech ends (longer in deaf mode).
 * - aria-live="off": screen-reader users already hear the synthesised voice; a live region here would
 *   read the same sentence twice.
 * - High contrast (white on near-black, > 15:1), no animation or flashing (WCAG 2.3.1), dismissible.
 *   Closing only hides the text; it does not stop the voice (that is the read-aloud button's job).
 */

import { useEffect, useRef, useState } from "react";
import { onSpeech } from "@/lib/a11y/speak";

/** How long the caption stays after speech ends: always ≥ 5 s of total reading time. */
const LINGER_MS = 2500;
const LINGER_DEAF_MS = 8000;
const MIN_VISIBLE_MS = 5000;

type Caption = { text: string; speaking: boolean };

export function CaptionBar({ deaf }: { deaf: boolean }) {
  const [caption, setCaption] = useState<Caption | null>(null);
  const [lang, setLang] = useState("en");
  const hideTimer = useRef<number | undefined>(undefined);
  const deafRef = useRef(deaf);
  useEffect(() => {
    deafRef.current = deaf;
  }, [deaf]);

  useEffect(() => {
    const clear = () => {
      if (hideTimer.current !== undefined) window.clearTimeout(hideTimer.current);
      hideTimer.current = undefined;
    };
    let shown: { text: string; at: number } | null = null;
    const unsubscribe = onSpeech(({ text, state }) => {
      clear();
      setLang(document.documentElement.lang || "en");
      if (state === "start") {
        shown = { text, at: Date.now() };
        setCaption({ text, speaking: true });
        return;
      }
      if (!shown || shown.text !== text) return; // "end" of an utterance that was already replaced
      const linger = deafRef.current ? LINGER_DEAF_MS : LINGER_MS;
      const wait = Math.max(linger, MIN_VISIBLE_MS - (Date.now() - shown.at));
      setCaption((c) => (c && c.text === text ? { ...c, speaking: false } : c));
      hideTimer.current = window.setTimeout(() => {
        shown = null;
        setCaption(null);
      }, wait);
    });
    return () => {
      clear();
      unsubscribe();
    };
  }, []);

  if (!caption) return null;
  const es = lang.startsWith("es");

  return (
    <div
      aria-live="off"
      data-testid="a11y-captions"
      data-speaking={caption.speaking ? "true" : "false"}
      className="fixed inset-x-0 bottom-4 z-[110] flex justify-center px-4"
    >
      <figure
        className="flex w-full max-w-3xl items-start gap-3 rounded-lg border border-white/40 bg-neutral-950 px-4 py-3 text-white shadow-xl"
        aria-label={es ? "Subtítulos" : "Captions"}
      >
        <span
          aria-hidden="true"
          className="mt-0.5 shrink-0 rounded border border-white/60 px-1.5 text-xs font-bold tracking-wide"
          title={es ? "Subtítulos" : "Captions"}
        >
          CC
        </span>
        <figcaption
          lang={es ? "es" : "en"}
          className="max-h-40 flex-1 overflow-y-auto text-base leading-relaxed font-medium"
          data-testid="a11y-caption-text"
        >
          {caption.text}
        </figcaption>
        <button
          type="button"
          onClick={() => {
            if (hideTimer.current !== undefined) window.clearTimeout(hideTimer.current);
            setCaption(null);
          }}
          className="shrink-0 rounded border border-white/60 px-2 py-0.5 text-sm font-semibold hover:bg-white hover:text-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          aria-label={es ? "Cerrar subtítulos" : "Close captions"}
        >
          ✕
        </button>
      </figure>
    </div>
  );
}
