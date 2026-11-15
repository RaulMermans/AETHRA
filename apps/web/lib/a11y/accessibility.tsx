"use client";

/**
 * Inclusive mode (shared contract for all accessibility features).
 *
 * Three independent switches, persisted per viewer in localStorage and mirrored on <html> as
 * data attributes so CSS can react without prop drilling:
 *   - colorblind  → html[data-a11y-colorblind="on"]   colour-vision-deficiency-safe palettes + symbols/patterns
 *   - screenReader→ html[data-a11y-screenreader="on"] blind / low-vision: text alternatives, announcements, read-aloud
 *   - deaf        → html[data-a11y-deaf="on"]          deaf / hard of hearing: every sound or speech has a visual/text equivalent
 *
 * `announce(text)` pushes a message to a polite aria-live region (always mounted) so any component can
 * tell screen-reader users what changed (e.g. "Map now shows solar zones").
 * `notify(text)` shows a visible toast — used as the visual equivalent of any audio cue (deaf mode).
 *
 * Deaf mode internals (docs/ACCESSIBILITY.md):
 *   - every announce(text) is ALSO shown as a toast (the visual twin of the screen-reader cue); those
 *     echo toasts are aria-hidden so screen readers don't hear the message twice;
 *   - toasts: solid near-black on white text (contrast > 15:1), no animation/flashing, ≥ 5 s on screen
 *     (6 s normally, 10 s in deaf mode), dismissible;
 *   - <CaptionBar/> shows the exact text of every speak() call (lib/a11y/speak.ts) for everyone.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { CaptionBar } from "@/components/a11y/CaptionBar";
import { ClickToSpeak } from "@/components/a11y/ClickToSpeak";
import { speak, stopSpeaking } from "./speak";

const TOAST_MS = 6000;
const TOAST_DEAF_MS = 10000;

export type A11yFlag = "colorblind" | "screenReader" | "deaf";
export type A11ySettings = Record<A11yFlag, boolean>;

const STORAGE_KEY = "aethra-a11y";
const DEFAULTS: A11ySettings = { colorblind: false, screenReader: false, deaf: false };
const ATTR: Record<A11yFlag, string> = {
  colorblind: "data-a11y-colorblind",
  screenReader: "data-a11y-screenreader",
  deaf: "data-a11y-deaf",
};

/** `echo`: visual copy of an announce() — hidden from assistive tech (already spoken by the live region). */
type Toast = { id: number; text: string; echo: boolean };

declare global {
  interface Window {
    /** Automation-only hook (set when navigator.webdriver is true) so e2e tests can drive cues. */
    __aethraA11y?: { announce: (text: string) => void; notify: (text: string) => void; speak: typeof speak };
  }
}

type A11yContextValue = {
  settings: A11ySettings;
  setFlag: (flag: A11yFlag, on: boolean) => void;
  toggle: (flag: A11yFlag) => void;
  /** Polite screen-reader announcement (works in every mode). */
  announce: (text: string) => void;
  /** Visible text notification (visual equivalent of sounds; always shown when deaf mode is on). */
  notify: (text: string) => void;
};

const A11yContext = createContext<A11yContextValue | null>(null);

function readStored(): A11ySettings {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<A11ySettings>;
    return {
      colorblind: parsed.colorblind === true,
      screenReader: parsed.screenReader === true,
      // Deaf mode switch removed from the menu (owner decision, 15 Nov 2026); captions stay always on.
      deaf: false,
    };
  } catch {
    return DEFAULTS;
  }
}

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<A11ySettings>(DEFAULTS);
  const [liveText, setLiveText] = useState("");
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastId = useRef(0);

  useEffect(() => {
    setSettings(readStored());
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    (Object.keys(ATTR) as A11yFlag[]).forEach((flag) => {
      if (settings[flag]) root.setAttribute(ATTR[flag], "on");
      else root.removeAttribute(ATTR[flag]);
    });
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      /* storage unavailable: settings still apply this session */
    }
  }, [settings]);

  // Read by announce()/notify() without re-creating them. Updated synchronously in setFlag so the
  // "Deaf mode on" announcement made in the same click is already shown as a toast.
  const deafRef = useRef(settings.deaf);
  useEffect(() => {
    deafRef.current = settings.deaf;
  }, [settings.deaf]);

  const setFlag = useCallback((flag: A11yFlag, on: boolean) => {
    if (flag === "deaf") deafRef.current = on;
    setSettings((s) => ({ ...s, [flag]: on }));
  }, []);
  const toggle = useCallback((flag: A11yFlag) => {
    setSettings((s) => ({ ...s, [flag]: !s[flag] }));
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const pushToast = useCallback(
    (text: string, echo: boolean) => {
      const clean = text.trim();
      if (!clean) return;
      const id = ++toastId.current;
      // Same text already on screen: replace it rather than stacking duplicates (no visual "blinking").
      setToasts((t) => [...t.filter((x) => x.text !== clean).slice(-2), { id, text: clean, echo }]);
      window.setTimeout(() => dismissToast(id), deafRef.current ? TOAST_DEAF_MS : TOAST_MS);
    },
    [dismissToast],
  );

  const announce = useCallback(
    (text: string) => {
      // Clear first so repeating the same message is announced again.
      setLiveText("");
      window.setTimeout(() => setLiveText(text), 60);
      // Deaf mode: what a screen reader would say is also shown on screen.
      if (deafRef.current) pushToast(text, true);
    },
    [pushToast],
  );

  const notify = useCallback((text: string) => pushToast(text, false), [pushToast]);

  // Stop any read-aloud when the provider unmounts (leaving /explore).
  useEffect(() => () => stopSpeaking(), []);

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.webdriver) return;
    window.__aethraA11y = { announce, notify, speak };
    return () => {
      delete window.__aethraA11y;
    };
  }, [announce, notify]);

  const value = useMemo<A11yContextValue>(
    () => ({ settings, setFlag, toggle, announce, notify }),
    [settings, setFlag, toggle, announce, notify],
  );

  return (
    <A11yContext.Provider value={value}>
      {children}
      <div aria-live="polite" aria-atomic="true" className="sr-only" data-testid="a11y-live">
        {liveText}
      </div>
      {toasts.length > 0 && (
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-none fixed left-1/2 top-16 z-[100] flex w-[min(36rem,calc(100vw-2rem))] -translate-x-1/2 flex-col gap-2"
          data-testid="a11y-toasts"
        >
          {toasts.map((t) => (
            <div
              key={t.id}
              aria-hidden={t.echo ? "true" : undefined}
              data-testid="a11y-toast"
              data-echo={t.echo ? "true" : "false"}
              className="pointer-events-auto flex items-start gap-3 rounded-lg border border-white/50 bg-neutral-950 px-4 py-2.5 text-base font-medium leading-snug text-white shadow-lg"
            >
              <span className="flex-1">{t.text}</span>
              <button
                type="button"
                tabIndex={t.echo ? -1 : undefined}
                onClick={() => dismissToast(t.id)}
                data-testid="a11y-toast-dismiss"
                aria-label="Dismiss"
                className="shrink-0 rounded px-1.5 text-sm font-bold hover:bg-white hover:text-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
      <CaptionBar deaf={settings.deaf} />
      <ClickToSpeak enabled={settings.screenReader} />
    </A11yContext.Provider>
  );
}

export function useAccessibility(): A11yContextValue {
  const value = useContext(A11yContext);
  if (!value) throw new Error("useAccessibility must be used inside AccessibilityProvider");
  return value;
}
