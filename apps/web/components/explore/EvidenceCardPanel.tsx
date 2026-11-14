"use client";

import { useEffect, useState } from "react";
import { ToolPanel } from "./ToolPanel";

/**
 * EvidenceCards produced by the Python pipeline (scripts/export_evidence_cards.py).
 * Render-only (ADR-002): every number is read from /data/evidence-cards.json, nothing is recomputed.
 */
type Outcome = "supported_increase" | "supported_decrease" | "no_robust_trend" | "insufficient_evidence";

type EvidenceCard = {
  id: string;
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
    expected_if_independent?: number;
    window_range_per_decade?: [number, number];
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

const TITLES: Record<string, string> = {
  "energy-gap-R0": "Solar + wind joint lows",
  "gate-a-temperature-R0": "Air temperature",
};

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

export function EvidenceCardPanel({ onClose }: { onClose: () => void }) {
  const [cards, setCards] = useState<EvidenceCard[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    fetch("/data/evidence-cards.json")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<{ cards: EvidenceCard[] }>;
      })
      .then((d) => setCards(d.cards))
      .catch((e: Error) => setError(e.message));
  }, []);

  const card = cards?.[active];
  return (
    <ToolPanel icon="chart" title="Evidence cards" onClose={onClose}>
      {error && <p className="mt-3 text-xs text-rose-200">Evidence could not be loaded ({error}).</p>}
      {!cards && !error && <p className="mt-3 text-xs text-muted">Loading evidence…</p>}
      {cards && (
        <div role="tablist" aria-label="Evidence card" className="mt-3 flex gap-1">
          {cards.map((c, i) => (
            <button
              key={c.id}
              role="tab"
              aria-selected={i === active}
              onClick={() => setActive(i)}
              className={`focus-ring flex-1 rounded-md px-2 py-1 text-[11px] ${
                i === active ? "bg-white/12 text-ink" : "text-muted hover:bg-white/6"
              }`}
            >
              {TITLES[c.id] ?? c.id}
            </button>
          ))}
        </div>
      )}
      {card && (
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
            {card.how_much.median_per_year !== undefined && (
              <div>
                <dt className="text-[10px] tracking-[0.12em] text-faint uppercase">Context</dt>
                <dd>
                  Median {card.how_much.median_per_year} joint-low days/yr vs {card.how_much.expected_if_independent} if solar and wind
                  were independent.
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
      )}
    </ToolPanel>
  );
}
