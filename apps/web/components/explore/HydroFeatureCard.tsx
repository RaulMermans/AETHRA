"use client";

import type { IgnHydroFeature } from "@/lib/globe/ign-hydro";
import { useLocale } from "@/lib/i18n/locale";

interface Props {
  feature: IgnHydroFeature | null;
  unavailable: boolean;
  onClose: () => void;
}

/**
 * IGN rivers and lakes are fixed map context (D79). This card only appears when a click finds a
 * mapped feature or the IGN service fails; it lives in the left column flow so it never overlaps.
 */
export function HydroFeatureCard({ feature, unavailable, onClose }: Props) {
  const { m } = useLocale();
  if (!feature && !unavailable) return null;
  return (
    <section aria-label={m.hydro.label} className="panel pointer-events-auto p-3 text-xs text-muted" aria-live="polite">
      <div className="flex items-start justify-between gap-2">
        <p className="font-mono text-[10px] tracking-[0.14em] text-faint uppercase">{m.hydro.label}</p>
        <button type="button" onClick={onClose} aria-label={m.hydro.close} className="focus-ring -mt-1 -mr-1 rounded-md px-1.5 text-sm leading-none text-muted hover:text-ink">
          ×
        </button>
      </div>
      {feature ? (
        <>
          <p className="mt-1 text-sm font-medium text-ink">{feature.name ?? m.hydro.unnamed}</p>
          <details className="mt-1">
            <summary className="cursor-pointer text-[11px] text-muted hover:text-ink">{feature.id}</summary>
            <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
              {Object.entries(feature.attributes).map(([key, value]) => (
                <div key={key} className="col-span-2 grid grid-cols-subgrid">
                  <dt>{key}</dt>
                  <dd className="break-all text-ink">{value}</dd>
                </div>
              ))}
            </dl>
          </details>
          <p className="mt-2 leading-snug">{m.hydro.note}</p>
        </>
      ) : (
        <p role="alert" className="mt-1 leading-snug text-amber-100">{m.hydro.unavailable}</p>
      )}
    </section>
  );
}
