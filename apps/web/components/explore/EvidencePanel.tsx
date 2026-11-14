"use client";

import { useState } from "react";
import { formatDegrees } from "@/lib/format";
import {
  queryClimateAtLocation,
  type ActiveClimateConfig,
  type ClimateBundle,
  type DecisionAlert,
  type LocationEvidence,
  type RiverBasin,
} from "@/lib/globe/climate";
import type { GeoCoordinate } from "@/lib/globe/types";
import { Icon } from "./Icon";

interface EvidencePanelProps {
  open: boolean;
  onClose: () => void;
  selected: GeoCoordinate | null;
  bundle: ClimateBundle | null;
  config: ActiveClimateConfig;
  onSelectYear: (year: number) => void;
  onSelectLocation: (coord: GeoCoordinate | null) => void;
}

const LEVEL_BADGE: Record<DecisionAlert["level"], string> = {
  LOW: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  MODERATE: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  HIGH: "bg-amber-500/20 text-amber-300 border-amber-500/40",
  CRITICAL: "bg-rose-500/20 text-rose-300 border-rose-500/40",
};

function TrendForecastChart({
  evidence,
  selectedYear,
  onSelectYear,
}: {
  evidence: LocationEvidence;
  selectedYear: number;
  onSelectYear: (year: number) => void;
}) {
  const pts = evidence.series;
  const w = 340;
  const h = 135;
  const padL = 34;
  const padR = 10;
  const padT = 12;
  const padB = 20;
  const innerW = w - padL - padR;
  const innerH = h - padT - padB;

  const allVals: number[] = [];
  for (const p of pts) {
    if (p.observed !== undefined) allVals.push(p.observed);
    allVals.push(p.trend);
    if (p.ciLow !== undefined) allVals.push(p.ciLow);
    if (p.ciHigh !== undefined) allVals.push(p.ciHigh);
  }
  const vMin = Math.min(...allVals);
  const vMax = Math.max(...allVals);
  const span = vMax - vMin || 1;
  const yMin = vMin - span * 0.1;
  const yMax = vMax + span * 0.1;

  const xOf = (yr: number) => padL + ((yr - 2000) / 30) * innerW;
  const yOf = (val: number) => padT + (1 - (val - yMin) / (yMax - yMin || 1)) * innerH;

  // Trend line path (2000..2030)
  const trendPath = pts
    .map((p, i) => `${i === 0 ? "M" : "L"}${xOf(p.year).toFixed(1)},${yOf(p.trend).toFixed(1)}`)
    .join(" ");

  // Observed polyline (2000..2026)
  const obsPts = pts.filter((p) => p.observed !== undefined);
  const obsPath = obsPts
    .map((p, i) => `${i === 0 ? "M" : "L"}${xOf(p.year).toFixed(1)},${yOf(p.observed!).toFixed(1)}`)
    .join(" ");

  // 2025..2030 95% CI fan polygon
  const ciPts = pts.filter((p) => p.ciLow !== undefined && p.ciHigh !== undefined);
  const ciPolygon =
    ciPts.length > 1
      ? [
          ...ciPts.map((p, i) => `${i === 0 ? "M" : "L"}${xOf(p.year).toFixed(1)},${yOf(p.ciHigh!).toFixed(1)}`),
          ...[...ciPts].reverse().map((p) => `L${xOf(p.year).toFixed(1)},${yOf(p.ciLow!).toFixed(1)}`),
          "Z",
        ].join(" ")
      : "";

  const x2026 = xOf(2026);
  const xSel = xOf(selectedYear);

  return (
    <div className="rounded-lg border border-line bg-black/25 p-2.5">
      <div className="mb-1 flex items-center justify-between text-[10px] text-muted">
        <span className="font-medium text-ink">
          2000–2026 Observed + 2030 Projection ({evidence.units})
        </span>
        <span className="text-amber-300">95% CI Cone (2026–2030)</span>
      </div>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="h-32 w-full cursor-pointer select-none overflow-visible"
        role="img"
        aria-label={`Time series and 2030 trend extrapolation for ${evidence.effectiveTitle}`}
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const relX = ((e.clientX - rect.left) / rect.width) * w;
          const yr = Math.round(2000 + ((relX - padL) / innerW) * 30);
          onSelectYear(Math.max(2000, Math.min(2030, yr)));
        }}
      >
        {/* Forecast shaded background (2026..2030) */}
        <rect
          x={x2026}
          y={padT}
          width={Math.max(0, w - padR - x2026)}
          height={innerH}
          fill="rgba(251, 191, 36, 0.08)"
        />
        <line
          x1={x2026}
          y1={padT}
          x2={x2026}
          y2={padT + innerH}
          stroke="rgba(251, 191, 36, 0.45)"
          strokeDasharray="3 3"
        />

        {/* Y axis labels */}
        {[0, 0.5, 1].map((t) => {
          const v = yMin + t * (yMax - yMin);
          const y = yOf(v);
          return (
            <g key={t}>
              <line x1={padL} y1={y} x2={w - padR} y2={y} stroke="rgba(255,255,255,0.07)" />
              <text x={padL - 4} y={y + 3} textAnchor="end" className="fill-white/45 font-mono text-[8.5px]">
                {v.toFixed(vMax - vMin < 2 ? 2 : 0)}
              </text>
            </g>
          );
        })}

        {/* 95% CI Cone */}
        {ciPolygon && <path d={ciPolygon} fill="rgba(251, 191, 36, 0.24)" />}

        {/* Sen's slope trend line */}
        <path d={trendPath} fill="none" stroke="#fbbf24" strokeWidth={1.6} strokeDasharray="4 2" />

        {/* Historical observations */}
        {obsPath && <path d={obsPath} fill="none" stroke="#7cc4ff" strokeWidth={1.8} />}
        {obsPts.map((p) => (
          <circle
            key={p.year}
            cx={xOf(p.year)}
            cy={yOf(p.observed!)}
            r={p.year === selectedYear ? 3.5 : 1.8}
            fill={p.year === selectedYear ? "#ffffff" : "#7cc4ff"}
          />
        ))}

        {/* Selected year cursor */}
        <line x1={xSel} y1={padT} x2={xSel} y2={padT + innerH} stroke="rgba(255,255,255,0.5)" strokeWidth={1} />

        {/* X axis ticks */}
        {[2000, 2010, 2020, 2026, 2030].map((yr) => (
          <text
            key={yr}
            x={xOf(yr)}
            y={h - 4}
            textAnchor="middle"
            className={`font-mono text-[8.5px] ${yr > 2026 ? "fill-amber-300" : "fill-white/50"}`}
          >
            {yr}
          </text>
        ))}
      </svg>
    </div>
  );
}

function GldasNationalCurve({
  gldas,
}: {
  gldas: NonNullable<LocationEvidence["gldasSeries"]>;
}) {
  const pts = gldas.points;
  const w = 340;
  const h = 96;
  const padL = 34;
  const padR = 10;
  const padT = 10;
  const padB = 18;
  const innerW = w - padL - padR;
  const innerH = h - padT - padB;

  const vals = pts.flatMap((p) => (p.secondary !== undefined ? [p.primary, p.secondary] : [p.primary]));
  const vMin = Math.min(...vals);
  const vMax = Math.max(...vals);
  const span = vMax - vMin || 1;
  const yMin = vMin - span * 0.1;
  const yMax = vMax + span * 0.1;

  const xOf = (yr: number) => padL + ((yr - 2000) / 26) * innerW;
  const yOf = (val: number) => padT + (1 - (val - yMin) / (yMax - yMin || 1)) * innerH;

  const primaryPath = pts
    .map((p, i) => `${i === 0 ? "M" : "L"}${xOf(p.year).toFixed(1)},${yOf(p.primary).toFixed(1)}`)
    .join(" ");
  const secondaryPath = pts.some((p) => p.secondary !== undefined)
    ? pts
        .filter((p) => p.secondary !== undefined)
        .map((p, i) => `${i === 0 ? "M" : "L"}${xOf(p.year).toFixed(1)},${yOf(p.secondary!).toFixed(1)}`)
        .join(" ")
    : "";

  return (
    <div className="rounded-lg border border-line bg-black/25 p-2.5">
      <div className="mb-1 flex items-center justify-between gap-2 text-[10px]">
        <span className="truncate font-medium text-ink">{gldas.title}</span>
        <span className="shrink-0 font-mono text-muted">
          {gldas.stats.slope_decade > 0 ? "+" : ""}
          {gldas.stats.slope_decade} {gldas.units}/dec (p={gldas.stats.p_value.toFixed(2)})
        </span>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="h-24 w-full overflow-visible">
        {[0, 1].map((t) => {
          const v = yMin + t * (yMax - yMin);
          const y = yOf(v);
          return (
            <g key={t}>
              <line x1={padL} y1={y} x2={w - padR} y2={y} stroke="rgba(255,255,255,0.07)" />
              <text x={padL - 4} y={y + 3} textAnchor="end" className="fill-white/45 font-mono text-[8px]">
                {v.toFixed(vMax < 10 ? 1 : 0)}
              </text>
            </g>
          );
        })}
        {secondaryPath && <path d={secondaryPath} fill="none" stroke="#f59e0b" strokeWidth={1.4} strokeDasharray="3 2" />}
        <path d={primaryPath} fill="none" stroke="#34d399" strokeWidth={1.8} />
        {[2000, 2010, 2020, 2026].map((yr) => (
          <text key={yr} x={xOf(yr)} y={h - 3} textAnchor="middle" className="fill-white/45 font-mono text-[8px]">
            {yr}
          </text>
        ))}
      </svg>
      <div className="mt-1 flex items-center gap-3 text-[10px] text-muted">
        <span className="inline-flex items-center gap-1">
          <span className="size-2 rounded-full bg-emerald-400" /> {gldas.primaryLabel}
        </span>
        {gldas.secondaryLabel && (
          <span className="inline-flex items-center gap-1">
            <span className="size-2 rounded-full bg-amber-400" /> {gldas.secondaryLabel}
          </span>
        )}
      </div>
    </div>
  );
}

export function EvidencePanel({
  open,
  onClose,
  selected,
  bundle,
  config,
  onSelectYear,
  onSelectLocation,
}: EvidencePanelProps) {
  const [tab, setTab] = useState<"evidence" | "decisions">("evidence");

  if (!open) return null;

  const evidence = bundle ? queryClimateAtLocation(bundle, config, selected) : null;

  return (
    <aside
      id="evidence-panel"
      aria-label="Scientific Evidence and 2030 Decision Support"
      className="panel pointer-events-auto flex max-h-[calc(100dvh-10rem)] w-full flex-col overflow-hidden sm:w-[26rem]"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 border-b border-line px-4 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-sm font-semibold text-ink">
              {evidence ? evidence.locationLabel : "Evidence & 2030 Forecast"}
            </h2>
            {selected && (
              <button
                type="button"
                onClick={() => onSelectLocation(null)}
                className="focus-ring rounded bg-white/8 px-1.5 py-0.5 text-[10px] text-muted hover:text-ink"
              >
                Reset to Spain
              </button>
            )}
          </div>
          <p className="mt-0.5 truncate font-mono text-[11px] text-muted">
            {evidence
              ? evidence.subLabel
              : selected
                ? `${formatDegrees(selected.latitude, 3)}, ${formatDegrees(selected.longitude, 3)}`
                : "Spain national analysis"}
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

      {/* Mode tabs: Scientific Evidence vs 2030 Decisions */}
      <div className="grid grid-cols-2 border-b border-line bg-white/3 p-1 text-xs">
        <button
          type="button"
          onClick={() => setTab("evidence")}
          className={`focus-ring rounded py-1.5 font-medium transition ${
            tab === "evidence" ? "bg-white/12 text-ink" : "text-muted hover:text-ink"
          }`}
        >
          Trend & 2030 Curve
        </button>
        <button
          type="button"
          onClick={() => setTab("decisions")}
          className={`focus-ring rounded py-1.5 font-medium transition ${
            tab === "decisions" ? "bg-amber-400/20 text-amber-200" : "text-muted hover:text-ink"
          }`}
        >
          2030 Decision Matrix
        </button>
      </div>

      {!evidence ? (
        <div className="grid place-items-center p-8 text-center">
          <p className="text-xs text-muted">Loading Spain climate bundle…</p>
        </div>
      ) : (
        <div className="space-y-3 overflow-y-auto p-3.5 text-xs">
          {/* Quick Basin / Region selector when in Water/Rivers or Drought */}
          {bundle && (config.dimension === "water_rivers" || config.dimension === "drought") && (
            <div className="flex flex-wrap items-center gap-1">
              <span className="mr-1 text-[10px] text-faint">Basins:</span>
              {bundle.rivers.map((b: RiverBasin) => {
                const isCurr = evidence.basin?.id === b.id;
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => onSelectLocation({ latitude: b.lat, longitude: b.lon })}
                    className={`focus-ring rounded px-1.5 py-0.5 text-[10px] ${
                      isCurr ? "bg-sky-400/25 font-medium text-sky-200" : "bg-white/6 text-muted hover:text-ink"
                    }`}
                  >
                    {b.name.replace("Cuenca del ", "")}
                  </button>
                );
              })}
            </div>
          )}

          {tab === "evidence" ? (
            <>
              {/* KPI Grid answering What / How Much / 2030 Forecast / Significance */}
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-lg border border-line bg-white/4 p-2">
                  <p className="text-[10px] text-faint">
                    {evidence.currentYear} {evidence.currentYear > 2026 ? "(Proj.)" : "(Obs.)"}
                  </p>
                  <p className="mt-0.5 font-mono text-sm font-semibold text-ink">
                    {evidence.currentValue} <span className="text-[10px] font-normal text-muted">{evidence.units}</span>
                  </p>
                </div>
                <div className="rounded-lg border border-line bg-white/4 p-2">
                  <p className="text-[10px] text-faint">Sen&apos;s Trend</p>
                  <p className="mt-0.5 font-mono text-sm font-semibold text-ink">
                    {evidence.stats.slope_decade > 0 ? "+" : ""}
                    {evidence.stats.slope_decade}{" "}
                    <span className="text-[10px] font-normal text-muted">{evidence.trendUnits}</span>
                  </p>
                  <p className="font-mono text-[9px] text-faint">
                    95% CI [{evidence.stats.ci_low_decade}, {evidence.stats.ci_high_decade}]
                  </p>
                </div>
                <div className="rounded-lg border border-amber-400/30 bg-amber-400/10 p-2">
                  <p className="text-[10px] text-amber-200">2030 Forecast</p>
                  <p className="mt-0.5 font-mono text-sm font-semibold text-amber-100">
                    {evidence.projected2030}{" "}
                    <span className="text-[10px] font-normal text-amber-200/80">{evidence.units}</span>
                  </p>
                  <p className="font-mono text-[9px] text-amber-200/80">
                    Δ vs 2000: {evidence.delta2030 > 0 ? "+" : ""}
                    {evidence.delta2030}
                  </p>
                </div>
              </div>

              {/* Statistical Significance Badge (NASA Validity Criterion) */}
              <div
                className={`flex items-center justify-between rounded-md border px-2.5 py-1.5 text-[11px] ${
                  evidence.stats.significant
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                    : "border-white/15 bg-white/5 text-muted"
                }`}
              >
                <span>
                  {evidence.stats.significant
                    ? "✓ Statistically significant trend (Mann-Kendall)"
                    : "⏳ Insufficient evidence (high interannual variability)"}
                </span>
                <span className="font-mono text-[10px]">
                  p = {evidence.stats.p_value < 0.0001 ? "<0.0001" : evidence.stats.p_value.toFixed(4)}
                </span>
              </div>

              {/* Primary Interactive Chart: 2000-2026 + 2027-2030 Forecast Cone */}
              <TrendForecastChart
                evidence={evidence}
                selectedYear={config.year}
                onSelectYear={onSelectYear}
              />

              {/* Companion National GLDAS Curve (Soil Moisture, Runoff/ET, or SWE) */}
              {evidence.gldasSeries && <GldasNationalCurve gldas={evidence.gldasSeries} />}

              {/* Provenance Card */}
              <div className="rounded-lg border border-line bg-white/3 p-2.5 text-[10px] leading-relaxed text-muted">
                <p className="font-medium text-ink">Provenance & Methodology</p>
                <p className="mt-0.5">
                  <strong>Datasets:</strong> {evidence.dimensionMeta.datasets}
                </p>
                <p>
                  <strong>Method:</strong> Theil-Sen non-parametric slope + two-sided Mann-Kendall test (α = 0.05). 2027–2030 values are trend extrapolations with 95% confidence bounds, associated with historical trajectory (not a dynamical GCM forecast).
                </p>
              </div>
            </>
          ) : (
            /* 2030 Decision Support Matrix */
            <div className="space-y-2.5">
              <p className="text-[11px] leading-snug text-muted">
                Operational recommendations for <strong>{evidence.locationLabel}</strong> based on extrapolated{" "}
                <strong>2030</strong> indicators:
              </p>
              {evidence.decisions.map((d) => (
                <div key={d.sector} className="rounded-lg border border-line bg-white/4 p-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold text-ink">{d.sector}</span>
                    <span className={`rounded border px-1.5 py-0.5 font-mono text-[9px] font-semibold ${LEVEL_BADGE[d.level]}`}>
                      {d.level} RISK
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] font-medium text-ink/90">{d.headline}</p>
                  <p className="mt-0.5 font-mono text-[10px] text-accent">{d.metricSummary}</p>
                  <p className="mt-1 text-[11px] leading-snug text-muted">{d.recommendation}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
