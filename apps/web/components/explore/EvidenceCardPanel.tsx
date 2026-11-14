"use client";

import { useEffect, useState } from "react";
import type { ResolvedAdminScope } from "@/lib/globe/admin-scope";
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

type Topic = "temperature" | "joint_low";

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
};

const OUTCOME_STYLE: Record<Outcome, { glyph: string; cls: string }> = {
  supported_increase: { glyph: "▲", cls: "border-amber-300/40 bg-amber-400/15 text-amber-100" },
  supported_decrease: { glyph: "▼", cls: "border-sky-300/40 bg-sky-400/15 text-sky-100" },
  no_robust_trend: { glyph: "◆", cls: "border-white/25 bg-white/8 text-ink" },
  insufficient_evidence: { glyph: "?", cls: "border-white/25 bg-white/8 text-ink" },
};

const TOPICS: { id: Topic; title: string }[] = [
  { id: "temperature", title: "Air temperature" },
  { id: "joint_low", title: "Solar + wind joint lows" },
];

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
  return `${v > 0 ? "+" : v < 0 ? "−" : "±"}${Math.abs(v).toFixed(digits)}`;
}

function Series({ card }: { card: EvidenceCard }) {
  const { years, values, complete, units, label } = card.series;
  const w = 256;
  const h = 110;
  const pl = 30;
  const pb = 16;
  const lo0 = Math.min(...values);
  const hi0 = Math.max(...values);
  const pad = (hi0 - lo0) * 0.12 || 1;
  const lo = lo0 >= 0 ? Math.max(0, lo0 - pad) : lo0 - pad;
  const hi = hi0 + pad;
  const x0 = years[0];
  const x1 = years[years.length - 1];
  const fx = (x: number) => pl + ((x - x0) / (x1 - x0)) * (w - pl - 4);
  const fy = (y: number) => 4 + ((hi - y) / (hi - lo)) * (h - pb - 4);
  const line = (yr: number) => card.trend_line.intercept + (card.trend_line.slope_per_decade / 10) * yr;
  return (
    <figure className="mt-3">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img" aria-label={`${label}, ${x0}–${x1}, ${units}`}>
        <line x1={pl} y1={h - pb} x2={w - 4} y2={h - pb} stroke="rgb(255 255 255 / 0.2)" />
        {[lo, (lo + hi) / 2, hi].map((v) => (
          <text key={v} x={pl - 4} y={fy(v) + 3} textAnchor="end" className="fill-white/45 text-[8px]">
            {v.toFixed(Math.abs(hi - lo) < 5 ? 1 : 0)}
          </text>
        ))}
        {[x0, Math.round((x0 + x1) / 2), x1].map((yr) => (
          <text key={yr} x={fx(yr)} y={h - 4} textAnchor="middle" className="fill-white/45 text-[8px]">
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
      <figcaption className="text-[10px] text-faint">
        {label} ({units}), observed years only. Dashed: Theil–Sen line.
      </figcaption>
    </figure>
  );
}

function CardBody({ card }: { card: EvidenceCard }) {
  return (
    <article className="mt-3 space-y-3 text-xs text-muted">
      <p className="text-ink">{card.question}</p>
      <div className={`flex items-center gap-2 rounded-md border px-2 py-1.5 ${OUTCOME_STYLE[card.outcome].cls}`}>
        <span aria-hidden className="font-mono">{OUTCOME_STYLE[card.outcome].glyph}</span>
        <span className="font-semibold">{card.outcome_label}</span>
      </div>
      <p className="font-mono text-sm text-ink tabular-nums">
        {signed(card.how_much.slope_per_decade)} {card.how_much.units}
        <span className="block text-[11px] text-muted">
          95% CI {signed(card.how_much.ci95_per_decade[0])} to {signed(card.how_much.ci95_per_decade[1])}
          {card.how_much.window_range_per_decade &&
            ` · window range ${signed(card.how_much.window_range_per_decade[0])} to ${signed(card.how_much.window_range_per_decade[1])}`}
        </span>
      </p>
      <Series card={card} />
      <dl className="space-y-1.5">
        <div><dt className="text-[10px] tracking-[0.12em] text-faint uppercase">What</dt><dd>{card.what}</dd></div>
        <div><dt className="text-[10px] tracking-[0.12em] text-faint uppercase">Where</dt><dd>{card.where}</dd></div>
        <div><dt className="text-[10px] tracking-[0.12em] text-faint uppercase">When</dt><dd>{card.when}</dd></div>
        <div>
          <dt className="text-[10px] tracking-[0.12em] text-faint uppercase">Evidence</dt>
          <dd>
            {card.evidence.method}. n = {card.evidence.n_years} years, p = {card.evidence.p}
            {card.evidence.p_adjusted_bh !== undefined && ` (BH-adjusted ${card.evidence.p_adjusted_bh})`}, lag-1 r ={" "}
            {card.evidence.lag1_autocorr}
            {card.evidence.min_detectable_trend_per_decade != null &&
              `. Smallest trend detectable with 80% power ≈ ${card.evidence.min_detectable_trend_per_decade} ${card.how_much.units}`}
            .
          </dd>
        </div>
        {card.complementarity && (
          <div>
            <dt className="text-[10px] tracking-[0.12em] text-faint uppercase">Descriptive context (not a trend)</dt>
            <dd>
              {card.complementarity.observed_2001_2025} joint-low days in 2001–2025 vs ≈
              {card.complementarity.expected_if_independent_mean} expected if same-day solar and wind lows were independent (95% range{" "}
              {card.complementarity.expected_range_95[0]}–{card.complementarity.expected_range_95[1]}; ratio {card.complementarity.ratio}).
              Null model: {card.complementarity.null_model}. Describes resource data, not grid reliability.
            </dd>
          </div>
        )}
      </dl>
      <p className="rounded-md border border-amber-300/25 bg-amber-400/8 px-2 py-1.5 text-amber-100">
        Do not conclude: {card.do_not_conclude}
      </p>
      <details>
        <summary className="cursor-pointer text-ink">Limitations & sensitivity</summary>
        <ul className="mt-1 list-disc space-y-1 pl-4">
          {card.limitations.map((l) => <li key={l}>{l}</li>)}
          <li>
            Sensitivity:{" "}
            {Object.entries(card.evidence.sensitivity).map(([k, v]) => `${k} ${signed(v)}`).join(" · ")}
          </li>
        </ul>
      </details>
      <details>
        <summary className="cursor-pointer text-ink">Sources & provenance</summary>
        <ul className="mt-1 space-y-1">
          {card.sources.map((s) => (
            <li key={s.name}>
              <a className="underline decoration-white/30 hover:text-ink" href={s.url} target="_blank" rel="noreferrer">
                {s.name}
              </a>{" "}
              — {s.role}
            </li>
          ))}
          <li className="font-mono text-[10px] break-all text-faint">
            {card.provenance.bundle} · sha256 {card.provenance.bundle_sha256.slice(0, 12)}… · {card.provenance.git}
          </li>
          <li className="text-[10px] text-faint">{card.status}</li>
        </ul>
      </details>
    </article>
  );
}

export function EvidenceCardPanel({
  scope,
  onOpenTrend,
  onClose,
}: {
  scope: ResolvedAdminScope;
  onOpenTrend: () => void;
  onClose: () => void;
}) {
  const [cards, setCards] = useState<EvidenceCard[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [topic, setTopic] = useState<Topic>("temperature");
  const [showReference, setShowReference] = useState(false);

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
  const regionLabel = key === "age" ? "Spain (national view)" : scope.name;

  return (
    <ToolPanel icon="chart" title="Evidence cards" onClose={onClose}>
      <p className="mt-2 text-[11px] text-muted">
        Selected region: <span className="text-ink">{regionLabel}</span>
      </p>
      {error && <p role="alert" className="mt-3 text-xs text-ink">Data failed quality checks: evidence could not be loaded ({error}).</p>}
      {!cards && !error && <p className="mt-3 text-xs text-muted" role="status">Loading evidence…</p>}
      {cards && (
        <div role="tablist" aria-label="Evidence topic" className="mt-2 flex gap-1">
          {TOPICS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={t.id === topic}
              onClick={() => setTopic(t.id)}
              className={`focus-ring flex-1 rounded-md px-2 py-1 text-[11px] ${
                t.id === topic ? "bg-white/12 text-ink" : "text-muted hover:bg-white/6"
              }`}
            >
              {t.title}
            </button>
          ))}
        </div>
      )}
      {cards && exact && (
        <>
          <p className="mt-3 rounded-md border border-nav/30 bg-nav/10 px-2 py-1 text-[11px] text-ink">
            Result for <strong className="font-medium">{exact.region.name}</strong>
            {key === "age" && " (Canarias reported separately)"}
          </p>
          <CardBody card={exact} />
        </>
      )}
      {cards && !exact && (
        <div className="mt-3 space-y-2 text-xs">
          <p className="rounded-md border border-white/25 bg-white/8 px-2 py-1.5 text-ink">
            <span aria-hidden className="mr-1 font-mono">?</span>
            No {topic === "temperature" ? "air-temperature" : "solar + wind"} EvidenceCard for {scope.name}.
            {topic === "joint_low" &&
              " The pre-registered study covers Peninsula + Balearics, Galicia, Castilla y León, Aragón and Andalucía only."}
          </p>
          {topic === "temperature" && (
            <p className="text-muted">
              This region&apos;s own MERRA-2 temperature trend (precomputed by the same pipeline) is in the Trend panel.{" "}
              <button type="button" onClick={onOpenTrend} className={`${smallButton} mt-1`}>
                Open Trend panel
              </button>
            </p>
          )}
          {national && (
            <button
              type="button"
              aria-expanded={showReference}
              onClick={() => setShowReference((v) => !v)}
              className="focus-ring text-[11px] text-muted underline hover:text-ink"
            >
              {showReference ? "Hide" : "Show"} national reference ({national.region.name}, not {scope.name})
            </button>
          )}
          {showReference && national && (
            <>
              <p className="rounded-md border border-amber-300/40 bg-amber-400/10 px-2 py-1 text-[11px] text-amber-100">
                National reference: {national.region.name}. This is <strong>not</strong> a result for {scope.name}.
              </p>
              <CardBody card={national} />
            </>
          )}
        </div>
      )}
    </ToolPanel>
  );
}
