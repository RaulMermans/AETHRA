"use client";

/**
 * Always-on map key: NOAA stations vs registered plants.
 * This CyL register has wind and solar PV only — no hydropower.
 */

export function MapMarkerLegend({
  stationsVisible,
  energyVisible,
}: {
  stationsVisible: boolean;
  energyVisible: boolean;
}) {
  if (!stationsVisible && !energyVisible) return null;

  return (
    <aside className="panel pointer-events-auto max-w-[16.5rem] px-2.5 py-2" aria-label="Map marker legend">
      <p className="text-[9px] tracking-[0.16em] text-faint uppercase">What the dots are</p>
      <ul className="mt-1.5 space-y-1.5 text-[11px] text-ink">
        {stationsVisible && (
          <li className="flex items-start gap-2">
            <span className="mt-0.5 size-2.5 shrink-0 rounded-full bg-sky-300 ring-1 ring-white/70" aria-hidden />
            <span>
              <span className="font-medium">Weather station (NOAA)</span>
              <span className="block text-[10px] leading-snug text-muted">Temperature / rain gauge. Not a power plant.</span>
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
                <span className="font-medium">Onshore wind</span>
                <span className="block text-[10px] leading-snug text-muted">Registered wind farm (Castilla y León). Teal triangle.</span>
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 size-2.5 shrink-0 rounded-[3px] bg-amber-400 ring-1 ring-black/40" aria-hidden />
              <span>
                <span className="font-medium">Solar photovoltaic</span>
                <span className="block text-[10px] leading-snug text-muted">Registered PV plant (Castilla y León). Amber square.</span>
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 size-2.5 shrink-0 rounded-full border border-dashed border-sky-400/70" aria-hidden />
              <span>
                <span className="font-medium text-muted">Hydropower</span>
                <span className="block text-[10px] leading-snug text-muted">
                  Not in this register. This layer is wind + solar PV only, CyL only.
                </span>
              </span>
            </li>
          </>
        )}
      </ul>
      {energyVisible && (
        <p className="mt-1.5 text-[9px] leading-snug text-faint">Registered MW ≠ electricity produced. Points sit inside official perimeters.</p>
      )}
    </aside>
  );
}
