"use client";

import {
  getEffectiveMeta,
  samplePaletteCss,
  type ActiveClimateConfig,
  type DimensionId,
} from "@/lib/globe/climate";

const STATION_DIMS: DimensionId[] = [
  "temperature",
  "precipitation",
  "snow",
  "heat_extremes",
  "rain_extremes",
  "wind",
];

function formatTick(n: number): string {
  if (Math.abs(n) >= 100) return n.toFixed(0);
  if (Math.abs(n) >= 10) return n.toFixed(0);
  return n.toFixed(1).replace(/\.0$/, "");
}

function metricCaption(cfg: ActiveClimateConfig): string {
  if (cfg.dimension === "water_rivers" || cfg.dimension === "drought") {
    return cfg.mode === "trend"
      ? "Basin runoff trend"
      : cfg.mode === "anomaly2030"
        ? "Projected basin runoff change"
        : "Basin runoff this year";
  }
  if (cfg.dimension === "snow") return "Snow days at mountain stations";
  if (cfg.dimension === "wind") return "Mean wind speed at the station";
  if (cfg.dimension === "heat_extremes") {
    return cfg.heatMetric === "tropical_nights" ? "Tropical nights at the station" : "Hot days at the station";
  }
  if (cfg.dimension === "rain_extremes") {
    return cfg.rainMetric === "max_dry_spell" ? "Longest dry spell at the station" : "Wettest day at the station";
  }
  if (cfg.dimension === "precipitation") return "Annual rainfall at the gauge";
  return "Air temperature at the station";
}

export function PointsLegend({ config }: { config: ActiveClimateConfig }) {
  const dim = config.dimension;
  const stations = STATION_DIMS.includes(dim);
  const basins = dim === "water_rivers" || dim === "drought";
  if (!stations && !basins) return null;

  const eff = getEffectiveMeta(config);
  const [lo, hi] = eff.domain;
  const stops = [0, 0.25, 0.5, 0.75, 1].map((t) => {
    const value = lo + (hi - lo) * t;
    return { value, color: samplePaletteCss(eff.palette, value, eff.domain) };
  });

  return (
    <div className="panel pointer-events-auto px-2.5 py-1.5" aria-label="Point color legend">
      <p className="text-[9px] uppercase tracking-[0.16em] text-faint">Points</p>
      <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
        {stations && (
          <li className="flex items-center gap-1.5 text-[10px] text-muted">
            <span className="size-1.5 shrink-0 rounded-full bg-sky-300 ring-1 ring-[#0b1424]" aria-hidden />
            NOAA station
          </li>
        )}
        {basins && (
          <li className="flex items-center gap-1.5 text-[10px] text-muted">
            <span className="size-2 shrink-0 rounded-full bg-cyan-300 ring-2 ring-sky-400" aria-hidden />
            Basin hub
          </li>
        )}
      </ul>
      <p className="mt-1 text-[10px] leading-snug text-ink">{metricCaption(config)}</p>
      <div className="mt-1 flex items-center gap-1.5">
        <span className="font-mono text-[8px] tabular-nums text-faint">{formatTick(lo)}</span>
        <div className="flex flex-1 items-center justify-between" role="img" aria-label={`${eff.units} color scale`}>
          {stops.map((stop, i) => (
            <span
              key={i}
              className="size-2 rounded-full ring-1 ring-black/40"
              style={{ background: stop.color }}
              title={`${formatTick(stop.value)} ${eff.units}`}
            />
          ))}
        </div>
        <span className="font-mono text-[8px] tabular-nums text-faint">
          {formatTick(hi)} {eff.units}
        </span>
      </div>
    </div>
  );
}
