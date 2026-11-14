"use client";

import { useEffect, useRef, useState } from "react";
import { EXPLORATORY_FEATURES_ENABLED } from "@/lib/demo-mode";
import {
  DESTINATIONS,
  destinationAllowedInJudgeMode,
  type DestinationType,
  type GeographicDestination,
} from "@/lib/globe/destinations";
import { useLocale } from "@/lib/i18n/locale";
import type { Messages } from "@/lib/i18n/messages";
import { Icon } from "./Icon";

type GroupKey = "landmarks" | "cases" | "plant";

const GROUPS: { key: GroupKey; ids: readonly string[] }[] = [
  { key: "landmarks", ids: ["mulhacen", "picos-de-europa"] },
  {
    key: "cases",
    ids: [
      "case-r0-joint-low",
      "case-es11-joint-low",
      "case-es41-joint-low",
      "case-es24-joint-low",
      "case-es61-joint-low",
    ],
  },
  { key: "plant", ids: ["installation-buniel"] },
];

function typeLabel(type: DestinationType, t: Messages["menu"]): string {
  switch (type) {
    case "natural_landmark":
      return t.landmark;
    case "geographic_research_area":
      return t.overview;
    case "existing_energy_installation":
      return t.installation;
    case "scientific_case_study_region":
      return t.research;
    default: {
      const exhaustive: never = type;
      return exhaustive;
    }
  }
}

/** Destinations menu: landmarks, five Gate B research cases, and the 3D plant prototype. */
export function ExploreSpain({
  selectedId,
  onSelect,
  disabled,
}: {
  selectedId: string | null;
  onSelect: (destination: GeographicDestination) => void;
  disabled: boolean;
}) {
  const { m } = useLocale();
  const t = m.menu;
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const firstItemRef = useRef<HTMLButtonElement>(null);
  const spain = DESTINATIONS.find((d) => d.id === "spain");

  useEffect(() => {
    if (!open) return;
    firstItemRef.current?.focus();
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="pointer-events-auto relative flex items-stretch sm:mb-1">
      {open && (
        <div
          id="places-menu"
          role="menu"
          aria-label={t.places}
          className="panel absolute right-0 bottom-full z-50 mb-2 max-h-[min(24rem,calc(100dvh-8rem))] w-72 overflow-y-auto p-1.5"
        >
          {GROUPS.map((group) => {
            const items = group.ids
              .map((id) => DESTINATIONS.find((d) => d.id === id))
              .filter((dest): dest is GeographicDestination => Boolean(dest))
              .filter((dest) => EXPLORATORY_FEATURES_ENABLED || destinationAllowedInJudgeMode(dest));
            if (items.length === 0) return null;
            return (
              <div key={group.key} className="mb-1">
              <p className="px-2.5 pt-1 pb-0.5 text-[10px] tracking-[0.12em] text-faint uppercase">{t[group.key]}</p>
              {items.map((dest, i) => {
                const isFirst = group === GROUPS[0] && i === 0;
                return (
                  <button
                    key={dest.id}
                    ref={isFirst ? firstItemRef : undefined}
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      onSelect(dest);
                      setOpen(false);
                    }}
                    className={`focus-ring flex w-full flex-col rounded-md px-2.5 py-1.5 text-left transition-colors hover:bg-white/8 ${
                      selectedId === dest.id ? "bg-white/8" : ""
                    }`}
                  >
                    <span className="flex items-baseline justify-between gap-3 text-[13px] text-ink">
                      {t.names[dest.id] ?? dest.name}
                      <span className="text-[11px] text-faint">{t.hints[dest.id] ?? dest.hint}</span>
                    </span>
                    <span className="text-[10px] text-faint">
                      {typeLabel(dest.type, t)}
                      {dest.protectedLandscape ? ` · ${t.park}` : ""}
                    </span>
                  </button>
                );
              })}
            </div>
            );
          })}
        </div>
      )}
      <button
        type="button"
        disabled={disabled || !spain}
        onClick={() => spain && onSelect(spain)}
        className="focus-ring inline-flex items-center gap-2 rounded-l-full border border-line bg-atlantic/85 py-2.5 pr-4 pl-5 text-sm font-medium text-ink shadow-lg shadow-black/40 backdrop-blur-md transition hover:border-nav/50 hover:bg-atlantic disabled:opacity-50"
      >
        <Icon name="target" />
        {t.explore}
      </button>
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls="places-menu"
        aria-label={t.destinations}
        onClick={() => setOpen((o) => !o)}
        className="focus-ring inline-flex items-center rounded-r-full border border-l-0 border-line bg-atlantic/85 pr-3.5 pl-2.5 text-ink shadow-lg shadow-black/40 backdrop-blur-md transition hover:border-nav/50 hover:bg-atlantic disabled:opacity-50"
      >
        <Icon name="chevron" className={`size-3.5 transition-transform ${open ? "-rotate-90" : "rotate-90"}`} />
      </button>
    </div>
  );
}
