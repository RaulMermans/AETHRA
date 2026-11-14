/**
 * Measurements between two points on the WGS84 ellipsoid (surface distances: relief is ignored).
 * Pure functions, no Cesium, so the UI can show the same numbers the globe draws.
 */

interface LatLon {
  latitude: number;
  longitude: number;
}

const A = 6_378_137; // WGS84 semi-major axis (m)
const F = 1 / 298.257223563; // WGS84 flattening
const B = A * (1 - F);
const E2 = F * (2 - F); // first eccentricity squared
const RAD = Math.PI / 180;

/** Longitude difference wrapped to [-180, 180]. */
export function deltaLongitude(from: number, to: number): number {
  return ((((to - from + 180) % 360) + 360) % 360) - 180;
}

/**
 * Geodesic distance and initial bearing (Vincenty inverse, ~0.5 mm accuracy). Falls back to a
 * great-circle on the mean radius for nearly antipodal points where Vincenty does not converge.
 */
export function geodesic(a: LatLon, b: LatLon): { metres: number; bearingDeg: number } {
  const L = deltaLongitude(a.longitude, b.longitude) * RAD;
  const U1 = Math.atan((1 - F) * Math.tan(a.latitude * RAD));
  const U2 = Math.atan((1 - F) * Math.tan(b.latitude * RAD));
  const sinU1 = Math.sin(U1), cosU1 = Math.cos(U1);
  const sinU2 = Math.sin(U2), cosU2 = Math.cos(U2);

  let lambda = L;
  for (let i = 0; i < 200; i++) {
    const sinL = Math.sin(lambda), cosL = Math.cos(lambda);
    const sinSigma = Math.hypot(cosU2 * sinL, cosU1 * sinU2 - sinU1 * cosU2 * cosL);
    if (sinSigma === 0) return { metres: 0, bearingDeg: 0 }; // coincident points
    const cosSigma = sinU1 * sinU2 + cosU1 * cosU2 * cosL;
    const sigma = Math.atan2(sinSigma, cosSigma);
    const sinAlpha = (cosU1 * cosU2 * sinL) / sinSigma;
    const cos2Alpha = 1 - sinAlpha * sinAlpha;
    const cos2SigmaM = cos2Alpha === 0 ? 0 : cosSigma - (2 * sinU1 * sinU2) / cos2Alpha; // equatorial line
    const C = (F / 16) * cos2Alpha * (4 + F * (4 - 3 * cos2Alpha));
    const prev = lambda;
    lambda =
      L +
      (1 - C) * F * sinAlpha * (sigma + C * sinSigma * (cos2SigmaM + C * cosSigma * (-1 + 2 * cos2SigmaM ** 2)));
    if (Math.abs(lambda - prev) < 1e-12) {
      const u2 = (cos2Alpha * (A * A - B * B)) / (B * B);
      const k1 = 1 + (u2 / 16384) * (4096 + u2 * (-768 + u2 * (320 - 175 * u2)));
      const k2 = (u2 / 1024) * (256 + u2 * (-128 + u2 * (74 - 47 * u2)));
      const dSigma =
        k2 *
        sinSigma *
        (cos2SigmaM +
          (k2 / 4) *
            (cosSigma * (-1 + 2 * cos2SigmaM ** 2) -
              (k2 / 6) * cos2SigmaM * (-3 + 4 * sinSigma ** 2) * (-3 + 4 * cos2SigmaM ** 2)));
      const bearing = Math.atan2(cosU2 * Math.sin(lambda), cosU1 * sinU2 - sinU1 * cosU2 * Math.cos(lambda));
      return { metres: B * k1 * (sigma - dSigma), bearingDeg: (bearing / RAD + 360) % 360 };
    }
  }
  // Not converged (nearly antipodal): spherical approximation on the mean radius.
  const R = (2 * A + B) / 3;
  const p1 = a.latitude * RAD, p2 = b.latitude * RAD;
  const h = Math.sin((p2 - p1) / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(L / 2) ** 2;
  const bearing = Math.atan2(Math.sin(L) * Math.cos(p2), Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(L));
  return { metres: 2 * R * Math.asin(Math.min(1, Math.sqrt(h))), bearingDeg: (bearing / RAD + 360) % 360 };
}

/** Length of the meridian arc between two latitudes (m). */
export function meridianArc(lat1: number, lat2: number): number {
  return geodesic({ latitude: lat1, longitude: 0 }, { latitude: lat2, longitude: 0 }).metres;
}

/** Length along a parallel at `latitude` for a longitude difference (m). */
export function parallelArc(latitude: number, dLonDeg: number): number {
  const phi = latitude * RAD;
  const N = A / Math.sqrt(1 - E2 * Math.sin(phi) ** 2); // prime vertical radius of curvature
  return N * Math.cos(phi) * Math.abs(dLonDeg) * RAD;
}

/**
 * Offset from A to B split into axes: Y (north–south, along A's meridian to B's latitude) and
 * X (east–west, along B's parallel). Same right-angle path the globe draws.
 */
export function offset(a: LatLon, b: LatLon) {
  const dLat = b.latitude - a.latitude;
  const dLon = deltaLongitude(a.longitude, b.longitude);
  return {
    dLatDeg: dLat,
    dLonDeg: dLon,
    northSouthMetres: meridianArc(a.latitude, b.latitude),
    eastWestMetres: parallelArc(b.latitude, dLon),
    /** Corner of the right-angle path: A's longitude, B's latitude. */
    corner: { latitude: b.latitude, longitude: a.longitude },
  };
}

const COMPASS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
export function compassPoint(bearingDeg: number): string {
  return COMPASS[Math.round(bearingDeg / 45) % 8];
}

/** "850 m", "12.3 km", "1,234 km" (SI, D20). */
export function formatDistance(metres: number): string {
  if (metres < 1_000) return `${Math.round(metres)} m`;
  const km = metres / 1_000;
  const digits = km < 10 ? 2 : km < 100 ? 1 : 0;
  return `${km.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits })} km`;
}

// --- Polygon area / perimeter -----------------------------------------------------------------

const E = Math.sqrt(E2);
/** q(φ) for the authalic latitude (Snyder 1987, eq. 3-12). */
function q(phi: number): number {
  const s = Math.sin(phi);
  return (1 - E2) * (s / (1 - E2 * s * s) - (1 / (2 * E)) * Math.log((1 - E * s) / (1 + E * s)));
}
const QP = q(Math.PI / 2);
/** Radius of the sphere with the same surface area as the WGS84 ellipsoid (m). */
export const AUTHALIC_RADIUS = A * Math.sqrt(QP / 2);
const authalicLatitude = (latDeg: number) => Math.asin(Math.max(-1, Math.min(1, q(latDeg * RAD) / QP)));

/** Great-circle interpolation (authalic sphere), fraction t in [0, 1]. */
function interpolate(a: LatLon, b: LatLon, t: number): LatLon {
  const p1 = a.latitude * RAD, l1 = a.longitude * RAD, p2 = b.latitude * RAD, l2 = b.longitude * RAD;
  const d = 2 * Math.asin(Math.sqrt(Math.sin((p2 - p1) / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin((l2 - l1) / 2) ** 2));
  if (d === 0) return a;
  const A1 = Math.sin((1 - t) * d) / Math.sin(d), B1 = Math.sin(t * d) / Math.sin(d);
  const x = A1 * Math.cos(p1) * Math.cos(l1) + B1 * Math.cos(p2) * Math.cos(l2);
  const y = A1 * Math.cos(p1) * Math.sin(l1) + B1 * Math.cos(p2) * Math.sin(l2);
  const z = A1 * Math.sin(p1) + B1 * Math.sin(p2);
  return { latitude: Math.atan2(z, Math.hypot(x, y)) / RAD, longitude: Math.atan2(y, x) / RAD };
}

/**
 * Area of a polygon (m²) on the WGS84 ellipsoid, vertices in order (not repeated at the end).
 * Exact equal-area formula (authalic latitudes; Chamberlain & Duquette 2007) applied after
 * densifying each edge every ≤10 km along the geodesic, so it matches the edges drawn on the
 * globe. Self-intersecting polygons give meaningless values.
 */
export function polygonArea(input: LatLon[]): number {
  if (input.length < 3) return 0;
  const points: LatLon[] = [];
  for (let i = 0; i < input.length; i++) {
    const a = input[i], b = input[(i + 1) % input.length];
    const steps = Math.min(200, Math.max(1, Math.ceil(geodesic(a, b).metres / 10_000)));
    for (let k = 0; k < steps; k++) points.push(interpolate(a, b, k / steps));
  }
  const n = points.length;
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const p1 = points[i];
    const p2 = points[(i + 1) % n];
    const dLon = deltaLongitude(p1.longitude, p2.longitude) * RAD;
    sum += dLon * (2 + Math.sin(authalicLatitude(p1.latitude)) + Math.sin(authalicLatitude(p2.latitude)));
  }
  return Math.abs((sum * AUTHALIC_RADIUS * AUTHALIC_RADIUS) / 2);
}

/** Sum of geodesic edge lengths (m); `closed` adds the edge back to the first point. */
export function pathLength(points: LatLon[], closed = false): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) total += geodesic(points[i - 1], points[i]).metres;
  if (closed && points.length > 2) total += geodesic(points[points.length - 1], points[0]).metres;
  return total;
}

// --- Circles -------------------------------------------------------------------------------

/** Point at `metres` along `bearingDeg` from `from` (sphere of authalic radius; for drawing). */
export function destination(from: LatLon, bearingDeg: number, metres: number): LatLon {
  const d = metres / AUTHALIC_RADIUS;
  const t = bearingDeg * RAD;
  const p1 = from.latitude * RAD;
  const l1 = from.longitude * RAD;
  const p2 = Math.asin(Math.sin(p1) * Math.cos(d) + Math.cos(p1) * Math.sin(d) * Math.cos(t));
  const l2 = l1 + Math.atan2(Math.sin(t) * Math.sin(d) * Math.cos(p1), Math.cos(d) - Math.sin(p1) * Math.sin(p2));
  return { latitude: p2 / RAD, longitude: (((l2 / RAD + 540) % 360) - 180) };
}

/** Area (m²) and circumference (m) of a geodesic circle of radius r on the authalic sphere. */
export function circle(radiusMetres: number) {
  const R = AUTHALIC_RADIUS;
  const s = radiusMetres / R;
  return { area: 2 * Math.PI * R * R * (1 - Math.cos(s)), circumference: 2 * Math.PI * R * Math.sin(s) };
}

/** "850 m²", "12.3 km²", "1,234 km²". */
export function formatArea(m2: number): string {
  if (m2 < 1e5) return `${Math.round(m2).toLocaleString("en-US")} m²`;
  const km2 = m2 / 1e6;
  const digits = km2 < 10 ? 2 : km2 < 100 ? 1 : 0;
  return `${km2.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits })} km²`;
}

// --- Coordinates input -------------------------------------------------------------------------

/**
 * Parses "40.4168, -3.7038", "40.4168 -3.7038", "40.4168N 3.7038W" or
 * DMS like `40°25'0"N 3°42'14"W`. Latitude first. Returns null if not valid.
 */
export function parseCoordinates(input: string): LatLon | null {
  const parts = input
    .trim()
    .toUpperCase()
    .replace(/,(?=\s*[-+]?\d)/g, " ")
    .match(/[-+−]?\d+(?:[.,]\d+)?\s*°?\s*(?:\d+(?:[.,]\d+)?\s*['′]\s*)?(?:\d+(?:[.,]\d+)?\s*["″]\s*)?[NSEWO]?/g);
  if (!parts || parts.length !== 2) return null;
  const toDeg = (s: string) => {
    const nums = (s.match(/\d+(?:[.,]\d+)?/g) ?? []).map((n) => parseFloat(n.replace(",", ".")));
    if (!nums.length) return NaN;
    let v = nums[0] + (nums[1] ?? 0) / 60 + (nums[2] ?? 0) / 3600;
    if (/^[-−]/.test(s.trim()) || /[SWO]$/.test(s.trim())) v = -v;
    return v;
  };
  const [lat, lon] = parts.map(toDeg);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
  return { latitude: lat, longitude: lon };
}
