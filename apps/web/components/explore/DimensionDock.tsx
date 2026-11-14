"use client";

import {
  DIMENSIONS,
  dimensionHasSpatialGrid,
  FIRST_OBSERVED_YEAR,
  getEffectiveMeta,
  LAST_COMPLETE_YEAR,
  type ActiveClimateConfig,
  type ClimateDisplayMode,
  type DimensionId,
  type HeatSubMetric,
  type RainSubMetric,
} from "@/lib/globe/climate";

interface DimensionDockProps {
  config: ActiveClimateConfig;
  heatmapVisible: boolean;
  stationsVisible: boolean;
  playing: boolean;
  timelineReady: boolean;
  onChange: (patch: Partial<ActiveClimateConfig>) => void;
  onToggleHeatmap: () => void;
  onToggleStations: () => void;
  onTogglePlay: () => void;
}

const MODE_LABELS: { id: ClimateDisplayMode; label: string; title: string }[] = [
  { id: "value", label: "Annual", title: "Observed annual value" },
  { id: "trend", label: "Trend", title: "Decadal Trend" },
];

export function DimensionDock({
  config,
  heatmapVisible,
  stationsVisible,
  playing,
  timelineReady,
  onChange,
  onToggleHeatmap,
  onToggleStations,
  onTogglePlay,
}: DimensionDockProps) {
  const activeDim = DIMENSIONS.find((d) => d.id === config.dimension) ?? DIMENSIONS[0];
  const eff = getEffectiveMeta(config);
  const hasGrid = dimensionHasSpatialGrid(config.dimension);
  const canPlay = config.mode === "value" && hasGrid;

  const stepYear = (delta: number) => {
    const next = Math.min(LAST_COMPLETE_YEAR, Math.max(FIRST_OBSERVED_YEAR, config.year + delta));
    onChange({ year: next });
  };

  return (
    <section
      aria-label="Climate dimensions"
      className="panel pointer-events-auto w-[min(20rem,calc(100vw-2rem))] overflow-hidden px-2 py-1.5 shadow-2xl"
    >
      <div className="grid grid-cols-4 gap-1" role="tablist" aria-label="Environmental dimensions">
        {DIMENSIONS.map((d) => {
          const active = d.id === config.dimension;
          return (
            <button
              key={d.id}
              type="button"
              role="tab"
              aria-selected={active}
              title={d.label}
              onClick={() => onChange({ dimension: d.id as DimensionId })}
              className={`focus-ring truncate rounded-md px-1 py-1 text-center text-[10px] font-medium leading-tight transition-colors ${
                active
                  ? "bg-accent text-accent-ink shadow-sm"
                  : "bg-white/6 text-muted hover:bg-white/12 hover:text-ink"
              }`}
            >
              {d.shortLabel}
            </button>
          );
        })}
      </div>

      <div className="mt-1.5 flex gap-1">
        {hasGrid && (
          <button
            type="button"
            onClick={onToggleHeatmap}
            aria-pressed={heatmapVisible}
            className={`focus-ring flex-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium transition-colors ${
              heatmapVisible
                ? "border-accent/50 bg-accent/15 text-ink"
                : "border-line bg-white/5 text-faint hover:text-muted"
            }`}
          >
            Map
          </button>
        )}
        <button
          type="button"
          onClick={onToggleStations}
          aria-pressed={stationsVisible}
          title="NOAA reference weather stations: one per province nationally, all of them inside a selected region (or river hubs). Full list: station catalog tool."
          className={`focus-ring flex-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium transition-colors ${
            stationsVisible
              ? "border-accent/50 bg-accent/15 text-ink"
              : "border-line bg-white/5 text-faint hover:text-muted"
          }`}
        >
          Stations
        </button>
      </div>

      {(config.dimension === "heat_extremes" || config.dimension === "rain_extremes") && (
        <div className="mt-1.5 flex flex-wrap gap-1 border-t border-line/60 pt-1.5">
          {config.dimension === "heat_extremes" &&
            (
              [
                ["tropical_nights", "Tropical nights"],
                ["hot_days_35", "Days > 35 °C"],
              ] as [HeatSubMetric, string][]
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => onChange({ heatMetric: id })}
                className={`focus-ring rounded px-1.5 py-0.5 text-[10px] ${
                  config.heatMetric === id ? "bg-white/15 font-medium text-ink" : "text-muted hover:text-ink"
                }`}
              >
                {label}
              </button>
            ))}
          {config.dimension === "rain_extremes" &&
            (
              [
                ["max_dry_spell", "Dry spell"],
                ["wettest_day", "Wettest day"],
              ] as [RainSubMetric, string][]
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => onChange({ rainMetric: id })}
                className={`focus-ring rounded px-1.5 py-0.5 text-[10px] ${
                  config.rainMetric === id ? "bg-white/15 font-medium text-ink" : "text-muted hover:text-ink"
                }`}
              >
                {label}
              </button>
            ))}
        </div>
      )}

      <div className="mt-1.5 flex gap-1 border-t border-line pt-1.5">
        {MODE_LABELS.map((m) => (
          <button
            key={m.id}
            type="button"
            title={m.title}
            onClick={() => onChange({ mode: m.id })}
            className={`focus-ring flex-1 rounded-md px-1 py-0.5 text-[10px] transition-colors ${
              config.mode === m.id
                ? "bg-white/15 font-medium text-ink"
                : "text-muted hover:bg-white/8 hover:text-ink"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {config.mode === "value" ? (
        <div className="mt-1.5 space-y-1">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => stepYear(-1)}
              disabled={config.year <= FIRST_OBSERVED_YEAR || playing}
              aria-label="Previous observed year"
              className="focus-ring size-6 shrink-0 rounded-md bg-white/10 text-[11px] text-ink hover:bg-white/20 disabled:opacity-35"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={onTogglePlay}
              disabled={!canPlay}
              aria-label={playing ? "Pause timeline" : `Play timeline ${FIRST_OBSERVED_YEAR} to ${LAST_COMPLETE_YEAR}`}
              className="focus-ring flex size-7 shrink-0 items-center justify-center rounded-full bg-accent/90 text-[11px] text-accent-ink hover:bg-accent disabled:opacity-35"
            >
              {playing ? "❚❚" : "▶"}
            </button>
            <button
              type="button"
              onClick={() => stepYear(1)}
              disabled={config.year >= LAST_COMPLETE_YEAR || playing}
              aria-label="Next observed year"
              className="focus-ring size-6 shrink-0 rounded-md bg-white/10 text-[11px] text-ink hover:bg-white/20 disabled:opacity-35"
            >
              ›
            </button>
            <span className="min-w-[3.4rem] rounded bg-white/10 px-1 py-0.5 text-center font-mono text-[10px] font-semibold text-ink tabular-nums">
              {config.year}
            </span>
            <span className="font-mono text-[9px] text-faint">
              {FIRST_OBSERVED_YEAR}–{LAST_COMPLETE_YEAR}
            </span>
          </div>
          {playing && !timelineReady && (
            <p className="text-[10px] text-faint">Preparing observed frames…</p>
          )}
          {playing && timelineReady && (
            <p className="text-[10px] leading-snug text-faint">
              Visual blend between consecutive observed years — not a new year, not a forecast.
            </p>
          )}
        </div>
      ) : (
        <p className="mt-1.5 text-[10px] leading-snug text-muted">
          Theil–Sen slope per decade, complete years. Colour shows slope only, not significance.
        </p>
      )}

      <p className="mt-1.5 min-w-0 truncate border-t border-line/60 pt-1.5 text-[11px] font-medium text-ink">
        {eff.title}
        {activeDim.synthetic && (
          <span className="ml-1 rounded bg-warn/15 px-1 py-px text-[9px] font-normal text-warn">
            {activeDim.badge ?? "Pilot"}
          </span>
        )}
      </p>
    </section>
  );
}
