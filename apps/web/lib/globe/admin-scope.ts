import type { GeoCoordinate, OrbitView } from "./types";

export type AdminScopeLevel = "age" | "ccaa" | "provincia";

export interface AdminCcaa {
  id: string;
  name: string;
  institution: string;
  center: [number, number]; // [lat, lon]
  bbox: [number, number, number, number]; // [west, south, east, north]
  range: number;
  coordinates: number[][][][]; // MultiPolygon
}

export interface AdminProvince {
  id: string;
  name: string;
  ccaaId: string;
  ccaaName: string;
  capital: string;
  institution: string;
  center: [number, number]; // [lat, lon]
  bbox: [number, number, number, number];
  range: number;
  coordinates: number[][][][]; // MultiPolygon
}

export interface AdminBundle {
  generated_at: string;
  source: string;
  age: {
    id: string;
    name: string;
    institution: string;
  };
  ccaa: AdminCcaa[];
  provinces: AdminProvince[];
}

export interface AdminScopeSelection {
  level: AdminScopeLevel;
  ccaaId: string;
  provinceId: string;
  /** When true, heatmap and station overlays are strictly bounded to the selected jurisdiction. */
  clipToScope: boolean;
}

export const DEFAULT_ADMIN_SCOPE: AdminScopeSelection = {
  level: "age",
  ccaaId: "ES61", // Andalucía default when switching to CCAA
  provinceId: "29", // Málaga default when switching to Provincia
  clipToScope: true,
};

export const SCOPE_LEVEL_META: Record<
  AdminScopeLevel,
  {
    id: AdminScopeLevel;
    shortLabel: string;
    labelEs: string;
    labelEn: string;
    buyerTag: string;
    competencies: string;
  }
> = {
  age: {
    id: "age",
    shortLabel: "Estado (AGE)",
    labelEs: "Administración General del Estado",
    labelEn: "National State (AGE)",
    buyerTag: "MITECO · D.G. del Agua · AEMET · Red Eléctrica",
    competencies:
      "Planificación Hidrológica Nacional, cuencas intercomunitarias, red básica de observación y PNIEC 2030.",
  },
  ccaa: {
    id: "ccaa",
    shortLabel: "Comunidad Autónoma",
    labelEs: "Comunidad Autónoma (CCAA)",
    labelEn: "Autonomous Community",
    buyerTag: "Gobiernos Autonómicos · Consejerías de Medio Ambiente y Agua",
    competencies:
      "Ordenación del territorio, cuencas intracomunitarias, prevención de incendios forestales (INFOCA/homólogos), salud pública y PAC autonómica.",
  },
  provincia: {
    id: "provincia",
    shortLabel: "Provincia",
    labelEs: "Provincia (Diputación / Cabildo)",
    labelEn: "Provincial Administration",
    buyerTag: "Diputaciones Provinciales · Cabildos y Consells Insulars",
    competencies:
      "Consorcios provinciales de aguas y bomberos, planes provinciales de adaptación climática, asistencia técnica supramunicipal y red viaria provincial.",
  },
};

let adminBundlePromise: Promise<AdminBundle> | null = null;

export function loadAdminBundle(): Promise<AdminBundle> {
  if (!adminBundlePromise) {
    adminBundlePromise = fetch("/data/spain-admin.json").then((r) => {
      if (!r.ok) throw new Error(`Failed to load spain-admin.json (${r.status})`);
      return r.json() as Promise<AdminBundle>;
    });
  }
  return adminBundlePromise;
}

function pointInRing(lon: number, lat: number, ring: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];
    const intersect = yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi || 1e-12) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export function pointInMultiPolygon(lon: number, lat: number, multiPoly: number[][][][]): boolean {
  for (const poly of multiPoly) {
    if (poly.length > 0 && pointInRing(lon, lat, poly[0])) {
      return true;
    }
  }
  return false;
}

export interface ResolvedAdminScope {
  level: AdminScopeLevel;
  id: string;
  name: string;
  hierarchyLabel: string;
  institution: string;
  competencies: string;
  buyerTag: string;
  center: GeoCoordinate;
  bbox: [number, number, number, number];
  orbitView: OrbitView;
  clipToScope: boolean;
  /** MultiPolygon coordinates in WGS84 [lon, lat] when level !== "age". */
  multiPolygon: number[][][][] | null;
  /** Parent province / CCAA references for context. */
  ccaa?: AdminCcaa;
  province?: AdminProvince;
  /** Fast spatial containment test for stations & grid cells. */
  contains: (lat: number, lon: number) => boolean;
}

export function resolveAdminScope(
  admin: AdminBundle | null,
  selection: AdminScopeSelection,
): ResolvedAdminScope {
  const levelMeta = SCOPE_LEVEL_META[selection.level];

  if (!admin || selection.level === "age") {
    return {
      level: "age",
      id: "ES",
      name: "España · Territorio Nacional",
      hierarchyLabel: "Administración General del Estado (AGE) · 19 CCAA / Ciudades Autónomas · 52 Provincias",
      institution:
        admin?.age.institution ?? "Administración General del Estado (AGE) · MITECO / AEMET / D.G. del Agua",
      competencies: levelMeta.competencies,
      buyerTag: levelMeta.buyerTag,
      center: { latitude: 39.2, longitude: -3.5 },
      bbox: [-18.5, 27.3, 4.6, 44.1],
      orbitView: {
        target: { latitude: 39.2, longitude: -2.6 },
        heading: 0,
        pitch: -55,
        range: 2_050_000,
        durationSeconds: 2.2,
      },
      clipToScope: false,
      multiPolygon: null,
      contains: () => true,
    };
  }

  if (selection.level === "ccaa") {
    const ccaa = admin.ccaa.find((c) => c.id === selection.ccaaId) ?? admin.ccaa[0];
    const [w, s, e, n] = ccaa.bbox;
    const provs = admin.provinces.filter((p) => p.ccaaId === ccaa.id);
    const provNames = provs.map((p) => p.name).join(", ");
    return {
      level: "ccaa",
      id: ccaa.id,
      name: ccaa.name,
      hierarchyLabel:
        provs.length === 1
          ? `Comunidad Autónoma Uniprovincial (${provNames})`
          : `Comunidad Autónoma · ${provs.length} provincias (${provNames})`,
      institution: ccaa.institution,
      competencies: levelMeta.competencies,
      buyerTag: levelMeta.buyerTag,
      center: { latitude: ccaa.center[0], longitude: ccaa.center[1] },
      bbox: ccaa.bbox,
      orbitView: {
        target: { latitude: ccaa.center[0], longitude: ccaa.center[1] },
        heading: 0,
        pitch: -62,
        range: ccaa.range,
        durationSeconds: 2.2,
      },
      clipToScope: selection.clipToScope,
      multiPolygon: ccaa.coordinates,
      ccaa,
      contains: (lat: number, lon: number) => {
        if (lon < w - 0.08 || lon > e + 0.08 || lat < s - 0.08 || lat > n + 0.08) return false;
        return pointInMultiPolygon(lon, lat, ccaa.coordinates);
      },
    };
  }

  // Provincia level (the atomic territorial unit)
  const prov = admin.provinces.find((p) => p.id === selection.provinceId) ?? admin.provinces[0];
  const ccaa = admin.ccaa.find((c) => c.id === prov.ccaaId);
  const [w, s, e, n] = prov.bbox;
  return {
    level: "provincia",
    id: prov.id,
    name: `Provincia de ${prov.name}`,
    hierarchyLabel: `${prov.ccaaName} · Capital: ${prov.capital}`,
    institution: prov.institution,
    competencies: levelMeta.competencies,
    buyerTag: levelMeta.buyerTag,
    center: { latitude: prov.center[0], longitude: prov.center[1] },
    bbox: prov.bbox,
    orbitView: {
      target: { latitude: prov.center[0], longitude: prov.center[1] },
      heading: 0,
      pitch: -58,
      range: prov.range,
      durationSeconds: 2.2,
    },
    clipToScope: selection.clipToScope,
    multiPolygon: prov.coordinates,
    ccaa,
    province: prov,
    contains: (lat: number, lon: number) => {
      if (lon < w - 0.08 || lon > e + 0.08 || lat < s - 0.08 || lat > n + 0.08) return false;
      return pointInMultiPolygon(lon, lat, prov.coordinates);
    },
  };
}

/**
 * Builds the GeoJSON LineString/Point overlay highlighting the active administrative boundary
 * (and subtle reference lines for parent CCAA when viewing a Province).
 */
export function buildAdminScopeOverlayGeoJson(
  admin: AdminBundle | null,
  resolved: ResolvedAdminScope,
): {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    properties: Record<string, unknown>;
    geometry:
      | { type: "Point"; coordinates: [number, number] }
      | { type: "LineString"; coordinates: number[][] };
  }>;
} {
  if (!admin || resolved.level === "age") {
    return { type: "FeatureCollection", features: [] };
  }

  const features: Array<{
    type: "Feature";
    properties: Record<string, unknown>;
    geometry:
      | { type: "Point"; coordinates: [number, number] }
      | { type: "LineString"; coordinates: number[][] };
  }> = [];

  // 1. If in Provincia mode, draw parent CCAA outline subtly for context
  if (resolved.level === "provincia" && resolved.ccaa) {
    for (const poly of resolved.ccaa.coordinates) {
      if (poly[0]) {
        features.push({
          type: "Feature",
          properties: {
            kind: "admin-parent-outline",
            color: "#819DB5",
          },
          geometry: {
            type: "LineString",
            coordinates: poly[0],
          },
        });
      }
    }
  }

  // 2. Draw the active jurisdiction's primary perimeter in bright gold/amber
  if (resolved.multiPolygon) {
    for (const poly of resolved.multiPolygon) {
      if (poly[0]) {
        features.push({
          type: "Feature",
          properties: {
            kind: "admin-active-outline",
            name: resolved.name,
            institution: resolved.institution,
            color: "#fbbf24",
          },
          geometry: {
            type: "LineString",
            coordinates: poly[0],
          },
        });
      }
    }
  }

  // 3. Center badge point for the active jurisdiction
  features.push({
    type: "Feature",
    properties: {
      kind: "basin-hub",
      name: `${resolved.name} (${resolved.institution})`,
      color: "#fbbf24",
      pixelSize: 9.5,
    },
    geometry: {
      type: "Point",
      coordinates: [resolved.center.longitude, resolved.center.latitude],
    },
  });

  return { type: "FeatureCollection", features };
}
