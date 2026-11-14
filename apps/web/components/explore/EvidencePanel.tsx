"use client";

import { useMemo, useState } from "react";
import { formatDegrees } from "@/lib/format";
import { SCOPE_LEVEL_META, type ResolvedAdminScope } from "@/lib/globe/admin-scope";
import {
  queryClimateAtLocation,
  type ActiveClimateConfig,
  type ClimateBundle,
  type DecisionAlert,
  type LocationEvidence,
  type NoaaStation,
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
  resolvedScope?: ResolvedAdminScope | null;
  onSelectYear: (year: number) => void;
  onSelectLocation: (coord: GeoCoordinate | null) => void;
  onResetToNational?: () => void;
  onInspectStation: (coord: GeoCoordinate) => void;
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

function StationIdentity({
  station,
  distanceKm,
}: {
  station: NoaaStation;
  distanceKm: number;
}) {
  return (
    <p className="text-[11px] text-muted">
      <span className="font-medium text-ink">{station.name.replace(/, SP$/i, "")}</span>
      <span className="mx-1.5 text-faint">·</span>
      {station.id}
      <span className="mx-1.5 text-faint">·</span>
      {distanceKm < 2 ? "this station" : `${distanceKm} km`}
    </p>
  );
}

function StationFinder({
  stations,
  activeId,
  onInspectStation,
}: {
  stations: NoaaStation[];
  activeId?: string;
  onInspectStation: (coord: GeoCoordinate) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? stations.filter((s) => s.name.toLowerCase().includes(q) || s.id.toLowerCase().includes(q))
      : stations;
    return [...list].sort((a, b) => a.name.localeCompare(b.name)).slice(0, q ? 24 : 12);
  }, [query, stations]);

  return (
    <div className="rounded-lg border border-line bg-white/3 p-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="focus-ring flex w-full items-center justify-between text-left text-[11px] text-muted hover:text-ink"
      >
        Find a station ({stations.length})
        <Icon name="chevron" className={`size-3.5 transition-transform ${open ? "rotate-90" : ""}`} />
      </button>
      {open && (
        <>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search Madrid, Málaga, SP0000…"
        className="focus-ring mt-1.5 w-full rounded-md border border-line bg-black/30 px-2 py-1.5 text-xs text-ink placeholder:text-faint"
      />
      <ul className="mt-1.5 max-h-40 overflow-y-auto">
        {matches.map((s) => {
          const active = s.id === activeId;
          return (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => onInspectStation({ latitude: s.lat, longitude: s.lon })}
                className={`focus-ring flex w-full items-baseline justify-between gap-2 rounded px-1.5 py-1 text-left text-[11px] ${
                  active ? "bg-accent/20 text-ink" : "text-muted hover:bg-white/8 hover:text-ink"
                }`}
              >
                <span className="truncate">{s.name.replace(/, SP$/i, "")}</span>
                <span className="shrink-0 font-mono text-[10px] text-faint">{s.id}</span>
              </button>
            </li>
          );
        })}
        {matches.length === 0 && <li className="px-1.5 py-2 text-[11px] text-faint">No station matches that search.</li>}
      </ul>
        </>
      )}
    </div>
  );
}

export function EvidencePanel({
  open,
  onClose,
  selected,
  bundle,
  config,
  resolvedScope,
  onSelectYear,
  onSelectLocation,
  onResetToNational,
  onInspectStation,
}: EvidencePanelProps) {
  const [tab, setTab] = useState<"evidence" | "decisions">("evidence");

  if (!open) return null;

  const evidence = bundle ? queryClimateAtLocation(bundle, config, selected, resolvedScope) : null;
  const scopeLevelMeta = resolvedScope ? SCOPE_LEVEL_META[resolvedScope.level] : SCOPE_LEVEL_META.age;

  return (
    <aside
      id="evidence-panel"
      aria-label="Scientific Evidence and 2030 Decision Support"
      className="panel pointer-events-auto flex h-full max-h-full w-full flex-col overflow-hidden"
    >
      <div className="flex items-start justify-between gap-3 border-b border-line px-3 py-2.5">
        <div className="min-w-0">
          <div className="mb-1 flex flex-wrap items-center gap-1.5">
            <span className="rounded bg-amber-400/20 px-1.5 py-0.5 font-mono text-[9.5px] font-semibold text-amber-200 uppercase">
              {scopeLevelMeta.labelEn}
            </span>
            {evidence?.stationsInScopeCount !== undefined && (
              <span className="rounded bg-white/8 px-1.5 py-0.5 font-mono text-[9.5px] text-muted">
                {evidence.stationsInScopeCount} stations
              </span>
            )}
            {(selected || (resolvedScope && resolvedScope.level !== "age")) && (
              <button
                type="button"
                onClick={() => {
                  onSelectLocation(null);
                  onResetToNational?.();
                }}
                className="focus-ring rounded bg-white/8 px-1.5 py-0.5 text-[10px] text-muted hover:text-ink"
              >
                All of Spain
              </button>
            )}
          </div>
          <h2 className="truncate text-sm font-semibold text-ink">
            {evidence ? evidence.locationLabel : "Trend to 2030"}
          </h2>
          <p className="mt-0.5 truncate text-[11px] text-muted" title={evidence?.subLabel}>
            {evidence
              ? evidence.subLabel
              : selected
                ? `${formatDegrees(selected.latitude, 3)}, ${formatDegrees(selected.longitude, 3)}`
                : "National view"}
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
          Trend
        </button>
        <button
          type="button"
          onClick={() => setTab("decisions")}
          className={`focus-ring rounded py-1.5 font-medium transition ${
            tab === "decisions" ? "bg-amber-400/20 text-amber-200" : "text-muted hover:text-ink"
          }`}
        >
          2030 decisions
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

              <TrendForecastChart
                evidence={evidence}
                selectedYear={config.year}
                onSelectYear={onSelectYear}
              />

              {evidence.nearestStation && (
                <StationIdentity
                  station={evidence.nearestStation.station}
                  distanceKm={evidence.nearestStation.distanceKm}
                />
              )}
              {bundle && (
                <StationFinder
                  stations={bundle.noaa.stations}
                  activeId={evidence.nearestStation?.station.id}
                  onInspectStation={onInspectStation}
                />
              )}

              {evidence.gldasSeries && <GldasNationalCurve gldas={evidence.gldasSeries} />}

              <details className="rounded-lg border border-line bg-white/3 p-2.5 text-[10px] leading-relaxed text-muted">
                <summary className="cursor-pointer font-medium text-ink">Sources & method</summary>
                <p className="mt-1.5">
                  <strong>Datasets:</strong> {evidence.dimensionMeta.datasets}
                </p>
                <p>
                  <strong>Method:</strong> Theil-Sen slope + Mann-Kendall (α = 0.05). 2027–2030 is a trend extrapolation with 95% bounds, not a GCM forecast.
                </p>
              </details>
            </>
          ) : (
            /* 2030 Decision Support Matrix */
            <div className="space-y-2.5">
              {resolvedScope && (
                <div className="rounded-lg border border-amber-400/30 bg-amber-400/8 p-2.5 text-[10.5px]">
                  <p className="font-semibold text-amber-200">
                    For: {resolvedScope.institution}
                  </p>
                  <p className="mt-0.5 text-[10px] text-muted">{resolvedScope.hierarchyLabel}</p>
                  <p className="mt-1 text-[10px] leading-snug text-ink/85">
                    <strong>Mandate:</strong> {resolvedScope.competencies}
                  </p>
                </div>
              )}
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
