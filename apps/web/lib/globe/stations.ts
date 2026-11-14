/**
 * NOAA GHCN-Daily station catalog.
 *
 * Stations are ground truth (in-situ thermometers / rain gauges), not NASA data: they validate the
 * NASA MERRA-2 / GPM grids. To keep the national map readable we show a *reference network*: one
 * station per province — the one with the longest annual record for the active metric. Inside a
 * CCAA or province scope every station is shown. The full list lives in the station catalog panel.
 */
import { pointInMultiPolygon, type AdminBundle } from "./admin-scope";
import type { DimensionId, NoaaStation, NoaaStationYearRecord, TrendStats } from "./climate";

export type StationMetric = keyof NoaaStationYearRecord & string;

/** Minimum complete years for a station to be a provincial reference. */
export const MIN_REFERENCE_YEARS = 15;

export const STATION_METRIC_META: Record<StationMetric, { label: string; units: string }> = {
  tavg: { label: "Mean air temperature", units: "°C" },
  tmax: { label: "Mean daily maximum", units: "°C" },
  dtr: { label: "Diurnal temperature range", units: "°C" },
  prcp: { label: "Annual precipitation", units: "mm" },
  tropical_nights: { label: "Tropical nights", units: "nights" },
  hot_days_35: { label: "Days above 35 °C", units: "days" },
  wettest_day: { label: "Wettest day", units: "mm" },
  max_dry_spell: { label: "Longest dry spell", units: "days" },
  snow_days: { label: "Snow days", units: "days" },
  max_snwd: { label: "Max snow depth", units: "mm" },
};

/** Station metric shown for each dimension; null when stations don't measure that dimension. */
export function stationMetricFor(
  dimension: DimensionId,
  heatMetric: string,
  rainMetric: string,
): StationMetric | null {
  switch (dimension) {
    case "temperature":
      return "tavg";
    case "precipitation":
      return "prcp";
    case "snow":
      return "snow_days";
    case "heat_extremes":
      return heatMetric as StationMetric;
    case "rain_extremes":
      return rainMetric as StationMetric;
    default:
      return null;
  }
}

export interface StationEntry {
  station: NoaaStation;
  /** Display name without the ", SP" suffix, title-cased. */
  label: string;
  provinceId: string;
  provinceName: string;
  ccaaId: string;
  ccaaName: string;
  /** Years with data for the metric (n of the trend fit). */
  years: number;
  trend: TrendStats | null;
  reference: boolean;
}

function titleCase(name: string): string {
  return name
    .replace(/, SP$/i, "")
    .toLowerCase()
    .replace(/(^|[\s\-/(])(\p{L})/gu, (_, p: string, c: string) => p + c.toUpperCase());
}

/** Station id → province, computed once per admin bundle (point-in-polygon, nearest centre fallback). */
const provinceCache = new WeakMap<AdminBundle, Map<string, AdminBundle["provinces"][number]>>();

function provinceIndex(admin: AdminBundle, stations: NoaaStation[]) {
  let index = provinceCache.get(admin);
  if (index && index.size === stations.length) return index;
  index = new Map();
  for (const st of stations) {
    let match = admin.provinces.find((p) => {
      const [w, s, e, n] = p.bbox;
      return st.lon >= w && st.lon <= e && st.lat >= s && st.lat <= n && pointInMultiPolygon(st.lon, st.lat, p.coordinates);
    });
    // Coastal gauges can sit just outside the simplified coastline: use the nearest province centre.
    if (!match) {
      match = admin.provinces.reduce((best, p) =>
        Math.hypot(p.center[0] - st.lat, p.center[1] - st.lon) < Math.hypot(best.center[0] - st.lat, best.center[1] - st.lon)
          ? p
          : best,
      );
    }
    index.set(st.id, match);
  }
  provinceCache.set(admin, index);
  return index;
}

/**
 * Catalog entries for a metric. Without the admin bundle there are no provinces, so every station
 * counts as a reference (the map falls back to showing all of them).
 */
export function buildStationCatalog(
  stations: NoaaStation[],
  admin: AdminBundle | null,
  metric: StationMetric,
): StationEntry[] {
  const pool = metric === "snow_days" || metric === "max_snwd" ? stations.filter((s) => s.has_snow) : stations;
  const index = admin ? provinceIndex(admin, stations) : null;

  const entries: StationEntry[] = pool.map((st) => {
    const prov = index?.get(st.id);
    const trend = st.stats[metric] ?? null;
    return {
      station: st,
      label: titleCase(st.name),
      provinceId: prov?.id ?? "",
      provinceName: prov?.name ?? "",
      ccaaId: prov?.ccaaId ?? "",
      ccaaName: prov?.ccaaName ?? "",
      years: trend?.n ?? 0,
      trend,
      reference: !index,
    };
  });

  if (index) {
    const best = new Map<string, StationEntry>();
    for (const e of entries) {
      if (e.years < MIN_REFERENCE_YEARS) continue;
      const cur = best.get(e.provinceId);
      if (!cur || e.years > cur.years || (e.years === cur.years && distToCentre(e, index) < distToCentre(cur, index))) {
        best.set(e.provinceId, e);
      }
    }
    for (const e of best.values()) e.reference = true;
  }
  return entries;
}

function distToCentre(e: StationEntry, index: Map<string, AdminBundle["provinces"][number]>): number {
  const p = index.get(e.station.id);
  return p ? Math.hypot(p.center[0] - e.station.lat, p.center[1] - e.station.lon) : 0;
}
