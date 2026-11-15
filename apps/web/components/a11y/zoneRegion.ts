import { pointInMultiPolygon, type AdminBundle } from "@/lib/globe/admin-scope";

/**
 * Plain-language place name for a screening zone: the province that contains the zone centre
 * ("Jaén (Andalucía)"), or the nearest province centre for coastal zones whose centre is at sea.
 * A naming aid only (no statistic); returns null when the admin boundaries are not loaded.
 */
export function zoneRegionName(
  lat: number,
  lon: number,
  admin: AdminBundle | null,
  near: (name: string) => string,
): string | null {
  if (!admin || admin.provinces.length === 0) return null;
  for (const p of admin.provinces) {
    const [w, s, e, n] = p.bbox;
    if (lon < w || lon > e || lat < s || lat > n) continue;
    if (pointInMultiPolygon(lon, lat, p.coordinates)) return `${p.name} (${p.ccaaName})`;
  }
  let best = admin.provinces[0];
  let bestD = Infinity;
  for (const p of admin.provinces) {
    const d = (p.center[0] - lat) ** 2 + ((p.center[1] - lon) * Math.cos((lat * Math.PI) / 180)) ** 2;
    if (d < bestD) {
      bestD = d;
      best = p;
    }
  }
  return near(`${best.name} (${best.ccaaName})`);
}
