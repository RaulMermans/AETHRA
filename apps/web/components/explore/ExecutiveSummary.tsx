"use client";

import { useMemo } from "react";
import type { PvScreeningData } from "@/lib/globe/pv-screening";
import { executiveCopy, type ExecTile, type ExecTone } from "@/lib/i18n/executive-copy";
import { formatScreeningNumber } from "@/lib/i18n/screening-copy";
import type { Locale } from "@/lib/i18n/messages";
import { ReadAloudButton } from "@/components/a11y/ReadAloudButton";
import { blindCopy } from "@/lib/i18n/a11y-blind-copy";

const TONE: Record<ExecTone, { ring: string; number: string; dot: string }> = {
  positive: { ring: "border-emerald-400/35 bg-emerald-400/[0.06]", number: "text-emerald-100", dot: "bg-emerald-300" },
  caution: { ring: "border-amber-400/35 bg-amber-400/[0.06]", number: "text-amber-100", dot: "bg-amber-300" },
  neutral: { ring: "border-sky-400/25 bg-sky-400/[0.05]", number: "text-sky-100", dot: "bg-sky-300" },
  missing: { ring: "border-line bg-white/[0.03]", number: "text-muted", dot: "bg-slate-400" },
};

/** Bar strip of published values (no smoothing, no fitted line: render, don't compute). */
function Strip({ series, locale, label }: { series: NonNullable<ExecTile["series"]>; locale: Locale; label: string }) {
  const max = Math.max(...series.values, 0) || 1;
  const first = series.years[0];
  const last = series.years[series.years.length - 1];
  return (
    <div className="mt-2" role="img" aria-label={`${label}: ${first}–${last}`}>
      <div className="flex h-8 items-end gap-px">
        {series.values.map((v, i) => (
          <span
            key={series.years[i]}
            className="min-w-0 flex-1 rounded-t-[1px] bg-white/35"
            style={{ height: `${Math.max(2, (v / max) * 100)}%` }}
            title={`${series.years[i]}: ${formatScreeningNumber(locale, v, v < 1 ? 3 : 0)} ${series.unit}`}
          />
        ))}
      </div>
      <div className="mt-0.5 flex justify-between text-[9px] text-faint tabular-nums">
        <span>{first}</span>
        <span>{last}</span>
      </div>
    </div>
  );
}

function Tile({ tile, index, locale, howLabel, decisionLabel, sourceLabel }: { tile: ExecTile; index: number; locale: Locale; howLabel: string; decisionLabel: string; sourceLabel: string }) {
  const tone = TONE[tile.tone];
  const speech = [`${tile.label}.`, tile.value, tile.valueNote ?? "", `${tile.meaning}`, `${decisionLabel}: ${tile.hint}`].filter(Boolean).join(" ");
  return (
    <li className={`relative rounded-lg border ${tone.ring}`}>
      {/* Outside <summary>: a button inside it would be a nested interactive control. */}
      <ReadAloudButton text={speech} what={blindCopy(locale).tileCard(tile.label)} className="absolute top-1.5 right-1.5 z-[1] !size-6" />
      <details className="group">
        <summary className="focus-ring block cursor-pointer list-none rounded-lg py-2.5 pr-9 pl-3 [&::-webkit-details-marker]:hidden">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.1em] text-faint uppercase">
            <span aria-hidden className="tabular-nums">{index + 1}</span>
            <span aria-hidden className={`size-1.5 rounded-full ${tone.dot}`} />
            <span className="min-w-0 truncate">{tile.label}</span>
            <span aria-hidden className="ml-auto text-[10px] normal-case tracking-normal text-faint transition-transform group-open:rotate-90">›</span>
          </div>
          <div className="mt-1 flex flex-wrap items-baseline gap-x-2">
            <span className={`font-mono text-xl leading-tight font-semibold tabular-nums ${tone.number}`}>{tile.value}</span>
            {tile.valueNote && <span className="text-[11px] leading-tight text-muted">{tile.valueNote}</span>}
          </div>
          <p className="mt-1 text-xs leading-relaxed text-ink">{tile.meaning}</p>
          {tile.series && tile.series.values.length > 1 && <Strip series={tile.series} locale={locale} label={tile.label} />}
          <p className="mt-1.5 flex gap-1.5 text-[11px] leading-snug text-muted">
            <span className="shrink-0 font-semibold text-ink">→ {decisionLabel}:</span>
            <span>{tile.hint}</span>
          </p>
          <span className="mt-1 inline-block text-[10px] text-accent group-open:hidden">{howLabel} ›</span>
        </summary>
        <div className="border-t border-line px-3 py-2 text-[11px] leading-snug">
          <p className="text-[10px] font-semibold tracking-[0.1em] text-faint uppercase">{howLabel}</p>
          <p className="mt-1 text-muted">{tile.how.method}</p>
          {tile.how.rows.length > 0 && (
            <dl className="mt-1.5 space-y-1">
              {tile.how.rows.map((r) => (
                <div key={r.label}>
                  <dt className="text-faint">{r.label}</dt>
                  <dd className="font-mono text-[10.5px] break-words text-ink tabular-nums">{r.value}</dd>
                </div>
              ))}
            </dl>
          )}
          <p className="mt-1.5 text-faint">
            {sourceLabel}:{" "}
            {tile.how.sourceUrl ? (
              <a className="underline hover:text-ink" href={tile.how.sourceUrl} target="_blank" rel="noreferrer">{tile.how.source}</a>
            ) : (
              tile.how.source
            )}
          </p>
        </div>
      </details>
    </li>
  );
}

export function ExecutiveSummary({ data, locale }: { data: PvScreeningData; locale: Locale }) {
  const copy = executiveCopy(locale);
  const tiles = useMemo(() => {
    const screening = data.screening;
    if (!screening) return [];
    const featured = screening.cells.find((cell) => cell.id === screening.featured_case?.cell_id) ?? null;
    const validation = screening.regions_validation?.find((r) => r.region === "Andalucía") ?? screening.regions_validation?.[0] ?? null;
    return executiveCopy(locale).tiles({
      screening,
      featured,
      tTested: screening.cells.filter((cell) => cell.t_p_bh !== null).length,
      capacity: data.capacity ?? null,
      dust: data.dust,
      validation,
    });
  }, [data, locale]);
  if (tiles.length === 0) return null;
  return (
    <section aria-labelledby="exec-summary-heading" className="mb-4">
      <h3 id="exec-summary-heading" className="text-[11px] font-semibold tracking-[0.12em] text-ink uppercase">{copy.heading}</h3>
      <p className="mt-0.5 mb-2 text-[11px] text-faint">{copy.intro}</p>
      <ol className="space-y-2">
        {tiles.map((tile, i) => (
          <Tile key={tile.id} tile={tile} index={i} locale={locale} howLabel={copy.howWeKnow} decisionLabel={copy.decision} sourceLabel={copy.sourceLabel} />
        ))}
      </ol>
      <details className="mt-2 rounded-md border border-line px-2.5 py-1.5 text-[11px]">
        <summary className="focus-ring cursor-pointer text-muted hover:text-ink">{copy.glossaryHeading}</summary>
        <dl className="mt-1.5 space-y-1">
          {copy.glossary.map((g) => (
            <div key={g.term}>
              <dt className="inline font-semibold text-ink">{g.term}: </dt>
              <dd className="inline text-muted">{g.text}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-1.5 text-faint">{copy.status}</p>
      </details>
      <p className="mt-2 text-[11px] text-muted">{copy.checkSeparately}</p>
    </section>
  );
}
