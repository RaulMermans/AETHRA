"use client";

import { useEffect } from "react";
import {
  DIMENSIONS,
  getEffectiveMeta,
  paletteGradientCss,
  type ActiveClimateConfig,
  type ClimateDisplayMode,
  type DimensionId,
  type HeatSubMetric,
  type ProjectionScenario,
  type RainSubMetric,
  type VegSubMetric,
} from "@/lib/globe/climate";

interface DimensionDockProps {
  config: ActiveClimateConfig;
  heatmapVisible: boolean;
  stationsVisible: boolean;
  playing: boolean;
  onChange: (patch: Partial<ActiveClimateConfig>) => void;
  onToggleHeatmap: () => void;
  onToggleStations: () => void;
  onTogglePlay: () => void;
  onOpenEvidence: () => void;
}

const MODE_LABELS: { id: ClimateDisplayMode; label: string }[] = [
  { id: "value", label: "Annual / Forecast" },
  { id: "trend", label: "Decadal Trend" },
  { id: "anomaly2030", label: "2030 Δ Change" },
];

const SCENARIO_LABELS: { id: ProjectionScenario; label: string }[] = [
  { id: "central", label: "Central (Sen)" },
  { id: "high", label: "Upper 95% CI" },
  { id: "low", label: "Lower 95% CI" },
];

export function DimensionDock({
  config,
  heatmapVisible,
  stationsVisible,
  playing,
  onChange,
  onToggleHeatmap,
  onToggleStations,
  onTogglePlay,
  onOpenEvidence,
}: DimensionDockProps) {
  const activeDim = DIMENSIONS.find((d) => d.id === config.dimension) ?? DIMENSIONS[0];
  const eff = getEffectiveMeta(config);
  const isForecastYear = config.year > 2026;

  // Auto-advance year when playing
  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(() => {
      onChange({ year: config.year >= 2030 ? 2000 : config.year + 1 });
    }, 650);
    return () => clearInterval(timer);
  }, [playing, config.year, onChange]);

  return (
    <section
      aria-label="Climate Dimensions and 2030 Extrapolation Controls"
      className="panel pointer-events-auto w-full max-w-[46rem] px-3.5 py-3 shadow-2xl"
    >
      {/* Row 1: 9 Dimension pills */}
      <div className="flex flex-wrap items-center justify-between gap-1.5">
        <div className="flex flex-wrap items-center gap-1" role="tablist" aria-label="Environmental dimensions">
          {DIMENSIONS.map((d) => {
            const active = d.id === config.dimension;
            return (
              <button
                key={d.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onChange({ dimension: d.id as DimensionId })}
                className={`focus-ring rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
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

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onToggleHeatmap}
            aria-pressed={heatmapVisible}
            className={`focus-ring rounded-full border px-2.5 py-1 text-[10px] font-medium transition-colors ${
              heatmapVisible
                ? "border-accent/50 bg-accent/15 text-ink"
                : "border-line bg-white/5 text-faint hover:text-muted"
            }`}
          >
            Heatmap {heatmapVisible ? "ON" : "OFF"}
          </button>
          <button
            type="button"
            onClick={onToggleStations}
            aria-pressed={stationsVisible}
            className={`focus-ring rounded-full border px-2.5 py-1 text-[10px] font-medium transition-colors ${
              stationsVisible
                ? "border-accent/50 bg-accent/15 text-ink"
                : "border-line bg-white/5 text-faint hover:text-muted"
            }`}
          >
            Points/Rivers {stationsVisible ? "ON" : "OFF"}
          </button>
        </div>
      </div>

      {/* Sub-metric selector for Heat Extremes, Rain Extremes, or Vegetation */}
      {(config.dimension === "heat_extremes" ||
        config.dimension === "rain_extremes" ||
        config.dimension === "vegetation") && (
        <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-line/60 pt-2 text-[11px]">
          <span className="text-faint">Indicator:</span>
          {config.dimension === "heat_extremes" && (
            <>
              {(
                [
                  ["tropical_nights", "Tropical Nights (Tmin ≥ 20 °C)"],
                  ["hot_days_35", "Hot Days (Tmax > 35 °C)"],
                ] as [HeatSubMetric, string][]
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => onChange({ heatMetric: id })}
                  className={`focus-ring rounded px-2 py-0.5 text-[11px] ${
                    config.heatMetric === id ? "bg-white/15 font-medium text-ink" : "text-muted hover:text-ink"
                  }`}
                >
                  {label}
                </button>
              ))}
            </>
          )}
          {config.dimension === "rain_extremes" && (
            <>
              {(
                [
                  ["max_dry_spell", "Longest Dry Spell (consecutive days <1 mm)"],
                  ["wettest_day", "Wettest Day of Year (mm/day)"],
                ] as [RainSubMetric, string][]
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => onChange({ rainMetric: id })}
                  className={`focus-ring rounded px-2 py-0.5 text-[11px] ${
                    config.rainMetric === id ? "bg-white/15 font-medium text-ink" : "text-muted hover:text-ink"
                  }`}
                >
                  {label}
                </button>
              ))}
            </>
          )}
          {config.dimension === "vegetation" && (
            <>
              {(
                [
                  ["ndvi", "NDVI (Normalized Difference Vegetation Index)"],
                  ["evi", "EVI (Enhanced Vegetation Index)"],
                ] as [VegSubMetric, string][]
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => onChange({ vegMetric: id })}
                  className={`focus-ring rounded px-2 py-0.5 text-[11px] ${
                    config.vegMetric === id ? "bg-white/15 font-medium text-ink" : "text-muted hover:text-ink"
                  }`}
                >
                  {label}
                </button>
              ))}
            </>
          )}
        </div>
      )}

      {/* Row 2: Mode selector + Year slider (2000 -> 2026 Observed | 2027 -> 2030 Projected) */}
      <div className="mt-2.5 flex flex-col gap-2 border-t border-line pt-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-1">
          {MODE_LABELS.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => onChange({ mode: m.id })}
              className={`focus-ring rounded-md px-2 py-1 text-[11px] transition-colors ${
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
          <div className="flex flex-1 items-center gap-2 sm:max-w-[24rem]">
            <button
              type="button"
              onClick={onTogglePlay}
              aria-label={playing ? "Pause timeline" : "Play timeline 2000 to 2030"}
              className="focus-ring flex size-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-[10px] text-ink hover:bg-white/20"
            >
              {playing ? "❚❚" : "▶"}
            </button>
            <span className="font-mono text-[10px] text-faint">2000</span>
            <input
              type="range"
              min={2000}
              max={2030}
              step={1}
              value={config.year}
              onChange={(e) => onChange({ year: Number(e.target.value) })}
              aria-label="Year selector (2000 to 2030)"
              className="focus-ring h-1.5 flex-1 accent-accent"
            />
            <span className="font-mono text-[10px] text-amber-300">2030</span>
            <span
              className={`min-w-[4.6rem] rounded px-1.5 py-0.5 text-center font-mono text-[11px] font-semibold tabular-nums ${
                isForecastYear ? "bg-amber-400/20 text-amber-300" : "bg-white/10 text-ink"
              }`}
            >
              {config.year}
              {isForecastYear ? " PROJ" : ""}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-[11px]">
            <span className="text-faint">2030 Scenario:</span>
            {SCENARIO_LABELS.map((sc) => (
              <button
                key={sc.id}
                type="button"
                onClick={() => onChange({ scenario: sc.id })}
                className={`focus-ring rounded px-2 py-0.5 text-[10px] ${
                  config.scenario === sc.id
                    ? "bg-amber-400/20 font-medium text-amber-200"
                    : "bg-white/5 text-muted hover:text-ink"
                }`}
              >
                {sc.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Scenario selector when in Forecast years (2027..2030) */}
      {config.mode === "value" && isForecastYear && (
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-md bg-amber-500/10 px-2.5 py-1.5 text-[11px]">
          <span className="text-amber-200">
            <strong>2030 Extrapolation Mode:</strong> Sen&apos;s slope projection ({config.year})
          </span>
          <div className="flex items-center gap-1">
            {SCENARIO_LABELS.map((sc) => (
              <button
                key={sc.id}
                type="button"
                onClick={() => onChange({ scenario: sc.id })}
                className={`focus-ring rounded px-2 py-0.5 text-[10px] ${
                  config.scenario === sc.id
                    ? "bg-amber-400/30 font-medium text-amber-100"
                    : "text-amber-200/70 hover:text-amber-100"
                }`}
              >
                {sc.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Row 3: Colorbar legend + metadata + Open Decision Panel */}
      <div className="mt-2.5 flex flex-col gap-2 border-t border-line/60 pt-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <p className="truncate text-[12px] font-medium text-ink">
              {eff.title}
              {activeDim.synthetic && (
                <span className="ml-1.5 rounded bg-warn/15 px-1.5 py-px text-[10px] text-warn">
                  {activeDim.badge ?? "Derived / Pilot"}
                </span>
              )}
            </p>
            <span className="shrink-0 text-[10px] text-faint">{activeDim.spatialNote}</span>
          </div>
          <div className="mt-1 flex items-center gap-2">
            <span className="font-mono text-[10px] tabular-nums text-muted">
              {eff.domain[0]} {eff.units}
            </span>
            <div
              className="h-2 flex-1 rounded-full border border-white/15"
              style={{ background: paletteGradientCss(eff.palette) }}
              aria-hidden
            />
            <span className="font-mono text-[10px] tabular-nums text-muted">
              {eff.domain[1]} {eff.units}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenEvidence}
          className="focus-ring shrink-0 rounded-full border border-accent/40 bg-accent/15 px-3 py-1.5 text-[11px] font-medium text-ink transition hover:bg-accent/25"
        >
          2030 Trends & Decisions →
        </button>
      </div>
    </section>
  );
}
