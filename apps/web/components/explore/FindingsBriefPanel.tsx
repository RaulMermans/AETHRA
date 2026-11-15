"use client";

import { useEffect, useState } from "react";
import { cardById, parseEvidenceCatalog, type EvidenceCard } from "@/lib/agent/cards";
import { ENERGY_RESEARCH_CASES } from "@/lib/globe/energy-research-cases";
import { useLocale } from "@/lib/i18n/locale";
import { localizeCardFace } from "@/lib/i18n/science-copy";
import { Icon } from "./Icon";

/**
 * Detective briefing of published findings only. Does not compute correlations or new slopes.
 * Temperature numbers come from evidence-cards.json; joint-low copy is D62-tested against Python.
 */

function signed(n: number): string {
  const mag = Math.abs(n).toFixed(2);
  if (n > 0) return `+${mag}`;
  if (n < 0) return `−${mag}`;
  return mag;
}

export function FindingsBriefPanel({
  onClose,
  onOpenCard,
  onOpenCase,
}: {
  onClose: () => void;
  onOpenCard: () => void;
  onOpenCase: (caseId: string) => void;
}) {
  const [temp, setTemp] = useState<EvidenceCard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { locale, m } = useLocale();

  useEffect(() => {
    let active = true;
    fetch("/data/evidence-cards.json")
      .then(async (res) => {
        if (!res.ok) throw new Error(`evidence-cards.json HTTP ${res.status}`);
        return parseEvidenceCatalog(await res.json());
      })
      .then((catalog) => {
        if (!active) return;
        const card = cardById(catalog, "gate-a-temperature-R0");
        if (!card) throw new Error("Missing Gate A temperature card");
        setTemp(card);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      active = false;
    };
  }, []);

  const face = temp
    ? localizeCardFace(
        {
          topic: temp.topic,
          region: temp.region,
          question: temp.question,
          outcome_label: temp.outcome_label,
          what: temp.what,
          where: temp.where,
          when: temp.when,
          do_not_conclude: temp.do_not_conclude,
          limitations: temp.limitations,
          evidence: { method: temp.evidence.method },
          series: { label: "Annual mean T2M" },
          how_much: { units: temp.how_much.units },
          status: temp.status,
          sources: [],
        },
        locale,
      )
    : null;

  return (
    <section
      aria-label={m.findings.aria}
      className="panel pointer-events-auto flex h-full min-h-0 w-full flex-col overflow-hidden"
    >
      <div className="flex items-center justify-between gap-2 px-3 pt-3 pb-2">
        <h2 className="text-[14px] font-medium tracking-wide text-ink">{m.findings.title}</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label={m.findings.close}
          className="focus-ring grid size-7 place-items-center rounded-md text-muted hover:bg-white/6 hover:text-ink"
        >
          <Icon name="close" className="size-3.5" />
        </button>
      </div>
      <div className="px-3 pb-2">
        <p className="font-mono text-[12px] tracking-[0.14em] text-faint uppercase">{m.findings.questionLabel}</p>
        <p className="mt-0.5 text-[15px] leading-snug font-medium text-ink">{m.findings.question}</p>
      </div>
      <p className="px-3 pb-2 font-mono text-[12px] leading-snug text-faint">
        {m.findings.banner}
      </p>
      {/* D75: separate the active study from whatever climate layer the globe is showing. */}
      <p className="mx-3 mb-2 flex gap-1.5 rounded-md border border-sky-300/25 bg-sky-400/8 px-2 py-1 text-[13px] leading-snug text-sky-100">
        <Icon name="globe" className="mt-0.5 size-3.5 shrink-0" />
        <span>{m.findings.mapNote}</span>
      </p>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 pb-3">
        {error ? (
          <p role="alert" className="text-[14px] text-amber-100">
            {error}. {m.findings.invented}
          </p>
        ) : null}

        <article className="rounded-md border border-white/20 bg-white/5 p-2.5">
          <p className="font-mono text-[12px] tracking-[0.14em] text-faint uppercase">{m.findings.finding2}</p>
          <p className="mt-1 text-[15px] font-medium text-ink">◆ {m.findings.insufficientFive}</p>
          <p className="mt-1 text-[13px] leading-snug text-muted">{m.findings.jointNote}</p>
          <ul className="mt-2 space-y-1">
            {ENERGY_RESEARCH_CASES.map((study) => (
              <li key={study.id}>
                <button
                  type="button"
                  onClick={() => onOpenCase(study.id)}
                  className="focus-ring flex w-full items-baseline justify-between gap-2 rounded-md px-1 py-0.5 text-left hover:bg-white/8"
                >
                  <span className="text-[14px] text-ink">{study.regionName}</span>
                  <span className="font-mono text-[12px] text-faint">
                    {signed(study.primary.slopePerDecade)} {locale === "es" ? "días por década" : study.primary.units}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </article>

        <article className="rounded-md border border-amber-300/35 bg-amber-400/10 p-2.5">
          <p className="font-mono text-[12px] tracking-[0.14em] text-amber-100/80 uppercase">{m.findings.finding1}</p>
          {temp && face ? (
            <>
              <p className="mt-1 text-[15px] font-medium text-amber-100">▲ {face.outcome_label}</p>
              <p className="mt-1 text-[14px] leading-snug text-ink">
                {signed(temp.how_much.slope_per_decade)} {face.units} ({m.cards.ci(signed(temp.how_much.ci95_per_decade[0]), signed(temp.how_much.ci95_per_decade[1]))}; n = {temp.evidence.n_years}). {face.when}.
              </p>
              <p className="mt-1 text-[12px] leading-snug text-muted">{face.what}. {face.where}.</p>
              <p className="mt-1 text-[12px] leading-snug text-faint">{face.do_not_conclude}</p>
            </>
          ) : (
            <p className="mt-1 text-[13px] text-faint">{m.findings.loadingGate}</p>
          )}
        </article>

        <article className="rounded-md border border-line bg-black/20 p-2.5">
          <p className="font-mono text-[12px] tracking-[0.14em] text-faint uppercase">{m.findings.relate}</p>
          <p className="mt-1 text-[13px] leading-snug text-muted">{m.findings.relateBody}</p>
          <ul className="mt-2 space-y-1.5">
            {ENERGY_RESEARCH_CASES.map((study) => {
              const ratio = study.complementarityPrimary.ratio;
              const pct = Math.min(100, Math.max(0, ratio * 100));
              return (
                <li key={`${study.id}-c`}>
                  <div className="flex items-baseline justify-between text-[13px] text-ink">
                    <span>{study.regionName}</span>
                    <span className="font-mono text-faint">{ratio.toFixed(2)}{m.findings.chance}</span>
                  </div>
                  <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-white/10" aria-hidden="true">
                    <div className="h-full rounded-full bg-sky-300/70" style={{ width: `${pct}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="mt-2 text-[12px] leading-snug text-faint">
            {m.findings.independence}
          </p>
        </article>

        <div className="rounded-md border border-line bg-black/20 p-2.5">
          <p className="font-mono text-[12px] tracking-[0.14em] text-faint uppercase">{m.findings.howSit}</p>
          <svg viewBox="0 0 280 132" className="mt-2 w-full text-ink" role="img" aria-label={m.findings.diagram}>
            <rect x="8" y="8" width="120" height="52" rx="6" fill="rgba(251,191,36,0.12)" stroke="rgba(252,211,77,0.45)" />
            <text x="68" y="28" textAnchor="middle" fill="currentColor" fontSize="10">
              {m.findings.air}
            </text>
            <text x="68" y="44" textAnchor="middle" fill="#fde68a" fontSize="9">
              MERRA-2 T2M
            </text>
            <rect x="152" y="8" width="120" height="52" rx="6" fill="rgba(56,189,248,0.1)" stroke="rgba(125,211,252,0.4)" />
            <text x="212" y="28" textAnchor="middle" fill="currentColor" fontSize="10">
              {m.findings.solarWind}
            </text>
            <text x="212" y="44" textAnchor="middle" fill="#7dd3fc" fontSize="9">
              NASA POWER
            </text>
            <line x1="128" y1="34" x2="152" y2="34" stroke="rgba(255,255,255,0.35)" strokeDasharray="3 3" />
            <text x="140" y="78" textAnchor="middle" fill="#9ca3af" fontSize="8">
              {m.findings.sameCountry}
            </text>
            <text x="140" y="92" textAnchor="middle" fill="#9ca3af" fontSize="8">
              {m.findings.noArrow}
            </text>
            <rect x="48" y="102" width="184" height="22" rx="4" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.12)" />
            <text x="140" y="117" textAnchor="middle" fill="currentColor" fontSize="9">
              {m.findings.spainExtent}
            </text>
          </svg>
        </div>

        <article className="rounded-md border border-amber-300/25 bg-amber-400/5 p-2.5">
          <p className="font-mono text-[12px] tracking-[0.14em] text-amber-100/80 uppercase">{m.findings.notPresentable}</p>
          <p className="mt-1 text-[13px] leading-snug text-muted">{m.findings.notPresentableBody}</p>
        </article>

        <button
          type="button"
          onClick={onOpenCard}
          className="focus-ring w-full rounded-md border border-line px-2 py-1.5 text-[14px] text-ink hover:bg-white/6"
        >
          {m.findings.openCards}
        </button>
      </div>
    </section>
  );
}
