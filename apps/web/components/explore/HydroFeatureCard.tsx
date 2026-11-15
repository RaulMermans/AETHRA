"use client";

import type { IgnHydroFeature } from "@/lib/globe/ign-hydro";
import { useLocale } from "@/lib/i18n/locale";

/**
 * IGN rivers and lakes are fixed map context (D79). Shown inside the clicked-point readout, only
 * when the click hits a mapped feature or the IGN service fails, so it adds no floating panel.
 */
export function HydroFeatureCard({ feature, unavailable }: { feature: IgnHydroFeature | null; unavailable: boolean }) {
  const { m } = useLocale();
  if (!feature && !unavailable) return null;
  return (
    <div aria-label={m.hydro.label} role="group" aria-live="polite" className="mt-1.5 rounded-md border border-cyan-300/25 bg-cyan-400/5 px-2 py-1.5 text-[11px] text-muted">
      <p className="text-[10px] uppercase tracking-[0.12em] text-cyan-200">{m.hydro.label}</p>
      {feature ? (
        <>
          <p className="mt-0.5 text-xs font-medium text-ink">{feature.name ?? m.hydro.unnamed}</p>
          <details className="mt-0.5">
            <summary className="cursor-pointer break-all hover:text-ink">{feature.id}</summary>
            <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
              {Object.entries(feature.attributes).map(([key, value]) => (
                <div key={key} className="col-span-2 grid grid-cols-subgrid">
                  <dt>{key}</dt>
                  <dd className="break-all text-ink">{value}</dd>
                </div>
              ))}
            </dl>
          </details>
          <p className="mt-1 leading-snug">{m.hydro.note}</p>
        </>
      ) : (
        <p role="alert" className="mt-0.5 leading-snug text-amber-100">{m.hydro.unavailable}</p>
      )}
    </div>
  );
}
