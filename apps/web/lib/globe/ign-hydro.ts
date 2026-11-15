import type { GeoCoordinate } from "./types";

export const IGN_HYDRO_LAYERS = ["ign-rivers", "ign-waterbodies", "ign-catchments"] as const;
export type IgnHydroLayerId = (typeof IGN_HYDRO_LAYERS)[number];

const SOURCE_LAYERS: Record<IgnHydroLayerId, string> = {
  "ign-rivers": "HY.Network",
  "ign-waterbodies": "HY.PhysicalWaters.Waterbodies",
  "ign-catchments": "HY.PhysicalWaters.Catchments",
};

export interface IgnHydroFeature {
  id: string;
  layerId: IgnHydroLayerId;
  name: string | null;
  attributes: Readonly<Record<string, string>>;
  geometry: { readonly type: string; readonly coordinates: unknown };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validCoordinates(value: unknown, depth: number): boolean {
  if (!Array.isArray(value) || value.length === 0) return false;
  if (depth > 0) return value.every((part: unknown) => validCoordinates(part, depth - 1));
  return value.length >= 2 &&
    typeof value[0] === "number" && Number.isFinite(value[0]) && Math.abs(value[0]) <= 180 &&
    typeof value[1] === "number" && Number.isFinite(value[1]) && Math.abs(value[1]) <= 90;
}

/** The official WMS returns a spatially limited reach or polygon at the clicked pixel. */
export async function queryIgnHydroFeature(
  coord: GeoCoordinate,
  layerId: IgnHydroLayerId,
  signal: AbortSignal,
): Promise<IgnHydroFeature | null> {
  // WMS 1.1.1 with EPSG:4326 uses longitude,latitude; the box is only for picking.
  const delta = 0.015;
  const params = new URLSearchParams({
    SERVICE: "WMS", VERSION: "1.1.1", REQUEST: "GetFeatureInfo",
    LAYERS: SOURCE_LAYERS[layerId], QUERY_LAYERS: SOURCE_LAYERS[layerId],
    STYLES: "", SRS: "EPSG:4326", FORMAT: "image/png",
    BBOX: `${coord.longitude - delta},${coord.latitude - delta},${coord.longitude + delta},${coord.latitude + delta}`,
    WIDTH: "201", HEIGHT: "201", X: "100", Y: "100",
    INFO_FORMAT: "application/json", FEATURE_COUNT: "1",
  });
  const response = await fetch(`https://servicios.idee.es/wms-inspire/hidrografia?${params}`, { signal });
  if (!response.ok) throw new Error(`IGN hydrology HTTP ${response.status}`);
  const body: unknown = await response.json();
  if (!isRecord(body) || !Array.isArray(body.features)) throw new Error("IGN hydrology returned an unexpected response");
  if (body.crs !== null && body.crs !== undefined) {
    if (!isRecord(body.crs) || !isRecord(body.crs.properties) ||
        body.crs.properties.name !== "urn:ogc:def:crs:EPSG::4326") {
      throw new Error("IGN hydrology returned an unsupported coordinate system");
    }
  }
  const feature: unknown = body.features[0];
  if (feature === undefined) return null;
  if (!isRecord(feature) || !isRecord(feature.properties) || !isRecord(feature.geometry)) {
    throw new Error("IGN hydrology returned an invalid feature");
  }
  const depths: Readonly<Record<string, number>> = { LineString: 1, MultiLineString: 2, Polygon: 2, MultiPolygon: 3 };
  const geometryType = feature.geometry.type;
  const depth = typeof geometryType === "string" ? depths[geometryType] : undefined;
  if (typeof geometryType !== "string" || depth === undefined || !validCoordinates(feature.geometry.coordinates, depth)) {
    throw new Error("IGN hydrology returned invalid geometry");
  }
  const attributes: Record<string, string> = {};
  for (const key of ["inspireid_localid", "hydroid_localid", "id_demarcd", "tipo", "persistencia", "origend", "jerarquia", "fuented", "longitud"]) {
    const value = feature.properties[key];
    if (typeof value === "string" || typeof value === "number") attributes[key] = String(value);
  }
  return {
    id: typeof feature.id === "string" ? feature.id : attributes.inspireid_localid ?? "IGN feature",
    layerId,
    name: typeof feature.properties.nombre === "string" ? feature.properties.nombre : null,
    attributes,
    geometry: { type: geometryType, coordinates: feature.geometry.coordinates },
  };
}
