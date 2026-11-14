"use client";

import { useEffect, useRef, useState } from "react";
import { PLACES, SPAIN_VIEW } from "@/lib/globe/catalog";
import type { GlobeController } from "@/lib/globe/types";
import { Icon } from "./Icon";

/** Primary "Explore Spain" action plus a menu of terrain-aware regional views. */
export function ExploreSpain({ controller }: { controller: GlobeController | null }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const firstItemRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    firstItemRef.current?.focus();
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const regions = PLACES.filter((p) => p.id !== "spain");

  return (
    <div ref={rootRef} className="pointer-events-auto relative flex items-stretch sm:mb-1">
      {open && (
        <div
          id="places-menu"
          role="menu"
          aria-label="Regions"
          className="panel absolute bottom-full left-0 mb-2 w-60 p-1.5"
        >
          {regions.map((p, i) => (
            <button
              key={p.id}
              ref={i === 0 ? firstItemRef : undefined}
              type="button"
              role="menuitem"
              onClick={() => {
                controller?.flyTo(p.view);
                setOpen(false);
              }}
              className="focus-ring flex w-full items-baseline justify-between gap-3 rounded-md px-2.5 py-2 text-left text-[13px] text-ink transition-colors hover:bg-white/8"
            >
              {p.name}
              <span className="text-[11px] text-faint">{p.hint}</span>
            </button>
          ))}
        </div>
      )}
      <button
        type="button"
        disabled={!controller}
        onClick={() => controller?.flyTo(SPAIN_VIEW)}
        className="focus-ring inline-flex items-center gap-2 rounded-l-full bg-accent py-2.5 pr-4 pl-5 text-sm font-medium text-accent-ink shadow-lg shadow-black/40 transition hover:brightness-110 active:brightness-95 disabled:opacity-50"
      >
        <Icon name="target" />
        Explore Spain
      </button>
      <button
        type="button"
        disabled={!controller}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls="places-menu"
        aria-label="More regions of Spain"
        onClick={() => setOpen((o) => !o)}
        className="focus-ring inline-flex items-center rounded-r-full border-l border-accent-ink/20 bg-accent pr-3.5 pl-2.5 text-accent-ink shadow-lg shadow-black/40 transition hover:brightness-110 active:brightness-95 disabled:opacity-50"
      >
        <Icon name="chevron" className={`size-3.5 transition-transform ${open ? "-rotate-90" : "rotate-90"}`} />
      </button>
    </div>
  );
}
