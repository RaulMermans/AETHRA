"use client";

import { useEffect, useState, type ReactNode } from "react";
import { EXPLORATORY_FEATURES_ENABLED } from "@/lib/demo-mode";
import { ILLUSTRATIVE_TURBINE_HEIGHT_M } from "@/lib/globe/cesium/illustrative-model";
import { ENERGY_RESEARCH_CASES, type EnergyResearchCase } from "@/lib/globe/energy-research-cases";
import { useLocale } from "@/lib/i18n/locale";
import { usePanelFocus } from "@/components/a11y/usePanelFocus";
import type { Locale, Messages } from "@/lib/i18n/messages";
import {
  caseNarrative,
  localizeRegionName,
  localizeResourceContext,
  localizeSeriesLabel,
  localizeSeriesUnits,
} from "@/lib/i18n/science-copy";
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
  allowInfrastructureControls,
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
  allowInfrastructureControls: boolean;
  onSelectCase: (id: string) => void;
  onShowModel: (show: boolean) => void;
  onShowPlantRegister: (show: boolean) => void;
  onAppearance: (appearance: "existing" | "conceptual") => void;
  onOpacity: (value: number) => void;
  onOpenEvidence: () => void;
  onReturnOverview: () => void;
  onClose: () => void;
}) {
  const { locale, m } = useLocale();
  const c = m.casePanel;
  const casePanel = usePanelFocus<HTMLElement>(onClose);
  const story = caseNarrative(study, locale);
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
      ref={casePanel.panelRef}
      onKeyDown={casePanel.onKeyDown}
      aria-label={c.aria}
      className="panel pointer-events-auto flex h-full min-h-0 w-full flex-col overflow-y-auto p-4"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 ref={casePanel.headingRef} tabIndex={-1} className="focus-ring rounded-sm font-mono text-[12px] tracking-[0.16em] text-nav uppercase">{c.title}</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label={c.close}
          className="focus-ring grid size-7 place-items-center rounded-md text-muted hover:bg-white/6 hover:text-ink"
        >
          <Icon name="close" className="size-3.5" />
        </button>
      </div>

      <div className="mt-2 flex flex-wrap gap-1" role="tablist" aria-label={c.regions}>
        {ENERGY_RESEARCH_CASES.map((rc) => {
          const selected = rc.id === study.id;
          return (
            <button
              key={rc.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => onSelectCase(rc.id)}
              className={`focus-ring rounded-md border px-2 py-1 text-[12px] ${
                selected ? "border-accent/50 bg-accent/15 text-ink" : "border-line text-muted hover:bg-white/6 hover:text-ink"
              }`}
            >
              {localizeRegionName(rc.title, locale)}
            </button>
          );
        })}
      </div>

      <p className="mt-3 font-mono text-[12px] tracking-[0.14em] text-faint">{c.caseStudy(catalogCode(study))}</p>
      <p className="mt-1 text-sm font-medium tracking-wide text-ink uppercase">{localizeRegionName(study.regionName, locale)}</p>
      <p className="mt-1 text-[13px] text-muted">{c.frames[study.techFrame]}</p>
      <p className="mt-1 font-mono text-[12px] text-faint">
        {c.historical(study.nuts2 === "R0" ? c.nationalNuts : c.nuts(study.nuts2))} · {t.cardId}
      </p>

      <div className="mt-2 rounded-md border border-white/20 bg-white/8 px-2 py-2">
        <p className="text-[12px] tracking-[0.12em] text-faint uppercase">{c.verdict}</p>
        <p className="text-sm text-ink">
          <span aria-hidden className="mr-1">
            ?
          </span>
          {c.insufficient}
        </p>
        <p className="mt-1 text-[13px] leading-relaxed text-muted">{c.verdictMeans}</p>
      </div>

      <p className="mt-2 text-[13px] leading-relaxed text-ink">{story.techFrameNote}</p>

      {visuals ? (
        <HorizonChart series={visuals.series} trend={visuals.trend} locale={locale} c={c} />
      ) : visualsError ? (
        <p className="mt-2 text-[13px] text-amber-100">{c.seriesError(visualsError)}</p>
      ) : (
        <p className="mt-2 text-[13px] text-faint">{c.loading}</p>
      )}

      <dl className="mt-2 space-y-1 text-[13px] text-ink">
        <Row label={c.trend}>
          {c.ci(signed(t.slopePerDecade), story.units, signed(t.ciLow), signed(t.ciHigh))}
        </Row>
        <Row label={c.nMedianLabel}>{c.nMedian(t.nYears, t.medianPerYear)}</Row>
        <Row label={c.pLabel}>{c.pFamily(t.p.toFixed(3), t.pAdjustedBh.toFixed(3))}</Row>
        <Row label={c.e0Solar}>{localizeResourceContext(study.solarContext, locale)}</Row>
        <Row label={c.e0Wind}>{localizeResourceContext(study.windContext, locale)}</Row>
      </dl>
      <p className="mt-1 text-[12px] leading-relaxed text-muted">{c.trendMeans}</p>

      <ComplementarityBars observed={cmp.observed} expected={cmp.expectedMean} ratio={cmp.ratio} c={c} />

      <Section title={c.overlay}>{c.overlayBody}</Section>

      <Section title={c.why}>{story.whySelected}</Section>
      <Section title={c.whereWhen}>
        {story.where} {story.when}
      </Section>
      <Section title={c.current}>
        {story.currentContext} {story.installationsNote}
      </Section>
      {/* D75: the 2032–2040 planning horizon is research-build only; judges see history only. */}
      {EXPLORATORY_FEATURES_ENABLED && <Section title={c.horizon}>{story.futureHorizon}</Section>}
      <p className="mt-2 text-[12px] leading-relaxed text-muted">{c.checkSeparately}</p>
      <details className="mt-2 rounded-md border border-line bg-black/20 px-2 py-1.5 text-[12px] leading-relaxed text-faint">
        <summary className="focus-ring cursor-pointer text-[13px] text-ink">{c.howWeKnow}</summary>
        <p className="mt-1 tracking-wide text-amber-100 uppercase">{c.banner}</p>
        <p className="mt-1 text-muted">{story.significanceNote}</p>
        <p className="mt-1">{story.doNotConclude}</p>
        <ul className="mt-1 list-disc space-y-0.5 pl-4">
          {story.limitations.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </details>

      <p className="mt-2 text-[12px] text-muted">
        {c.reference(localizeRegionName(study.comparisonName, locale))}
      </p>
      <button
        type="button"
        onClick={() => onSelectCase(study.comparisonCaseId)}
        className="focus-ring mt-1 rounded-md border border-line px-2 py-1 text-[13px] text-ink hover:bg-white/6"
      >
        {c.open(localizeRegionName(study.comparisonName, locale))}
      </button>

      {allowInfrastructureControls && study.hasPlantRegister && (
        <div className="mt-3 space-y-2 rounded-md border border-line p-2">
          <p className="text-[12px] tracking-[0.12em] text-faint uppercase">{c.register}</p>
          <label className="flex items-center gap-2 text-[13px] text-ink">
            <input
              type="checkbox"
              checked={showPlantRegister}
              onChange={(e) => onShowPlantRegister(e.target.checked)}
              className="accent-teal-300"
            />
            {c.showPlants}
          </label>
          <p className="text-[12px] leading-relaxed text-faint">
            {c.plantsNote}
          </p>
          <label className="flex items-center gap-2 text-[13px] text-ink">
            <input
              type="checkbox"
              checked={showModel}
              onChange={(e) => onShowModel(e.target.checked)}
              className="accent-teal-300"
            />
            {c.showModel}
          </label>
          <p className="text-[12px] leading-relaxed text-faint">
            {c.illustrativeDisclaimer} {c.modelDrawn(ILLUSTRATIVE_TURBINE_HEIGHT_M)}
          </p>
          <fieldset className="text-[13px] text-ink">
            <legend className="text-[12px] text-faint">{c.appearance}</legend>
            <label className="mr-3">
              <input
                type="radio"
                name="turbine-appearance"
                checked={appearance === "existing"}
                onChange={() => onAppearance("existing")}
                className="mr-1 accent-teal-300"
              />
              {c.existing}
            </label>
            <label>
              <input
                type="radio"
                name="turbine-appearance"
                checked={appearance === "conceptual"}
                onChange={() => onAppearance("conceptual")}
                className="mr-1 accent-sky-300"
              />
              {c.conceptual}
            </label>
          </fieldset>
          {appearance === "conceptual" && (
            <label className="block text-[12px] text-muted">
              {c.opacity}
              <input
                type="range"
                min={0.2}
                max={0.7}
                step={0.05}
                value={conceptualOpacity}
                onChange={(e) => onOpacity(Number(e.target.value))}
                className="mt-1 w-full"
              />
              <span className="block pt-1 text-faint">{c.conceptualDisclaimer}</span>
            </label>
          )}
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onOpenEvidence}
          className="focus-ring rounded-md border border-line px-2.5 py-1 text-[13px] text-ink hover:bg-white/6"
        >
          {c.openCard}
        </button>
        <button
          type="button"
          onClick={onReturnOverview}
          className="focus-ring rounded-md border border-line px-2.5 py-1 text-[13px] text-ink hover:bg-white/6"
        >
          {c.returnSpain}
        </button>
      </div>
    </section>
  );
}

function HorizonChart({
  series,
  trend,
  locale,
  c,
}: {
  series: CardSeries;
  trend: CardTrendLine;
  locale: Locale;
  c: Messages["casePanel"];
}) {
  const label = localizeSeriesLabel(series.label, locale);
  const units = localizeSeriesUnits(series.units, locale);
  const w = 280;
  const h = 128;
  const pl = 28;
  const pr = 6;
  const pt = 8;
  const pb = 22;
  const xMin = series.years[0] ?? 2001;
  const lastObs = series.years[series.years.length - 1] ?? 2025;
  // Judge build (D75): the axis ends at the last observed year. Research build keeps the empty
  // 2040 planning horizon, hatched and labelled "no validated projection". The fit never extends.
  const showHorizon = EXPLORATORY_FEATURES_ENABLED;
  const xMax = showHorizon ? 2040 : lastObs;
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
  const ticks = showHorizon ? [xMin, 2013, lastObs, 2032, xMax] : [xMin, Math.round((xMin + lastObs) / 2), lastObs];

  return (
    <figure className="mt-3">
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="w-full"
        role="img"
        aria-label={showHorizon ? c.chartAria(label, xMin, lastObs) : c.chartAriaHistorical(label, xMin, lastObs)}
      >
        {showHorizon && (
          <>
            <defs>
              <pattern id="no-forecast-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <line x1="0" y1="0" x2="0" y2="6" stroke="rgb(251 191 36 / 0.35)" strokeWidth="2" />
              </pattern>
            </defs>
            <rect x={hatchX} y={pt} width={Math.max(0, hatchW)} height={h - pt - pb} fill="url(#no-forecast-hatch)" />
            <text x={hatchX + 4} y={pt + 10} className="fill-amber-100/80 text-[7px]">
              {c.noProjection}
            </text>
          </>
        )}
        <line x1={pl} y1={h - pb} x2={w - pr} y2={h - pb} stroke="rgb(255 255 255 / 0.2)" />
        <line x1={fx(lastObs)} y1={pt} x2={fx(lastObs)} y2={h - pb} stroke="rgb(255 255 255 / 0.25)" strokeDasharray="2 2" />
        {[lo, (lo + hi) / 2, hi].map((v) => (
          <text key={v} x={pl - 3} y={fy(v) + 3} textAnchor="end" className="fill-white/45 text-[8px]">
            {v.toFixed(0)}
          </text>
        ))}
        {ticks.map((yr) => (
          <text key={yr} x={fx(yr)} y={h - 4} textAnchor={yr === xMax ? "end" : "middle"} className="fill-white/45 text-[7px]">
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
      <figcaption className="text-[12px] text-faint">
        {showHorizon ? c.chartCaption(label, units, lastObs) : c.chartCaptionHistorical(label, units, lastObs)}
      </figcaption>
    </figure>
  );
}

function ComplementarityBars({
  observed,
  expected,
  ratio,
  c,
}: {
  observed: number;
  expected: number;
  ratio: number;
  c: Messages["casePanel"];
}) {
  const max = Math.max(observed, expected, 1);
  return (
    <div className="mt-2">
      <h3 className="text-[12px] tracking-[0.12em] text-faint uppercase">{c.complementarity}</h3>
      <p className="mt-0.5 mb-1 text-[12px] text-faint">{c.complementarityNote}</p>
      <Bar label={c.observed} value={observed} max={max} className="bg-sky-300/80" />
      <Bar label={c.independent} value={expected} max={max} className="bg-white/25" />
      <p className="mt-1 text-[13px] text-ink">
        {c.ratio(ratio.toFixed(2), Math.round(ratio * 100))}
      </p>
    </div>
  );
}

function Bar({ label, value, max, className }: { label: string; value: number; max: number; className: string }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="mt-1 grid grid-cols-[6.4rem_1fr_2.4rem] items-center gap-1 text-[12px] text-muted">
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
      <h3 className="text-[12px] tracking-[0.12em] text-faint uppercase">{title}</h3>
      <p className="mt-0.5 text-[13px] leading-relaxed text-ink">{children}</p>
    </div>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[6.2rem_1fr] gap-x-2">
      <dt className="text-[12px] text-faint">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}
