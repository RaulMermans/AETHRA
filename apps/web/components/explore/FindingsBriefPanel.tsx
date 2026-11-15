"use client";

import { useEffect, useState, type ReactNode } from "react";
import { cardById, parseEvidenceCatalog, type EvidenceCard } from "@/lib/agent/cards";
import { ENERGY_RESEARCH_CASES } from "@/lib/globe/energy-research-cases";
import { useLocale } from "@/lib/i18n/locale";
import { localizeCardFace } from "@/lib/i18n/science-copy";
import { Icon, type IconName } from "./Icon";

/**
 * Plain-language briefing of published findings only: question → answer → what it means → what we can't say.
 * Does not compute correlations or new slopes. Temperature numbers come from evidence-cards.json;
 * joint-low numbers are quoted in energy-research-cases.ts (D62-tested against Python).
 */

type Verdict = "proven" | "notYet" | "outside";

const VERDICT_STYLE: Record<Verdict, { icon: IconName; cls: string }> = {
  proven: { icon: "check", cls: "border-amber-300/50 bg-amber-400/15 text-amber-100" },
  notYet: { icon: "search", cls: "border-sky-300/40 bg-sky-400/10 text-sky-100" },
  outside: { icon: "close", cls: "border-white/30 bg-white/5 text-ink" },
};

function VerdictBadge({ verdict, label }: { verdict: Verdict; label: string }) {
  const s = VERDICT_STYLE[verdict];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[12px] font-medium ${s.cls}`}>
      <Icon name={s.icon} className="size-3" />
      {label}
    </span>
  );
}

function Meaning({ means, cant, meansLabel, cantLabel }: { means: string; cant: string; meansLabel: string; cantLabel: string }) {
  return (
    <dl className="mt-2 space-y-1.5 text-[13px] leading-snug">
      <div>
        <dt className="text-[12px] font-medium text-ink">{meansLabel}</dt>
        <dd className="text-muted">{means}</dd>
      </div>
      <div>
        <dt className="text-[12px] font-medium text-faint">{cantLabel}</dt>
        <dd className="text-faint">{cant}</dd>
      </div>
    </dl>
  );
}

function Finding({ question, answer, badge, children, className }: { question: string; answer: ReactNode; badge: ReactNode; children: ReactNode; className: string }) {
  return (
    <article className={`rounded-md border p-2.5 ${className}`}>
      <p className="text-[14px] leading-snug font-medium text-ink">{question}</p>
      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
        {badge}
        <p className="text-[14px] leading-snug text-ink">{answer}</p>
      </div>
      {children}
    </article>
  );
}

export function FindingsBriefPanel({
  onClose,
  onOpenCard,
  onOpenCase,
  onStartProof,
  canStartProof,
}: {
  onClose: () => void;
  onOpenCard: () => void;
  onOpenCase: (caseId: string) => void;
  onStartProof: (card: EvidenceCard) => void;
  canStartProof: boolean;
}) {
  const [temp, setTemp] = useState<EvidenceCard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { locale, m } = useLocale();
  const f = m.findings;

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

  /** Spanish uses a decimal comma; the value itself is unchanged. */
  const dec = (s: string) => (locale === "es" ? s.replace(/(\d)\.(\d)/g, "$1,$2") : s);
  const signed = (n: number, digits = 2): string => {
    const mag = Math.abs(n).toFixed(digits);
    return dec(n > 0 ? `+${mag}` : n < 0 ? `−${mag}` : mag);
  };

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

  // Verdicts are keyed on the pipeline outcomes, never on the size of a number.
  const jointVerdict: Verdict = ENERGY_RESEARCH_CASES.every((c) => c.primary.outcomeLabel === "Insufficient evidence") ? "notYet" : "proven";
  const tempVerdict: Verdict = temp?.outcome === "supported_increase" ? "proven" : "notYet";
  const verdictLabel = (v: Verdict) => (v === "proven" ? f.verdictProven : f.verdictNotYet);
  const caseUnits = locale === "es" ? "días por década" : null;

  return (
    <section
      aria-label={f.aria}
      className="panel pointer-events-auto flex h-full min-h-0 w-full flex-col overflow-hidden"
    >
      <div className="flex items-center justify-between gap-2 px-3 pt-3 pb-2">
        <h2 className="text-[14px] font-medium tracking-wide text-ink">{f.title}</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label={f.close}
          className="focus-ring grid size-7 place-items-center rounded-md text-muted hover:bg-white/6 hover:text-ink"
        >
          <Icon name="close" className="size-3.5" />
        </button>
      </div>
      {/* D75: separate the active study from whatever climate layer the globe is showing. */}
      <p className="mx-3 mb-2 flex gap-1.5 text-[12px] leading-snug text-faint">
        <Icon name="globe" className="mt-0.5 size-3 shrink-0" />
        <span>{f.mapNote}</span>
      </p>
      {temp && (
        <button
          type="button"
          onClick={() => onStartProof(temp)}
          disabled={!canStartProof}
          title={!canStartProof ? m.explore.preparing : undefined}
          className="focus-ring mx-3 mb-2 rounded-md border border-amber-300/35 bg-amber-400/10 px-3 py-2 text-left text-[13px] font-medium text-amber-100 hover:bg-amber-400/15 disabled:cursor-wait disabled:opacity-50"
        >
          {m.proof.start}
        </button>
      )}
      <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto px-3 pb-3">
        {error ? (
          <p role="alert" className="text-[14px] text-amber-100">
            {error}. {f.invented}
          </p>
        ) : null}

        <Finding
          question={f.question}
          answer={f.answerJoint}
          badge={<VerdictBadge verdict={jointVerdict} label={verdictLabel(jointVerdict)} />}
          className="border-sky-300/30 bg-sky-400/5"
        >
          <Meaning means={f.meansJoint} cant={f.cantJoint} meansLabel={f.meansLabel} cantLabel={f.cantLabel} />
          <div className="mt-2 flex flex-wrap items-center gap-1">
            <span className="mr-0.5 text-[12px] text-faint">{f.regionsLabel}:</span>
            {ENERGY_RESEARCH_CASES.map((study) => (
              <button
                key={study.id}
                type="button"
                onClick={() => onOpenCase(study.id)}
                className="focus-ring rounded-full border border-line px-2 py-0.5 text-[12px] text-ink hover:bg-white/8"
              >
                {study.regionName}
              </button>
            ))}
          </div>
        </Finding>

        <Finding
          question={f.finding1}
          answer={temp ? f.answerWarm(signed(temp.how_much.slope_per_decade, 1)) : f.loadingGate}
          badge={temp ? <VerdictBadge verdict={tempVerdict} label={verdictLabel(tempVerdict)} /> : null}
          className="border-amber-300/35 bg-amber-400/8"
        >
          <Meaning means={f.meansWarm} cant={f.cantWarm} meansLabel={f.meansLabel} cantLabel={f.cantLabel} />
        </Finding>

        {/* Claim C of the Claim Test (D76): a boundary, not a third study. No estimate is produced. */}
        <article className="rounded-md border border-dashed border-white/30 bg-black/25 p-2.5" aria-label={f.boundary}>
          <p className="text-[14px] leading-snug font-medium text-ink">{f.boundary}</p>
          <p className="mt-0.5 text-[13px] text-muted italic">{f.boundaryClaim}</p>
          <div className="mt-1">
            <VerdictBadge verdict="outside" label={m.findings.boundaryVerdict} />
          </div>
          <p className="mt-1 text-[13px] leading-snug text-muted">{f.boundaryBody}</p>
        </article>

        <details className="rounded-md border border-line bg-black/20 p-2.5 text-[12px] leading-snug text-muted">
          <summary className="focus-ring cursor-pointer text-[13px] text-ink">{f.showNumbers} · {f.howWeKnow}</summary>

          <p className="mt-2 font-medium text-ink">{f.numbersJoint}</p>
          <ul className="mt-1 space-y-1 font-mono">
            {ENERGY_RESEARCH_CASES.map((study) => (
              <li key={`${study.id}-n`}>
                <span className="font-sans text-ink">{study.regionName}</span>{" "}
                {f.regionRow(
                  signed(study.primary.slopePerDecade),
                  caseUnits ?? study.primary.units,
                  m.cards.ci(signed(study.primary.ciLow), signed(study.primary.ciHigh)),
                  dec(String(study.primary.p)),
                  study.primary.nYears,
                )}{" "}
                · {f.chanceRow(dec(study.complementarityPrimary.ratio.toFixed(2)))}
              </li>
            ))}
          </ul>
          <p className="mt-1 text-faint">{f.chanceNote}</p>
          <p className="mt-1 text-muted">{f.unitsNote}</p>
          <p className="mt-1 text-faint">{f.sourceJoint}</p>

          <p className="mt-3 font-medium text-ink">{f.numbersWarm}</p>
          {temp && face ? (
            <>
              <p className="mt-1 font-mono">
                {face.outcome_label}: {signed(temp.how_much.slope_per_decade)} {face.units} ·{" "}
                {m.cards.ci(signed(temp.how_much.ci95_per_decade[0]), signed(temp.how_much.ci95_per_decade[1]))} · p ={" "}
                {dec(String(temp.evidence.p))} · n = {temp.evidence.n_years} · {face.when}
              </p>
              {temp.external_check && (
                <p className="mt-1">
                  {m.cards.externalCheck(
                    temp.external_check.n_stations,
                    temp.external_check.stations_warming,
                    temp.external_check.within_0_2_per_decade,
                    `${temp.external_check.slope_diff_median_per_decade > 0 ? "+" : ""}${temp.external_check.slope_diff_median_per_decade.toFixed(3)}`,
                    temp.external_check.period,
                  )}
                </p>
              )}
              <p className="mt-1 text-faint">{f.sourceWarm("NASA MERRA-2 M2TMNXSLV (T2M)")}</p>
            </>
          ) : (
            <p className="mt-1 text-faint">{f.loadingGate}</p>
          )}

          <p className="mt-3 text-faint">{f.notPresentableBody}</p>
          <p className="mt-1 text-faint">{f.banner}</p>
        </details>

        <p className="text-[13px] leading-snug text-muted">{f.solarHint}</p>

        <button
          type="button"
          onClick={onOpenCard}
          className="focus-ring w-full rounded-md border border-line px-2 py-1.5 text-[14px] text-ink hover:bg-white/6"
        >
          {f.openCards}
        </button>
      </div>
    </section>
  );
}
