"use client";

import { useState } from "react";
import { formatDegrees, formatElevation } from "@/lib/format";
import { useLocale } from "@/lib/i18n/locale";
import type { Messages } from "@/lib/i18n/messages";
import type { GeoCoordinate, OverlayFeature } from "@/lib/globe/types";
import { Icon } from "./Icon";

function overlayKindLabel(kind: OverlayFeature["kind"], copy: Messages): string {
  if (kind === "station") return copy.coords.station;
  if (kind === "basin-hub") return copy.coords.basinHub;
  if (kind === "reservoir") return copy.coords.reservoir;
  if (kind === "lake") return copy.coords.lake;
  if (kind === "lagoon") return copy.coords.lagoon;
  if (kind === "installation") return copy.coords.installation;
  return copy.coords.river;
}

function OverlayCard({ feature, copy }: { feature: OverlayFeature; copy: Messages }) {
  const title = feature.name.replace(/, SP$/i, "");
  return (
    <div className="rounded-md border border-nav/30 bg-nav/10 px-2 py-1.5">
      <p className="text-[10px] uppercase tracking-[0.12em] text-nav">{overlayKindLabel(feature.kind, copy)}</p>
      <p className="mt-0.5 text-xs font-medium text-ink">{title}</p>
      <p className="mt-0.5 font-mono text-[11px] text-muted">
        {feature.kind === "station" ? feature.id : feature.detail ?? feature.basin ?? feature.id}
        {feature.elevationM !== undefined ? ` · ${Math.round(feature.elevationM)} m` : ""}
      </p>
      {feature.value !== undefined && (
        <p className="mt-0.5 font-mono text-xs text-ink">
          {feature.value}
          {feature.units ? ` ${feature.units}` : ""}
        </p>
      )}
    </div>
  );
}

function Row({ label, value, copy, locale }: { label: string; value: GeoCoordinate | null; copy: Messages; locale: "en" | "es" }) {
  return (
    <div className="grid grid-cols-[4.25rem_1fr] items-baseline gap-x-2">
      <dt className="text-[10px] uppercase tracking-[0.12em] text-faint">{label}</dt>
      <dd className="font-mono text-xs tabular-nums text-ink">
        {value ? (
          <>
            <span className="inline-block min-w-[6.5rem]">{formatDegrees(value.latitude)}</span>
            <span className="inline-block min-w-[7rem]">{formatDegrees(value.longitude)}</span>
            {value.elevation && (
              <span
                className="text-muted"
                title={`Terrain elevation from ${value.elevation.source}${
                  value.elevation.approximate ? ` (${copy.coords.mesh})` : ` (${copy.coords.sample})`
                }. ${value.elevation.datum === "orthometric" ? copy.coords.aboveSea : copy.coords.ellipsoid}`}
              >
                {" "}
                {formatElevation(value.elevation, locale)}
              </span>
            )}
          </>
        ) : (
          <span className="text-faint">—</span>
        )}
      </dd>
    </div>
  );
}

export function CoordinateReadout({
  selected,
  overlay,
  onClear,
}: {
  hover: GeoCoordinate | null;
  selected: GeoCoordinate | null;
  overlay: OverlayFeature | null;
  onClear: () => void;
}) {
  const { locale, m } = useLocale();
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    if (!selected) return;
    try {
      await navigator.clipboard.writeText(
        `${selected.latitude.toFixed(5)}, ${selected.longitude.toFixed(5)}`,
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      /* clipboard unavailable: ignore */
    }
  };

  if (!selected && !overlay) return null;

  return (
    <section aria-label={m.coords.selection} className="panel pointer-events-auto px-2.5 py-2">
      {overlay ? (
        <OverlayCard feature={overlay} copy={m} />
      ) : (
        <dl className="space-y-1" aria-live="polite">
          <Row label={m.coords.point} value={selected} copy={m} locale={locale} />
        </dl>
      )}
      {selected && (
        <div className="mt-1 flex items-center justify-end gap-0.5">
          <button
            type="button"
            onClick={copy}
            className="focus-ring rounded p-1 text-muted transition-colors hover:text-ink"
            aria-label={m.coords.copy}
            title={copied ? m.coords.copied : m.coords.copy}
          >
            <Icon name="copy" className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={onClear}
            className="focus-ring rounded p-1 text-muted transition-colors hover:text-ink"
            aria-label={m.coords.clear}
            title={m.coords.clear}
          >
            <Icon name="close" className="size-3.5" />
          </button>
        </div>
      )}
      <span className="sr-only" aria-live="polite">{copied ? m.coords.copiedLive : ""}</span>
    </section>
  );
}
