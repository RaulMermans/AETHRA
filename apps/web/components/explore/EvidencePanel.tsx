"use client";

import { formatDegrees } from "@/lib/format";
import { SCOPE_LEVEL_META, type ResolvedAdminScope } from "@/lib/globe/admin-scope";
import {
  getEffectiveMeta,
  queryClimateAtLocation,
  type ActiveClimateConfig,
  type ClimateBundle,
  type EvidenceOutcome,
  type LocationEvidence,
  type RiverBasin,
} from "@/lib/globe/climate";
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

function outcomeView(evidence: LocationEvidence): { glyph: string; label: string; tone: string } {
  const outcome: EvidenceOutcome = evidence.outcome;
  switch (outcome) {
    case "supported_increase":
      return { glyph: "▲", label: "Supported increase", tone: "border-amber-300/40 bg-amber-400/15 text-amber-100" };
    case "supported_decrease":
      return { glyph: "▼", label: "Supported decrease", tone: "border-sky-300/40 bg-sky-400/15 text-sky-100" };
    case "not_significant":
      return { glyph: "◆", label: "No robust trend detected", tone: "border-white/25 bg-white/8 text-ink" };
    case "not_computed":
      return { glyph: "?", label: "Insufficient evidence", tone: "border-white/25 bg-white/8 text-ink" };
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
}: {
  evidence: LocationEvidence;
  selectedYear: number;
  onSelectYear: (year: number) => void;
}) {
  const pts = evidence.series;
  if (pts.length < 2) {
    return <p className="rounded-xl bg-black/30 p-3 text-[12px] text-muted">No observed series for this place.</p>;
  }
  const w = 360;
  const h = 168;
  const padL = 34;
  const padR = 8;
  const padT = 12;
  const padB = 22;
  const innerW = w - padL - padR;
  const innerH = h - padT - padB;
  const x0 = pts[0].year;
  const x1 = pts[pts.length - 1].year;

  const vals: number[] = [];
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
      <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
        <span className="inline-flex items-center gap-1.5 text-ink">
          <span className="h-0.5 w-4 rounded bg-[#7cc4ff]" />
          Observed ({evidence.units})
        </span>
        {trendPath && (
          <span className="inline-flex items-center gap-1.5 text-amber-200">
            <span className="h-0 w-4 border-t-2 border-dashed border-amber-400" />
            Theil–Sen line, fitted period only
          </span>
        )}
      </div>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="h-44 w-full cursor-pointer select-none overflow-visible"
        role="img"
        aria-label={`${evidence.effectiveTitle}, observed ${x0}–${x1}, ${evidence.units}`}
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const relX = ((e.clientX - rect.left) / rect.width) * w;
          const yr = Math.round(x0 + ((relX - padL) / innerW) * (x1 - x0));
          onSelectYear(Math.max(x0, Math.min(x1, yr)));
        }}
      >
        {ticks.map((v) => (
          <text key={v} x={padL - 4} y={yOf(v) + 3} textAnchor="end" className="fill-white/45 text-[9px]">
            {fmt(v)}
          </text>
        ))}
        <line x1={padL} y1={padT + innerH} x2={w - padR} y2={padT + innerH} stroke="rgba(255,255,255,0.15)" />
        {trendPath && <path d={trendPath} fill="none" stroke="#fbbf24" strokeWidth={1.8} strokeDasharray="5 3" />}
        {segments.map((d) => (
          <path key={d} d={d} fill="none" stroke="#7cc4ff" strokeWidth={2} />
        ))}
        {pts
          .filter((p) => p.observed !== undefined)
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
          <text key={yr} x={xOf(yr)} y={h - 4} textAnchor="middle" className="fill-white/45 text-[10px]">
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
  if (!open) return null;

  const evidence = bundle ? queryClimateAtLocation(bundle, config, selected, resolvedScope) : null;
  const scopeLevelMeta = resolvedScope ? SCOPE_LEVEL_META[resolvedScope.level] : SCOPE_LEVEL_META.age;
  const scale = getEffectiveMeta(config, bundle);
  const view = evidence ? outcomeView(evidence) : null;
  const st = evidence?.stats ?? null;

  return (
    <aside
      id="evidence-panel"
      aria-label="Trend evidence"
      className="panel pointer-events-auto flex h-full max-h-full w-full flex-col overflow-hidden"
    >
      <div className="flex items-start justify-between gap-3 px-4 pt-3.5 pb-2">
        <div className="min-w-0">
          <p className="text-[10px] font-medium tracking-[0.14em] text-muted uppercase">
            {evidence?.dimensionMeta.shortLabel ?? "Trend"} · {scopeLevelMeta.labelEn}
          </p>
          <h2 className="mt-0.5 truncate text-lg font-semibold tracking-tight text-ink">
            {evidence ? evidence.locationLabel : "Spain"}
          </h2>
          <p className="truncate text-[12px] text-muted">
            {evidence
              ? evidence.subLabel
              : selected
                ? `${formatDegrees(selected.latitude, 3)}, ${formatDegrees(selected.longitude, 3)}`
                : "National view"}
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
              className="focus-ring rounded-md px-2 py-1 text-[11px] text-muted hover:bg-white/8 hover:text-ink"
            >
              Spain
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close evidence panel"
            className="focus-ring rounded p-1 text-muted transition-colors hover:text-ink"
          >
            <Icon name="close" />
          </button>
        </div>
      </div>

      {!evidence || !view ? (
        <div className="grid flex-1 place-items-center p-8 text-center">
          <p className="text-xs text-muted">Loading…</p>
        </div>
      ) : (
        <div className="mt-1 min-h-0 flex-1 space-y-3 overflow-y-auto px-4 pb-4">
          <div className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-[13px] ${view.tone}`}>
            <span aria-hidden className="font-mono">{view.glyph}</span>
            <span className="font-semibold">{view.label}</span>
          </div>

          {st ? (
            <div>
              <p className="font-mono text-xl font-semibold text-ink tabular-nums">
                {signed(st.slope_decade)} {evidence.trendUnits}
              </p>
              <p className="text-[12px] text-muted">
                95% CI {signed(st.ci_low_decade)} to {signed(st.ci_high_decade)} · {st.first_year ?? "?"}–{st.last_year ?? "?"} ·
                n = {st.n} years · Mann–Kendall p = {st.p_value}
                {st.hamed_rao_applied ? " (autocorrelation-corrected)" : ""}
              </p>
            </div>
          ) : (
            <p className="text-[12px] leading-snug text-muted">{evidence.notComputedReason ?? "No precomputed trend for this place."}</p>
          )}

          <div className="flex items-center gap-3 rounded-xl bg-white/5 px-3 py-2">
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
            <p className="text-[12px] text-muted">
              {evidence.currentValue !== null
                ? `${evidence.currentYear}: ${fmt(evidence.currentValue)} ${evidence.units} (observed)`
                : `No data for ${evidence.currentYear} at this place.`}
            </p>
          </div>

          <ObservedChart evidence={evidence} selectedYear={config.year} onSelectYear={onSelectYear} />

          <dl className="space-y-1.5 text-[12px] text-muted">
            <div>
              <dt className="text-[10px] tracking-[0.12em] text-faint uppercase">Source & support</dt>
              <dd>{evidence.statsSource}</dd>
            </div>
            <div>
              <dt className="text-[10px] tracking-[0.12em] text-faint uppercase">Method</dt>
              <dd>
                Theil–Sen slope with 95% CI; Mann–Kendall test (ties-corrected, autocorrelation-checked). Supported = p &lt;
                0.05 and CI excludes 0. Complete calendar years only.
              </dd>
            </div>
          </dl>

          <p className="rounded-md border border-amber-300/25 bg-amber-400/8 px-2 py-1.5 text-[12px] text-amber-100">
            Do not conclude: not a forecast, not a cause, not energy production or site suitability.
          </p>

          {/* Review check (data/results/scope_multiplicity/scope_bh.json): non-temperature regional labels are
              not robust to testing ~72 regions. Labels are unchanged pending a team decision; the caveat is shown. */}
          {config.dimension !== "temperature" && st && (
            <p className="rounded-md border border-white/20 bg-white/5 px-2 py-1.5 text-[11px] text-muted">
              <span aria-hidden className="mr-1">⚠</span>
              EXPLORATORY: each region is tested on its own, without adjustment for the ~72 regions offered here. After a
              Benjamini–Hochberg adjustment, none of the regional rain or rain-anomaly labels and only 1 of 17 modelled-runoff
              labels stay supported. Temperature labels are unaffected.
            </p>
          )}

          {bundle && config.dimension === "precipitation" && (
            <div className="flex flex-wrap gap-1" aria-label="Basin bounding boxes">
              {bundle.rivers.map((b: RiverBasin) => {
                const isCurr = evidence.basin?.id === b.id;
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => onSelectLocation({ latitude: b.lat, longitude: b.lon })}
                    className={`focus-ring rounded-full px-2 py-0.5 text-[11px] ${
                      isCurr ? "bg-sky-400/25 font-medium text-sky-100" : "bg-white/6 text-muted hover:text-ink"
                    }`}
                  >
                    {b.name.replace("Cuenca del ", "")} box
                  </button>
                );
              })}
            </div>
          )}

          <details className="text-[12px] text-muted">
            <summary className="cursor-pointer text-ink/80">Stations</summary>
            <div className="mt-2 space-y-2">
              {evidence.nearestStation && (
                <p>
                  Nearest NOAA station:{" "}
                  <span className="text-ink">{evidence.nearestStation.station.name.replace(/, SP$/i, "")}</span>
                  {evidence.nearestStation.distanceKm >= 2 ? ` · ${evidence.nearestStation.distanceKm} km` : ""}
                </p>
              )}
              <button
                type="button"
                onClick={onOpenStationCatalog}
                className="focus-ring flex w-full items-center justify-between text-left text-[11px] text-muted hover:text-ink"
              >
                Browse all weather stations
                <Icon name="chevron" className="size-3.5" />
              </button>
            </div>
          </details>
        </div>
      )}
    </aside>
  );
}
