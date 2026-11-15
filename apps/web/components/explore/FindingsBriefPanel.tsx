"use client";

import { useEffect, useState, type ReactNode } from "react";
import { cardById, parseEvidenceCatalog, type EvidenceCard } from "@/lib/agent/cards";
import { PV_SCREENING_URL, type PvScreeningFile, type PvSummary } from "@/lib/globe/pv-screening";
import { useLocale } from "@/lib/i18n/locale";
import { localizeCardFace } from "@/lib/i18n/science-copy";
import type { Locale } from "@/lib/i18n/messages";
import { Icon, type IconName } from "./Icon";

/**
 * Study findings for the solar PV use case: "where should a PV plant go, and is the climate behind it changing?"
 * Render-only (ADR-002): every number is read from pv-screening.json (scripts/build_pv_screening.py) or
 * evidence-cards.json (Gate A). Verdicts follow the pipeline's significance flags, never the size of a number.
 */

type Verdict = "supported" | "stable" | "where";

const VERDICT_STYLE: Record<Verdict, { icon: IconName; cls: string }> = {
  supported: { icon: "check", cls: "border-amber-300/50 bg-amber-400/15 text-amber-100" },
  stable: { icon: "check", cls: "border-emerald-300/45 bg-emerald-400/12 text-emerald-100" },
  where: { icon: "globe", cls: "border-sky-300/40 bg-sky-400/10 text-sky-100" },
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

function Finding({ question, answer, badge, means, meansLabel, className }: { question: string; answer: ReactNode; badge: ReactNode; means: string; meansLabel: string; className: string }) {
  return (
    <article className={`rounded-md border p-2.5 ${className}`}>
      <p className="text-[14px] leading-snug font-medium text-ink">{question}</p>
      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
        {badge}
        <p className="text-[14px] leading-snug text-ink">{answer}</p>
      </div>
      <p className="mt-2 text-[13px] leading-snug text-muted">
        <span className="font-medium text-ink">{meansLabel}: </span>
        {means}
      </p>
    </article>
  );
}

type Num = (n: number, digits?: number) => string;

function pvCopy(locale: Locale) {
  if (locale === "es") {
    return {
      aria: "Hallazgos del estudio: fotovoltaica en España",
      title: "Fotovoltaica en España: lo que dicen los datos NASA",
      intro: "Cuatro preguntas que se hace quien va a construir una planta solar, respondidas con tendencias de NASA 2000–2025.",
      meansLabel: "Para tu proyecto",
      supported: "Tendencia significativa",
      stable: "Recurso estable",
      where: "Mapa de decisión",
      qWhere: "¿Dónde construir?",
      aWhere: (good: number, pct: string) => `${good} zonas reúnen mucho sol y bajo conflicto ambiental. Ahí está ya el ${pct} % de la potencia solar en operación.`,
      mWhere: "Empieza por las celdas verdes del mapa (sur, Murcia, La Mancha) y descarta las rojas: poco sol o zona ambientalmente sensible según MITECO.",
      qSun: "¿Se está perdiendo el sol?",
      aSun: (tested: number, median: string) => `No. Ninguna de las ${tested} celdas muestra una caída significativa (mediana ${median} % por década).`,
      mSun: "La radiación de los últimos 25 años es una base fiable para estimar producción: no hay tendencia que la invalide.",
      qHeat: "¿El calor resta rendimiento?",
      aHeat: (sig: number, tested: number, t: string, pen: string) => `Sí: los veranos suben ${t} °C por década (significativo en ${sig} de ${tested} celdas). Con el coeficiente típico de −0,4 %/°C, unos ${pen} % de rendimiento por década.`,
      mHeat: "Ten en cuenta la temperatura de módulo en el diseño: ventilación, separación de filas y módulos con mejor coeficiente térmico.",
      qWarm: "¿Se calienta España en conjunto?",
      aWarm: (s: string) => `Sí: ${s} °C por década desde 2000 (Península y Baleares).`,
      mWarm: "Confirma la tendencia de calor con otra serie NASA y 64 estaciones NOAA de referencia.",
      openSolar: "Abrir el mapa solar",
      showNumbers: "Ver cifras y método",
      method: "Método: Theil–Sen + Mann–Kendall por celda de MERRA-2 (0,5° × 0,625°), corrección FDR entre celdas, años completos 2000–2025.",
      penaltyNote: "La pérdida por calor es indicativa: aplica un coeficiente estándar de módulo a la tendencia de temperatura; no es producción medida.",
      sourcePv: "Fuentes: NASA MERRA-2 (radiación SWGDN y temperatura T2M), MITECO zonificación ambiental FV 2024, Global Energy Monitor (plantas).",
      loading: "Cargando resultados…",
      missing: "Resultados no disponibles. No se muestra ningún valor inventado.",
    };
  }
  return {
    aria: "Study findings: solar PV in Spain",
    title: "Solar PV in Spain: what NASA data say",
    intro: "Four questions a solar developer asks, answered with NASA trends 2000–2025.",
    meansLabel: "For your project",
    supported: "Significant trend",
    stable: "Stable resource",
    where: "Decision map",
    qWhere: "Where to build?",
    aWhere: (good: number, pct: string) => `${good} areas combine strong sun and low environmental conflict. ${pct}% of operating solar capacity already sits there.`,
    mWhere: "Start from the green cells on the map (south, Murcia, La Mancha) and drop the red ones: weak sun or environmentally sensitive land per MITECO.",
    qSun: "Is the sun fading?",
    aSun: (tested: number, median: string) => `No. None of ${tested} cells shows a significant decline (median ${median}% per decade).`,
    mSun: "The last 25 years of irradiance are a sound baseline for yield estimates: no trend undermines them.",
    qHeat: "Is heat costing output?",
    aHeat: (sig: number, tested: number, t: string, pen: string) => `Yes: summers warm by ${t} °C per decade (significant in ${sig} of ${tested} cells). With the typical −0.4%/°C module coefficient, about ${pen}% of output per decade.`,
    mHeat: "Design for module temperature: ventilation, row spacing and modules with a better temperature coefficient.",
    qWarm: "Is Spain warming overall?",
    aWarm: (s: string) => `Yes: ${s} °C per decade since 2000 (Peninsula + Balearics).`,
    mWarm: "Confirms the heat trend with a separate NASA series and 64 NOAA reference stations.",
    openSolar: "Open the solar map",
    showNumbers: "Show numbers and method",
    method: "Method: Theil–Sen + Mann–Kendall per MERRA-2 cell (0.5° × 0.625°), FDR correction across cells, complete years 2000–2025.",
    penaltyNote: "The heat loss is indicative: a standard module coefficient applied to the temperature trend, not measured generation.",
    sourcePv: "Sources: NASA MERRA-2 (SWGDN irradiance, T2M temperature), MITECO 2024 PV environmental zoning, Global Energy Monitor (plants).",
    loading: "Loading results…",
    missing: "Results not available. No value is invented.",
  };
}

export function FindingsBriefPanel({
  onClose,
  onOpenCard,
  onOpenSolar,
  onStartProof,
  canStartProof,
}: {
  onClose: () => void;
  onOpenCard: () => void;
  onOpenSolar: () => void;
  onStartProof: (card: EvidenceCard) => void;
  canStartProof: boolean;
}) {
  const [temp, setTemp] = useState<EvidenceCard | null>(null);
  const [pv, setPv] = useState<PvSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { locale, m } = useLocale();
  const f = m.findings;
  const c = pvCopy(locale);

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
        if (active) setError(err instanceof Error ? err.message : String(err));
      });
    fetch(PV_SCREENING_URL)
      .then(async (res) => {
        if (!res.ok) throw new Error(`pv-screening.json HTTP ${res.status}`);
        return (await res.json()) as PvScreeningFile;
      })
      .then((file) => {
        if (active) setPv(file.summary ?? null);
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      active = false;
    };
  }, []);

  /** Spanish uses a decimal comma; the value itself is unchanged. */
  const dec = (s: string) => (locale === "es" ? s.replace(/(\d)\.(\d)/g, "$1,$2") : s);
  const signed: Num = (n, digits = 2) => {
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

  const tested = pv?.irr_cells_tested ?? null;
  const sunReady = pv && tested !== null && pv.irr_cells_significant_down !== undefined && pv.irr_trend_pct_decade_median !== undefined;
  const sunStable = sunReady && pv.irr_cells_significant_down === 0;
  const heatReady = pv && tested !== null && pv.t_cells_significant_up !== undefined && pv.t_trend_c_decade_median !== undefined && pv.heat_penalty_pct_decade_median !== undefined;
  const whereReady = pv && pv.operating_mw_in_good_pct !== undefined;

  return (
    <section aria-label={c.aria} className="panel pointer-events-auto flex h-full min-h-0 w-full flex-col overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-3 pt-3 pb-1">
        <h2 className="text-[14px] font-medium tracking-wide text-ink">{c.title}</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label={f.close}
          className="focus-ring grid size-7 place-items-center rounded-md text-muted hover:bg-white/6 hover:text-ink"
        >
          <Icon name="close" className="size-3.5" />
        </button>
      </div>
      <p className="mx-3 mb-2 text-[12px] leading-snug text-faint">{c.intro}</p>
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
            {error}. {c.missing}
          </p>
        ) : null}
        {!pv && !error ? <p className="text-[13px] text-muted" role="status">{c.loading}</p> : null}

        {whereReady && (
          <Finding
            question={c.qWhere}
            answer={c.aWhere(pv.cells_good, dec(String(pv.operating_mw_in_good_pct)))}
            badge={<VerdictBadge verdict="where" label={c.where} />}
            means={c.mWhere}
            meansLabel={c.meansLabel}
            className="border-sky-300/30 bg-sky-400/5"
          />
        )}

        {sunReady && (
          <Finding
            question={c.qSun}
            answer={c.aSun(tested, signed(pv.irr_trend_pct_decade_median ?? 0))}
            badge={<VerdictBadge verdict={sunStable ? "stable" : "supported"} label={sunStable ? c.stable : c.supported} />}
            means={c.mSun}
            meansLabel={c.meansLabel}
            className="border-emerald-300/30 bg-emerald-400/5"
          />
        )}

        {heatReady && (
          <Finding
            question={c.qHeat}
            answer={c.aHeat(pv.t_cells_significant_up ?? 0, tested, signed(pv.t_trend_c_decade_median ?? 0), signed(pv.heat_penalty_pct_decade_median ?? 0))}
            badge={<VerdictBadge verdict="supported" label={c.supported} />}
            means={c.mHeat}
            meansLabel={c.meansLabel}
            className="border-amber-300/35 bg-amber-400/8"
          />
        )}

        {temp && temp.outcome === "supported_increase" && (
          <Finding
            question={c.qWarm}
            answer={c.aWarm(signed(temp.how_much.slope_per_decade, 1))}
            badge={<VerdictBadge verdict="supported" label={c.supported} />}
            means={c.mWarm}
            meansLabel={c.meansLabel}
            className="border-amber-300/25 bg-amber-400/5"
          />
        )}

        <button
          type="button"
          onClick={onOpenSolar}
          className="focus-ring w-full rounded-md border border-amber-300/40 bg-amber-400/10 px-2 py-1.5 text-[14px] font-medium text-amber-100 hover:bg-amber-400/15"
        >
          {c.openSolar}
        </button>

        <details className="rounded-md border border-line bg-black/20 p-2.5 text-[12px] leading-snug text-muted">
          <summary className="focus-ring cursor-pointer text-[13px] text-ink">{c.showNumbers}</summary>
          <p className="mt-2">{c.method}</p>
          <p className="mt-1 text-faint">{c.penaltyNote}</p>
          <p className="mt-1 text-faint">{c.sourcePv}</p>

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
        </details>

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
