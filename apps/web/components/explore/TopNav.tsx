"use client";

import { useState, type ReactNode } from "react";
import { BrandWordmark } from "@/components/BrandWordmark";
import { useLocale } from "@/lib/i18n/locale";
import type { Locale } from "@/lib/i18n/messages";
import { AccessibilityMenu } from "./AccessibilityMenu";
import { BrandStoryDialog } from "./BrandStoryDialog";

export function TopNav({ center }: { center?: ReactNode }) {
  const { locale, setLocale, m } = useLocale();
  const [storyOpen, setStoryOpen] = useState(false);
  const option = (id: Locale, label: string, name: string) => {
    const active = locale === id;
    return (
      <button
        type="button"
        aria-pressed={active}
        aria-label={`${label} · ${name}`}
        lang={id}
        onClick={() => setLocale(id)}
        className={`focus-ring rounded-md px-2 py-1 text-[11px] font-medium tracking-wide ${
          active ? "bg-accent text-accent-ink" : "text-muted hover:text-ink"
        }`}
      >
        {label}
      </button>
    );
  };

  return (
    <>
      <header className="pointer-events-none absolute inset-x-0 top-0 z-[60] grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 pt-3 sm:px-6 sm:pt-4">
        <button
          type="button"
          aria-label={m.brandStory.open}
          aria-haspopup="dialog"
          aria-expanded={storyOpen}
          onClick={() => setStoryOpen(true)}
          className="focus-ring pointer-events-auto flex w-fit max-w-full items-center rounded-md border border-line bg-atlantic/70 px-2.5 py-1.5 backdrop-blur-md transition hover:border-nav/50 hover:bg-atlantic/90"
        >
          <BrandWordmark />
        </button>
        <div className="pointer-events-auto justify-self-center">{center}</div>
        <div className="pointer-events-auto flex shrink-0 items-center gap-1.5 justify-self-end">
          <AccessibilityMenu />
          <div
            role="group"
            aria-label={m.lang.group}
            className="flex shrink-0 rounded-md border border-line bg-atlantic/70 p-0.5 backdrop-blur-md"
          >
            {option("es", "ES", "Español")}
            {option("en", "EN", "English")}
          </div>
        </div>
      </header>
      <BrandStoryDialog open={storyOpen} onClose={() => setStoryOpen(false)} />
    </>
  );
}
