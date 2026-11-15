"use client";

import type { EvidenceCard } from "@/lib/agent/cards";
import { paletteGradientCss, type PaletteId } from "@/lib/globe/climate";
import { useLocale } from "@/lib/i18n/locale";
import { localizeCardFace } from "@/lib/i18n/science-copy";

export type ProofStage = "planet" | "extent" | "trend";

/** Map colour scale as already shown by the left-column legend (hidden below lg while the guide runs). */
export interface ProofScale {
  palette: PaletteId;
  domain: [number, number];
  units: string;
}

function tick(n: number): string {
  return n.toFixed(Math.abs(n) >= 10 ? 0 : 1).replace(/\.0$/, "");
}

export function PlanetToProof({
  card,
  stage,
  onRegion,
  onTrend,
  onReveal,
  onExit,
  scale,
}: {
  card: EvidenceCard;
  stage: ProofStage;
  scale: ProofScale;
  onRegion: () => void;
  onTrend: () => void;
  onReveal: () => void;
  onExit: () => void;
}) {
  const { locale, m } = useLocale();
  const face = localizeCardFace({
    topic: card.topic,
    region: card.region,
    question: card.question,
    outcome_label: card.outcome_label,
    what: card.what,
    where: card.where,
    when: card.when,
    do_not_conclude: card.do_not_conclude,
    limitations: card.limitations,
    evidence: { method: card.evidence.method },
    series: { label: "Annual mean T2M" },
    how_much: { units: card.how_much.units },
    status: card.status,
    sources: [],
  }, locale);
  const stepLabel = stage === "planet" ? m.proof.planet : stage === "extent" ? m.proof.extent : m.proof.trend;

  return (
    // Below lg the guide is a bottom sheet and the side panels are hidden, so nothing overlaps it.
    <aside
      aria-label={m.proof.title}
      className="panel pointer-events-auto absolute inset-x-3 bottom-3 z-40 mx-auto max-h-[46dvh] max-w-xl overflow-y-auto p-4 lg:inset-x-auto lg:top-[4.75rem] lg:right-20 lg:bottom-auto lg:mx-0 lg:max-h-[calc(100dvh-9rem)] lg:w-[23rem]"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] tracking-[0.14em] text-faint uppercase">{m.proof.title}</p>
          <h2 className="mt-1 text-[15px] font-medium text-ink">{stepLabel}</h2>
        </div>
        <button type="button" onClick={onExit} className="focus-ring rounded-md px-2 py-1 text-xs text-muted hover:bg-white/6 hover:text-ink">
          {m.proof.exit}
        </button>
      </div>
      <p className="mt-3 rounded-md border border-amber-300/30 bg-amber-400/10 px-2 py-1.5 text-[11px] text-amber-100">
        {face.status}
      </p>
      {stage === "planet" && (
        <p className="mt-3 text-[15px] leading-snug text-ink">{face.question}</p>
      )}
      {stage === "extent" && (
        <div className="mt-3 space-y-2 text-[13px] leading-snug text-muted">
          <p className="font-medium text-ink">{m.proof.studyRegion} · {face.when}</p>
          <p>{m.proof.extentNote}</p>
          <p>{face.where}</p>
        </div>
      )}
      {stage === "trend" && (
        <div className="mt-3 space-y-2 text-[13px] leading-snug text-muted">
          <p>{m.proof.trendMapNote}</p>
          <div className="lg:hidden" role="img" aria-label={`${tick(scale.domain[0])} to ${tick(scale.domain[1])} ${scale.units}`}>
            <div className="h-1.5 rounded-full" style={{ background: paletteGradientCss(scale.palette) }} />
            <div className="mt-1 flex justify-between font-mono text-[11px] text-ink">
              <span>{tick(scale.domain[0])}</span>
              <span>{scale.units}</span>
              <span>{tick(scale.domain[1])}</span>
            </div>
          </div>
          <p>{face.do_not_conclude}</p>
          <p><span className="font-medium text-ink">{m.proof.why}:</span> {m.proof.whyBody}</p>
        </div>
      )}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={stage === "planet" ? onRegion : stage === "extent" ? onTrend : onReveal}
          className="focus-ring rounded-md bg-accent px-3 py-2 text-[13px] font-medium text-accent-ink hover:brightness-110"
        >
          {stage === "planet" ? m.proof.goToRegion : stage === "extent" ? m.proof.showTrend : m.proof.reveal}
        </button>
        {stage !== "trend" && (
          <button type="button" onClick={onReveal} className="focus-ring rounded-md px-2 py-2 text-[12px] text-muted underline hover:text-ink">
            {m.proof.skip}
          </button>
        )}
      </div>
    </aside>
  );
}
