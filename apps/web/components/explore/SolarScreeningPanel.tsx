"use client";

import type { ReactNode } from "react";
import { useLocale } from "@/lib/i18n/locale";
import { screeningCopy, type Bullet } from "@/lib/i18n/screening-copy";
import type { ScreeningToggles } from "@/lib/globe/cesium/screening-layers";
import { MITECO_FALLBACK_COLORS, VERDICT_COLORS, type PvCell, type PvScreeningData, type PvVerdict, type SolarPlant } from "@/lib/globe/pv-screening";

/** Sun glyph (the shared Icon set has none). */
export function SunGlyph({ className = "size-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" className={className} aria-hidden>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}

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
  selectedPlant,
  onClearSelection,
  onClose,
}: {
  data: PvScreeningData | null;
  loading: boolean;
  toggles: ScreeningToggles;
  onToggle: (key: keyof ScreeningToggles) => void;
  selectedCell: PvCell | null;
  selectedPlant: SolarPlant | null;
  onClearSelection: () => void;
  onClose: () => void;
}) {
  const { locale } = useLocale();
  const t = screeningCopy(locale);
  const s = data?.screening ?? null;
  const period: [number, number] = s?.period ?? [2000, 2025];
  const mitecoColor = (v: number) => data?.miteco?.classes.find((c) => c.value === v)?.color ?? MITECO_FALLBACK_COLORS[v] ?? "#64748b";

  return (
    <section
      aria-label={t.title}
      className="panel pointer-events-auto flex h-full min-h-0 w-full flex-col overflow-hidden p-4"
    >
      <div className="flex shrink-0 items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-sm text-ink">
            <SunGlyph className="size-4 text-amber-300" />
            {t.title}
          </h2>
          <p className="mt-0.5 text-[10px] tracking-[0.1em] text-faint uppercase" title={t.exploratoryHint}>
            {t.exploratory}
          </p>
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
          <PlantCard plant={selectedPlant} t={t} mitecoColor={mitecoColor} onBack={onClearSelection} />
        ) : selectedCell && s ? (
          <CellCard cell={selectedCell} t={t} period={period} method={s.method} sources={s.sources ?? []} onBack={onClearSelection} />
        ) : s ? (
          <div className="space-y-1.5 text-[13px] leading-snug text-ink">
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
      </div>
    </section>
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
  t,
  period,
  method,
  sources,
  onBack,
}: {
  cell: PvCell;
  t: Copy;
  period: [number, number];
  method?: string;
  sources: { id: string; label: string; doi?: string; url?: string }[];
  onBack: () => void;
}) {
  const v = cell.verdict;
  const color = v === "no_data" ? "#64748b" : VERDICT_COLORS[v];
  return (
    <article aria-live="polite">
      <BackButton label={t.back} onClick={onBack} />
      <div className="rounded-lg p-3" style={{ background: `${color}1f`, boxShadow: `inset 0 0 0 1px ${color}66` }}>
        <div className="flex items-center gap-2">
          <VerdictSwatch verdict={v} size="size-5" />
          <p className="text-[15px] font-medium text-ink">{t.verdictSentence[v]}</p>
        </div>
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

      <div className="mt-3 space-y-2">
        <div className="rounded-md bg-white/5 px-2.5 py-2">
          <p className="text-[10px] tracking-[0.1em] text-faint uppercase">{t.meansHeading}</p>
          <p className="mt-0.5 text-[13px] leading-snug text-ink">{t.means[v]}</p>
        </div>
        <div className="rounded-md border border-line px-2.5 py-2">
          <p className="text-[10px] tracking-[0.1em] text-faint uppercase">{t.cannotHeading}</p>
          <p className="mt-0.5 text-xs leading-snug text-muted">{t.cannot}</p>
        </div>
      </div>

      <details className="mt-3 rounded-md border border-line px-2.5 py-2 text-xs">
        <summary className="focus-ring cursor-pointer text-muted hover:text-ink">{t.details}</summary>
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
