"use client";

/**
 * Relationship maps tool (D74, docs/RELATIONSHIP_MAPS.md). Picks which two-variable map the globe
 * shows and explains it: question, pipeline summary, scale with words at both ends, symbol key,
 * provenance and a "do not conclude" line. Every number is read from relationship-maps.json.
 */

import { paletteGradientCss } from "@/lib/globe/climate";
import { RELATION_MAP_IDS, RELATION_MAP_META, type RelationMapId, type RelationshipsFile } from "@/lib/globe/relationships";
import { useLocale } from "@/lib/i18n/locale";
import { ToolPanel } from "./ToolPanel";

const signed = (v: number, d = 2) => (v > 0 ? "+" : "") + v.toFixed(d);

function KeyRow({ swatch, text }: { swatch: "dotted" | "blank" | "filled" | "ring" | "grey"; text: string }) {
  const sw =
    swatch === "dotted" ? (
      <span className="grid size-3 place-items-center rounded-[2px] bg-[#d8b365] ring-1 ring-black/40">
        <span className="size-1 rounded-full bg-[#0b1424]" />
      </span>
    ) : swatch === "blank" ? (
      <span className="size-3 rounded-[2px] border border-dashed border-white/50" />
    ) : swatch === "filled" ? (
      <span className="size-3 rounded-full bg-[#ef8a62] ring-[1.5px] ring-white" />
    ) : swatch === "ring" ? (
      <span className="size-3 rounded-full border-[3px] border-[#ef8a62] bg-[#0b1424]" />
    ) : (
      <span className="ml-0.5 size-2 rounded-full bg-[rgb(120,128,140)] ring-1 ring-white" />
    );
  return (
    <li className="flex items-center gap-2">
      <span aria-hidden className="grid w-3.5 shrink-0 place-items-center">
        {sw}
      </span>
      <span>{text}</span>
    </li>
  );
}

export function RelationshipPanel({
  file,
  error,
  active,
  onChange,
  onClose,
}: {
  file: RelationshipsFile | null;
  error: string | null;
  active: RelationMapId;
  onChange: (id: RelationMapId) => void;
  onClose: () => void;
}) {
  const { m } = useLocale();
  const c = m.relations;
  const meta = RELATION_MAP_META[active];
  const copy = c.maps[active];

  let summary = "";
  let robustCount: number | null = null;
  let block: { datasets: string; period: string; method?: string; status: string } | null = null;
  if (file) {
    switch (active) {
      case "agreement": {
        const s = file.r1_validation.summary;
        summary = c.agreementSummary(s.n_stations, s.pearson_r_median.toFixed(2), s.sign_agreement);
        block = file.r1_validation;
        break;
      }
      case "trend-gap": {
        const s = file.r1_validation.summary;
        summary = c.trendGapSummary(s.n_stations, signed(s.slope_diff_median, 3));
        block = file.r1_validation;
        break;
      }
      case "temp-precip": {
        const s = file.r2_temp_precip.summary;
        summary = c.couplingSummary(s.n_tested, s.n_tested_negative, s.n_robust, s.q_min.toFixed(3), signed(s.rho_median));
        robustCount = s.n_robust;
        block = file.r2_temp_precip;
        break;
      }
      case "heat-drought": {
        const s = file.r3_heat_drought.summary;
        summary = c.compoundSummary(s.n_tested, s.n_tested_positive, s.n_robust, s.q_min.toFixed(3), signed(s.rho_median));
        robustCount = s.n_robust;
        block = file.r3_heat_drought;
        break;
      }
      default: {
        const exhaustive: never = active;
        return exhaustive;
      }
    }
  }

  return (
    <ToolPanel icon="axes" title={c.title} onClose={onClose}>
      <div className="mt-2 grid grid-cols-2 gap-1" role="tablist" aria-label={c.choose}>
        {RELATION_MAP_IDS.map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={id === active}
            onClick={() => onChange(id)}
            className={`focus-ring rounded-md px-2 py-1 text-[13px] font-medium transition-colors ${
              id === active ? "bg-accent text-accent-ink" : "bg-white/6 text-muted hover:bg-white/12 hover:text-ink"
            }`}
          >
            {c.maps[id].tab}
          </button>
        ))}
      </div>

      {error ? (
        <p role="alert" className="mt-3 text-xs text-red-300">
          {c.error} {error}
        </p>
      ) : !file || !block ? (
        <p className="mt-3 text-xs text-muted">{c.loading}</p>
      ) : (
        <div className="mt-3 space-y-3 text-[14px] text-muted">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold text-ink">{copy.title}</h3>
              {meta.exploratory && (
                <span className="rounded border border-amber-300/40 px-1.5 py-0.5 text-[11px] font-semibold tracking-wider text-amber-200">
                  {c.exploratory}
                </span>
              )}
            </div>
            <p className="mt-1 leading-snug">{copy.question}</p>
          </div>

          {robustCount === 0 && (
            <div className="flex items-center gap-2 rounded-lg border border-white/25 bg-white/8 px-2.5 py-1.5 text-[15px] text-ink">
              <span aria-hidden className="font-mono">◆</span>
              <span className="font-semibold">{c.noRobust}</span>
            </div>
          )}
          <p className="leading-snug text-ink">{summary}</p>
          {robustCount !== null && <p className="text-[13px] leading-snug">{c.signNote}</p>}

          <div>
            <div className="h-2 w-full rounded-full ring-1 ring-white/25" style={{ background: paletteGradientCss(meta.palette) }} role="img"
              aria-label={`${c.scaleLow[active]} → ${c.scaleHigh[active]}`} />
            <div className="mt-1 flex justify-between gap-2 text-[12px]">
              <span>
                <span className="font-mono text-ink">{meta.domain[0]}</span> {c.scaleLow[active]}
              </span>
              <span className="text-right">
                {c.scaleHigh[active]} <span className="font-mono text-ink">{meta.domain[1]}</span>
              </span>
            </div>
            <p className="mt-0.5 text-center text-[12px] text-faint">{meta.units}</p>
          </div>

          {active === "temp-precip" && (
            <ul className="space-y-1 text-[13px] text-ink">
              <li className="text-muted">{c.cellsKey}</li>
              <KeyRow swatch="dotted" text={c.dottedKey} />
              <KeyRow swatch="blank" text={c.blankKey} />
            </ul>
          )}
          {active === "heat-drought" && (
            <ul className="space-y-1 text-[13px] text-ink">
              <KeyRow swatch="filled" text={c.filledKey} />
              <KeyRow swatch="ring" text={c.ringKey} />
              <KeyRow swatch="grey" text={c.greyKey} />
            </ul>
          )}

          <dl className="space-y-1.5">
            <div>
              <dt className="text-[12px] tracking-[0.12em] text-faint uppercase">{c.data}</dt>
              <dd>{block.datasets}</dd>
            </div>
            <div>
              <dt className="text-[12px] tracking-[0.12em] text-faint uppercase">{c.period}</dt>
              <dd>{block.period}</dd>
            </div>
            {block.method && (
              <div>
                <dt className="text-[12px] tracking-[0.12em] text-faint uppercase">{c.method}</dt>
                <dd>{block.method}</dd>
              </div>
            )}
          </dl>
          {robustCount !== null && <p className="text-[13px]">{c.whyDetrend}</p>}
          <p className="text-[13px] text-faint">
            {block.status} · {c.design}
          </p>
          <p className="rounded-md border border-amber-300/25 bg-amber-400/8 px-2 py-1.5 text-amber-100">{c.doNot}</p>
          <p className="text-[13px] text-faint">{c.activeHint}</p>
        </div>
      )}
    </ToolPanel>
  );
}
