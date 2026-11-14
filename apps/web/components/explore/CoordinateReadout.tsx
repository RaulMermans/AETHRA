"use client";

import { useState } from "react";
import { formatDegrees, formatElevation } from "@/lib/format";
import type { GeoCoordinate } from "@/lib/globe/types";
import { Icon } from "./Icon";

function Row({ label, value }: { label: string; value: GeoCoordinate | null }) {
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
                  value.elevation.approximate ? " (rendered mesh, approximate)" : " (most detailed sample)"
                }. ${value.elevation.datum === "orthometric" ? "Above sea level." : "Height above the WGS84 ellipsoid."}`}
              >
                {" "}
                {formatElevation(value.elevation)}
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
  hover,
  selected,
  onClear,
}: {
  hover: GeoCoordinate | null;
  selected: GeoCoordinate | null;
  onClear: () => void;
}) {
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

  return (
    <section aria-label="Coordinates" className="panel pointer-events-auto px-3 py-2.5">
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <h2 className="text-[10px] uppercase tracking-[0.12em] text-muted">
          Lat · Lon <span className="text-faint">(decimal °, WGS84)</span>
        </h2>
        {selected && (
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={copy}
              className="focus-ring rounded p-1 text-muted transition-colors hover:text-ink"
              aria-label="Copy selected coordinates"
              title={copied ? "Copied" : "Copy"}
            >
              <Icon name="copy" className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={onClear}
              className="focus-ring rounded p-1 text-muted transition-colors hover:text-ink"
              aria-label="Clear selected location"
              title="Clear"
            >
              <Icon name="close" className="size-3.5" />
            </button>
          </div>
        )}
      </div>
      <dl className="space-y-1" aria-live="polite">
        <div className="hidden [@media(hover:hover)]:block">
          <Row label="Cursor" value={hover} />
        </div>
        <Row label="Selected" value={selected} />
      </dl>
      {!selected && <p className="mt-1.5 text-[11px] text-faint">Click or tap the globe to select a location.</p>}
      <span className="sr-only" aria-live="polite">{copied ? "Coordinates copied" : ""}</span>
    </section>
  );
}
