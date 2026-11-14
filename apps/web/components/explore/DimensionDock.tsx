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
import {
  configPatchFromSlot,
  TIMELINE_TREND_INDEX,
  timelineIndexFromConfig,
  timelineSlotFromIndex,
} from "@/lib/globe/climate-timeline";
import { useLocale } from "@/lib/i18n/locale";
import type { Messages } from "@/lib/i18n/messages";

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

function dockTitle(config: ActiveClimateConfig, copy: Messages): string {
  if (config.dimension === "heat_extremes") {
    return config.heatMetric === "hot_days_35" ? copy.dock.hotDays : copy.dock.tropical;
  }
  if (config.dimension === "rain_extremes") {
    return config.rainMetric === "wettest_day" ? copy.dock.wettest : copy.dock.drySpell;
  }
  return copy.dimensions[config.dimension].label;
}

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
  const { m } = useLocale();
  const modeLabels: { id: ClimateDisplayMode; label: string; title: string }[] = [
    { id: "value", label: m.dock.annual, title: m.dock.annualTitle },
    { id: "trend", label: m.dock.trend, title: m.dock.trendTitle },
  ];
  const activeDim = DIMENSIONS.find((d) => d.id === config.dimension) ?? DIMENSIONS[0];
  const eff = getEffectiveMeta(config);
  const hasGrid = dimensionHasSpatialGrid(config.dimension);
  const slotIndex = timelineIndexFromConfig(config.mode, config.year);
  const onTrend = config.mode === "trend";
  const atFirst = slotIndex <= 0;
  const atLast = slotIndex >= TIMELINE_TREND_INDEX;

  const stepSlot = (delta: number) => {
    const next = Math.min(TIMELINE_TREND_INDEX, Math.max(0, slotIndex + delta));
    onChange(configPatchFromSlot(timelineSlotFromIndex(next)));
  };

  return (
    <section
      aria-label={m.dock.aria}
      className="panel pointer-events-auto w-[min(20rem,calc(100vw-2rem))] overflow-hidden px-2 py-1.5 shadow-2xl"
    >
      <div className="grid grid-cols-4 gap-1" role="tablist" aria-label={m.dock.tabs}>
        {DIMENSIONS.map((d) => {
          const active = d.id === config.dimension;
          return (
            <button
              key={d.id}
              type="button"
              role="tab"
              aria-selected={active}
              title={m.dimensions[d.id].label}
              onClick={() => onChange({ dimension: d.id as DimensionId })}
              className={`focus-ring truncate rounded-md px-1 py-1 text-center text-[10px] font-medium leading-tight transition-colors ${
                active
                  ? "bg-accent text-accent-ink shadow-sm"
                  : "bg-white/6 text-muted hover:bg-white/12 hover:text-ink"
              }`}
            >
              {m.dimensions[d.id].short}
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
            {m.dock.map}
          </button>
        )}
        <button
          type="button"
          onClick={onToggleStations}
          aria-pressed={stationsVisible}
          title={m.dock.stationsTitle}
          className={`focus-ring flex-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium transition-colors ${
            stationsVisible
              ? "border-accent/50 bg-accent/15 text-ink"
              : "border-line bg-white/5 text-faint hover:text-muted"
          }`}
        >
          {m.dock.stations}
        </button>
      </div>

      {(config.dimension === "heat_extremes" || config.dimension === "rain_extremes") && (
        <div className="mt-1.5 flex flex-wrap gap-1 border-t border-line/60 pt-1.5">
          {config.dimension === "heat_extremes" &&
            (
              [
                ["tropical_nights", m.dock.tropical],
                ["hot_days_35", m.dock.hotDays],
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
                ["max_dry_spell", m.dock.drySpell],
                ["wettest_day", m.dock.wettest],
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
        {modeLabels.map((mode) => (
          <button
            key={mode.id}
            type="button"
            title={mode.title}
            onClick={() =>
              onChange(mode.id === "trend" ? { mode: "trend" } : { mode: "value", year: config.year })
            }
            className={`focus-ring flex-1 rounded-md px-1 py-0.5 text-[10px] transition-colors ${
              config.mode === mode.id
                ? "bg-white/15 font-medium text-ink"
                : "text-muted hover:bg-white/8 hover:text-ink"
            }`}
          >
            {mode.label}
          </button>
        ))}
      </div>

      <div className="mt-1.5 space-y-1">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => stepSlot(-1)}
            disabled={atFirst || playing}
            aria-label={m.dock.prev}
            className="focus-ring size-6 shrink-0 rounded-md bg-white/10 text-[11px] text-ink hover:bg-white/20 disabled:opacity-35"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={onTogglePlay}
            disabled={!hasGrid}
            aria-label={playing ? m.dock.pause : m.dock.play(FIRST_OBSERVED_YEAR, LAST_COMPLETE_YEAR)}
            className="focus-ring flex size-7 shrink-0 items-center justify-center rounded-full bg-accent/90 text-[11px] text-accent-ink hover:bg-accent disabled:opacity-35"
          >
            {playing ? "❚❚" : "▶"}
          </button>
          <button
            type="button"
            onClick={() => stepSlot(1)}
            disabled={atLast || playing}
            aria-label={m.dock.next}
            className="focus-ring size-6 shrink-0 rounded-md bg-white/10 text-[11px] text-ink hover:bg-white/20 disabled:opacity-35"
          >
            ›
          </button>
          <span
            className={`min-w-[3.4rem] rounded px-1 py-0.5 text-center font-mono text-[10px] font-semibold tabular-nums ${
              onTrend ? "bg-amber-400/20 text-amber-100" : "bg-white/10 text-ink"
            }`}
          >
            {onTrend ? m.dock.trend : config.year}
          </span>
          <span className="font-mono text-[9px] text-faint">
            {FIRST_OBSERVED_YEAR}–{LAST_COMPLETE_YEAR}
          </span>
        </div>

        <div className="px-0.5 pt-0.5">
          <div className="pointer-events-none mb-0.5 flex h-1 overflow-hidden rounded-full" aria-hidden>
            <div className="w-[82%] bg-sky-300/25" />
            <div className={`w-[18%] ${onTrend ? "bg-amber-400/70" : "bg-amber-400/30"}`} />
          </div>
          <input
            type="range"
            min={0}
            max={TIMELINE_TREND_INDEX}
            step={1}
            value={slotIndex}
            disabled={playing}
            aria-label={m.dock.slider}
            aria-valuetext={
              onTrend ? m.dock.trendValue(FIRST_OBSERVED_YEAR, LAST_COMPLETE_YEAR) : String(config.year)
            }
            onChange={(e) => {
              const parsed = Number(e.target.value);
              if (!Number.isFinite(parsed)) return;
              onChange(configPatchFromSlot(timelineSlotFromIndex(parsed)));
            }}
            className="focus-ring w-full accent-sky-300 disabled:opacity-40"
          />
          <div className="flex justify-between font-mono text-[9px] text-faint">
            <span>{FIRST_OBSERVED_YEAR}</span>
            <span>{LAST_COMPLETE_YEAR}</span>
            <span className={onTrend ? "text-amber-200" : ""}>{m.dock.trend}</span>
          </div>
        </div>

        {playing && !timelineReady && (
          <p className="text-[10px] text-faint">{m.dock.preparingFrames}</p>
        )}
        {playing && timelineReady && !onTrend && config.year < LAST_COMPLETE_YEAR && (
          <p className="text-[10px] leading-snug text-faint">
            {m.dock.blend}
          </p>
        )}
        {playing && timelineReady && !onTrend && config.year >= LAST_COMPLETE_YEAR && (
          <p className="text-[10px] leading-snug text-amber-100/90">
            {m.dock.nextTrend(FIRST_OBSERVED_YEAR, LAST_COMPLETE_YEAR)}
          </p>
        )}
        {onTrend && (
          <p className="text-[10px] leading-snug text-muted">
            {m.dock.slopeNote(FIRST_OBSERVED_YEAR, LAST_COMPLETE_YEAR)}
          </p>
        )}
      </div>

      <p className="mt-1.5 min-w-0 truncate border-t border-line/60 pt-1.5 text-[11px] font-medium text-ink">
        {onTrend
          ? `${dockTitle(config, m)} · ${m.dock.trend}`
          : `${dockTitle(config, m)} · ${config.year}`}
        {activeDim.synthetic && (
          <span className="ml-1 rounded bg-warn/15 px-1 py-px text-[9px] font-normal text-warn">
            {activeDim.badge ?? m.dock.pilot}
          </span>
        )}
      </p>
    </section>
  );
}
