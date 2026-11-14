"use client";

import { useMemo, useState, type ReactNode } from "react";
import type { ClimateBundle, TrendStats } from "@/lib/globe/climate";
import {
  AUTHORITY_LABEL,
  TECHNOLOGY_META,
  type InfrastructureFile,
  type Installation,
  type InstallationTechnology,
} from "@/lib/globe/energy-infrastructure";
import { Icon } from "./Icon";
import { ToolPanel, smallButton } from "./ToolPanel";

type TechFilter = "all" | InstallationTechnology;
type Outcome = "supported_increase" | "supported_decrease" | "not_significant";

const TECH_ORDER: InstallationTechnology[] = ["wind_onshore", "solar_pv"];

function fmtMw(mw: number): string {
  return mw >= 100 ? mw.toFixed(0) : mw >= 10 ? mw.toFixed(1) : mw.toFixed(2);
}

function signed(n: number, digits = 2): string {
  return `${n > 0 ? "+" : n < 0 ? "−" : "±"}${Math.abs(n).toFixed(digits)}`;
}

/** Reads the pipeline's outcome label; nothing is recomputed here. */
function outcomeOf(stats: TrendStats): Outcome {
  return stats.outcome ?? (stats.significant ? (stats.slope_decade > 0 ? "supported_increase" : "supported_decrease") : "not_significant");
}

function OutcomeLine({ stats }: { stats: TrendStats | null }) {
  if (!stats) {
    return (
      <p className="text-xs text-ink">
        <span aria-hidden className="mr-1">?</span>Insufficient evidence
      </p>
    );
  }
  const outcome = outcomeOf(stats);
  const period = `${stats.first_year ?? "?"}–${stats.last_year ?? "?"}`;
  const ci = `(CI ${signed(stats.ci_low_decade)} to ${signed(stats.ci_high_decade)})`;
  switch (outcome) {
    case "supported_increase":
    case "supported_decrease":
      return (
        <p className="text-xs text-ink">
          <span aria-hidden className="mr-1">{outcome === "supported_increase" ? "▲" : "▼"}</span>
          Supported {outcome === "supported_increase" ? "increase" : "decrease"} of{" "}
          <span className="font-mono tabular-nums">{signed(stats.slope_decade)} °C</span> {ci} per decade, {period}
        </p>
      );
    case "not_significant":
      return (
        <p className="text-xs text-ink">
          <span aria-hidden className="mr-1">◆</span>No robust trend detected{" "}
          <span className="text-muted">
            ({signed(stats.slope_decade)} °C {ci} per decade, {period})
          </span>
        </p>
      );
    default: {
      const exhaustive: never = outcome;
      return exhaustive;
    }
  }
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[6.5rem_1fr] gap-x-2 py-0.5">
      <dt className="text-[10px] tracking-[0.08em] text-faint uppercase">{label}</dt>
      <dd className="min-w-0 text-[11px] break-words text-ink">{children}</dd>
    </div>
  );
}

function InstallationDetail({
  inst,
  bundle,
  file,
  onBack,
  onOpenRegion,
}: {
  inst: Installation;
  bundle: ClimateBundle | null;
  file: InfrastructureFile;
  onBack: () => void;
  onOpenRegion: (inst: Installation) => void;
}) {
  const tech = TECHNOLOGY_META[inst.technology];
  const scope = bundle?.scopes[inst.evidenceScope];
  const stats = scope?.temperature?.stats ?? null;
  const cell = inst.merra2Cell;
  return (
    <div className="mt-3">
      <button type="button" onClick={onBack} className="focus-ring text-[11px] text-muted hover:text-ink">
        ← All installations
      </button>
      <h3 className="mt-1 text-sm font-medium text-ink">{inst.name}</h3>
      <p className="text-[11px] text-muted">
        <span aria-hidden className="mr-1 inline-block size-2 rounded-full" style={{ background: tech.color }} />
        {tech.label} · {inst.municipality} ({inst.provinceName})
      </p>

      <dl className="mt-2">
        <Field label="Installed capacity">
          <span className="font-mono tabular-nums">{fmtMw(inst.capacityMw)} MW</span>{" "}
          <span className="text-faint">registered, not output</span>
        </Field>
        <Field label="Status">
          {inst.status === "in_operation" ? "In operation (listed by the source, no end date)" : `End of operation recorded ${inst.operationEnd ?? ""}`}
        </Field>
        <Field label="In operation since">{inst.operationStart ?? "Not stated in source"}</Field>
        <Field label="Register code">
          <span className="font-mono">{inst.id}</span> · cat. {inst.categoryCode}
        </Field>
        <Field label="Authorised by">{AUTHORITY_LABEL[inst.authority]}</Field>
        <Field label="Location">
          <span className="font-mono tabular-nums">
            {inst.lat.toFixed(4)}°, {inst.lon.toFixed(4)}°
          </span>{" "}
          <span className="text-faint">point inside official perimeter ({inst.perimeterAreaKm2} km²)</span>
        </Field>
        <Field label="Data date">{inst.infoDate} (record) · retrieved {file.source.retrievedUtc.slice(0, 10)}</Field>
      </dl>

      <section aria-label="Spatial support" className="mt-3 rounded-md border border-line p-2">
        <h4 className="text-[10px] tracking-[0.12em] text-faint uppercase">Facility vs NASA data support</h4>
        <ul className="mt-1 space-y-1 text-[11px] text-ink">
          <li>
            <span className="text-muted">Facility:</span> {inst.perimeterAreaKm2} km² perimeter
          </li>
          <li>
            <span className="text-muted">MERRA-2 cell containing it</span> (outlined on map): 0.5° × 0.625°, ≈{" "}
            <span className="font-mono tabular-nums">
              {cell.heightKm} × {cell.widthKm} km
            </span>
            , centre {cell.latCenter}°, {cell.lonCenter}°
          </li>
          <li>
            <span className="text-muted">Result shown below:</span> area-weighted mean over all of {inst.provinceName} province
          </li>
        </ul>
        <p className="mt-1 text-[10px] leading-relaxed text-faint">
          The NASA values describe the regional average, not conditions at the facility. Reanalysis cannot resolve
          single sites.
          {!inst.pointInProvinceOutline &&
            ` This facility's point falls just outside the simplified ${inst.provinceName} outline used for the regional average; the register places it in ${inst.provinceName}.`}
        </p>
      </section>

      <section aria-label="NASA evidence for this region" className="mt-3 rounded-md border border-nav/30 bg-nav/8 p-2">
        <h4 className="text-[10px] tracking-[0.12em] text-nav uppercase">NASA evidence · {scope?.name ?? inst.provinceName}</h4>
        <p className="mt-1 text-[11px] text-muted">
          Annual mean 2 m air temperature (°C), trend per decade
        </p>
        <div className="mt-1">
          {!bundle ? <p className="text-xs text-muted">Loading NASA results…</p> : <OutcomeLine stats={stats} />}
        </div>
        {stats && (
          <p className="mt-1 text-[10px] text-faint">
            Theil–Sen slope with 95 % CI, Mann–Kendall p = {stats.p_value.toFixed(3)}, n = {stats.n} complete years
          </p>
        )}
        <p className="mt-1 text-[10px] leading-relaxed text-faint">
          {bundle ? `${bundle.merra2.dataset} (reanalysis), DOI ${bundle.merra2.doi}` : "NASA MERRA-2 (reanalysis)"} ·
          province scope precomputed by scripts/build_climate_bundle.py
        </p>
        <button type="button" onClick={() => onOpenRegion(inst)} className={`${smallButton} mt-2`}>
          <Icon name="chart" className="size-3.5" /> Open {inst.provinceName} in Trend panel
        </button>
      </section>

      <p className="mt-3 text-[10px] leading-relaxed text-amber-200/90">
        Do not conclude: this is not plant generation, capacity factor or performance, not a site ranking or
        suitability score, not a forecast, and the temperature trend is not shown to affect this facility.
      </p>
    </div>
  );
}

/**
 * Energy infrastructure context (D49, opt-in, off the demo path): registered installations from the
 * Castilla y León register layer, and the NASA analysis region each one falls in.
 */
export function EnergyInfrastructurePanel({
  file,
  error,
  bundle,
  selectedId,
  onSelect,
  onOpenRegion,
  onClose,
}: {
  file: InfrastructureFile | null;
  error: string | null;
  bundle: ClimateBundle | null;
  selectedId: string | null;
  onSelect: (inst: Installation | null) => void;
  onOpenRegion: (inst: Installation) => void;
  onClose: () => void;
}) {
  const [tech, setTech] = useState<TechFilter>("all");
  const [query, setQuery] = useState("");

  const counts = useMemo(() => {
    const c: Record<TechFilter, number> = { all: 0, wind_onshore: 0, solar_pv: 0 };
    for (const i of file?.installations ?? []) {
      c.all += 1;
      c[i.technology] += 1;
    }
    return c;
  }, [file]);

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = (file?.installations ?? []).filter(
      (i) =>
        (tech === "all" || i.technology === tech) &&
        (!q || [i.name, i.municipality, i.provinceName, i.id].some((t) => t.toLowerCase().includes(q))),
    );
    const byProv = new Map<string, Installation[]>();
    for (const i of list) byProv.set(i.provinceName, [...(byProv.get(i.provinceName) ?? []), i]);
    return [...byProv.entries()]
      .sort(([a], [b]) => a.localeCompare(b, "es"))
      .map(([name, items]) => [name, items.sort((a, b) => a.name.localeCompare(b.name, "es"))] as const);
  }, [file, tech, query]);

  const selected = file?.installations.find((i) => i.id === selectedId) ?? null;
  const shown = groups.reduce((n, [, items]) => n + items.length, 0);

  return (
    <ToolPanel icon="pylon" title="Energy infrastructure" onClose={onClose}>
      <p className="mt-1 inline-block rounded border border-amber-300/40 px-1.5 text-[9px] tracking-wider text-amber-200 uppercase">
        Context layer · not validated
      </p>

      {error ? (
        <p role="alert" className="mt-3 text-xs text-ink">
          Data failed quality checks: {error}
        </p>
      ) : !file ? (
        <p className="mt-3 text-xs text-muted" role="status">
          Loading installations…
        </p>
      ) : selected ? (
        <InstallationDetail inst={selected} bundle={bundle} file={file} onBack={() => onSelect(null)} onOpenRegion={onOpenRegion} />
      ) : (
        <>
          <p className="mt-2 text-[11px] leading-relaxed text-muted">
            Wind farms and PV plants in operation listed in the Castilla y León production-installation register.{" "}
            <strong className="font-medium text-ink">Castilla y León only</strong>, not a national inventory. Select one to see
            the NASA analysis region it falls in.
          </p>

          <div role="group" aria-label="Filter by technology" className="mt-3 flex flex-wrap gap-1">
            {(["all", ...TECH_ORDER] as const).map((t) => (
              <button
                key={t}
                type="button"
                aria-pressed={tech === t}
                onClick={() => setTech(t)}
                className={`focus-ring inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] transition-colors ${
                  tech === t ? "border-accent bg-accent text-accent-ink" : "border-line text-muted hover:text-ink"
                }`}
              >
                {t !== "all" && (
                  <span aria-hidden className="inline-block size-2 rounded-full" style={{ background: TECHNOLOGY_META[t].color }} />
                )}
                {t === "all" ? "All" : TECHNOLOGY_META[t].short} · {counts[t]}
              </button>
            ))}
          </div>

          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Name, municipality or province"
            aria-label="Search installations"
            className="focus-ring mt-2 w-full rounded-md border border-line bg-white/5 px-2.5 py-1.5 text-xs text-ink placeholder:text-faint"
          />

          <div className="mt-2 flex items-baseline justify-between text-[10px] tracking-[0.12em] text-faint uppercase">
            <span>Installation · municipality</span>
            <span>MW registered</span>
          </div>

          {shown === 0 ? (
            <p className="mt-3 text-xs text-muted">No installations match.</p>
          ) : (
            <div className="mt-1.5 space-y-2.5">
              {groups.map(([name, items]) => (
                <section key={name} aria-label={name}>
                  <h3 className="sticky top-0 bg-[rgb(8_12_20/0.96)] py-0.5 text-[10px] font-medium tracking-[0.1em] text-muted uppercase">
                    {name} · {items.length}
                  </h3>
                  <ul>
                    {items.map((i) => (
                      <li key={i.id}>
                        <button
                          type="button"
                          onClick={() => onSelect(i)}
                          className="focus-ring flex w-full items-center justify-between gap-2 rounded px-1.5 py-1 text-left hover:bg-white/8"
                        >
                          <span className="min-w-0">
                            <span className="flex items-center gap-1.5 text-[12px] text-ink">
                              <span
                                aria-label={TECHNOLOGY_META[i.technology].label}
                                className="inline-block size-2 shrink-0 rounded-full"
                                style={{ background: TECHNOLOGY_META[i.technology].color }}
                              />
                              <span className="truncate">{i.name}</span>
                            </span>
                            <span className="block truncate text-[10px] text-faint">
                              {TECHNOLOGY_META[i.technology].short} · {i.municipality}
                            </span>
                          </span>
                          <span className="shrink-0 font-mono text-[11px] text-ink tabular-nums">{fmtMw(i.capacityMw)}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </>
      )}

      {file && (
        <p className="mt-3 text-[10px] leading-relaxed text-faint">
          Source: {file.source.attribution}.{" "}
          <a href={file.source.metadataUrl} target="_blank" rel="noreferrer" className="underline hover:text-ink">
            Layer metadata
          </a>{" "}
          · register: {file.source.register}. Record dates {file.source.infoDateRange?.join(" to ") ?? "not stated"}. {" "}
          {file.counts.installations} installations built from {file.counts.sourcePolygons} source polygons; polygons without a
          register code or registered capacity, or with inconsistent duplicates, are excluded. No generation data is shown.
        </p>
      )}
    </ToolPanel>
  );
}
