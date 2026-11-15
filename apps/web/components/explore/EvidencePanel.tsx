"use client";

import { formatDegrees } from "@/lib/format";
import { useLocale } from "@/lib/i18n/locale";
import type { Messages } from "@/lib/i18n/messages";
import { type ResolvedAdminScope } from "@/lib/globe/admin-scope";
import {
  getEffectiveMeta,
  queryClimateAtLocation,
  type ActiveClimateConfig,
  type ClimateBundle,
  type EvidenceOutcome,
  type LocationEvidence,
  type RiverBasin,
} from "@/lib/globe/climate";
import { presentedOutcome } from "@/lib/globe/scope-multiplicity";
import type { GeoCoordinate } from "@/lib/globe/types";
import { Icon } from "./Icon";
import { ScaleThermometer } from "./ScaleThermometer";

/**
 * Evidence for the active dimension and place. Render-only (ADR-002): slopes, CIs, p-values and
 * outcome labels come from climate-bundle.json (scripts/build_climate_bundle.py). Observed years
 * only; no extrapolation, no projections (D38).
 */
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
  onOpenStationCatalog: () => void;
}

function fmt(n: number, digits?: number): string {
  const abs = Math.abs(n);
  const d = digits ?? (abs >= 100 ? 0 : abs >= 10 ? 1 : 2);
  return n.toFixed(d);
}

function signed(n: number): string {
  return `${n > 0 ? "+" : n < 0 ? "−" : "±"}${fmt(Math.abs(n))}`;
}

function placeLabel(label: string, copy: Messages): string {
  if (label === "This place") return copy.evidence.thisPlace;
  if (label === "Peninsula + Balearics") return copy.evidence.peninsula;
  if (label.startsWith("Near ")) return copy.evidence.near(label.slice(5));
  if (label.endsWith(" basin box")) return copy.evidence.basinBox(label.slice(0, -" basin box".length));
  return label;
}

function subPlace(label: string, copy: Messages): string {
  if (label === "Clicked on the map") return copy.evidence.clicked;
  if (label === "National view (Canarias reported separately)") return copy.evidence.nationalCanarias;
  return label;
}

function reasonLabel(reason: string | undefined, copy: Messages): string {
  if (!reason) return copy.evidence.noTrend;
  if (reason === "No precomputed trend for this place.") return copy.evidence.noTrend;
  if (reason === "No precomputed series for this area.") return copy.evidence.noSeriesArea;
  if (reason === "This station has fewer than 15 complete years for this metric.") return copy.evidence.stationYears;
  if (reason.startsWith("Area trends are not computed")) return copy.evidence.pickStation;
  return reason;
}

function sourceLabel(source: string, copy: Messages): string {
  if (source === "NOAA GHCN-Daily stations") return copy.evidence.stationShort;
  const station = /^NOAA GHCN-Daily station (.+) \(complete years only; not homogenized\)$/.exec(source);
  if (station?.[1]) return copy.evidence.stationSource(station[1]);
  const basin = /^NASA GPM IMERG, (.+) bounding box \(not the watershed\)$/.exec(source);
  if (basin?.[1]) return copy.evidence.basinSource(basin[1]);
  const scope = /^(.+), (.+), area-weighted$/.exec(source);
  if (scope?.[1] && scope[2]) return copy.evidence.scopeSource(scope[1], scope[2]);
  return source;
}

function outcomeView(evidence: LocationEvidence, copy: Messages): { glyph: string; label: string; tone: string } {
  const outcome: EvidenceOutcome | "exploratory_unadjusted" = presentedOutcome(
    evidence.dimensionMeta.id,
    evidence.outcome,
  );
  switch (outcome) {
    case "supported_increase":
      return { glyph: "▲", label: copy.outcome.increase, tone: "border-amber-300/40 bg-amber-400/15 text-amber-100" };
    case "supported_decrease":
      return { glyph: "▼", label: copy.outcome.decrease, tone: "border-sky-300/40 bg-sky-400/15 text-sky-100" };
    case "exploratory_unadjusted":
      return {
        glyph: "⚠",
        label: copy.outcome.exploratory,
        tone: "border-amber-300/35 bg-amber-400/10 text-amber-100",
      };
    case "not_significant":
      return { glyph: "◆", label: copy.outcome.noRobust, tone: "border-white/25 bg-white/8 text-ink" };
    case "not_computed":
      return { glyph: "?", label: copy.outcome.insufficient, tone: "border-white/25 bg-white/8 text-ink" };
    default: {
      const exhaustive: never = outcome;
      return exhaustive;
    }
  }
}

function ObservedChart({
  evidence,
  selectedYear,
  onSelectYear,
  mapShowsTrend,
  copy,
}: {
  evidence: LocationEvidence;
  selectedYear: number;
  onSelectYear: (year: number) => void;
  mapShowsTrend: boolean;
  copy: Messages;
}) {
  const pts = evidence.series;
  if (pts.length < 2) {
    return <p className="rounded-xl bg-black/30 p-3 text-[14px] text-muted">{copy.evidence.noSeries}</p>;
  }
  const w = 360;
  const h = 168;
  const padL = 38;
  const padR = 8;
  const padT = 14;
  const padB = 24;
  const innerW = w - padL - padR;
  const innerH = h - padT - padB;
  const x0 = pts[0].year;
  const x1 = pts[pts.length - 1].year;

  // Standardized anomalies (z-scores) read best as bars around 0: sign = dry vs wet year.
  const anomalyBars = evidence.dimensionMeta.id === "drought";
  const vals: number[] = anomalyBars ? [0] : [];
  for (const p of pts) {
    if (p.observed !== undefined) vals.push(p.observed);
    if (p.trend !== undefined) vals.push(p.trend);
  }
  const vMin = Math.min(...vals);
  const vMax = Math.max(...vals);
  const span = vMax - vMin || 1;
  const yMin = vMin - span * 0.1;
  const yMax = vMax + span * 0.12;
  const xOf = (yr: number) => padL + ((yr - x0) / Math.max(1, x1 - x0)) * innerW;
  const yOf = (val: number) => padT + (1 - (val - yMin) / (yMax - yMin || 1)) * innerH;

  // Observed line breaks at missing years (gaps are shown, never interpolated).
  const segments: string[] = [];
  let current = "";
  let prevYear: number | null = null;
  for (const p of pts) {
    if (p.observed === undefined) continue;
    const cmd = prevYear !== null && p.year === prevYear + 1 && current ? "L" : "M";
    if (cmd === "M" && current) {
      segments.push(current);
      current = "";
    }
    current += `${cmd}${xOf(p.year).toFixed(1)},${yOf(p.observed).toFixed(1)} `;
    prevYear = p.year;
  }
  if (current) segments.push(current);
  const trendPts = pts.filter((p) => p.trend !== undefined);
  const trendPath = trendPts
    .map((p, i) => `${i === 0 ? "M" : "L"}${xOf(p.year).toFixed(1)},${yOf(p.trend ?? 0).toFixed(1)}`)
    .join(" ");
  const ticks = [yMin + (yMax - yMin) * 0.1, (yMin + yMax) / 2, yMax - (yMax - yMin) * 0.1];
  const xTicks = Array.from(new Set([x0, Math.round((x0 + x1) / 2), x1]));

  return (
    <div className="rounded-xl bg-black/30 p-3">
      <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px]">
        {anomalyBars ? (
          <>
            <span className="inline-flex items-center gap-1.5 text-ink">
              <span aria-hidden className="h-2.5 w-2 rounded-[1px] bg-[#5ab4ac]" />
              {copy.evidence.wetBar}
            </span>
            <span className="inline-flex items-center gap-1.5 text-ink">
              <span aria-hidden className="h-2.5 w-2 rounded-[1px] bg-[#d8b365]" />
              {copy.evidence.dryBar}
            </span>
          </>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-ink">
            <span className="h-0.5 w-4 rounded bg-[#7cc4ff]" />
            {copy.evidence.observed(evidence.units)}
          </span>
        )}
        {trendPath && (
          <span className={`inline-flex items-center gap-1.5 ${mapShowsTrend ? "font-medium text-amber-100" : "text-amber-200"}`}>
            <span className="h-0 w-4 border-t-2 border-dashed border-amber-400" />
            {copy.evidence.senLine}
          </span>
        )}
        {mapShowsTrend && (
          <span className="text-[12px] text-faint">{copy.evidence.globeSlope}</span>
        )}
      </div>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="h-44 w-full cursor-pointer select-none overflow-hidden"
        role="img"
        aria-label={copy.evidence.chartAria(evidence.effectiveTitle, x0, x1, evidence.units)}
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const relX = ((e.clientX - rect.left) / rect.width) * w;
          const yr = Math.round(x0 + ((relX - padL) / innerW) * (x1 - x0));
          onSelectYear(Math.max(x0, Math.min(x1, yr)));
        }}
      >
        {ticks.map((v) => {
          const y = yOf(v) + 3;
          if (y > padT + innerH - 2) return null;
          return (
            <text key={v} x={padL - 4} y={y} textAnchor="end" className="fill-white/45 text-[11px]">
              {fmt(v)}
            </text>
          );
        })}
        <line x1={padL} y1={padT + innerH} x2={w - padR} y2={padT + innerH} stroke="rgba(255,255,255,0.15)" />
        {anomalyBars &&
          pts.map((p) => {
            if (p.observed === undefined) return null; // missing year = gap, never a zero bar
            const barW = Math.max(2, (innerW / Math.max(1, x1 - x0 + 1)) * 0.72);
            const y0 = yOf(0);
            const yv = yOf(p.observed);
            return (
              <rect
                key={`bar-${p.year}`}
                x={xOf(p.year) - barW / 2}
                y={Math.min(y0, yv)}
                width={barW}
                height={Math.max(0.5, Math.abs(yv - y0))}
                fill={p.observed >= 0 ? "#5ab4ac" : "#d8b365"}
                opacity={p.year === selectedYear ? 1 : 0.82}
                stroke={p.year === selectedYear ? "#ffffff" : "none"}
                strokeWidth={1}
              />
            );
          })}
        {anomalyBars && (
          <line x1={padL} y1={yOf(0)} x2={w - padR} y2={yOf(0)} stroke="rgba(255,255,255,0.45)" strokeWidth={1} />
        )}
        {trendPath && (
          <path
            d={trendPath}
            fill="none"
            stroke="#fbbf24"
            strokeWidth={mapShowsTrend ? 2.4 : 1.8}
            strokeDasharray="5 3"
          />
        )}
        {!anomalyBars &&
          segments.map((d) => <path key={d} d={d} fill="none" stroke="#7cc4ff" strokeWidth={2} />)}
        {pts
          .filter((p) => !anomalyBars && p.observed !== undefined)
          .map((p) => (
            <circle
              key={p.year}
              cx={xOf(p.year)}
              cy={yOf(p.observed ?? 0)}
              r={p.year === selectedYear ? 4 : 2}
              fill="#7cc4ff"
            />
          ))}
        {xTicks.map((yr) => (
          <text key={yr} x={xOf(yr)} y={h - 4} textAnchor="middle" className="fill-white/45 text-[12px]">
            {yr}
          </text>
        ))}
      </svg>
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
  onOpenStationCatalog,
}: EvidencePanelProps) {
  const { m } = useLocale();
  if (!open) return null;

  const evidence = bundle ? queryClimateAtLocation(bundle, config, selected, resolvedScope) : null;
  const levelLabel =
    resolvedScope?.level === "ccaa"
      ? m.evidence.levelRegion
      : resolvedScope?.level === "provincia"
        ? m.evidence.levelProvince
        : m.evidence.levelNational;
  const scale = getEffectiveMeta(config, bundle);
  const view = evidence ? outcomeView(evidence, m) : null;
  const st = evidence?.stats ?? null;

  return (
    <aside
      id="evidence-panel"
      aria-label={m.evidence.aria}
      className="panel pointer-events-auto flex h-full max-h-full w-full flex-col overflow-hidden"
    >
      <div className="flex items-start justify-between gap-3 px-4 pt-3.5 pb-2">
        <div className="min-w-0">
          <p className="text-[12px] font-medium tracking-[0.14em] text-muted uppercase">
            {(evidence ? m.dimensions[evidence.dimensionMeta.id].short : m.evidence.trend)} · {levelLabel}
          </p>
          <h2 className="mt-0.5 truncate text-lg font-semibold tracking-tight text-ink">
            {evidence ? placeLabel(evidence.locationLabel, m) : m.evidence.spain}
          </h2>
          <p className="truncate text-[14px] text-muted">
            {evidence
              ? subPlace(evidence.subLabel, m)
              : selected
                ? `${formatDegrees(selected.latitude, 3)}, ${formatDegrees(selected.longitude, 3)}`
                : m.evidence.nationalView}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {(selected || (resolvedScope && resolvedScope.level !== "age")) && (
            <button
              type="button"
              onClick={() => {
                onSelectLocation(null);
                onResetToNational?.();
              }}
              className="focus-ring rounded-md px-2 py-1 text-[13px] text-muted hover:bg-white/8 hover:text-ink"
            >
              {m.evidence.spain}
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label={m.evidence.close}
            className="focus-ring rounded p-1 text-muted transition-colors hover:text-ink"
          >
            <Icon name="close" />
          </button>
        </div>
      </div>

      {!evidence || !view ? (
        <div className="grid flex-1 place-items-center p-8 text-center">
          <p className="text-xs text-muted">{m.evidence.loading}</p>
        </div>
      ) : (
        <div className="mt-1 min-h-0 flex-1 space-y-3 overflow-y-auto px-4 pb-4">
          <div className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-[15px] ${view.tone}`}>
            <span aria-hidden className="font-mono">{view.glyph}</span>
            <span className="font-semibold">{view.label}</span>
          </div>

          {st ? (
            <div>
              <p className="font-mono text-xl font-semibold text-ink tabular-nums">
                {signed(st.slope_decade)} {evidence.trendUnits}
              </p>
              <p className="text-[14px] text-muted">
                {m.cards.ci(signed(st.ci_low_decade), signed(st.ci_high_decade))} · {st.first_year ?? "?"}–{st.last_year ?? "?"} ·
                n = {st.n} {m.cards.years} · Mann–Kendall p = {st.p_value}
                {st.hamed_rao_applied ? m.evidence.corrected : ""}
              </p>
            </div>
          ) : (
            <p className="text-[14px] leading-snug text-muted">{reasonLabel(evidence.notComputedReason, m)}</p>
          )}

          <div className="flex items-center gap-3 rounded-xl bg-white/5 px-3 py-2">
            {config.mode === "trend" && st ? (
              <>
                <ScaleThermometer
                  palette={scale.palette}
                  domain={scale.domain}
                  units={evidence.trendUnits}
                  value={st.slope_decade}
                  label={m.evidence.slopeLabel}
                  height={96}
                  thin
                />
                <p className="text-[14px] text-muted">
                  {m.evidence.mapSlope(
                    signed(st.slope_decade),
                    evidence.trendUnits,
                    String(st.first_year ?? "?"),
                    String(st.last_year ?? "?"),
                  )}
                </p>
              </>
            ) : (
              <>
                {evidence.currentValue !== null ? (
                  <ScaleThermometer
                    palette={scale.palette}
                    domain={scale.domain}
                    units={evidence.units}
                    value={evidence.currentValue}
                    label={String(evidence.currentYear)}
                    height={96}
                    thin
                  />
                ) : null}
                <p className="text-[14px] text-muted">
                  {evidence.currentValue !== null
                    ? m.evidence.observedYear(evidence.currentYear, fmt(evidence.currentValue), evidence.units)
                    : m.evidence.noDataYear(evidence.currentYear)}
                </p>
              </>
            )}
          </div>

          <ObservedChart
            evidence={evidence}
            selectedYear={config.year}
            onSelectYear={onSelectYear}
            mapShowsTrend={config.mode === "trend"}
            copy={m}
          />

          <dl className="space-y-1.5 text-[14px] text-muted">
            <div>
              <dt className="text-[12px] tracking-[0.12em] text-faint uppercase">{m.evidence.source}</dt>
              <dd>{sourceLabel(evidence.statsSource, m)}</dd>
            </div>
            <div>
              <dt className="text-[12px] tracking-[0.12em] text-faint uppercase">{m.evidence.method}</dt>
              <dd>{m.evidence.methodBody}</dd>
            </div>
          </dl>

          <p className="rounded-md border border-amber-300/25 bg-amber-400/8 px-2 py-1.5 text-[14px] text-amber-100">
            {m.evidence.doNot}
          </p>

          {/* Review check (data/results/scope_multiplicity/scope_bh.json): non-temperature regional labels are
              not robust to testing ~72 regions. Labels are unchanged pending a team decision; the caveat is shown. */}
          {config.dimension !== "temperature" && st && (
            <p className="rounded-md border border-white/20 bg-white/5 px-2 py-1.5 text-[13px] text-muted">
              <span aria-hidden className="mr-1">⚠</span>
              {m.evidence.multiplicity}
            </p>
          )}

          {bundle && config.dimension === "precipitation" && (
            <div className="flex flex-wrap gap-1" aria-label={m.evidence.basins}>
              {bundle.rivers.map((b: RiverBasin) => {
                const isCurr = evidence.basin?.id === b.id;
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => onSelectLocation({ latitude: b.lat, longitude: b.lon })}
                    className={`focus-ring rounded-full px-2 py-0.5 text-[13px] ${
                      isCurr ? "bg-sky-400/25 font-medium text-sky-100" : "bg-white/6 text-muted hover:text-ink"
                    }`}
                  >
                    {b.name.replace("Cuenca del ", "")} {m.evidence.box}
                  </button>
                );
              })}
            </div>
          )}

          <details className="text-[14px] text-muted">
            <summary className="cursor-pointer text-ink/80">{m.evidence.stations}</summary>
            <div className="mt-2 space-y-2">
              {evidence.nearestStation && (
                <p>
                  {m.evidence.nearest(
                    evidence.nearestStation.station.name.replace(/, SP$/i, ""),
                    evidence.nearestStation.distanceKm >= 2 ? String(evidence.nearestStation.distanceKm) : "",
                  )}
                </p>
              )}
              <button
                type="button"
                onClick={onOpenStationCatalog}
                className="focus-ring flex w-full items-center justify-between text-left text-[13px] text-muted hover:text-ink"
              >
                {m.evidence.browse}
                <Icon name="chevron" className="size-3.5" />
              </button>
            </div>
          </details>
        </div>
      )}
    </aside>
  );
}
