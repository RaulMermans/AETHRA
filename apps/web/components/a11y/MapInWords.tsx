"use client";

import { useId, useMemo } from "react";
import type { AdminBundle } from "@/lib/globe/admin-scope";
import type { PvScreeningFile } from "@/lib/globe/pv-screening";
import { useLocale } from "@/lib/i18n/locale";
import { blindCopy, type VerdictGroup } from "@/lib/i18n/a11y-blind-copy";
import { formatScreeningNumber } from "@/lib/i18n/screening-copy";
import { usePanelFocus } from "./usePanelFocus";
import { zoneRegionName } from "./zoneRegion";

export const MAP_IN_WORDS_ID = "map-in-words";

export type MapInWordsClimate = {
  variable: string;
  period: string;
  trendSentence: string;
};

const GROUPS: VerdictGroup[] = ["good", "mixed", "avoid"];
const GROUP_MARK: Record<VerdictGroup, string> = { good: "✓", mixed: "~", avoid: "✕" };

/**
 * Text alternative of the globe (WCAG 1.1.1 / 2.1.1): what the map shows right now, in words, with a
 * button for every map action. Solar screening: zones grouped green / amber / red with place name,
 * sunshine and a "Select" button that does exactly what clicking the zone on the globe does.
 * Climate maps: variable, period and the published Spain-wide trend sentence. Render-only.
 */
export function MapInWords({
  mode,
  screening,
  loading,
  admin,
  selectedCellId,
  onSelectCell,
  climate,
  onClose,
}: {
  mode: "solar" | "climate";
  screening: PvScreeningFile | null;
  loading: boolean;
  admin: AdminBundle | null;
  selectedCellId: string | null;
  onSelectCell: (cellId: string) => void;
  climate: MapInWordsClimate;
  onClose: () => void;
}) {
  const { locale } = useLocale();
  const c = blindCopy(locale);
  const headingId = useId();
  const { panelRef, headingRef, onKeyDown } = usePanelFocus<HTMLElement>(onClose);

  const groups = useMemo(() => {
    if (!screening) return null;
    const out: Record<VerdictGroup, { id: string; region: string; sunshine: string }[]> = { good: [], mixed: [], avoid: [] };
    for (const cell of screening.cells) {
      if (cell.verdict === "no_data") continue;
      const region = zoneRegionName(cell.lat, cell.lon, admin, c.nearRegion) ?? `${cell.lat.toFixed(2)}°, ${cell.lon.toFixed(2)}°`;
      const sunshine =
        cell.irr_mean_kwh_m2_day === null ? c.noSunshine : `${formatScreeningNumber(locale, cell.irr_mean_kwh_m2_day, 2)} ${c.sunshineUnit}`;
      out[cell.verdict].push({ id: cell.id, region, sunshine });
    }
    // Alphabetical by place: the list is a way to reach every zone, not a ranking.
    GROUPS.forEach((g) => out[g].sort((a, b) => a.region.localeCompare(b.region, locale) || a.id.localeCompare(b.id)));
    return out;
  }, [screening, admin, locale, c]);
  const noData = screening ? screening.cells.filter((cell) => cell.verdict === "no_data").length : 0;

  return (
    <section
      id={MAP_IN_WORDS_ID}
      ref={panelRef}
      aria-labelledby={headingId}
      onKeyDown={onKeyDown}
      className="panel pointer-events-auto flex max-h-full min-h-0 w-full flex-col overflow-hidden p-3"
      data-testid="map-in-words"
    >
      <div className="flex shrink-0 items-start justify-between gap-2">
        <h2 id={headingId} ref={headingRef} tabIndex={-1} className="focus-ring text-sm font-medium text-ink">
          {c.mapInWords}
          <span className="block text-[11px] font-normal text-muted">
            {mode === "solar" ? c.mapInWordsSolarHeading : c.mapInWordsClimateHeading}
          </span>
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label={c.mapInWordsHide}
          title={c.mapInWordsHide}
          className="focus-ring grid size-7 shrink-0 place-items-center rounded-md text-muted hover:bg-white/6 hover:text-ink"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="size-3.5" aria-hidden>
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>
      <p className="mt-1 shrink-0 text-[11px] leading-snug text-faint">{c.mapInWordsIntro}</p>

      <div className="mt-2 min-h-0 flex-1 overflow-y-auto pr-0.5 text-[13px] leading-snug text-ink">
        {mode === "climate" ? (
          <div className="space-y-1.5">
            <p>{c.climateVariable(climate.variable)}</p>
            <p>{c.climatePeriod(climate.period)}</p>
            <p>{climate.trendSentence}</p>
            <p className="text-[11px] text-muted">{c.climateHint}</p>
          </div>
        ) : loading && !screening ? (
          <p role="status" className="text-muted">
            {c.mapInWordsLoading}
          </p>
        ) : !groups ? (
          <p className="text-muted">{c.dataFailed(c.solarData)}</p>
        ) : (
          <div className="space-y-2">
            <p className="text-[11px] text-muted">{c.solarHint}</p>
            {GROUPS.map((g) => (
              <details key={g} open={g === "good"} className="rounded-md border border-line" data-group={g}>
                <summary className="focus-ring cursor-pointer rounded-md px-2 py-1.5 text-[12px] font-semibold">
                  <span aria-hidden className="mr-1">
                    {GROUP_MARK[g]}
                  </span>
                  {c.groupHeading[g](groups[g].length)}
                </summary>
                <ul className="space-y-0.5 px-1 pb-1.5">
                  {groups[g].map((z) => {
                    const isSel = z.id === selectedCellId;
                    return (
                      <li
                        key={z.id}
                        aria-current={isSel ? "true" : undefined}
                        className={`flex items-center gap-2 rounded px-1.5 py-1 ${isSel ? "bg-white/10" : ""}`}
                      >
                        <span className="min-w-0 flex-1 text-[12px]">
                          {c.zoneLine(z.region, z.sunshine)}
                          <span className="sr-only">
                            {" "}
                            · {c.verdictWord[g]}
                            {isSel ? ` · ${c.selectedMark}` : ""}
                          </span>
                        </span>
                        <button
                          type="button"
                          onClick={() => onSelectCell(z.id)}
                          aria-label={c.selectAria(z.region, z.id)}
                          className="focus-ring shrink-0 rounded-md border border-line px-2 py-0.5 text-[11px] text-ink hover:bg-white/8"
                        >
                          {c.select}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </details>
            ))}
            {noData > 0 && <p className="text-[11px] text-faint">{c.noDataZones(noData)}</p>}
          </div>
        )}
      </div>
    </section>
  );
}
