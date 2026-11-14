"use client";

/**
 * Always-on map key: NOAA stations vs registered plants.
 * This CyL register has wind and solar PV only — no hydropower.
 */

import { useLocale } from "@/lib/i18n/locale";

export function MapMarkerLegend({
  stationsVisible,
  energyVisible,
}: {
  stationsVisible: boolean;
  energyVisible: boolean;
}) {
  const { m } = useLocale();
  if (!stationsVisible && !energyVisible) return null;

  return (
    <aside className="panel pointer-events-auto max-w-[16.5rem] px-2.5 py-2" aria-label={m.legend.aria}>
      <p className="text-[9px] tracking-[0.16em] text-faint uppercase">{m.legend.title}</p>
      <ul className="mt-1.5 space-y-1.5 text-[11px] text-ink">
        {stationsVisible && (
          <li className="flex items-start gap-2">
            <span className="mt-0.5 size-2.5 shrink-0 rounded-full bg-sky-300 ring-1 ring-white/70" aria-hidden />
            <span>
              <span className="font-medium">{m.legend.station}</span>
              <span className="block text-[10px] leading-snug text-muted">{m.legend.stationHint}</span>
            </span>
          </li>
        )}
        {energyVisible && (
          <>
            <li className="flex items-start gap-2">
              <span
                className="mt-0.5 size-0 shrink-0 border-x-[6px] border-x-transparent border-b-[11px] border-b-teal-300"
                aria-hidden
              />
              <span>
                <span className="font-medium">{m.legend.wind}</span>
                <span className="block text-[10px] leading-snug text-muted">{m.legend.windHint}</span>
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 size-2.5 shrink-0 rounded-[3px] bg-amber-400 ring-1 ring-black/40" aria-hidden />
              <span>
                <span className="font-medium">{m.legend.solar}</span>
                <span className="block text-[10px] leading-snug text-muted">{m.legend.solarHint}</span>
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 size-2.5 shrink-0 rounded-full border border-dashed border-sky-400/70" aria-hidden />
              <span>
                <span className="font-medium text-muted">{m.legend.hydro}</span>
                <span className="block text-[10px] leading-snug text-muted">{m.legend.hydroHint}</span>
              </span>
            </li>
          </>
        )}
      </ul>
      {energyVisible && (
        <p className="mt-1.5 text-[9px] leading-snug text-faint">{m.legend.mw}</p>
      )}
    </aside>
  );
}
