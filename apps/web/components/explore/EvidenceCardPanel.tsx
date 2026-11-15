"use client";

import { useEffect, useState, type ReactNode } from "react";
import type { ResolvedAdminScope } from "@/lib/globe/admin-scope";
import { useLocale } from "@/lib/i18n/locale";
import { localizeCardFace } from "@/lib/i18n/science-copy";
import { parseExternalCheck } from "@/lib/agent/cards";
import { ToolPanel, smallButton } from "./ToolPanel";

/**
 * EvidenceCards produced by the Python pipeline (scripts/export_evidence_cards.py).
 * Render-only (ADR-002): every number is read from /data/evidence-cards.json, nothing is recomputed.
 *
 * Scope rule: a card is shown as "the result for X" only when its `region.scope` equals the selected
 * /explore scope key exactly. Otherwise the panel says no card exists for X and offers the national
 * card strictly as a labelled reference. A national result is never relabelled as regional.
 */
type Outcome = "supported_increase" | "supported_decrease" | "no_robust_trend" | "insufficient_evidence";

export type EvidenceTopic = "temperature" | "joint_low";
type Topic = EvidenceTopic;

type EvidenceCard = {
  id: string;
  topic: Topic;
  headline: boolean;
  region: { scope: string; name: string };
  status: string;
  question: string;
  outcome: Outcome;
  outcome_label: string;
  what: string;
  where: string;
  when: string;
  how_much: {
    slope_per_decade: number;
    ci95_per_decade: [number, number];
    units: string;
    median_per_year?: number;
    window_range_per_decade?: [number, number];
  };
  complementarity?: {
    observed_2001_2025: number;
    expected_if_independent_mean: number;
    expected_range_95: [number, number];
    ratio: number;
    null_model: string;
    source: string;
  };
  evidence: {
    method: string;
    n_years: number;
    p: number;
    p_adjusted_bh?: number;
    lag1_autocorr: number;
    min_detectable_trend_per_decade?: number | null;
    sensitivity: Record<string, number>;
  };
  context?: Record<string, string | number>;
  do_not_conclude: string;
  limitations: string[];
  series: { label: string; units: string; years: number[]; values: number[]; complete: boolean[] };
  trend_line: { intercept: number; slope_per_decade: number };
  sources: { name: string; role: string; url: string }[];
  provenance: { bundle: string; bundle_sha256: string; git: string };
  external_check?: unknown;
};

const OUTCOME_STYLE: Record<Outcome, { glyph: string; cls: string }> = {
  supported_increase: { glyph: "▲", cls: "border-amber-300/40 bg-amber-400/15 text-amber-100" },
  supported_decrease: { glyph: "▼", cls: "border-sky-300/40 bg-sky-400/15 text-sky-100" },
  no_robust_trend: { glyph: "◆", cls: "border-white/25 bg-white/8 text-ink" },
  insufficient_evidence: { glyph: "?", cls: "border-white/25 bg-white/8 text-ink" },
};

const TOPIC_IDS: Topic[] = ["temperature", "joint_low"];

/** Same scope keys as climate-bundle.json and queryClimateAtLocation: "age", "ccaa:<id>", "provincia:<id>". */
function scopeKeyOf(scope: ResolvedAdminScope): string {
  return scope.level === "age" ? "age" : `${scope.level}:${scope.id}`;
}

function isCard(v: unknown): v is EvidenceCard {
  if (typeof v !== "object" || v === null) return false;
  const c = v as Record<string, unknown>;
  const region = c.region as Record<string, unknown> | undefined;
  return (
    typeof c.id === "string" &&
    (c.topic === "temperature" || c.topic === "joint_low") &&
    typeof c.headline === "boolean" &&
    typeof region?.scope === "string" &&
    typeof region?.name === "string" &&
    typeof c.how_much === "object" &&
    typeof c.series === "object"
  );
}

function signed(v: number, digits = 2): string {
  return `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v).toFixed(digits)}`; // zero has no sign ("±" read as uncertainty)
}

function Series({ card, label, units, caption }: { card: EvidenceCard; label: string; units: string; caption: string }) {
  const { years, values, complete } = card.series;
  const w = 256;
  const h = 110;
  const pl = 36;
  const pt = 12;
  const pb = 18;
  const lo0 = Math.min(...values);
  const hi0 = Math.max(...values);
  const pad = (hi0 - lo0) * 0.12 || 1;
  const lo = lo0 >= 0 ? Math.max(0, lo0 - pad) : lo0 - pad;
  const hi = hi0 + pad;
  const x0 = years[0];
  const x1 = years[years.length - 1];
  const fx = (x: number) => pl + ((x - x0) / (x1 - x0)) * (w - pl - 4);
  const fy = (y: number) => pt + ((hi - y) / (hi - lo)) * (h - pb - pt);
  const line = (yr: number) => card.trend_line.intercept + (card.trend_line.slope_per_decade / 10) * yr;
  return (
    <figure className="mt-3">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full overflow-hidden" role="img" aria-label={`${label}, ${x0}–${x1}, ${units}`}>
        <line x1={pl} y1={h - pb} x2={w - 4} y2={h - pb} stroke="rgb(255 255 255 / 0.2)" />
        {[lo, (lo + hi) / 2, hi].map((v) => {
          const y = fy(v) + 3;
          if (y > h - pb - 2) return null;
          return (
            <text key={v} x={pl - 4} y={y} textAnchor="end" className="fill-white/45 text-[8px]">
              {v.toFixed(Math.abs(hi - lo) < 5 ? 1 : 0)}
            </text>
          );
        })}
        {[x0, Math.round((x0 + x1) / 2), x1].map((yr) => (
          <text key={yr} x={fx(yr)} y={h - 4} textAnchor={yr === x1 ? "end" : yr === x0 ? "start" : "middle"} className="fill-white/45 text-[8px]">
            {yr}
          </text>
        ))}
        <polyline
          points={years.map((yr, i) => `${fx(yr)},${fy(values[i])}`).join(" ")}
          fill="none"
          stroke="rgb(125 211 252)"
          strokeWidth={1.2}
        />
        {years.map((yr, i) => (
          <circle
            key={yr}
            cx={fx(yr)}
            cy={fy(values[i])}
            r={2}
            fill={complete[i] ? "rgb(125 211 252)" : "transparent"}
            stroke="rgb(125 211 252)"
          />
        ))}
        <line x1={fx(x0)} y1={fy(line(x0))} x2={fx(x1)} y2={fy(line(x1))} stroke="rgb(251 191 36)" strokeDasharray="4 3" strokeWidth={1.4} />
      </svg>
      <figcaption className="text-[12px] text-faint">
        {caption}
      </figcaption>
    </figure>
  );
}

function ReceiptSection({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="border-t border-line/70 pt-2">
      <h3 className="mb-1 font-mono text-[11px] tracking-[0.12em] text-faint uppercase">{label}</h3>
      {children}
    </section>
  );
}

/**
 * The EvidenceCard as an "evidence receipt" (D76): claim → verdict → size and uncertainty → what it
 * does not show → method → NASA data and provenance. Same fields as before, reordered; every value is
 * read from evidence-cards.json (Python export). The verdict sentence is keyed on the pipeline outcome.
 */
function CardBody({ card }: { card: EvidenceCard }) {
  const { locale, m } = useLocale();
  const face = localizeCardFace(card, locale);
  const seriesUnits = card.series.units === "days per year" && locale === "es" ? "días por año" : card.series.units;
  const external = parseExternalCheck(card.external_check);
  return (
    <article className="mt-3 space-y-2.5 text-xs text-muted" aria-label={m.cards.receipt}>
      <p className="rounded-md border border-amber-300/30 bg-amber-400/10 px-2 py-1.5 text-[12px] text-amber-100">
        {face.status}
      </p>
      <ReceiptSection label={m.cards.sClaim}>
        <p className="text-[13px] leading-snug text-ink">{face.question}</p>
      </ReceiptSection>

      <ReceiptSection label={m.cards.sVerdict}>
        <div className={`flex items-center gap-2 rounded-md border px-2 py-1.5 text-[13px] ${OUTCOME_STYLE[card.outcome].cls}`}>
          <span aria-hidden className="font-mono">{OUTCOME_STYLE[card.outcome].glyph}</span>
          <span className="font-semibold">{face.outcome_label}</span>
        </div>
        <p className="mt-1 leading-snug">{m.cards.verdictMeaning[card.outcome]}</p>
      </ReceiptSection>

      <ReceiptSection label={m.cards.sSize}>
        <p className="font-mono text-base font-semibold text-ink tabular-nums">
          {signed(card.how_much.slope_per_decade)} {face.units}
        </p>
        <p className="text-[13px] text-ink">
          {m.cards.ci(signed(card.how_much.ci95_per_decade[0]), signed(card.how_much.ci95_per_decade[1]))}
          {card.how_much.window_range_per_decade &&
            ` · ${m.cards.window(signed(card.how_much.window_range_per_decade[0]), signed(card.how_much.window_range_per_decade[1]))}`}
        </p>
        <p className="mt-0.5">
          {m.cards.period}: {face.when} · n = {card.evidence.n_years} {m.cards.years}
        </p>
        <p className="mt-0.5">
          {m.cards.source}: {card.sources.map((src) => src.name).join(" · ")}
        </p>
        <p className="mt-1 text-[11px] leading-snug text-faint">{m.cards.ciMeaning}</p>
      </ReceiptSection>

      <ReceiptSection label={m.cards.sLimits}>
        <p className="rounded-md border border-amber-300/25 bg-amber-400/8 px-2 py-1.5 text-amber-100">
          {m.cards.doNot} {face.do_not_conclude}
        </p>
        <Series
          card={card}
          label={face.seriesLabel}
          units={seriesUnits}
          caption={
            locale === "es"
              ? `${face.seriesLabel} (${seriesUnits}), solo años observados. Discontinua: recta de Theil–Sen.`
              : `${face.seriesLabel} (${seriesUnits}), observed years only. Dashed: Theil–Sen line.`
          }
        />
      </ReceiptSection>

      <ReceiptSection label={m.cards.sMethod}>
        <p>
          {face.method}. n = {card.evidence.n_years} {m.cards.years}, p = {card.evidence.p}
          {card.evidence.p_adjusted_bh !== undefined && ` ${m.cards.bh(card.evidence.p_adjusted_bh)}`}, lag-1 r ={" "}
          {card.evidence.lag1_autocorr}
          {card.evidence.min_detectable_trend_per_decade != null &&
            m.cards.power(card.evidence.min_detectable_trend_per_decade, face.units)}
          .
        </p>
        {card.complementarity && (
          <p className="mt-1">
            <span className="text-faint">{m.cards.context}: </span>
            {m.cards.jointDays(
              card.complementarity.observed_2001_2025,
              card.complementarity.expected_if_independent_mean,
              card.complementarity.expected_range_95[0],
              card.complementarity.expected_range_95[1],
              card.complementarity.ratio,
            )}{" "}
            {m.cards.nullModel(face.nullModel)}
          </p>
        )}
        {external && (
          <p className="mt-1">
            {m.cards.externalCheck(
              external.n_stations,
              external.stations_warming,
              external.within_0_2_per_decade,
              signed(external.slope_diff_median_per_decade, 3),
              external.period,
            )}{" "}
            <span className="text-faint">{m.cards.externalNote}</span>
          </p>
        )}
      </ReceiptSection>

      <ReceiptSection label={m.cards.sData}>
        <dl className="space-y-1.5">
          <div><dt className="text-[12px] tracking-[0.12em] text-faint uppercase">{m.cards.what}</dt><dd>{face.what}</dd></div>
          <div><dt className="text-[12px] tracking-[0.12em] text-faint uppercase">{m.cards.where}</dt><dd>{face.where}</dd></div>
          <div><dt className="text-[12px] tracking-[0.12em] text-faint uppercase">{m.cards.when}</dt><dd>{face.when}</dd></div>
        </dl>
        <details className="mt-2">
          <summary className="cursor-pointer text-ink">{m.cards.sources}</summary>
          <ul className="mt-1 space-y-1">
            {card.sources.map((src) => (
              <li key={src.name}>
                <a className="underline decoration-white/30 hover:text-ink" href={src.url} target="_blank" rel="noreferrer">
                  {src.name}
                </a>{" "}
                — {locale === "es" && src.role === card.sources[0]?.role ? face.sourceRole : locale === "es" && src.role === "daily 50 m wind speed" ? "velocidad del viento a 50 m, diaria" : locale === "es" && src.role === "daily solar insolation" ? "insolación solar diaria" : src.role}
              </li>
            ))}
            <li className="font-mono text-[12px] break-all text-faint">
              {card.provenance.bundle} · sha256 {card.provenance.bundle_sha256.slice(0, 12)}… · {card.provenance.git}
            </li>
            <li className="text-[12px] text-faint">{face.status}</li>
          </ul>
        </details>
        <details className="mt-1">
          <summary className="cursor-pointer text-ink">{m.cards.limits}</summary>
          <ul className="mt-1 list-disc space-y-1 pl-4">
            {face.limitations.map((l) => <li key={l}>{l}</li>)}
            <li>
              {m.cards.sensitivity}{" "}
              {Object.entries(card.evidence.sensitivity).map(([k, v]) => `${k} ${signed(v)}`).join(" · ")}
            </li>
          </ul>
        </details>
      </ReceiptSection>
    </article>
  );
}

export function EvidenceCardPanel({
  scope,
  initialTopic = "temperature",
  onOpenTrend,
  onClose,
}: {
  scope: ResolvedAdminScope;
  /** Topic selected on open (a joint-low research case opens on its joint-low card). */
  initialTopic?: Topic;
  onOpenTrend: () => void;
  onClose: () => void;
}) {
  const [cards, setCards] = useState<EvidenceCard[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [topic, setTopic] = useState<Topic>(initialTopic);
  const [showReference, setShowReference] = useState(false);
  const { m } = useLocale();

  useEffect(() => {
    fetch("/data/evidence-cards.json")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<unknown>;
      })
      .then((d) => {
        const list = typeof d === "object" && d !== null ? (d as { cards?: unknown }).cards : undefined;
        if (!Array.isArray(list) || !list.every(isCard)) throw new Error("cards failed schema check");
        setCards(list);
      })
      .catch((e: Error) => setError(e.message));
  }, []);

  const key = scopeKeyOf(scope);
  // Reset the reference toggle whenever the region or topic changes.
  useEffect(() => setShowReference(false), [key, topic]);

  const exact = cards?.find((c) => c.topic === topic && c.region.scope === key) ?? null;
  const national = cards?.find((c) => c.topic === topic && c.headline && c.region.scope === "age") ?? null;
  const regionLabel = key === "age" ? m.cards.spainNational : scope.name;

  return (
    <ToolPanel icon="chart" title={m.cards.title} onClose={onClose}>
      <p className="mt-2 text-[13px] text-muted">
        {m.cards.selected} <span className="text-ink">{regionLabel}</span>
      </p>
      {error && <p role="alert" className="mt-3 text-xs text-ink">{m.cards.failed(error)}</p>}
      {!cards && !error && <p className="mt-3 text-xs text-muted" role="status">{m.cards.loading}</p>}
      {cards && (
        <div role="tablist" aria-label={m.cards.topic} className="mt-2 flex gap-1">
          {TOPIC_IDS.map((id) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={id === topic}
              onClick={() => setTopic(id)}
              className={`focus-ring flex-1 rounded-md px-2 py-1 text-[13px] ${
                id === topic ? "bg-white/12 text-ink" : "text-muted hover:bg-white/6"
              }`}
            >
              {id === "temperature" ? m.cards.air : m.cards.joint}
            </button>
          ))}
        </div>
      )}
      {cards && exact && (
        <>
          <p className="mt-3 rounded-md border border-nav/30 bg-nav/10 px-2 py-1 text-[13px] text-ink">
            {m.cards.resultFor} <strong className="font-medium">{exact.region.name}</strong>
            {key === "age" && ` ${m.cards.canarias}`}
          </p>
          <CardBody card={exact} />
        </>
      )}
      {cards && !exact && (
        <div className="mt-3 space-y-2 text-xs">
          <p className="rounded-md border border-white/25 bg-white/8 px-2 py-1.5 text-ink">
            <span aria-hidden className="mr-1 font-mono">?</span>
            {m.cards.noCard(topic === "temperature" ? m.cards.airTopic : m.cards.jointTopic, scope.name)}
            {topic === "joint_low" && ` ${m.cards.jointScope}`}
          </p>
          {topic === "temperature" && (
            <p className="text-muted">
              {m.cards.ownTrend}{" "}
              <button type="button" onClick={onOpenTrend} className={`${smallButton} mt-1`}>
                {m.cards.openTrend}
              </button>
            </p>
          )}
          {national && (
            <button
              type="button"
              aria-expanded={showReference}
              onClick={() => setShowReference((v) => !v)}
              className="focus-ring text-[13px] text-muted underline hover:text-ink"
            >
              {showReference ? m.cards.hide : m.cards.show} {m.cards.nationalRef(national.region.name, scope.name)}
            </button>
          )}
          {showReference && national && (
            <>
              <p className="rounded-md border border-amber-300/40 bg-amber-400/10 px-2 py-1 text-[13px] text-amber-100">
                {m.cards.notFor(national.region.name, scope.name)}
              </p>
              <CardBody card={national} />
            </>
          )}
        </div>
      )}
    </ToolPanel>
  );
}
