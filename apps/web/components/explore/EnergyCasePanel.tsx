"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  CONCEPTUAL_DISCLAIMER,
  ILLUSTRATIVE_DISCLAIMER,
  ILLUSTRATIVE_TURBINE_HEIGHT_M,
} from "@/lib/globe/cesium/illustrative-model";
import { ENERGY_RESEARCH_CASES, type CaseTechFrame, type EnergyResearchCase } from "@/lib/globe/energy-research-cases";
import { Icon } from "./Icon";

type CardSeries = {
  years: number[];
  values: number[];
  complete: boolean[];
  units: string;
  label: string;
};

type CardTrendLine = { intercept: number; slope_per_decade: number };

function signed(n: number, digits = 2): string {
  const mag = Math.abs(n).toFixed(digits);
  if (n > 0) return `+${mag}`;
  if (n < 0) return `−${mag}`;
  return mag;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function parseSeries(v: unknown): CardSeries | null {
  if (!isRecord(v)) return null;
  const years = v.years;
  const values = v.values;
  const complete = v.complete;
  if (!Array.isArray(years) || !Array.isArray(values) || !Array.isArray(complete)) return null;
  if (years.length !== values.length || years.length !== complete.length || years.length === 0) return null;
  if (!years.every((y) => typeof y === "number") || !values.every((x) => typeof x === "number")) return null;
  if (!complete.every((c) => typeof c === "boolean")) return null;
  if (typeof v.units !== "string" || typeof v.label !== "string") return null;
  return { years, values, complete, units: v.units, label: v.label };
}

function parseTrendLine(v: unknown): CardTrendLine | null {
  if (!isRecord(v)) return null;
  if (typeof v.intercept !== "number" || typeof v.slope_per_decade !== "number") return null;
  return { intercept: v.intercept, slope_per_decade: v.slope_per_decade };
}

function findCardVisuals(raw: unknown, cardId: string): { series: CardSeries; trend: CardTrendLine } | null {
  if (!isRecord(raw) || !Array.isArray(raw.cards)) return null;
  const card = raw.cards.find((c) => isRecord(c) && c.id === cardId);
  if (!card || !isRecord(card)) return null;
  const series = parseSeries(card.series);
  const trend = parseTrendLine(card.trend_line);
  if (!series || !trend) return null;
  return { series, trend };
}

const FRAME_LABEL: Record<CaseTechFrame, string> = {
  hybrid: "Solar–wind resource complementarity",
  wind_focus: "Wind resource context",
  solar_focus: "Solar resource context",
};

function catalogCode(study: EnergyResearchCase): string {
  const index = ENERGY_RESEARCH_CASES.findIndex((c) => c.id === study.id);
  return String((index >= 0 ? index : 0) + 1).padStart(3, "0");
}

export function EnergyCasePanel({
  study,
  showModel,
  showPlantRegister,
  appearance,
  conceptualOpacity,
  onSelectCase,
  onShowModel,
  onShowPlantRegister,
  onAppearance,
  onOpacity,
  onOpenEvidence,
  onReturnOverview,
  onClose,
}: {
  study: EnergyResearchCase;
  showModel: boolean;
  showPlantRegister: boolean;
  appearance: "existing" | "conceptual";
  conceptualOpacity: number;
  onSelectCase: (id: string) => void;
  onShowModel: (show: boolean) => void;
  onShowPlantRegister: (show: boolean) => void;
  onAppearance: (appearance: "existing" | "conceptual") => void;
  onOpacity: (value: number) => void;
  onOpenEvidence: () => void;
  onReturnOverview: () => void;
  onClose: () => void;
}) {
  const t = study.primary;
  const cmp = study.complementarityPrimary;
  const [visuals, setVisuals] = useState<{ series: CardSeries; trend: CardTrendLine } | null>(null);
  const [visualsError, setVisualsError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setVisuals(null);
    setVisualsError(null);
    fetch("/data/evidence-cards.json")
      .then(async (res) => {
        if (!res.ok) throw new Error(`evidence-cards.json HTTP ${res.status}`);
        return (await res.json()) as unknown;
      })
      .then((raw) => {
        if (!active) return;
        const found = findCardVisuals(raw, t.cardId);
        if (!found) throw new Error(`No series for ${t.cardId}`);
        setVisuals(found);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setVisualsError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      active = false;
    };
  }, [t.cardId]);

  return (
    <section
      aria-label="Energy research case"
      className="panel pointer-events-auto max-h-[calc(100dvh-12rem)] w-[min(24rem,calc(100vw-5rem))] overflow-y-auto p-4"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-mono text-[10px] tracking-[0.16em] text-nav uppercase">Research cases</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close research case"
          className="focus-ring grid size-7 place-items-center rounded-md text-muted hover:bg-white/6 hover:text-ink"
        >
          <Icon name="close" className="size-3.5" />
        </button>
      </div>

      <div className="mt-2 flex flex-wrap gap-1" role="tablist" aria-label="Gate B regions">
        {ENERGY_RESEARCH_CASES.map((c) => {
          const selected = c.id === study.id;
          return (
            <button
              key={c.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => onSelectCase(c.id)}
              className={`focus-ring rounded-md border px-2 py-1 text-[10px] ${
                selected ? "border-accent/50 bg-accent/15 text-ink" : "border-line text-muted hover:bg-white/6 hover:text-ink"
              }`}
            >
              {c.title}
            </button>
          );
        })}
      </div>

      <p className="mt-3 font-mono text-[10px] tracking-[0.14em] text-faint">Case study {catalogCode(study)}</p>
      <p className="mt-1 text-sm font-medium tracking-wide text-ink uppercase">{study.regionName}</p>
      <p className="mt-1 text-[11px] text-muted">{FRAME_LABEL[study.techFrame]}</p>
      <p className="mt-1 font-mono text-[10px] text-faint">
        Historical NASA evidence · Regional investigation ·{" "}
        {study.nuts2 === "R0" ? "Peninsula + Balearics" : `NUTS-2 ${study.nuts2}`} · {t.cardId}
      </p>

      <p className="mt-2 rounded-md border border-amber-300/25 bg-amber-400/10 px-2 py-1 text-[10px] tracking-wide text-amber-100 uppercase">
        EXPLORATORY · quotes Python · 5/5 regions insufficient evidence
      </p>

      <div className="mt-2 rounded-md border border-white/20 bg-white/8 px-2 py-2">
        <p className="text-[10px] tracking-[0.12em] text-faint uppercase">Verdict</p>
        <p className="text-sm text-ink">
          <span aria-hidden className="mr-1">
            ?
          </span>
          Insufficient evidence
        </p>
        <p className="mt-1 text-[11px] leading-relaxed text-muted">{study.significanceNote}</p>
      </div>

      <p className="mt-2 text-[11px] leading-relaxed text-ink">{study.techFrameNote}</p>

      {visuals ? (
        <HorizonChart series={visuals.series} trend={visuals.trend} />
      ) : visualsError ? (
        <p className="mt-2 text-[11px] text-amber-100">Series not loaded: {visualsError}</p>
      ) : (
        <p className="mt-2 text-[11px] text-faint">Loading observed series…</p>
      )}

      <dl className="mt-2 space-y-1 text-[11px] text-ink">
        <Row label="Trend">
          {signed(t.slopePerDecade)} {t.units} (CI {signed(t.ciLow)} to {signed(t.ciHigh)})
        </Row>
        <Row label="n / median">
          {t.nYears} years · {t.medianPerYear} days/year
        </Row>
        <Row label="p / BH p">
          {t.p.toFixed(3)} · {t.pAdjustedBh.toFixed(3)} (family of 5)
        </Row>
        <Row label="E0 solar">{study.solarContext}</Row>
        <Row label="E0 wind">{study.windContext}</Row>
      </dl>

      <ComplementarityBars observed={cmp.observed} expected={cmp.expectedMean} ratio={cmp.ratio} />

      <Section title="Globe overlay (context, not a score)">
        The map clips to this region so you see which cells belong to the case. That heatmap is the climate
        dimension you already picked — not a fruitfulness or suitability layer. Joint-low evidence lives in the
        chart above (POWER regional mean), not as a per-cell overlay.
      </Section>

      <Section title="Why this region">{study.whySelected}</Section>
      <Section title="Where / when">
        {study.where} {study.when}
      </Section>
      <Section title="Current context">
        {study.currentContext} {study.installationsNote}
      </Section>
      <Section title="Horizon 2032–2040 (not a forecast)">{study.futureHorizon}</Section>
      <p className="mt-2 text-[10px] leading-relaxed text-faint">{study.doNotConclude}</p>
      <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[10px] text-faint">
        {study.limitations.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>

      <p className="mt-2 text-[10px] text-muted">
        Reference: {study.comparisonName} — difference not tested.
      </p>
      <button
        type="button"
        onClick={() => onSelectCase(study.comparisonCaseId)}
        className="focus-ring mt-1 rounded-md border border-line px-2 py-1 text-[11px] text-ink hover:bg-white/6"
      >
        Open {study.comparisonName}
      </button>

      {study.hasPlantRegister && (
        <div className="mt-3 space-y-2 rounded-md border border-line p-2">
          <p className="text-[10px] tracking-[0.12em] text-faint uppercase">CyL register (optional overlay)</p>
          <label className="flex items-center gap-2 text-[11px] text-ink">
            <input
              type="checkbox"
              checked={showPlantRegister}
              onChange={(e) => onShowPlantRegister(e.target.checked)}
              className="accent-teal-300"
            />
            Show 652 registered plants
          </label>
          <p className="text-[10px] leading-relaxed text-faint">
            Off by default. Other CCAA have no plant layer here, so a dense CyL map is not evidence that this
            region is uniquely built-out or uniquely fruitful.
          </p>
          <label className="flex items-center gap-2 text-[11px] text-ink">
            <input
              type="checkbox"
              checked={showModel}
              onChange={(e) => onShowModel(e.target.checked)}
              className="accent-teal-300"
            />
            Illustrative 3D at Buniel
          </label>
          <p className="text-[10px] leading-relaxed text-faint">
            {ILLUSTRATIVE_DISCLAIMER} Drawn ~{ILLUSTRATIVE_TURBINE_HEIGHT_M} m tall so it reads on the globe.
          </p>
          <fieldset className="text-[11px] text-ink">
            <legend className="text-[10px] text-faint">Appearance</legend>
            <label className="mr-3">
              <input
                type="radio"
                name="turbine-appearance"
                checked={appearance === "existing"}
                onChange={() => onAppearance("existing")}
                className="mr-1 accent-teal-300"
              />
              Existing — verified
            </label>
            <label>
              <input
                type="radio"
                name="turbine-appearance"
                checked={appearance === "conceptual"}
                onChange={() => onAppearance("conceptual")}
                className="mr-1 accent-sky-300"
              />
              Conceptual — not an approved project
            </label>
          </fieldset>
          {appearance === "conceptual" && (
            <label className="block text-[10px] text-muted">
              Ghost opacity
              <input
                type="range"
                min={0.2}
                max={0.7}
                step={0.05}
                value={conceptualOpacity}
                onChange={(e) => onOpacity(Number(e.target.value))}
                className="mt-1 w-full"
              />
              <span className="block pt-1 text-faint">{CONCEPTUAL_DISCLAIMER}</span>
            </label>
          )}
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onOpenEvidence}
          className="focus-ring rounded-md border border-line px-2.5 py-1 text-[11px] text-ink hover:bg-white/6"
        >
          Open EvidenceCard
        </button>
        <button
          type="button"
          onClick={onReturnOverview}
          className="focus-ring rounded-md border border-line px-2.5 py-1 text-[11px] text-ink hover:bg-white/6"
        >
          Return to Spain
        </button>
      </div>
    </section>
  );
}

function HorizonChart({ series, trend }: { series: CardSeries; trend: CardTrendLine }) {
  const w = 280;
  const h = 128;
  const pl = 28;
  const pr = 6;
  const pt = 8;
  const pb = 22;
  const xMin = series.years[0] ?? 2001;
  const lastObs = series.years[series.years.length - 1] ?? 2025;
  const xMax = 2040;
  const lo0 = Math.min(...series.values);
  const hi0 = Math.max(...series.values);
  const pad = (hi0 - lo0) * 0.18 || 1;
  const lo = Math.max(0, lo0 - pad);
  const hi = hi0 + pad;
  const fx = (x: number) => pl + ((x - xMin) / (xMax - xMin)) * (w - pl - pr);
  const fy = (y: number) => pt + ((hi - y) / (hi - lo)) * (h - pt - pb);
  const lineAt = (yr: number) => trend.intercept + (trend.slope_per_decade / 10) * yr;
  const hatchX = fx(lastObs + 0.5);
  const hatchW = fx(xMax) - hatchX;
  const ticks = [xMin, 2013, lastObs, 2032, xMax];

  return (
    <figure className="mt-3">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img" aria-label={`${series.label}, observed ${xMin}–${lastObs}, no projection after ${lastObs}`}>
        <defs>
          <pattern id="no-forecast-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="6" stroke="rgb(251 191 36 / 0.35)" strokeWidth="2" />
          </pattern>
        </defs>
        <rect x={hatchX} y={pt} width={Math.max(0, hatchW)} height={h - pt - pb} fill="url(#no-forecast-hatch)" />
        <text x={hatchX + 4} y={pt + 10} className="fill-amber-100/80 text-[7px]">
          No validated projection
        </text>
        <line x1={pl} y1={h - pb} x2={w - pr} y2={h - pb} stroke="rgb(255 255 255 / 0.2)" />
        <line x1={fx(lastObs)} y1={pt} x2={fx(lastObs)} y2={h - pb} stroke="rgb(255 255 255 / 0.25)" strokeDasharray="2 2" />
        {[lo, (lo + hi) / 2, hi].map((v) => (
          <text key={v} x={pl - 3} y={fy(v) + 3} textAnchor="end" className="fill-white/45 text-[8px]">
            {v.toFixed(0)}
          </text>
        ))}
        {ticks.map((yr) => (
          <text key={yr} x={fx(yr)} y={h - 4} textAnchor="middle" className="fill-white/45 text-[7px]">
            {yr}
          </text>
        ))}
        <polyline
          points={series.years.map((yr, i) => `${fx(yr)},${fy(series.values[i] ?? 0)}`).join(" ")}
          fill="none"
          stroke="rgb(125 211 252)"
          strokeWidth={1.4}
        />
        {series.years.map((yr, i) => (
          <circle
            key={yr}
            cx={fx(yr)}
            cy={fy(series.values[i] ?? 0)}
            r={2}
            fill={series.complete[i] ? "rgb(125 211 252)" : "transparent"}
            stroke="rgb(125 211 252)"
          />
        ))}
        <line
          x1={fx(xMin)}
          y1={fy(lineAt(xMin))}
          x2={fx(lastObs)}
          y2={fy(lineAt(lastObs))}
          stroke="rgb(251 191 36)"
          strokeDasharray="4 3"
          strokeWidth={1.4}
        />
      </svg>
      <figcaption className="text-[10px] text-faint">
        {series.label} ({series.units}). Solid: observed years. Dashed: Theil–Sen on 2001–{lastObs} only. Hatched
        2026–2040: no validated projection — not a forecast.
      </figcaption>
    </figure>
  );
}

function ComplementarityBars({ observed, expected, ratio }: { observed: number; expected: number; ratio: number }) {
  const max = Math.max(observed, expected, 1);
  return (
    <div className="mt-2">
      <h3 className="text-[10px] tracking-[0.12em] text-faint uppercase">Complementarity (descriptive)</h3>
      <p className="mt-0.5 mb-1 text-[10px] text-faint">Joint-low days 2001–2025 vs year-shift independence. Not a trend.</p>
      <Bar label="Observed" value={observed} max={max} className="bg-sky-300/80" />
      <Bar label="If independent" value={expected} max={max} className="bg-white/25" />
      <p className="mt-1 text-[11px] text-ink">
        Ratio {ratio.toFixed(2)} — joint lows about {Math.round(ratio * 100)}% as often as independence would suggest.
      </p>
    </div>
  );
}

function Bar({ label, value, max, className }: { label: string; value: number; max: number; className: string }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="mt-1 grid grid-cols-[6.4rem_1fr_2.4rem] items-center gap-1 text-[10px] text-muted">
      <span>{label}</span>
      <div className="h-2 overflow-hidden rounded-sm bg-white/10">
        <div className={`h-full ${className}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-right text-ink">{Math.round(value)}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mt-2">
      <h3 className="text-[10px] tracking-[0.12em] text-faint uppercase">{title}</h3>
      <p className="mt-0.5 text-[11px] leading-relaxed text-ink">{children}</p>
    </div>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[6.2rem_1fr] gap-x-2">
      <dt className="text-[10px] text-faint">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}
