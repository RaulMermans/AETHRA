"use client";

import { useMemo, useState } from "react";
import { paletteGradientCss, type PaletteId } from "@/lib/globe/climate";
import {
  ENERGY_CONCEPTS,
  type DualTimeSeriesPoint,
  type EnergyConceptId,
  type EnergyOptimizationGoal,
  type EnergyTargetScope,
  type EnergyVariableLens,
  type EvaluatedEnergySite,
} from "@/lib/globe/energy-tech";
import { Icon } from "./Icon";

const SCOPE_LABELS: Record<EnergyTargetScope, string> = {
  provincia: "Provinces (52 Provincias)",
  ccaa: "Autonomous Communities (19 CCAA)",
  basin: "Hydrographic Basins (8 Demarcaciones)",
  reservoir: "SWOT Reservoirs (48 Embalses NASA)",
};

const GOAL_LABELS: Record<EnergyOptimizationGoal, string> = {
  ideal: "Ideal Sites (Gaining / High Advantage)",
  at_risk: "At-Risk Sites (Losing Advantage / High Stress)",
  significant_only: "Statistically Significant Trends Only (p < 0.05)",
};

const STATUS_BADGE: Record<EvaluatedEnergySite["advantageStatus"], string> = {
  GAINING: "border-emerald-500/40 bg-emerald-500/15 text-emerald-200",
  STABLE_HIGH: "border-sky-500/40 bg-sky-500/15 text-sky-200",
  WATCH: "border-amber-500/40 bg-amber-500/15 text-amber-200",
  LOSING: "border-rose-500/40 bg-rose-500/15 text-rose-200",
};

interface EnergyTechControlsDockProps {
  conceptId: EnergyConceptId;
  scope: EnergyTargetScope;
  goal: EnergyOptimizationGoal;
  lens: EnergyVariableLens;
  heatmapDomain: [number, number];
  heatmapPalette: PaletteId;
  heatmapUnits: string;
  onChangeConcept: (id: EnergyConceptId) => void;
  onChangeScope: (scope: EnergyTargetScope) => void;
  onChangeGoal: (goal: EnergyOptimizationGoal) => void;
  onChangeLens: (lens: EnergyVariableLens) => void;
}

/**
 * Left-hand expert control dock with 4 clean dropdowns for selecting Energy Concept,
 * Territorial Scope, Optimization Goal, and Crossed Variable Lens.
 */
/** EXPLORATORY Energy Lab: missing values (NaN from the pipeline's nulls) render as an em dash. */
function show(v: number): string | number {
  return Number.isFinite(v) ? v : "—";
}

export function EnergyTechControlsDock({
  conceptId,
  scope,
  goal,
  lens,
  heatmapDomain,
  heatmapPalette,
  heatmapUnits,
  onChangeConcept,
  onChangeScope,
  onChangeGoal,
  onChangeLens,
}: EnergyTechControlsDockProps) {
  const concept = ENERGY_CONCEPTS.find((c) => c.id === conceptId) ?? ENERGY_CONCEPTS[0];

  return (
    <section
      aria-label="Energy Technology Suitability Selector"
      className="panel pointer-events-auto w-[min(19.5rem,calc(100vw-2rem))] overflow-hidden p-2.5 shadow-2xl"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-[10.5px] font-semibold tracking-wider text-amber-300 uppercase">
          Energy Tech Analyzer
        </span>
        <span
          className={`rounded px-1.5 py-0.5 font-mono text-[9px] font-medium ${
            concept.coverageBadge.startsWith("100%")
              ? "bg-emerald-500/15 text-emerald-300"
              : "bg-sky-500/15 text-sky-300"
          }`}
        >
          {concept.coverageBadge}
        </span>
      </div>

      {/* Dropdown 1: Energy Concept */}
      <div className="space-y-2">
        <div>
          <label htmlFor="energy-concept-select" className="block text-[10px] font-medium text-muted">
            1. Energy Technology / Concept
          </label>
          <select
            id="energy-concept-select"
            value={conceptId}
            onChange={(e) => onChangeConcept(e.target.value as EnergyConceptId)}
            className="focus-ring mt-1 w-full rounded-lg border border-white/15 bg-[#091224] px-2.5 py-1.5 text-[11.5px] font-medium text-ink shadow-inner"
          >
            {ENERGY_CONCEPTS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </div>

        {/* Dropdown 2: Territorial Unit / Scope */}
        <div className="grid grid-cols-2 gap-1.5">
          <div>
            <label htmlFor="energy-scope-select" className="block text-[10px] font-medium text-muted">
              2. Target Units
            </label>
            <select
              id="energy-scope-select"
              value={scope}
              onChange={(e) => onChangeScope(e.target.value as EnergyTargetScope)}
              className="focus-ring mt-1 w-full rounded-lg border border-white/15 bg-[#091224] px-2 py-1.5 text-[11px] text-ink"
            >
              {concept.allowedScopes.map((sc) => (
                <option key={sc} value={sc}>
                  {SCOPE_LABELS[sc]}
                </option>
              ))}
            </select>
          </div>

          {/* Dropdown 3: Optimization Goal */}
          <div>
            <label htmlFor="energy-goal-select" className="block text-[10px] font-medium text-muted">
              3. Ranking Filter
            </label>
            <select
              id="energy-goal-select"
              value={goal}
              onChange={(e) => onChangeGoal(e.target.value as EnergyOptimizationGoal)}
              className="focus-ring mt-1 w-full rounded-lg border border-white/15 bg-[#091224] px-2 py-1.5 text-[11px] text-ink"
            >
              {(Object.keys(GOAL_LABELS) as EnergyOptimizationGoal[]).map((g) => (
                <option key={g} value={g}>
                  {GOAL_LABELS[g]}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Dropdown 4: Map & Ranking Variable Lens */}
        <div>
          <label htmlFor="energy-lens-select" className="block text-[10px] font-medium text-muted">
            4. Crossed Variable on 3D Globe
          </label>
          <select
            id="energy-lens-select"
            value={lens}
            onChange={(e) => onChangeLens(e.target.value as EnergyVariableLens)}
            className="focus-ring mt-1 w-full rounded-lg border border-white/15 bg-[#091224] px-2.5 py-1.5 text-[11px] text-ink"
          >
            {(Object.keys(concept.lensLabels) as EnergyVariableLens[]).map((l) => (
              <option key={l} value={l}>
                {concept.lensLabels[l]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Research question & crossed variables summary */}
      <div className="mt-2.5 rounded-lg border border-line bg-black/30 p-2">
        <p className="text-[10.5px] font-medium leading-snug text-ink">{concept.questionEs}</p>
        <p className="mt-1 text-[10px] text-amber-200/90">
          <strong>Opportunity:</strong> {concept.opportunity}
        </p>
        <div className="mt-1.5 flex flex-wrap gap-1">
          {concept.variablesCrossed.map((v) => (
            <span
              key={v.id}
              title={`${v.dataset}: ${v.role}`}
              className={`rounded border px-1.5 py-0.5 font-mono text-[9px] ${
                v.isProxy
                  ? "border-amber-400/30 bg-amber-400/10 text-amber-200"
                  : "border-white/10 bg-white/6 text-muted"
              }`}
            >
              {v.label} ({v.units})
            </span>
          ))}
        </div>
      </div>

      {/* Color scale legend for the 3D heatmap */}
      <div className="mt-2 border-t border-line/60 pt-2">
        <div className="flex items-center justify-between text-[10px] text-muted">
          <span className="truncate font-medium text-ink">{concept.lensLabels[lens]}</span>
        </div>
        <div className="mt-1 flex items-center gap-1.5">
          <span className="font-mono text-[9px] tabular-nums text-muted">{heatmapDomain[0]}</span>
          <div
            className="h-1.5 flex-1 rounded-full border border-white/15"
            style={{ background: paletteGradientCss(heatmapPalette) }}
            aria-hidden
          />
          <span className="font-mono text-[9px] tabular-nums text-muted">
            {heatmapDomain[1]} {heatmapUnits}
          </span>
        </div>
      </div>
    </section>
  );
}

/**
 * Dual-Axis Crossed Time Series SVG Chart (2000–2030) comparing Primary vs Secondary crossed variables.
 */
function CrossedDualTimeSeriesChart({
  pts,
  primaryLabel,
  primaryUnits,
  secondaryLabel,
  secondaryUnits,
}: {
  pts: DualTimeSeriesPoint[];
  primaryLabel: string;
  primaryUnits: string;
  secondaryLabel: string;
  secondaryUnits: string;
}) {
  const w = 360;
  const h = 142;
  const padL = 34;
  const padR = 34;
  const padT = 14;
  const padB = 20;
  const innerW = w - padL - padR;
  const innerH = h - padT - padB;

  const fin = (v: number | undefined): v is number => v !== undefined && Number.isFinite(v);
  const pValsRaw = pts.flatMap((p) => [p.primaryObs, p.primaryTrend]).filter(fin);
  const sValsRaw = pts.flatMap((p) => [p.secondaryObs, p.secondaryTrend]).filter(fin);
  const pVals = pValsRaw.length ? pValsRaw : [0];
  const sVals = sValsRaw.length ? sValsRaw : [0];

  const pMinRaw = Math.min(...pVals);
  const pMaxRaw = Math.max(...pVals);
  const pSpan = pMaxRaw - pMinRaw || 1;
  const pMin = pMinRaw - pSpan * 0.12;
  const pMax = pMaxRaw + pSpan * 0.12;

  const sMinRaw = Math.min(...sVals);
  const sMaxRaw = Math.max(...sVals);
  const sSpan = sMaxRaw - sMinRaw || 1;
  const sMin = sMinRaw - sSpan * 0.12;
  const sMax = sMaxRaw + sSpan * 0.12;

  const xOf = (yr: number) => padL + ((yr - 2000) / 30) * innerW;
  const yPrimary = (v: number) => padT + (1 - (v - pMin) / (pMax - pMin || 1)) * innerH;
  const ySecondary = (v: number) => padT + (1 - (v - sMin) / (sMax - sMin || 1)) * innerH;

  const pObsPts = pts.filter((p) => p.primaryObs !== undefined);
  const pObsPath = pObsPts
    .map((p, i) => `${i === 0 ? "M" : "L"}${xOf(p.year).toFixed(1)},${yPrimary(p.primaryObs!).toFixed(1)}`)
    .join(" ");
  const pTrendPath = pts
    .filter((p) => Number.isFinite(p.primaryTrend))
    .map((p, i) => `${i === 0 ? "M" : "L"}${xOf(p.year).toFixed(1)},${yPrimary(p.primaryTrend).toFixed(1)}`)
    .join(" ");

  const sObsPts = pts.filter((p) => p.secondaryObs !== undefined);
  const sObsPath = sObsPts
    .map((p, i) => `${i === 0 ? "M" : "L"}${xOf(p.year).toFixed(1)},${ySecondary(p.secondaryObs!).toFixed(1)}`)
    .join(" ");
  const sTrendPath = pts
    .filter((p) => Number.isFinite(p.secondaryTrend))
    .map((p, i) => `${i === 0 ? "M" : "L"}${xOf(p.year).toFixed(1)},${ySecondary(p.secondaryTrend).toFixed(1)}`)
    .join(" ");

  const x2026 = xOf(2026);

  return (
    <div className="rounded-lg border border-line bg-black/30 p-2.5">
      <div className="mb-1 flex items-center justify-between gap-2 text-[10px]">
        <span className="font-semibold text-ink">Crossed Time Series (2000–2026 Obs. + 2030 Sen Projection)</span>
        <span className="font-mono text-[9.5px] text-amber-300">2026–2030 Forecast</span>
      </div>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="h-34 w-full select-none overflow-visible"
        role="img"
        aria-label={`Crossed time series comparing ${primaryLabel} and ${secondaryLabel}`}
      >
        <rect
          x={x2026}
          y={padT}
          width={Math.max(0, w - padR - x2026)}
          height={innerH}
          fill="rgba(251, 191, 36, 0.07)"
        />
        <line
          x1={x2026}
          y1={padT}
          x2={x2026}
          y2={padT + innerH}
          stroke="rgba(251, 191, 36, 0.4)"
          strokeDasharray="3 3"
        />

        {/* Grid & Dual Y-axis ticks */}
        {[0, 0.5, 1].map((t) => {
          const pv = pMin + t * (pMax - pMin);
          const sv = sMin + t * (sMax - sMin);
          const y = yPrimary(pv);
          return (
            <g key={t}>
              <line x1={padL} y1={y} x2={w - padR} y2={y} stroke="rgba(255,255,255,0.07)" />
              <text x={padL - 4} y={y + 3} textAnchor="end" className="fill-sky-300/85 font-mono text-[8px]">
                {pv.toFixed(pSpan < 4 ? 1 : 0)}
              </text>
              <text x={w - padR + 4} y={y + 3} textAnchor="start" className="fill-amber-300/85 font-mono text-[8px]">
                {sv.toFixed(sSpan < 4 ? 1 : 0)}
              </text>
            </g>
          );
        })}

        {/* Trend lines (2000..2030) */}
        <path d={pTrendPath} fill="none" stroke="#38bdf8" strokeWidth={1.2} strokeDasharray="3 2" opacity={0.75} />
        <path d={sTrendPath} fill="none" stroke="#f59e0b" strokeWidth={1.2} strokeDasharray="3 2" opacity={0.75} />

        {/* Observed lines (2000..2026) */}
        {sObsPath && <path d={sObsPath} fill="none" stroke="#fbbf24" strokeWidth={1.65} />}
        {pObsPath && <path d={pObsPath} fill="none" stroke="#38bdf8" strokeWidth={1.85} />}

        {/* X axis years */}
        {[2000, 2008, 2016, 2025, 2030].map((yr) => (
          <text
            key={yr}
            x={xOf(yr)}
            y={h - 4}
            textAnchor="middle"
            className={`font-mono text-[8px] ${yr > 2026 ? "fill-amber-300" : "fill-white/50"}`}
          >
            {yr}
          </text>
        ))}
      </svg>

      <div className="mt-1 flex flex-wrap items-center justify-between gap-2 text-[10px]">
        <span className="inline-flex items-center gap-1.5 text-sky-200">
          <span className="h-2 w-2 rounded-full bg-sky-400" />
          {primaryLabel} ({primaryUnits})
        </span>
        <span className="inline-flex items-center gap-1.5 text-amber-200">
          <span className="h-2 w-2 rounded-full bg-amber-400" />
          {secondaryLabel} ({secondaryUnits})
        </span>
      </div>
    </div>
  );
}

/**
 * NASA/CNES SWOT Satellite Pass Time Series Chart (2023–2026) for Floating Solar reservoir stability.
 */
function SwotReservoirPassChart({
  swotSeries,
  reservoirName,
}: {
  swotSeries: NonNullable<EvaluatedEnergySite["swotSeries"]>;
  reservoirName: string;
}) {
  if (swotSeries.length < 2) return null;
  const w = 360;
  const h = 104;
  const padL = 34;
  const padR = 34;
  const padT = 12;
  const padB = 18;
  const innerW = w - padL - padR;
  const innerH = h - padT - padB;

  const areas = swotSeries.map((p) => p.area_km2);
  const wses = swotSeries.map((p) => p.wse_m);

  const aMin = Math.min(...areas) * 0.92;
  const aMax = Math.max(...areas) * 1.08 || 1;
  const wMin = Math.min(...wses) - 1.5;
  const wMax = Math.max(...wses) + 1.5;

  const xOf = (idx: number) => padL + (idx / Math.max(1, swotSeries.length - 1)) * innerW;
  const yArea = (v: number) => padT + (1 - (v - aMin) / (aMax - aMin || 1)) * innerH;
  const yWse = (v: number) => padT + (1 - (v - wMin) / (wMax - wMin || 1)) * innerH;

  const areaPath = swotSeries
    .map((p, i) => `${i === 0 ? "M" : "L"}${xOf(i).toFixed(1)},${yArea(p.area_km2).toFixed(1)}`)
    .join(" ");
  const wsePath = swotSeries
    .map((p, i) => `${i === 0 ? "M" : "L"}${xOf(i).toFixed(1)},${yWse(p.wse_m).toFixed(1)}`)
    .join(" ");

  return (
    <div className="rounded-lg border border-emerald-500/25 bg-emerald-950/15 p-2.5">
      <div className="mb-1 flex items-center justify-between text-[10px]">
        <span className="font-semibold text-emerald-200">
          NASA SWOT L2 LakeSP Pass Series (2023–2026) · {reservoirName}
        </span>
        <span className="font-mono text-[9px] text-emerald-300/80">Area (km²) &amp; WSE (m)</span>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="h-24 w-full overflow-visible">
        {[0, 1].map((t) => {
          const av = aMin + t * (aMax - aMin);
          const wv = wMin + t * (wMax - wMin);
          const y = yArea(av);
          return (
            <g key={t}>
              <line x1={padL} y1={y} x2={w - padR} y2={y} stroke="rgba(255,255,255,0.07)" />
              <text x={padL - 4} y={y + 3} textAnchor="end" className="fill-emerald-300 font-mono text-[8px]">
                {av.toFixed(1)}
              </text>
              <text x={w - padR + 4} y={y + 3} textAnchor="start" className="fill-cyan-300 font-mono text-[8px]">
                {wv.toFixed(0)}m
              </text>
            </g>
          );
        })}
        <path d={wsePath} fill="none" stroke="#22d3ee" strokeWidth={1.4} strokeDasharray="3 2" />
        <path d={areaPath} fill="none" stroke="#34d399" strokeWidth={1.9} />
        {swotSeries.map((p, i) => (
          <circle key={p.ym} cx={xOf(i)} cy={yArea(p.area_km2)} r={2} fill="#34d399" />
        ))}
        {[0, Math.floor(swotSeries.length / 2), swotSeries.length - 1].map((idx) => (
          <text
            key={idx}
            x={xOf(idx)}
            y={h - 3}
            textAnchor="middle"
            className="fill-white/50 font-mono text-[8px]"
          >
            {swotSeries[idx]?.ym}
          </text>
        ))}
      </svg>
      <div className="mt-1 flex items-center justify-between text-[9.5px] text-muted">
        <span className="inline-flex items-center gap-1 text-emerald-300">
          <span className="size-2 rounded-full bg-emerald-400" /> Water Surface Area (km²)
        </span>
        <span className="inline-flex items-center gap-1 text-cyan-300">
          <span className="size-2 rounded-full bg-cyan-400" /> Water Surface Elevation WSE (m)
        </span>
      </div>
    </div>
  );
}

interface EnergyTechInspectorPanelProps {
  conceptId: EnergyConceptId;
  scope: EnergyTargetScope;
  goal: EnergyOptimizationGoal;
  sites: EvaluatedEnergySite[];
  selectedSiteId: string | null;
  onSelectSite: (site: EvaluatedEnergySite) => void;
  onClose: () => void;
}

/**
 * Right-hand inspector panel presenting Ranked Ideal Sites, Multi-Variable Crossed Time Series,
 * SWOT Reservoir Stability curves, and Scientific Proof for the active Energy Concept.
 */
export function EnergyTechInspectorPanel({
  conceptId,
  scope,
  goal,
  sites,
  selectedSiteId,
  onSelectSite,
  onClose,
}: EnergyTechInspectorPanelProps) {
  const [search, setSearch] = useState("");
  const [showAllRanks, setShowAllRanks] = useState(false);

  const concept = ENERGY_CONCEPTS.find((c) => c.id === conceptId) ?? ENERGY_CONCEPTS[0];

  const filteredSites = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sites;
    return sites.filter(
      (s) => s.name.toLowerCase().includes(q) || s.subLabel.toLowerCase().includes(q),
    );
  }, [sites, search]);

  const activeSite = useMemo(
    () => sites.find((s) => s.id === selectedSiteId) ?? filteredSites[0] ?? sites[0] ?? null,
    [sites, selectedSiteId, filteredSites],
  );

  const visibleRanks = showAllRanks ? filteredSites : filteredSites.slice(0, 6);

  return (
    <aside
      aria-label="Energy Technology Ranked Sites and Scientific Evidence"
      className="panel pointer-events-auto flex h-full max-h-full w-full flex-col overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 border-b border-line px-3.5 py-2.5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="rounded bg-amber-400/20 px-1.5 py-0.5 font-mono text-[9.5px] font-semibold text-amber-200 uppercase">
              {concept.shortTitle}
            </span>
            <span className="rounded bg-white/8 px-1.5 py-0.5 font-mono text-[9.5px] text-muted">
              {sites.length} {scope === "reservoir" ? "embalses" : scope === "basin" ? "cuencas" : scope === "ccaa" ? "CCAA" : "provincias"}
            </span>
          </div>
          <h2 className="mt-1 truncate text-sm font-semibold text-ink">{concept.title}</h2>
          <p className="truncate text-[11px] text-muted" title={concept.questionEn}>
            {concept.questionEn}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close energy analyzer"
          className="focus-ring rounded p-1 text-muted hover:text-ink"
        >
          <Icon name="close" />
        </button>
      </div>

      <div className="space-y-3 overflow-y-auto p-3.5 text-xs">
        {/* Ranked Sites Leaderboard */}
        <div className="rounded-xl border border-line bg-black/25 p-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold text-ink">
              {goal === "at_risk" ? "Top Vulnerable / At-Risk Sites" : "Top Ideal Sites Ranking"}
            </span>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter region, basin, dam…"
              className="focus-ring w-36 rounded-md border border-white/12 bg-black/40 px-2 py-0.5 text-[10.5px] text-ink placeholder:text-faint"
            />
          </div>

          <div className="mt-2 space-y-1 max-h-48 overflow-y-auto pr-0.5">
            {visibleRanks.map((site) => {
              const rank = sites.findIndex((x) => x.id === site.id) + 1;
              const isSelected = activeSite?.id === site.id;
              return (
                <button
                  key={site.id}
                  type="button"
                  onClick={() => onSelectSite(site)}
                  className={`focus-ring flex w-full items-center justify-between gap-2 rounded-lg border px-2.5 py-1.5 text-left transition ${
                    isSelected
                      ? "border-amber-400/50 bg-amber-400/15 text-ink"
                      : "border-white/6 bg-white/[0.03] text-ink hover:border-white/20 hover:bg-white/8"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[10px] font-semibold text-amber-300">#{rank}</span>
                      <span className="truncate text-[11.5px] font-semibold">{site.name}</span>
                      {site.significant && (
                        <span
                          title={`Statistically significant trend (p = ${site.pValue.toFixed(3)})`}
                          className="rounded bg-emerald-500/20 px-1 py-px font-mono text-[8.5px] text-emerald-300"
                        >
                          p&lt;0.05
                        </span>
                      )}
                    </div>
                    <p className="truncate text-[10px] text-muted">
                      {site.primaryMetric.label}: <strong>{show(site.primaryMetric.value)}</strong> {site.primaryMetric.units} ·{" "}
                      {site.secondaryMetric.label}: <strong>{show(site.secondaryMetric.value)}</strong> {site.secondaryMetric.units}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end">
                    <span className="font-mono text-xs font-bold text-ink">
                      {show(site.score)}
                      <span className="text-[9px] font-normal text-muted">/100</span>
                    </span>
                    <span
                      className={`mt-0.5 rounded border px-1 py-px font-mono text-[8.5px] ${STATUS_BADGE[site.advantageStatus]}`}
                    >
                      {site.advantageLabel}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {filteredSites.length > 6 && (
            <button
              type="button"
              onClick={() => setShowAllRanks((v) => !v)}
              className="focus-ring mt-1.5 w-full rounded-md bg-white/6 py-1 text-center text-[10px] font-medium text-muted hover:bg-white/12 hover:text-ink"
            >
              {showAllRanks ? "Show Top 6 Only" : `View All ${filteredSites.length} Ranked Sites`}
            </button>
          )}
        </div>

        {/* Active Site Deep-Dive */}
        {activeSite && (
          <div className="space-y-2.5">
            <div className="flex items-baseline justify-between gap-2 border-b border-line/60 pb-1.5">
              <div className="min-w-0">
                <h3 className="truncate text-xs font-semibold text-amber-200">
                  Selected Site: {activeSite.name}
                </h3>
                <p className="truncate text-[10px] text-muted">{activeSite.subLabel}</p>
              </div>
              <span className="shrink-0 font-mono text-xs font-semibold text-ink">
                Score {show(activeSite.score)}/100
              </span>
            </div>

            {/* 3 Crossed Variable KPI Cards */}
            <div className="grid grid-cols-3 gap-1.5">
              <div className="rounded-lg border border-line bg-white/4 p-2">
                <p className="truncate text-[9.5px] text-muted" title={activeSite.primaryMetric.label}>
                  {activeSite.primaryMetric.label}
                </p>
                <p className="mt-0.5 font-mono text-xs font-semibold text-sky-200">
                  {show(activeSite.primaryMetric.value)}{" "}
                  <span className="text-[9px] font-normal text-muted">{activeSite.primaryMetric.units}</span>
                </p>
                <p className="font-mono text-[9px] text-faint">
                  {activeSite.primaryMetric.slopeDecade > 0 ? "+" : ""}
                  {show(activeSite.primaryMetric.slopeDecade)} {activeSite.primaryMetric.trendUnits}
                </p>
              </div>

              <div className="rounded-lg border border-line bg-white/4 p-2">
                <p className="truncate text-[9.5px] text-muted" title={activeSite.secondaryMetric.label}>
                  {activeSite.secondaryMetric.label}
                </p>
                <p className="mt-0.5 font-mono text-xs font-semibold text-amber-200">
                  {show(activeSite.secondaryMetric.value)}{" "}
                  <span className="text-[9px] font-normal text-muted">{activeSite.secondaryMetric.units}</span>
                </p>
                <p className="font-mono text-[9px] text-faint">
                  {activeSite.secondaryMetric.slopeDecade > 0 ? "+" : ""}
                  {show(activeSite.secondaryMetric.slopeDecade)} {activeSite.secondaryMetric.trendUnits}
                </p>
              </div>

              <div className="rounded-lg border border-line bg-white/4 p-2">
                <p className="truncate text-[9.5px] text-muted">{activeSite.tertiaryMetric.label}</p>
                <p className="mt-0.5 truncate font-mono text-xs font-semibold text-ink">
                  {activeSite.tertiaryMetric.value}
                </p>
                <p className="truncate font-mono text-[9px] text-faint">{activeSite.tertiaryMetric.sub}</p>
              </div>
            </div>

            {/* Dual-Axis Crossed Time Series Chart (2000–2030) */}
            <CrossedDualTimeSeriesChart
              pts={activeSite.dualSeries}
              primaryLabel={activeSite.primarySeriesLabel}
              primaryUnits={activeSite.primarySeriesUnits}
              secondaryLabel={activeSite.secondarySeriesLabel}
              secondaryUnits={activeSite.secondarySeriesUnits}
            />

            {/* SWOT Satellite Reservoir Pass Chart (when inspecting a SWOT Reservoir) */}
            {activeSite.swotSeries && activeSite.swotSeries.length > 1 && (
              <SwotReservoirPassChart swotSeries={activeSite.swotSeries} reservoirName={activeSite.name} />
            )}

            {/* Scientific Evidence & Industrial Opportunity Synthesis */}
            <div className="rounded-lg border border-amber-400/25 bg-amber-400/8 p-2.5 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10.5px] font-semibold text-amber-200">
                  Exploratory reading (not a validated result)
                </span>
                <span className="font-mono text-[9.5px] text-muted">
                  {Number.isFinite(activeSite.pValue)
                    ? `MK p = ${activeSite.pValue < 0.001 ? "<0.001" : activeSite.pValue.toFixed(3)}`
                    : "No test · exploratory"}
                </span>
              </div>
              <p className="text-[11px] leading-snug text-ink/95">
                <strong>Evidence:</strong> {activeSite.scientificFinding}
              </p>
              <p className="text-[11px] leading-snug text-emerald-200/95">
                <strong>Opportunity:</strong> {activeSite.industrialOpportunity}
              </p>
            </div>

            {/* Provenance & Methodology Note */}
            <details className="rounded-lg border border-line bg-white/3 p-2 text-[10px] leading-relaxed text-muted">
              <summary className="cursor-pointer font-medium text-ink">
                Dataset Provenance &amp; Validity ({concept.coverageBadge})
              </summary>
              <p className="mt-1.5">{concept.methodologyNote}</p>
              <ul className="mt-1.5 space-y-1">
                {concept.variablesCrossed.map((v) => (
                  <li key={v.id}>
                    • <strong>{v.label}:</strong> {v.dataset} ({v.units}) — {v.role}
                    {v.isProxy ? " [Derived physical proxy]" : ""}
                  </li>
                ))}
              </ul>
            </details>
          </div>
        )}
      </div>
    </aside>
  );
}
