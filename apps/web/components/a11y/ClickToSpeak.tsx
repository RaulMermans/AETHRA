"use client";

/**
 * Blind / low-vision mode: whatever the user clicks is read aloud.
 * Reads the element's accessible name (aria-label, aria-labelledby, title, alt) or its visible text,
 * in the current page language, through speak() — so captions are shown on screen as well.
 * Skips the globe canvas (zone/plant clicks already announce and open a readable card) and the
 * explicit "Read aloud" buttons (they speak their own content).
 */

import { useEffect } from "react";
import { speak } from "@/lib/a11y/speak";

const MAX_CHARS = 320;
const TARGET =
  "button, a, [role='button'], [role='switch'], [role='tab'], [role='menuitem'], [role='option'], input, select, label, summary, [aria-label], h1, h2, h3, h4, p, li, td, th, dt, dd";

function clean(s: string | null | undefined): string {
  return (s ?? "").replace(/\s+/g, " ").trim();
}

function accessibleText(el: Element): string {
  const label = clean(el.getAttribute("aria-label"));
  if (label) return label;
  const labelledBy = el.getAttribute("aria-labelledby");
  if (labelledBy) {
    const text = clean(
      labelledBy
        .split(/\s+/)
        .map((id) => document.getElementById(id)?.textContent ?? "")
        .join(" "),
    );
    if (text) return text;
  }
  if (el instanceof HTMLInputElement) {
    const state = el.type === "checkbox" || el.type === "radio" ? (el.checked ? " ✓" : "") : "";
    return clean((el.labels?.[0]?.textContent ?? el.placeholder ?? el.value) + state);
  }
  const title = clean(el.getAttribute("title"));
  const text = clean((el as HTMLElement).innerText ?? el.textContent);
  return text || title || clean(el.querySelector("img")?.getAttribute("alt"));
}

export function ClickToSpeak({ enabled }: { enabled: boolean }) {
  useEffect(() => {
    if (!enabled) return;
    const onClick = (event: MouseEvent) => {
      const raw = event.target;
      if (!(raw instanceof Element)) return;
      if (raw.closest("canvas, .cesium-widget, [data-read-aloud]")) return;
      const el = raw.closest(TARGET) ?? raw;
      let text = accessibleText(el);
      if (!text) return;
      if (el.getAttribute("role") === "switch" || el.hasAttribute("aria-pressed")) {
        const on = el.getAttribute("aria-checked") === "true" || el.getAttribute("aria-pressed") === "true";
        // State after the click toggles it.
        const lang = document.documentElement.lang === "es" ? "es" : "en";
        text += lang === "es" ? (on ? ", desactivado" : ", activado") : on ? ", off" : ", on";
      }
      if (text.length > MAX_CHARS) text = `${text.slice(0, MAX_CHARS)}…`;
      speak(text, { lang: document.documentElement.lang === "es" ? "es" : "en" });
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [enabled]);
  return null;
}
