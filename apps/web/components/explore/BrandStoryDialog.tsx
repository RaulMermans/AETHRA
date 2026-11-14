"use client";

import { useEffect, useId, useRef } from "react";
import { BrandWordmark } from "@/components/BrandWordmark";
import { BRAND_TAGLINE } from "@/lib/brand";
import { useLocale } from "@/lib/i18n/locale";
import { Icon } from "./Icon";

export function BrandStoryDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { m } = useLocale();
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const story = m.brandStory;

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement;
    closeRef.current?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="pointer-events-auto fixed inset-0 z-50 flex items-end justify-center p-3 sm:items-center sm:p-6">
      <button
        type="button"
        aria-label={story.close}
        className="absolute inset-0 bg-space/72 backdrop-blur-[6px]"
        onClick={onClose}
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-label={story.dialog}
        className="panel relative z-10 flex max-h-[min(92dvh,40rem)] w-full max-w-[34rem] flex-col overflow-hidden"
      >
        <div className="relative border-b border-line px-5 pb-5 pt-5">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-10 -top-16 size-48 rounded-full bg-accent/12 blur-3xl"
          />
          <div className="relative flex items-start justify-between gap-3">
            <BrandWordmark />
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              aria-label={story.close}
              className="focus-ring grid size-8 shrink-0 place-items-center rounded-md text-muted hover:bg-white/6 hover:text-ink"
            >
              <Icon name="close" className="size-3.5" />
            </button>
          </div>
          <p className="relative mt-3 text-[13px] leading-snug text-accent">{BRAND_TAGLINE}</p>
          <h2
            id={titleId}
            className="relative mt-2 pr-2 text-[1.25rem] font-medium leading-snug tracking-tight text-ink sm:text-[1.35rem]"
          >
            {story.greeting}
          </h2>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5 pb-6 text-[13px] leading-relaxed text-muted">
          <p>{story.origin}</p>
          <p>{story.challenge}</p>

          <div className="space-y-4 border-t border-line pt-4">
            <StoryBeat title={story.missionTitle} body={story.mission} />
            <StoryBeat title={story.visionTitle} body={story.vision} />
            <StoryBeat title={story.honestyTitle} body={story.honesty} />
          </div>

          <p className="font-mono text-[10px] leading-snug text-faint">{story.independent}</p>
        </div>

        <div className="border-t border-line px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="focus-ring rounded-md bg-accent px-3 py-1.5 text-[12px] font-medium text-accent-ink hover:brightness-105"
          >
            {story.back}
          </button>
        </div>
      </section>
    </div>
  );
}

function StoryBeat({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <h3 className="text-[12px] font-medium text-ink">{title}</h3>
      <p className="mt-1">{body}</p>
    </div>
  );
}
