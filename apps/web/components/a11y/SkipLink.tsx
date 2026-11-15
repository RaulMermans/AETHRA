"use client";

import { useLocale } from "@/lib/i18n/locale";
import { blindCopy } from "@/lib/i18n/a11y-blind-copy";

export const MAIN_CONTENT_ID = "main-content";

/** First focusable element of the page: jumps keyboard / screen-reader users past the top bar. */
export function SkipLink() {
  const { locale } = useLocale();
  return (
    <a
      href={`#${MAIN_CONTENT_ID}`}
      onClick={(e) => {
        // The target is focusable (tabIndex=-1): move focus there without changing the URL hash,
        // which ExploreView uses for shareable camera views.
        e.preventDefault();
        document.getElementById(MAIN_CONTENT_ID)?.focus();
      }}
      className="sr-only rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-ink focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[200] focus:outline-2 focus:outline-offset-2 focus:outline-white"
    >
      {blindCopy(locale).skipToMain}
    </a>
  );
}
