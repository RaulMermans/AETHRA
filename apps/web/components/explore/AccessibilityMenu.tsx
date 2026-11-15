"use client";

/**
 * Inclusive-mode menu (top bar). A labelled button opens a small keyboard-operable dialog with three
 * switches (role="switch"): blind / low vision, deaf / hard of hearing, colour-blind safe colours.
 * Focus is trapped inside while open, Esc or the close button closes it and focus returns to the button.
 * Every change is announced through the shared aria-live region (announce()).
 *
 * Also exports `useColorblindMode()`: the one way components read the colour-blind flag. It switches
 * the global map palettes (climate.ts::setCvdPalettes) during render, so memos and effects that
 * sample colours in the same render already use the CVD-safe palettes.
 */

import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { useAccessibility, type A11yFlag } from "@/lib/a11y/accessibility";
import { setCvdPalettes } from "@/lib/globe/climate";
import { CVD_VERDICT_COLORS, VERDICT_SYMBOLS } from "@/lib/globe/cesium/screening-layers";
import { a11yCopy } from "@/lib/i18n/a11y-copy";
import { useLocale } from "@/lib/i18n/locale";
import { Icon } from "./Icon";

/** Colour-blind flag + keeps the global palette tables in sync (idempotent, safe to call anywhere). */
export function useColorblindMode(): boolean {
  const on = useAccessibility().settings.colorblind;
  setCvdPalettes(on);
  return on;
}

/** Universal-access glyph (person in a circle). */
function UniversalAccessIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="6.6" r="1.3" fill="currentColor" stroke="none" />
      <path d="M6.5 9.3l5.5 1.2 5.5-1.2M12 10.5v3.3M12 13.8l-2.6 4.6M12 13.8l2.6 4.6" />
    </svg>
  );
}

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function AccessibilityMenu() {
  const { locale } = useLocale();
  const t = a11yCopy(locale);
  const { settings, setFlag, announce } = useAccessibility();
  useColorblindMode();
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descId = useId();

  const close = useCallback((returnFocus = true) => {
    setOpen(false);
    if (returnFocus) window.setTimeout(() => buttonRef.current?.focus(), 0);
  }, []);

  useEffect(() => {
    if (!open) return;
    const first = dialogRef.current?.querySelector<HTMLElement>('[role="switch"]');
    first?.focus();
    const onPointer = (e: PointerEvent) => {
      const target = e.target as Node;
      if (!dialogRef.current?.contains(target) && !buttonRef.current?.contains(target)) close(false);
    };
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [open, close]);

  const onDialogKey = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      close();
      return;
    }
    if (e.key !== "Tab" || !dialogRef.current) return;
    const items = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
    if (items.length === 0) return;
    const firstEl = items[0];
    const lastEl = items[items.length - 1];
    if (e.shiftKey && document.activeElement === firstEl) {
      e.preventDefault();
      lastEl.focus();
    } else if (!e.shiftKey && document.activeElement === lastEl) {
      e.preventDefault();
      firstEl.focus();
    }
  };

  const flip = (flag: A11yFlag, name: string) => {
    const next = !settings[flag];
    if (flag === "colorblind") setCvdPalettes(next);
    setFlag(flag, next);
    announce(t.changed(name, next));
  };

  const rows: { flag: A11yFlag; name: string; hint: string; testId: string }[] = [
    { flag: "screenReader", name: t.screenReader, hint: t.screenReaderHint, testId: "a11y-switch-screenreader" },
    { flag: "colorblind", name: t.colorblind, hint: t.colorblindHint, testId: "a11y-switch-colorblind" },
  ];
  const activeCount = rows.filter((r) => settings[r.flag]).length;

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={locale === "es" ? "Accesibilidad / Accessibility" : "Accessibility / Accesibilidad"}
        data-testid="a11y-menu-button"
        onClick={() => (open ? close() : setOpen(true))}
        className={`focus-ring flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-medium tracking-wide backdrop-blur-md transition ${
          activeCount > 0 ? "border-accent/70 bg-accent/15 text-ink" : "border-line bg-atlantic/70 text-muted hover:text-ink"
        }`}
      >
        <UniversalAccessIcon className="size-4" />
        <span className="hidden sm:inline">{t.menuButton}</span>
        {activeCount > 0 && (
          <span className="rounded bg-accent px-1 text-[10px] leading-4 text-accent-ink" aria-hidden>
            {activeCount}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={descId}
          data-testid="a11y-menu"
          onKeyDown={onDialogKey}
          className="panel absolute right-0 top-full z-[70] mt-2 w-[min(22rem,calc(100vw-2rem))] p-3 text-left"
        >
          <div className="flex items-start justify-between gap-2">
            <h2 id={titleId} className="flex items-center gap-2 text-sm font-semibold text-ink">
              <UniversalAccessIcon className="size-4 text-accent" />
              {t.menuTitle}
            </h2>
            <button
              type="button"
              onClick={() => close()}
              aria-label={t.close}
              className="focus-ring grid size-7 shrink-0 place-items-center rounded-md text-muted hover:bg-white/6 hover:text-ink"
            >
              <Icon name="close" className="size-3.5" />
            </button>
          </div>
          <p id={descId} className="mt-1 text-[11px] leading-snug text-muted">
            {t.menuIntro}
          </p>

          <ul className="mt-3 space-y-2">
            {rows.map((r) => {
              const on = settings[r.flag];
              const hintId = `${titleId}-${r.flag}`;
              return (
                <li key={r.flag}>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={on}
                    aria-describedby={hintId}
                    data-testid={r.testId}
                    onClick={() => flip(r.flag, r.name)}
                    className={`focus-ring flex w-full items-start gap-3 rounded-lg border px-2.5 py-2 text-left transition ${
                      on ? "border-accent/70 bg-accent/10" : "border-line hover:border-nav/60"
                    }`}
                  >
                    <span
                      aria-hidden
                      className={`relative mt-0.5 inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition ${
                        on ? "border-accent bg-accent" : "border-nav/70 bg-space"
                      }`}
                    >
                      <span
                        className={`absolute grid size-3.5 place-items-center rounded-full text-[9px] font-bold leading-none transition-all ${
                          on ? "left-[1.15rem] bg-accent-ink text-accent" : "left-0.5 bg-nav text-space"
                        }`}
                      >
                        {on ? "✓" : ""}
                      </span>
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[12.5px] font-medium leading-snug text-ink">
                        {r.name}
                        <span className="ml-1.5 text-[10px] font-normal uppercase tracking-wider text-faint">{on ? t.on : t.off}</span>
                      </span>
                      <span id={hintId} className="block text-[11px] leading-snug text-muted">
                        {r.hint}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          {settings.colorblind && (
            <div className="mt-3 border-t border-line pt-2" data-testid="a11y-cvd-key">
              <p className="text-[9px] uppercase tracking-[0.16em] text-faint">{t.cvdLegendTitle}</p>
              <ul className="mt-1 space-y-1 text-[11px] text-ink">
                {(["good", "mixed", "avoid"] as const).map((v) => (
                  <li key={v} className="flex items-center gap-2">
                    <span
                      aria-hidden
                      className="grid size-4 shrink-0 place-items-center rounded-[4px] text-[10px] font-bold leading-none"
                      style={{ background: CVD_VERDICT_COLORS[v], color: v === "good" ? "#fff" : "#000" }}
                    >
                      {VERDICT_SYMBOLS[v]}
                    </span>
                    {v === "good" ? t.verdictGood : v === "mixed" ? t.verdictMixed : t.verdictAvoid}
                  </li>
                ))}
              </ul>
              <p className="mt-1 text-[10px] leading-snug text-faint">{t.cvdLegendNote}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
