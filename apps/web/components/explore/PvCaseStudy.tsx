"use client";

import type { PvCaseFile, PvCaseOutcome, PvCaseVariable } from "@/lib/globe/pv-case";
import { pvCaseCopy, type PvCaseCopy } from "@/lib/i18n/pv-case-copy";
import { formatScreeningNumber } from "@/lib/i18n/screening-copy";
import type { Locale } from "@/lib/i18n/messages";

const OUTCOME_ICON: Record<PvCaseOutcome, string> = {
  supported_increase: "▲",
  supported_decrease: "▼",
  no_robust_trend: "◇",
  insufficient_evidence: "?",
};

const DIGITS: Record<PvCaseVariable["id"], number> = { ghi: 2, t_summer: 1, hot_days: 0, aod: 3 };
const UNITS: Record<PvCaseVariable["id"], string> = { ghi: "kWh/m²/day", t_summer: "°C", hot_days: "days/yr", aod: "" };

/** Short teaser for the screening overview. */
export function PvCaseTeaser({ locale, onOpen }: { locale: Locale; onOpen: () => void }) {
  const t = pvCaseCopy(locale);
  return (
    <div className="mb-3 rounded-lg border border-sky-400/45 bg-sky-400/10 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-sky-200">{t.teaserHeading}</p>
      <p className="mt-1 text-xs leading-relaxed text-ink">{t.teaserText}</p>
      <button type="button" onClick={onOpen} className="focus-ring mt-2 rounded-md bg-sky-400/20 px-2.5 py-1.5 text-xs font-medium text-sky-100 hover:bg-sky-400/30">
        {t.open}
      </button>
    </div>
  );
}

function DevelopmentChart({ data, t }: { data: PvCaseFile; t: PvCaseCopy }) {
  const first = data.development.annual.find((row) => row.total_phases > 0);
  const rows = first ? data.development.annual.filter((row) => row.year >= first.year) : [];
  const max = Math.max(1, ...rows.map((row) => row.total_phases));
  if (rows.length === 0) return null;
  return (
    <>
      <div className="mt-3 flex h-24 items-end gap-px" role="img" aria-label={t.devHeading}>
        {rows.map((row) => (
          <div key={row.year} className="flex min-w-0 flex-1 flex-col justify-end" style={{ height: `${(row.total_phases / max) * 100}%` }} title={`${row.year}: ${row.explicit_pv_phases} ${t.explicit}, ${row.assumed_pv_phases} ${t.assumed} · Σ ${row.cumulative_reported_phases}`}>
            <span className="block bg-sky-300" style={{ height: row.total_phases ? `${(row.explicit_pv_phases / row.total_phases) * 100}%` : 0 }} />
            <span className="block bg-amber-400/80" style={{ height: row.total_phases ? `${(row.assumed_pv_phases / row.total_phases) * 100}%` : 0 }} />
          </div>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-faint"><span>{rows[0].year}</span><span>{rows[rows.length - 1].year}</span></div>
      <p className="mt-1 text-[10px] text-muted"><span className="text-sky-300">■</span> {t.explicit} <span className="ml-2 text-amber-300">■</span> {t.assumed}</p>
    </>
  );
}

/** Annual points as observed values (no fitted line: the intercept is not exported). */
function Sparkline({ variable, label }: { variable: PvCaseVariable; label: string }) {
  const pts = variable.annual.filter((row): row is { year: number; value: number } => row.value !== null);
  if (pts.length < 2) return null;
  const [y0, y1] = [pts[0].year, pts[pts.length - 1].year];
  const values = pts.map((p) => p.value);
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const x = (year: number) => 4 + ((year - y0) / Math.max(1, y1 - y0)) * 352;
  const y = (v: number) => 30 - ((v - lo) / Math.max(hi - lo, 1e-9)) * 26;
  return (
    <svg viewBox="0 0 360 34" className="mt-1.5 h-9 w-full" role="img" aria-label={label}>
      <polyline points={pts.map((p) => `${x(p.year)},${y(p.value)}`).join(" ")} fill="none" stroke="currentColor" strokeOpacity={0.35} strokeWidth={1} />
      {pts.map((p) => <circle key={p.year} cx={x(p.year)} cy={y(p.value)} r={1.6} fill="currentColor"><title>{`${p.year}: ${p.value}`}</title></circle>)}
    </svg>
  );
}

function VariableRow({ v, locale, t }: { v: PvCaseVariable; locale: Locale; t: PvCaseCopy }) {
  const d = DIGITS[v.id];
  const fmt = (n: number, signed = false) => formatScreeningNumber(locale, n, d === 0 ? 1 : d + 1, signed);
  const pct = v.id === "ghi" && v.slope_pct_per_decade !== undefined && v.ci95_pct_per_decade
    ? ` (${formatScreeningNumber(locale, v.slope_pct_per_decade, 2, true)}%; ${t.ciLabel} ${formatScreeningNumber(locale, v.ci95_pct_per_decade[0], 2)} – ${formatScreeningNumber(locale, v.ci95_pct_per_decade[1], 2)}%)`
    : "";
  const supported = v.outcome === "supported_increase" || v.outcome === "supported_decrease";
  return (
    <li className="rounded-md border border-line px-2.5 py-2">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-xs font-semibold text-ink">{t.variableName[v.id]}</p>
        <p className="shrink-0 text-[10px] text-faint">{t.mean} {formatScreeningNumber(locale, v.mean, d)} {UNITS[v.id]}</p>
      </div>
      <p className="text-[10px] text-faint">{t.variableWhy[v.id]}</p>
      <div className="text-sky-200"><Sparkline variable={v} label={`${t.variableName[v.id]}, ${v.period[0]}–${v.period[1]}`} /></div>
      {v.slope_per_decade !== null && v.ci95_per_decade && (
        <p className="font-mono text-[11px] tabular-nums text-ink">
          {fmt(v.slope_per_decade, true)} {UNITS[v.id]} {t.perDecade}{pct} · {t.ciLabel} {fmt(v.ci95_per_decade[0])} – {fmt(v.ci95_per_decade[1])}
        </p>
      )}
      <p className={`mt-1 text-[11px] font-semibold ${supported ? "text-emerald-200" : "text-amber-200"}`}>
        <span aria-hidden>{OUTCOME_ICON[v.outcome]} </span>{t.outcome[v.outcome]}
        {v.q_bh !== null && <span className="font-normal text-faint"> · {t.qLabel} {formatScreeningNumber(locale, v.q_bh, 3)} · n = {v.complete_years}</span>}
      </p>
    </li>
  );
}

export function PvCaseStudy({ data, locale }: { data: PvCaseFile; locale: Locale }) {
  const t = pvCaseCopy(locale);
  const dev = data.development;
  const dated = dev.annual.filter((row) => row.total_phases > 0);
  const classes = dev.operating_miteco_class_phases;
  const lowModerate = (classes["3"] ?? 0) + (classes["4"] ?? 0);
  const vars = data.climate.variables;
  const period = vars[0]?.period;
  const noneSupported = vars.length > 0 && vars.every((v) => v.outcome === "no_robust_trend");
  return (
    <section className="mt-3 rounded-lg border border-sky-400/40 bg-sky-400/5 p-3" aria-label={t.heading}>
      <h3 className="text-xs font-semibold text-sky-100">{t.heading}</h3>
      <p className="mt-1 text-[11px] leading-relaxed text-muted">{t.selection}</p>

      <div className="mt-3 rounded-md border border-line bg-white/3 p-2.5">
        <h4 className="text-xs font-semibold text-ink">{t.devHeading}</h4>
        {dated.length > 0 && (
          <p className="mt-1.5 text-sm font-semibold leading-relaxed text-sky-200">
            {t.devFinding(dev.summary.operating_pv_phases, dev.operating_locations, dated[0].year, dated[dated.length - 1].year)}
          </p>
        )}
        <DevelopmentChart data={data} t={t} />
        <p className="mt-2 text-[11px] leading-relaxed text-muted">{t.devHowToRead}</p>
        <p className="mt-2 text-[11px] leading-relaxed text-muted">
          {t.devStats(dev.exact_location_phases, dev.summary.operating_pv_phases, lowModerate, classes["0"] ?? 0, dev.pipeline.construction, dev.pipeline["pre-construction"])}
        </p>
        <details className="mt-2 text-[11px]">
          <summary className="focus-ring cursor-pointer text-muted hover:text-ink">{t.mwByRating}</summary>
          <ul className="mt-1 space-y-0.5 font-mono tabular-nums text-ink">
            {Object.entries(dev.operating_mw_by_rating).map(([basis, mw]) => <li key={basis}>{basis}: {formatScreeningNumber(locale, mw, 1)} MW</li>)}
          </ul>
          <p className="mt-1 text-[10px] text-faint">{t.mwNote}</p>
        </details>
        <div className="mt-2 rounded-md border border-amber-400/35 bg-amber-400/5 px-2 py-1.5" role="status">
          <p className="text-[11px] font-semibold text-amber-200">◇ {t.devOutcome}</p>
          <p className="mt-0.5 text-[10px] leading-relaxed text-muted">{t.devOutcomeMeaning}</p>
        </div>
      </div>

      <div className="mt-3">
        <h4 className="text-xs font-semibold text-ink">{t.climateHeading}</h4>
        {period && <p className="mt-1 text-[11px] leading-relaxed text-muted">{t.climateIntro(period[0], period[1])}</p>}
        <ul className="mt-2 space-y-2">
          {vars.map((v) => <VariableRow key={v.id} v={v} locale={locale} t={t} />)}
        </ul>
        {noneSupported && <p className="mt-2 rounded-md bg-white/5 px-2.5 py-2 text-[11px] leading-relaxed text-ink">{t.climateTakeaway}</p>}
      </div>

      <div className="mt-3 rounded-md border border-line px-2.5 py-2">
        <p className="text-[10px] tracking-[0.1em] text-faint uppercase">{t.limitsHeading}</p>
        <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[11px] leading-snug text-muted">
          {t.limits.map((item) => <li key={item}>{item}</li>)}
        </ul>
      </div>
      <p className="mt-2 text-[10px] leading-relaxed text-faint">
        {t.source}: {data.climate.source.name} {data.climate.source.api_version ?? ""} · {data.climate.source.spatial_support} · GEM Global Solar Power Tracker, Feb 2026 (CC BY 4.0) · MITECO 2024.
      </p>
    </section>
  );
}
