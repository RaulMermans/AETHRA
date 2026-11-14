"use client";

import { useMemo, useState } from "react";
import type { AdminBundle, ResolvedAdminScope } from "@/lib/globe/admin-scope";
import { LAST_COMPLETE_YEAR, type ActiveClimateConfig, type ClimateBundle } from "@/lib/globe/climate";
import {
  buildStationCatalog,
  MIN_REFERENCE_YEARS,
  STATION_METRIC_META,
  stationMetricFor,
  type StationEntry,
} from "@/lib/globe/stations";
import type { GeoCoordinate } from "@/lib/globe/types";
import { ToolPanel } from "./ToolPanel";

type Filter = "reference" | "all";

function formatTrend(e: StationEntry, units: string): string {
  if (!e.trend || e.trend.n < 8) return "—";
  const v = e.trend.slope_decade;
  const digits = Math.abs(v) >= 10 ? 0 : Math.abs(v) >= 1 ? 1 : 2;
  return `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v).toFixed(digits)} ${units}`;
}

/**
 * Catalog of NOAA GHCN-Daily stations: the full list behind the map's reference markers.
 * Grouped by CCAA (national view) or province (inside a scope), each row shows the station's
 * record length and its own trend for the active metric.
 */
export function StationCatalogPanel({
  bundle,
  admin,
  config,
  scope,
  selected,
  onInspect,
  onClose,
}: {
  bundle: ClimateBundle | null;
  admin: AdminBundle | null;
  config: ActiveClimateConfig;
  scope: ResolvedAdminScope;
  selected: GeoCoordinate | null;
  onInspect: (coord: GeoCoordinate) => void;
  onClose: () => void;
}) {
  const scoped = scope.level !== "age";
  const [filter, setFilter] = useState<Filter>("reference");
  const [query, setQuery] = useState("");

  const dimMetric = stationMetricFor(config.dimension, config.heatMetric, config.rainMetric);
  const metric = dimMetric ?? "tavg";
  const meta = STATION_METRIC_META[metric];

  const catalog = useMemo(
    () => (bundle ? buildStationCatalog(bundle.noaa.stations, admin, metric) : []),
    [bundle, admin, metric],
  );
  const inScope = useMemo(
    () => (scoped ? catalog.filter((e) => scope.contains(e.station.lat, e.station.lon)) : catalog),
    [catalog, scope, scoped],
  );

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = inScope.filter((e) => {
      if (q) {
        return [e.label, e.station.id, e.provinceName, e.ccaaName].some((t) => t.toLowerCase().includes(q));
      }
      return filter === "all" || e.reference;
    });
    const byGroup = new Map<string, StationEntry[]>();
    for (const e of list) {
      const key = (scoped ? e.provinceName : e.ccaaName) || "Other";
      byGroup.set(key, [...(byGroup.get(key) ?? []), e]);
    }
    return [...byGroup.entries()]
      .sort(([a], [b]) => a.localeCompare(b, "es"))
      .map(([name, items]) => [
        name,
        items.sort((a, b) => Number(b.reference) - Number(a.reference) || a.label.localeCompare(b.label, "es")),
      ] as const);
  }, [inScope, query, filter, scoped]);

  const refCount = inScope.filter((e) => e.reference).length;
  const shown = groups.reduce((n, [, items]) => n + items.length, 0);
  const isActive = (e: StationEntry) =>
    !!selected && Math.abs(selected.latitude - e.station.lat) < 1e-4 && Math.abs(selected.longitude - e.station.lon) < 1e-4;

  return (
    <ToolPanel icon="station" title="Station catalog" onClose={onClose}>
      <p className="mt-2 text-[11px] leading-relaxed text-muted">
        NOAA GHCN-Daily weather stations: ground measurements used to check the NASA grids. The map shows one
        reference station per province (longest record, ≥{MIN_REFERENCE_YEARS} years).
      </p>

      <div className="mt-3 flex items-center justify-between gap-2">
        <div role="group" aria-label="Which stations" className="flex gap-0.5 rounded-full border border-line p-0.5">
          {(
            [
              ["reference", `Reference · ${refCount}`],
              ["all", `All · ${inScope.length}`],
            ] as const
          ).map(([v, label]) => (
            <button
              key={v}
              type="button"
              aria-pressed={filter === v}
              onClick={() => setFilter(v)}
              className={`focus-ring rounded-full px-2.5 py-0.5 text-[11px] transition-colors ${
                filter === v ? "bg-accent text-accent-ink" : "text-muted hover:text-ink"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {scoped && <span className="truncate text-[10px] text-faint">in {scope.name}</span>}
      </div>

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Station, province or region"
        aria-label="Search stations"
        className="focus-ring mt-2 w-full rounded-md border border-line bg-white/5 px-2.5 py-1.5 text-xs text-ink placeholder:text-faint"
      />

      <div className="mt-2 flex items-baseline justify-between text-[10px] tracking-[0.12em] text-faint uppercase">
        <span>Station · record</span>
        <span title={`Theil-Sen slope, 2001–${LAST_COMPLETE_YEAR}. ● = supported after multiple-testing control (Mann–Kendall p < 0.05, CI excludes 0, Benjamini–Hochberg q < 0.05 across stations)`}>
          Trend / decade
        </span>
      </div>
      <p className="text-[10px] text-faint">
        {meta.label} ({meta.units}){!dimMetric && " — no station equivalent for this layer"}
      </p>

      {!bundle ? (
        <p className="mt-3 text-xs text-muted">Loading stations…</p>
      ) : shown === 0 ? (
        <p className="mt-3 text-xs text-muted">No stations match.</p>
      ) : (
        <div className="mt-1.5 space-y-2.5">
          {groups.map(([name, items]) => (
            <section key={name} aria-label={name}>
              <h3 className="sticky top-0 bg-[rgb(8_12_20/0.96)] py-0.5 text-[10px] font-medium tracking-[0.1em] text-muted uppercase">
                {name}
              </h3>
              <ul>
                {items.map((e) => (
                  <li key={e.station.id}>
                    <button
                      type="button"
                      onClick={() => onInspect({ latitude: e.station.lat, longitude: e.station.lon })}
                      title={`${e.station.id} · ${e.station.lat.toFixed(3)}, ${e.station.lon.toFixed(3)}`}
                      className={`focus-ring flex w-full items-center justify-between gap-2 rounded px-1.5 py-1 text-left ${
                        isActive(e) ? "bg-accent/20" : "hover:bg-white/8"
                      }`}
                    >
                      <span className="min-w-0">
                        <span className="flex items-center gap-1.5 text-[12px] text-ink">
                          <span className="truncate">{e.label}</span>
                          {e.reference && (
                            <span className="shrink-0 rounded border border-accent/40 px-1 text-[9px] text-accent">REF</span>
                          )}
                        </span>
                        <span className="block truncate text-[10px] text-faint">
                          {scoped ? "" : `${e.provinceName} · `}
                          {Math.round(e.station.elevation)} m · {e.years} yr
                          {e.years < MIN_REFERENCE_YEARS && " · short record"}
                        </span>
                      </span>
                      <span className="shrink-0 font-mono text-[11px] text-ink tabular-nums">
                        {formatTrend(e, meta.units)}
                        <span
                          aria-label={e.trend?.significant_fdr ? "supported trend" : "no robust trend detected"}
                          className={`ml-1 ${e.trend?.significant_fdr ? "text-accent" : "text-faint"}`}
                        >
                          {e.trend?.significant_fdr ? "●" : "○"}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
      <p className="mt-3 text-[10px] leading-relaxed text-faint">
        Source: NOAA NCEI GHCN-Daily, 2001–{LAST_COMPLETE_YEAR}, annual values from daily records. Not NASA data.
        Theil–Sen slope, complete years only. ● supported (p &lt; 0.05, CI excludes 0, BH q &lt; 0.05 across stations), ○ no robust trend detected. Stations are not homogenized.
      </p>
    </ToolPanel>
  );
}
