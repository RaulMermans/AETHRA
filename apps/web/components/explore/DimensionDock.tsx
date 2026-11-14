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

const MODE_LABELS: { id: ClimateDisplayMode; label: string; title: string }[] = [
  { id: "value", label: "Annual", title: "Annual / Forecast" },
  { id: "trend", label: "Trend", title: "Decadal Trend" },
  { id: "anomaly2030", label: "2030 Δ", title: "2030 Δ Change" },
];

const SCENARIO_LABELS: { id: ProjectionScenario; label: string; title: string }[] = [
  { id: "central", label: "Central", title: "Central (Sen)" },
  { id: "high", label: "High", title: "Upper 95% CI" },
  { id: "low", label: "Low", title: "Lower 95% CI" },
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

  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(() => {
      onChange({ year: config.year >= 2030 ? 2000 : config.year + 1 });
    }, 650);
    return () => clearInterval(timer);
  }, [playing, config.year, onChange]);

  return (
    <section
      aria-label="Climate dimensions and 2030 extrapolation"
      className="panel pointer-events-auto w-[min(20rem,calc(100vw-2rem))] overflow-hidden px-2.5 py-2 shadow-2xl"
    >
      <div className="grid grid-cols-3 gap-1" role="tablist" aria-label="Environmental dimensions">
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
          Heatmap {heatmapVisible ? "on" : "off"}
        </button>
        <button
          type="button"
          onClick={onToggleStations}
          aria-pressed={stationsVisible}
          className={`focus-ring flex-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium transition-colors ${
            stationsVisible
              ? "border-accent/50 bg-accent/15 text-ink"
              : "border-line bg-white/5 text-faint hover:text-muted"
          }`}
        >
          Points {stationsVisible ? "on" : "off"}
        </button>
      </div>

      {(config.dimension === "heat_extremes" ||
        config.dimension === "rain_extremes" ||
        config.dimension === "vegetation") && (
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
          {config.dimension === "vegetation" &&
            (
              [
                ["ndvi", "NDVI"],
                ["evi", "EVI"],
              ] as [VegSubMetric, string][]
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => onChange({ vegMetric: id })}
                className={`focus-ring rounded px-1.5 py-0.5 text-[10px] ${
                  config.vegMetric === id ? "bg-white/15 font-medium text-ink" : "text-muted hover:text-ink"
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
        <div className="mt-1.5 flex items-center gap-1.5">
          <button
            type="button"
            onClick={onTogglePlay}
            aria-label={playing ? "Pause timeline" : "Play timeline 2000 to 2030"}
            className="focus-ring flex size-5 shrink-0 items-center justify-center rounded-full bg-white/10 text-[9px] text-ink hover:bg-white/20"
          >
            {playing ? "❚❚" : "▶"}
          </button>
          <span className="font-mono text-[9px] text-faint">2000</span>
          <input
            type="range"
            min={2000}
            max={2030}
            step={1}
            value={config.year}
            onChange={(e) => onChange({ year: Number(e.target.value) })}
            aria-label="Year selector (2000 to 2030)"
            className="focus-ring h-1.5 min-w-0 flex-1 accent-accent"
          />
          <span className="font-mono text-[9px] text-amber-300">2030</span>
          <span
            className={`min-w-[3.4rem] rounded px-1 py-0.5 text-center font-mono text-[10px] font-semibold tabular-nums ${
              isForecastYear ? "bg-amber-400/20 text-amber-300" : "bg-white/10 text-ink"
            }`}
          >
            {config.year}
            {isForecastYear ? "*" : ""}
          </span>
        </div>
      ) : (
        <div className="mt-1.5 flex gap-1">
          {SCENARIO_LABELS.map((sc) => (
            <button
              key={sc.id}
              type="button"
              title={sc.title}
              onClick={() => onChange({ scenario: sc.id })}
              className={`focus-ring flex-1 rounded px-1 py-0.5 text-[10px] ${
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

      {config.mode === "value" && isForecastYear && (
        <div className="mt-1.5 rounded-md bg-amber-500/10 px-2 py-1">
          <p className="text-[10px] leading-snug text-amber-200">Projected {config.year}</p>
          <div className="mt-1 flex gap-1">
            {SCENARIO_LABELS.map((sc) => (
              <button
                key={sc.id}
                type="button"
                title={sc.title}
                onClick={() => onChange({ scenario: sc.id })}
                className={`focus-ring flex-1 rounded px-1 py-0.5 text-[10px] ${
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

      <div className="mt-1.5 border-t border-line/60 pt-1.5">
        <p className="min-w-0 truncate text-[11px] font-medium text-ink">
          {eff.title}
          {activeDim.synthetic && (
            <span className="ml-1 rounded bg-warn/15 px-1 py-px text-[9px] font-normal text-warn">
              {activeDim.badge ?? "Pilot"}
            </span>
          )}
        </p>
        <p className="truncate text-[9px] text-faint">{activeDim.spatialNote}</p>
        <div className="mt-1 flex items-center gap-1.5">
          <span className="font-mono text-[9px] tabular-nums text-muted">{eff.domain[0]}</span>
          <div
            className="h-1.5 flex-1 rounded-full border border-white/15"
            style={{ background: paletteGradientCss(eff.palette) }}
            aria-hidden
          />
          <span className="font-mono text-[9px] tabular-nums text-muted">
            {eff.domain[1]} {eff.units}
          </span>
        </div>
        <button
          type="button"
          onClick={onOpenEvidence}
          className="focus-ring mt-1.5 w-full rounded-md border border-accent/40 bg-accent/15 px-2 py-1 text-[10px] font-medium text-ink transition hover:bg-accent/25"
        >
          2030 Trends & Decisions
        </button>
      </div>
    </section>
  );
}
