"use client";

import { formatDegrees } from "@/lib/format";
import type { GeoCoordinate } from "@/lib/globe/types";
import { Icon } from "./Icon";

/**
 * Reserved area for scientific evidence: trend, time series and provenance for the selected
 * location or region. Renders an explicit empty state until the API provides results.
 */
export function EvidencePanel({
  open,
  onClose,
  selected,
}: {
  open: boolean;
  onClose: () => void;
  selected: GeoCoordinate | null;
}) {
  return (
    <aside
      id="evidence-panel"
      aria-label="Evidence"
      hidden={!open}
      className="panel pointer-events-auto w-full p-4 sm:w-[24rem]"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-medium text-ink">Evidence</h2>
          <p className="mt-0.5 font-mono text-[11px] text-muted">
            {selected
              ? `${formatDegrees(selected.latitude, 4)}, ${formatDegrees(selected.longitude, 4)}`
              : "No location selected"}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close evidence panel"
          className="focus-ring rounded p-1 text-muted transition-colors hover:text-ink"
        >
          <Icon name="close" />
        </button>
      </div>
      <div className="mt-4 grid place-items-center rounded-lg border border-dashed border-line px-4 py-8 text-center">
        <Icon name="chart" className="size-5 text-faint" />
        <p className="mt-2 text-xs text-muted">No analysis connected yet</p>
        <p className="mt-1 max-w-[18rem] text-[11px] leading-snug text-faint">
          Trend, time series, significance and provenance for the selected location will appear here
          once the analysis API is available.
        </p>
      </div>
    </aside>
  );
}
