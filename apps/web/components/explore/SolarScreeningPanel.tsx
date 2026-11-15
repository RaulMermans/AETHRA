"use client";

import { useEffect, useId, useMemo, useState, type ReactNode } from "react";
import { useLocale } from "@/lib/i18n/locale";
import { ReadAloudButton } from "@/components/a11y/ReadAloudButton";
import { usePanelFocus } from "@/components/a11y/usePanelFocus";
import { blindCopy } from "@/lib/i18n/a11y-blind-copy";
import { ExecutiveSummary } from "./ExecutiveSummary";
import { formatScreeningNumber, screeningCopy, type Bullet } from "@/lib/i18n/screening-copy";
import { plantsUpToYear, screeningPlants, type ScreeningToggles } from "@/lib/globe/cesium/screening-layers";
import { PvCaseStudy, PvCaseTeaser } from "./PvCaseStudy";
import type { PvCaseFile } from "@/lib/globe/pv-case";
import { MITECO_FALLBACK_COLORS, VERDICT_COLORS, type GiovanniDustFile, type PvCell, type PvHistoryFile, type PvHistoryYear, type PvScreeningData, type PvVerdict, type SolarPlant } from "@/lib/globe/pv-screening";

// IGN ETRS89 geodetic vertices inside r20c23; geographic references, not PV candidate parcels.
const CASE_PLACES = [
  { name: "Jabalcuz", province: "Jaén", lat: 37.737413, lon: -3.843343, source: "https://datos-geodesia.ign.es/Red_Geodesica/Hoja0947/094704.pdf" },
  { name: "Cerro La Torre", province: "Jaén", lat: 37.443090, lon: -3.972519, source: "https://datos-geodesia.ign.es/Red_Geodesica/Hoja0990/099066.pdf" },
  { name: "Cerro Cazuela", province: "Granada", lat: 37.356590, lon: -3.970614, source: "https://datos-geodesia.ign.es/Red_Geodesica/Hoja0990/099061.pdf" },
  { name: "Monte Ágreda", province: "Granada", lat: 37.379291, lon: -3.894583, source: "https://datos-geodesia.ign.es/Red_Geodesica/Hoja0990/099082.pdf" },
] as const;

/** Sun glyph (the shared Icon set has none). */
export function SunGlyph({ className = "size-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" className={className} aria-hidden>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}

/** Heading of the open zone card: focused when a zone is chosen from "Map in words". */
export const ZONE_CARD_HEADING_ID = "solar-zone-card-heading";

const VERDICT_MARK: Record<PvVerdict, string> = { good: "✓", mixed: "~", avoid: "✕", no_data: "–" };

function VerdictSwatch({ verdict, size = "size-4" }: { verdict: PvVerdict; size?: string }) {
  const color = verdict === "no_data" ? "#64748b" : VERDICT_COLORS[verdict];
  return (
    <span
      aria-hidden
      className={`${size} grid shrink-0 place-items-center rounded-[4px] text-[10px] leading-none font-bold text-black/80`}
      style={{ background: `${color}cc`, boxShadow: `inset 0 0 0 1px ${color}` }}
    >
      {VERDICT_MARK[verdict]}
    </span>
  );
}

function BulletIcon({ icon }: { icon: Bullet["icon"] }) {
  const paths: Record<Bullet["icon"], ReactNode> = {
    sun: <SunGlyph className="size-3.5" />,
    trend: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="size-3.5" aria-hidden>
        <path d="M3 17l6-6 4 4 8-8M15 7h6v6" />
      </svg>
    ),
    heat: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="size-3.5" aria-hidden>
        <path d="M10 14.5V6a2 2 0 1 1 4 0v8.5a3.5 3.5 0 1 1-4 0z" />
      </svg>
    ),
    leaf: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="size-3.5" aria-hidden>
        <path d="M5 19c8-1 13-8 14-14-6 1-13 6-14 14zM5 19c3-3 7-5 11-6" />
      </svg>
    ),
  };
  return <span className="mt-0.5 shrink-0 text-muted">{paths[icon]}</span>;
}

function Toggle({ on, label, hint, disabled, onChange }: { on: boolean; label: string; hint: string; disabled?: boolean; onChange: () => void }) {
  return (
    <label className={`flex items-start gap-2.5 rounded-md px-1.5 py-1.5 ${disabled ? "opacity-45" : "cursor-pointer hover:bg-white/5"}`}>
      <input type="checkbox" className="peer sr-only" checked={on} disabled={disabled} onChange={onChange} />
      <span
        aria-hidden
        className={`relative mt-0.5 h-4 w-7 shrink-0 rounded-full transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-accent ${
          on ? "bg-accent/70" : "bg-white/15"
        }`}
      >
        <span className={`absolute top-0.5 size-3 rounded-full bg-white transition-all ${on ? "left-3.5" : "left-0.5"}`} />
      </span>
      <span className="min-w-0">
        <span className="block text-[13px] leading-tight text-ink">{label}</span>
        <span className="block text-[11px] leading-snug text-faint">{hint}</span>
      </span>
    </label>
  );
}

export function SolarScreeningPanel({
  data,
  loading,
  toggles,
  onToggle,
  selectedCell,
  plantYear,
  onPlantYear,
  selectedPlant,
  onClearSelection,
  onSelectFeatured,
  onClose,
  selectedCellName,
}: {
  data: PvScreeningData | null;
  loading: boolean;
  toggles: ScreeningToggles;
  onToggle: (key: keyof ScreeningToggles) => void;
  selectedCell: PvCell | null;
  plantYear: number | null;
  onPlantYear: (year: number | null) => void;
  selectedPlant: SolarPlant | null;
  onClearSelection: () => void;
  onSelectFeatured: (cellId: string) => void;
  onClose: () => void;
  /** Plain-language place of the selected zone (province), read aloud with its card. */
  selectedCellName?: string | null;
}) {
  const { locale } = useLocale();
  const t = screeningCopy(locale);
  const headingId = useId();
  const { panelRef, headingRef, onKeyDown } = usePanelFocus<HTMLElement>(onClose);
  // "Back to summary" removes the card that held focus: keep keyboard users in the panel.
  const backToSummary = () => {
    onClearSelection();
    window.setTimeout(() => headingRef.current?.focus({ preventScroll: true }), 0);
  };
  const s = data?.screening ?? null;
  const featuredCase = s?.featured_case;
  const featuredCell = s?.cells.find((cell) => cell.id === featuredCase?.cell_id);
  const period: [number, number] = s?.period ?? [2000, 2025];
  const mitecoColor = (v: number) => data?.miteco?.classes.find((c) => c.value === v)?.color ?? MITECO_FALLBACK_COLORS[v] ?? "#64748b";

  return (
    <section
      ref={panelRef}
      aria-labelledby={headingId}
      onKeyDown={onKeyDown}
      data-testid="solar-panel"
      className="panel pointer-events-auto flex h-full min-h-0 w-full flex-col overflow-hidden p-4"
    >
      <div className="flex shrink-0 items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 id={headingId} ref={headingRef} tabIndex={-1} className="focus-ring flex items-center gap-2 rounded-sm text-sm text-ink">
            <SunGlyph className="size-4 text-amber-300" />
            {t.title}
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={t.close}
          className="focus-ring grid size-7 shrink-0 place-items-center rounded-md text-muted hover:bg-white/6 hover:text-ink"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="size-3.5" aria-hidden>
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>

      {/* Technology: Solar PV active; others shown so the analyst knows they are planned. */}
      <div role="group" aria-label={t.technology} className="mt-3 flex shrink-0 flex-wrap gap-1.5">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/15 px-2.5 py-1 text-xs text-amber-100 shadow-[inset_0_0_0_1px_rgb(251_191_36/0.4)]" aria-current="true">
          <SunGlyph className="size-3.5" />
          {t.techSolar}
        </span>
        {[t.techHydro, t.techWind].map((name) => (
          <span key={name} aria-disabled="true" className="inline-flex cursor-not-allowed items-center gap-1 rounded-full border border-line px-2.5 py-1 text-xs text-faint">
            {name} <span className="text-[9px] tracking-wider uppercase">{t.comingSoon}</span>
          </span>
        ))}
      </div>

      <div className="mt-3 min-h-0 flex-1 overflow-x-hidden overflow-y-auto pr-0.5">
        {loading && !data ? (
          <p className="text-xs text-muted" role="status">{t.loading}</p>
        ) : !s && !selectedPlant ? (
          <div className="rounded-lg border border-line bg-white/3 p-3">
            <p className="text-[13px] text-ink">{t.notAvailable}</p>
            <p className="mt-1 text-[11px] leading-snug text-faint">{t.notAvailableHint}</p>
          </div>
        ) : selectedPlant ? (
          <PlantCard plant={selectedPlant} t={t} mitecoColor={mitecoColor} onBack={backToSummary} />
        ) : selectedCell && s ? (
          <CellCard cell={selectedCell} pvCase={data?.sevillaCase ?? null} featuredCaseId={featuredCase?.cell_id} dust={data?.dust ?? null} locale={locale} t={t} period={period} method={s.method} sources={s.sources ?? []} onBack={backToSummary} zoneName={selectedCellName ?? null} />
        ) : s ? (
          <div className="space-y-1.5 text-[13px] leading-snug text-ink">
            {data && <ExecutiveSummary data={data} locale={locale} />}
            {data?.sevillaCase && <PvCaseTeaser locale={locale} onOpen={() => onSelectFeatured(data.sevillaCase?.cell_id ?? "")} />}
            {featuredCase && featuredCell && (
              <div className="mb-3 rounded-lg border border-emerald-400/45 bg-emerald-400/10 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-200">{t.featuredHeading}</p>
                <p className="mt-1 text-[11px] text-faint">{t.cellLabel(featuredCell)} · {t.featuredCenter}</p>
                <dl className="mt-2 grid grid-cols-2 gap-2">
                  <div><dt className="text-[10px] leading-tight text-faint">{t.featuredSunLabel}</dt><dd className="mt-1 font-mono text-base tabular-nums text-ink">{featuredCell.irr_mean_kwh_m2_day === null ? "—" : `${formatScreeningNumber(locale, featuredCell.irr_mean_kwh_m2_day, 2)} ${t.featuredSunUnit}`}</dd></div>
                  <div><dt className="text-[10px] leading-tight text-faint">{t.featuredEnvLabel}</dt><dd className="mt-1 font-mono text-base tabular-nums text-ink">{featuredCell.miteco_low_moderate_pct === null ? "—" : `${formatScreeningNumber(locale, featuredCell.miteco_low_moderate_pct, 1)}%`}</dd></div>
                </dl>
                <p className="mt-1.5 text-[11px] leading-relaxed text-muted">{t.featuredSunMeaning}</p>
                <p className="mt-1 text-[11px] leading-relaxed text-muted">{t.featuredEnvMeaning}</p>
                <p className="mt-1 text-xs leading-relaxed text-ink">
                  {t.featuredNarrative(
                    featuredCase.place,
                    featuredCase.green_cells_with_more_irradiance,
                    featuredCase.green_cells_with_more_low_moderate_land,
                    featuredCase.green_cells_better_on_both,
                    featuredCase.green_cells_compared,
                  )}
                </p>
                <ul className="mt-2 space-y-1.5 text-[11px] leading-relaxed text-muted">
                  {t.bullets(featuredCell).filter((bullet) => bullet.icon === "trend" || bullet.icon === "heat").map((bullet) => (
                    <li key={bullet.icon} className="flex gap-2"><BulletIcon icon={bullet.icon} /><span>{bullet.text}</span></li>
                  ))}
                </ul>
                <p className="mt-2 text-[11px] leading-relaxed text-muted">{t.environmentalMeaning}</p>
                <div className="mt-3 rounded-md border border-line px-2.5 py-2">
                  <p className="text-[11px] font-semibold text-ink">{t.placeReferenceHeading}</p>
                  <ul className="mt-1.5 space-y-1 text-[11px] leading-snug text-muted">
                    {CASE_PLACES.map((place) => (
                      <li key={place.name}>{place.name} ({place.province}) · {place.lat.toFixed(6)}°, {place.lon.toFixed(6)}° · <a className="underline hover:text-ink" href={place.source} target="_blank" rel="noreferrer">{t.placeSource}</a></li>
                    ))}
                  </ul>
                  <p className="mt-1.5 text-[10px] leading-snug text-faint">{t.placeReferenceNote}</p>
                </div>
                <button type="button" onClick={() => onSelectFeatured(featuredCase.cell_id)} className="focus-ring mt-2 rounded-md bg-emerald-400/20 px-2.5 py-1.5 text-xs font-medium text-emerald-100 hover:bg-emerald-400/30">
                  {t.featuredAction}
                </button>
                <p className="mt-2 text-[11px] text-faint">{t.featuredLimit}</p>
                {data?.dust?.featured_cell.id === featuredCase.cell_id && (
                  <DustContext dust={data.dust} locale={locale} t={t} />
                )}
                {!data?.dust && <p className="mt-2 text-[11px] text-amber-200" role="status">{t.dustUnavailable}</p>}
                {data?.history && data.history.featured_cell.id === featuredCase.cell_id && (
                  <HistoryContext history={data.history} t={t} />
                )}
              </div>
            )}
            <p>
              <VerdictInline verdict="good" /> {t.summaryGood(s.summary.cells_good, s.summary.good_regions?.slice(0, 3).join(", "))}
            </p>
            <p className="text-muted">{t.summaryRest(s.summary.cells_mixed, s.summary.cells_avoid)}</p>
            {s.summary.operating_mw_in_good_pct !== undefined && (
              <p className="text-muted">{t.summaryMw(s.summary.operating_mw_in_good_pct, s.summary.operating_mw_in_avoid_pct)}</p>
            )}
            <p className="text-[11px] text-faint">{t.summaryBasis(period[0], period[1])}</p>
            <p className="mt-2 rounded-md bg-white/5 px-2 py-1.5 text-xs text-accent">{t.clickHint}</p>
          </div>
        ) : null}

        <div className="mt-4 border-t border-line pt-3">
          <h3 className="mb-1 text-[10px] tracking-[0.12em] text-faint uppercase">{t.layersHeading}</h3>
          <Toggle on={toggles.cells} label={t.toggleCells} hint={s ? t.toggleCellsHint : t.notAvailable} disabled={!s} onChange={() => onToggle("cells")} />
          <Toggle on={toggles.miteco} label={t.toggleMiteco} hint={data?.miteco ? t.toggleMitecoHint : t.mitecoMissing} disabled={!data?.miteco} onChange={() => onToggle("miteco")} />
          <Toggle
            on={toggles.plants}
            label={t.togglePlants}
            hint={data?.plants || s?.landmarks?.length ? t.togglePlantsHint : t.plantsMissing}
            disabled={!data?.plants && !s?.landmarks?.length}
            onChange={() => onToggle("plants")}
          />
          {toggles.plants && data?.plants && (
            <PlantChronology data={data} year={plantYear} onYear={onPlantYear} t={t} locale={locale} />
          )}
        </div>

        <ul className="mt-3 space-y-1.5 border-t border-line pt-3 text-xs text-ink" aria-label="Legend">
          {(["good", "mixed", "avoid"] as const).map((v) => (
            <li key={v} className="flex items-center gap-2">
              <VerdictSwatch verdict={v} />
              {v === "good" ? t.legendGood : v === "mixed" ? t.legendMixed : t.legendAvoid}
            </li>
          ))}
          <li className="pt-1 text-[10px] leading-snug text-faint">{t.legendNote}</li>
        </ul>
        <details className="mt-3 border-t border-line pt-3 text-xs text-ink">
          <summary className="focus-ring cursor-pointer text-muted hover:text-ink">{t.markerHeading}</summary>
          <ul className="mt-2 space-y-1.5 text-[11px] leading-snug text-muted">
            <li>● {t.markerOperating}</li>
            <li>○ {t.markerConstruction}</li>
            <li><span className="text-amber-300">●</span> {t.markerLandmark}</li>
            <li>{t.markerOther}</li>
          </ul>
        </details>
      </div>
    </section>
  );
}

const CHRONO_FIRST_YEAR = 2000;
const CHRONO_LAST_YEAR = 2025; // last complete year; later start years are planned construction dates
const CHRONO_SPIKE_YEAR = 2017;
/** Rightmost slider notch, one past the last year: shows all phases, including undated and planned ones. */
const CHRONO_ALL_NOTCH = CHRONO_LAST_YEAR + 1;
const CHRONO_STEP_MS = 900;

/**
 * Year control for the solar plant points (D85): shows registered phases whose GEM start year is
 * at most the chosen year. Counts are of drawn points only; no growth rate is computed.
 */
function PlantChronology({ data, year, onYear, t, locale }: { data: PvScreeningData; year: number | null; onYear: (year: number | null) => void; t: Copy; locale: Language }) {
  const [playing, setPlaying] = useState(false);
  const all = useMemo(() => screeningPlants(data), [data]);
  const undated = useMemo(() => all.filter(({ plant }) => typeof plant.start_year !== "number").length, [all]);
  const shown = useMemo(() => plantsUpToYear(all, year).length, [all, year]);
  const spike = data.history?.annual.find((row) => row.year === CHRONO_SPIKE_YEAR)?.total_phases ?? null;
  // Official national installed PV capacity (Eurostat, rendered as published; MW).
  const official = data.capacity?.spain ?? null;
  const officialIdx = year === null || !official ? -1 : official.years.indexOf(year);
  const officialMw = officialIdx >= 0 ? official?.mw[officialIdx] : undefined;

  useEffect(() => {
    if (!playing) return;
    const id = window.setTimeout(() => {
      if (year !== null && year >= CHRONO_LAST_YEAR) {
        setPlaying(false);
        return;
      }
      onYear(year === null ? CHRONO_FIRST_YEAR : year + 1);
    }, year === null ? 0 : CHRONO_STEP_MS);
    return () => window.clearTimeout(id);
  }, [playing, year, onYear]);

  return (
    <div className="mt-1 ml-1.5 rounded-md border border-line bg-white/3 p-2.5" role="group" aria-label={t.chronoHeading}>
      <p className="text-[11px] font-semibold text-ink">{t.chronoHeading}</p>
      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          onClick={() => {
            if (!playing && year !== null && year >= CHRONO_LAST_YEAR) onYear(CHRONO_FIRST_YEAR);
            setPlaying((p) => !p);
          }}
          aria-label={playing ? t.chronoPause : t.chronoPlay}
          aria-pressed={playing}
          className="focus-ring grid size-7 shrink-0 place-items-center rounded-full bg-amber-400/20 text-amber-100 hover:bg-amber-400/30"
        >
          {playing ? (
            <svg viewBox="0 0 24 24" fill="currentColor" className="size-3.5" aria-hidden><path d="M7 5h4v14H7zM13 5h4v14h-4z" /></svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="currentColor" className="size-3.5" aria-hidden><path d="M8 5v14l11-7z" /></svg>
          )}
        </button>
        <input
          type="range"
          min={CHRONO_FIRST_YEAR}
          max={CHRONO_ALL_NOTCH}
          step={1}
          value={year ?? CHRONO_ALL_NOTCH}
          onChange={(e) => {
            setPlaying(false);
            const v = Number(e.target.value);
            onYear(v > CHRONO_LAST_YEAR ? null : v);
          }}
          aria-label={t.chronoSlider}
          aria-valuetext={year === null ? t.chronoAll : String(year)}
          className="focus-ring min-w-0 flex-1 accent-amber-300"
        />
        <span className="w-10 shrink-0 text-right font-mono text-xs tabular-nums text-ink">{year ?? t.chronoAll}</span>
        <button
          type="button"
          onClick={() => {
            setPlaying(false);
            onYear(null);
          }}
          aria-pressed={year === null}
          className={`focus-ring shrink-0 rounded-md px-2 py-1 text-[11px] ${year === null ? "bg-white/12 text-ink" : "text-muted hover:bg-white/6 hover:text-ink"}`}
        >
          {t.chronoAll}
        </button>
      </div>
      <p className="mt-2 text-[11px] leading-snug text-muted" role="status" aria-live="polite">
        {year === null ? t.chronoAllShown(all.length) : t.chronoShown(shown, year)}
      </p>
      {year !== null && undated > 0 && <p className="mt-1 text-[10px] leading-snug text-faint">{t.chronoUndated(undated)}</p>}
      {year !== null && official && (
        <p className="mt-1.5 rounded-md bg-sky-400/10 px-2 py-1.5 text-[11px] leading-snug text-sky-100">
          {typeof officialMw === "number"
            ? t.chronoOfficial(year, Math.round(officialMw).toLocaleString(locale === "es" ? "es" : "en"))
            : t.chronoOfficialMissing(year, official.latest.year)}
        </p>
      )}
      {year !== null && year >= CHRONO_SPIKE_YEAR && (
        <p className="mt-1.5 flex gap-1.5 text-[10px] leading-snug text-amber-200"><span aria-hidden>▲</span><span>{t.chronoSpike(spike)}</span></p>
      )}
      <p className="mt-1.5 text-[10px] leading-snug text-faint">{t.chronoLimit}</p>
    </div>
  );
}

function VerdictInline({ verdict }: { verdict: PvVerdict }) {
  return (
    <span className="mr-0.5 inline-block align-[-3px]">
      <VerdictSwatch verdict={verdict} size="size-3.5" />
    </span>
  );
}

type Copy = ReturnType<typeof screeningCopy>;
type Language = "en" | "es";

function DustContext({ dust, locale, t }: { dust: GiovanniDustFile; locale: Language; t: Copy }) {
  const years = dust.featured_cell.annual.length;
  return (
    <div className="mt-3 rounded-md border border-sky-400/25 bg-sky-400/5 px-2.5 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-sky-200">{t.dustHeading}</p>
      <p className="mt-1 text-[11px] leading-relaxed text-muted">{t.dustMeaning(formatScreeningNumber(locale, dust.featured_cell.mean_aot_2000_2025, 3), years)}</p>
      <p className="mt-1 text-[10px] text-faint">{dust.period[0]}–{dust.period[1]} · {t.dustSource} <a className="underline hover:text-ink" href="https://doi.org/10.5067/FH9A0MLJPC7N" target="_blank" rel="noreferrer">10.5067/FH9A0MLJPC7N</a></p>
    </div>
  );
}

function HistoryBars({ rows, period, label, t }: { rows: readonly PvHistoryYear[]; period: readonly [number, number]; label: string; t: Copy }) {
  const maxCount = Math.max(1, ...rows.map((row) => row.total_phases));
  return (
    <>
      <div className="mt-3 flex h-24 items-end gap-px" role="img" aria-label={label}>
        {rows.map((row) => (
          <div key={row.year} className="flex min-w-0 flex-1 flex-col justify-end" style={{ height: `${(row.total_phases / maxCount) * 100}%` }} title={`${row.year}: ${row.explicit_pv_phases} ${t.historyExplicit}, ${row.assumed_pv_phases} ${t.historyAssumed}`}>
            <span className="block bg-sky-300" style={{ height: row.total_phases ? `${(row.explicit_pv_phases / row.total_phases) * 100}%` : 0 }} />
            <span className="block bg-amber-400/80" style={{ height: row.total_phases ? `${(row.assumed_pv_phases / row.total_phases) * 100}%` : 0 }} />
          </div>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-faint"><span>{period[0]}</span><span>{period[1]}</span></div>
      <p className="mt-2 text-[10px] text-muted"><span className="text-sky-300">■</span> {t.historyExplicit} <span className="ml-2 text-amber-300">■</span> {t.historyAssumed}</p>
    </>
  );
}

function FeaturedHistoryChart({ rows, label, t }: { rows: readonly PvHistoryYear[]; label: string; t: Copy }) {
  const maxCount = Math.max(1, ...rows.map((row) => row.cumulative_reported_phases));
  return (
    <div className="mt-3 grid gap-1" style={{ gridTemplateColumns: `repeat(${rows.length}, minmax(0, 1fr))` }} role="img" aria-label={label}>
      {rows.map((row) => (
        <div key={row.year} className="flex min-w-0 flex-col items-center text-center tabular-nums" title={`${row.year}: ${row.total_phases} ${t.historyTableAdded.toLowerCase()}, ${row.cumulative_reported_phases} ${t.historyTableCumulative.toLowerCase()}`}>
          <span className="text-[10px] font-semibold text-ink">{row.cumulative_reported_phases}</span>
          <div className="mt-1 flex h-24 w-full items-end rounded-sm bg-white/5">
            <div className="w-full rounded-t-sm bg-sky-300" style={{ height: `${(row.cumulative_reported_phases / maxCount) * 100}%` }} />
          </div>
          <span className="mt-1 text-[10px] text-muted">{row.year}</span>
        </div>
      ))}
    </div>
  );
}

function HistoryContext({ history, t }: { history: PvHistoryFile; t: Copy }) {
  const firstDated = history.featured_cell.annual.find((row) => row.total_phases > 0);
  const chartRows = firstDated ? history.featured_cell.annual.filter((row) => row.year >= firstDated.year) : [];
  const lastDated = chartRows[chartRows.length - 1];
  return (
    <section className="mt-3 rounded-lg border border-line bg-white/3 p-3" aria-label={t.historyHeading}>
      <h3 className="text-xs font-semibold text-ink">{t.historyHeading}</h3>
      {firstDated && lastDated && <p className="mt-2 text-sm font-semibold leading-relaxed text-sky-200">{t.historyFinding(firstDated.year, firstDated.cumulative_reported_phases, lastDated.year, lastDated.cumulative_reported_phases)}</p>}
      <p className="mt-2 text-[11px] leading-relaxed text-muted">{t.historyHowToRead}</p>
      {chartRows.length > 0 && <FeaturedHistoryChart rows={chartRows} label={t.historyHeading} t={t} />}
      <p className="mt-2 text-[11px] leading-relaxed text-muted">{t.historyFeatured(history.featured_cell.summary.operating_pv_phases, history.featured_cell.summary.assumed_pv_phases)}</p>
      <details className="mt-2 text-[11px]"><summary className="focus-ring cursor-pointer text-muted hover:text-ink">{t.details}</summary>
        <table className="mt-2 w-full text-left tabular-nums"><thead><tr><th>{t.historyTableYear}</th><th>{t.historyTableAdded}</th><th>{t.historyTableCumulative}</th></tr></thead><tbody>
          {chartRows.map((row) => <tr key={row.year}><td>{row.year}</td><td>{row.total_phases}</td><td>{row.cumulative_reported_phases}</td></tr>)}
        </tbody></table>
      </details>
      <p className="mt-2 text-[10px] leading-relaxed text-faint">{t.historyLimit}</p>
      <div className="mt-2 rounded-md border border-amber-400/35 bg-amber-400/5 px-2 py-1.5" role="status">
        <p className="text-[11px] font-semibold text-amber-200">◇ {t.historyOutcome}</p>
        <p className="mt-0.5 text-[10px] leading-relaxed text-muted">{t.historyOutcomeMeaning}</p>
      </div>
      <details className="mt-3 border-t border-line pt-2 text-[11px]"><summary className="focus-ring cursor-pointer text-muted hover:text-ink">{t.historyNationalHeading}</summary>
        <p className="mt-2 leading-relaxed text-muted">{t.historyIntro(history.summary.operating_pv_phases, history.summary.known_start_year_phases, history.summary.unknown_start_year_phases)}</p>
        <HistoryBars rows={history.annual} period={history.period} label={t.historyNationalHeading} t={t} />
      </details>
    </section>
  );
}

function BackButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="focus-ring mb-2 inline-flex items-center gap-1 rounded-md text-[11px] text-muted hover:text-ink">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="size-3" aria-hidden>
        <path d="M15 6l-6 6 6 6" />
      </svg>
      {label}
    </button>
  );
}

function CellCard({
  cell,
  pvCase,
  featuredCaseId,
  dust,
  locale,
  t,
  period,
  method,
  sources,
  onBack,
  zoneName,
}: {
  cell: PvCell;
  pvCase: PvCaseFile | null;
  featuredCaseId?: string;
  dust: GiovanniDustFile | null;
  locale: Language;
  t: Copy;
  period: [number, number];
  method?: string;
  sources: { id: string; label: string; doi?: string; url?: string }[];
  onBack: () => void;
  zoneName: string | null;
}) {
  const v = cell.verdict;
  const b = blindCopy(locale);
  const speech = () =>
    [
      t.verdictSentence[v],
      zoneName ?? t.cellLabel(cell),
      ...(v !== "no_data" ? t.bullets(cell).map((x) => x.text) : []),
      `${t.meansHeading}: ${t.means[v]}`,
    ].join(" ");
  const color = v === "no_data" ? "#64748b" : VERDICT_COLORS[v];
  return (
    <article aria-live="polite">
      <BackButton label={t.back} onClick={onBack} />
      <div className="rounded-lg p-3" style={{ background: `${color}1f`, boxShadow: `inset 0 0 0 1px ${color}66` }}>
        <div className="flex items-center gap-2">
          <VerdictSwatch verdict={v} size="size-5" />
          <h3 id={ZONE_CARD_HEADING_ID} tabIndex={-1} className="focus-ring min-w-0 flex-1 rounded-sm text-[15px] font-medium text-ink">
            {t.verdictSentence[v]}
          </h3>
          <ReadAloudButton text={speech} what={b.zoneCard} />
        </div>
        {zoneName && <p className="mt-1 text-[12px] text-ink">{zoneName}</p>}
        <p className="mt-1 text-[10px] text-faint">{t.cellLabel(cell)}</p>
      </div>

      {v !== "no_data" && (
        <ul className="mt-3 space-y-2 text-[13px] leading-snug text-ink">
          {t.bullets(cell).map((b) => (
            <li key={b.icon} className="flex gap-2">
              <BulletIcon icon={b.icon} />
              <span>{b.text}</span>
            </li>
          ))}
        </ul>
      )}
      {typeof cell.plants_operating_n === "number" && cell.plants_operating_n > 0 && (
        <p className="mt-2 text-[11px] text-muted">{t.plantsInCell(cell.plants_operating_n, cell.plants_operating_mw ?? 0)}</p>
      )}

      {cell.miteco_low_moderate_pct !== null && (
        <p className="mt-3 rounded-md border border-emerald-400/25 bg-emerald-400/5 px-2.5 py-2 text-xs leading-relaxed text-muted">{t.environmentalMeaning}</p>
      )}
      {pvCase?.cell_id === cell.id && <PvCaseStudy data={pvCase} locale={locale} />}
      {dust?.featured_cell.id === cell.id && <DustContext dust={dust} locale={locale} t={t} />}
      {!dust && cell.id === featuredCaseId && <p className="mt-3 text-[11px] text-amber-200" role="status">{t.dustUnavailable}</p>}

      <div className="mt-3 space-y-2">
        <div className="rounded-md bg-white/5 px-2.5 py-2">
          <p className="text-[10px] tracking-[0.1em] text-faint uppercase">{t.meansHeading}</p>
          <p className="mt-0.5 text-[13px] leading-snug text-ink">{t.means[v]}</p>
        </div>
      </div>

      <details className="mt-3 rounded-md border border-line px-2.5 py-2 text-xs">
        <summary className="focus-ring cursor-pointer text-muted hover:text-ink">{t.details}</summary>
        <p className="mt-2 text-[11px] text-muted">
          <span className="text-faint">{t.cannotHeading}: </span>
          {t.cannot}
        </p>
        <dl className="mt-2 space-y-1">
          {t.detailRows(cell, period).map((r, i) => (
            <div key={`${r.label}-${i}`} className="grid grid-cols-[8.5rem_1fr] gap-2">
              <dt className="text-faint">{r.label}</dt>
              <dd className="font-mono text-[11px] text-ink tabular-nums">{r.value}</dd>
            </div>
          ))}
        </dl>
        {method && (
          <p className="mt-2 text-[11px] text-muted">
            <span className="text-faint">{t.method}: </span>
            {method}
          </p>
        )}
        {sources.length > 0 && (
          <div className="mt-2">
            <p className="text-faint">{t.sources}</p>
            <ul className="mt-0.5 list-disc space-y-0.5 pl-4 text-[11px] text-muted">
              {sources.map((src) => (
                <li key={src.id}>
                  {src.label}
                  {src.doi && (
                    <>
                      {" · "}
                      <a className="underline hover:text-ink" href={`https://doi.org/${src.doi.replace(/^https?:\/\/doi\.org\//, "")}`} target="_blank" rel="noreferrer">
                        doi:{src.doi.replace(/^https?:\/\/doi\.org\//, "")}
                      </a>
                    </>
                  )}
                  {!src.doi && src.url && (
                    <>
                      {" · "}
                      <a className="underline hover:text-ink" href={src.url} target="_blank" rel="noreferrer">
                        link
                      </a>
                    </>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </details>
      <p className="mt-2 text-[11px] text-faint">{t.checkSeparately}</p>
    </article>
  );
}

function PlantCard({ plant, t, mitecoColor, onBack }: { plant: SolarPlant; t: Copy; mitecoColor: (v: number) => string; onBack: () => void }) {
  const cls = typeof plant.miteco_class === "number" ? plant.miteco_class : null;
  return (
    <article aria-live="polite">
      <BackButton label={t.back} onClick={onBack} />
      <h3 className="text-[15px] font-medium text-ink">{plant.name}</h3>
      <p className="text-[11px] text-muted">{t.plantTech(plant.tech)}</p>
      <dl className="mt-3 grid grid-cols-2 gap-3">
        <div>
          <dt className="text-[10px] tracking-[0.12em] text-faint uppercase">{t.plantCapacity}</dt>
          <dd className="font-mono text-sm text-ink tabular-nums">{Math.round(plant.mw)} MW</dd>
        </div>
        <div>
          <dt className="text-[10px] tracking-[0.12em] text-faint uppercase">{t.plantStatusLabel}</dt>
          <dd className="text-sm text-ink">{t.plantStatus(plant.status)}</dd>
        </div>
        <div className="col-span-2">
          <dt className="text-[10px] tracking-[0.12em] text-faint uppercase">{t.plantMiteco}</dt>
          <dd className="mt-0.5 flex items-center gap-2 text-sm text-ink">
            {cls !== null ? (
              <>
                <span aria-hidden className="size-3 rounded-sm" style={{ background: mitecoColor(cls) }} />
                {t.mitecoClass(cls)}
              </>
            ) : (
              t.plantMitecoUnknown
            )}
          </dd>
        </div>
      </dl>
      <p className="mt-3 text-[11px] leading-snug text-faint">{t.plantNote}</p>
    </article>
  );
}
