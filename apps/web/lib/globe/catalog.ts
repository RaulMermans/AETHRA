import type { LayerDescriptor, LayerStateMap, OrbitView, Place } from "./types";

// --- Camera views ------------------------------------------------------------------------

/** Whole-Earth view centred on Spain, used in "world" mode. */
export const WORLD_VIEW: OrbitView = {
  target: { latitude: 30, longitude: -5 },
  heading: 0,
  pitch: -90,
  range: 21_000_000,
  durationSeconds: 2.4,
};

/** Oblique view framing Peninsula, Balearics and Canarias with visible relief. */
export const HOME_VIEW: OrbitView = {
  target: { latitude: 36.4, longitude: -8.4 },
  heading: 14,
  pitch: -42,
  range: 2_850_000,
  durationSeconds: 2.6,
};

/**
 * Spain land, simplified from Eurostat GISCO NUTS 2021 1:1M by scripts/build_web_boundary.py.
 */
export const SPAIN_BOUNDARY_URL = "/data/spain-boundary.geojson";
/**
 * What the globe renders (everything else is clipped): Spain land + a 200 nautical-mile (≈370 km)
 * sea band for visual context (plain coastline buffer, NOT the official EEZ), minus other
 * countries' land.
 */
export const SPAIN_RENDER_AREA_URL = "/data/spain-render-area.geojson";
/** Same outline as lines, for the outline layer (polygon outlines are not drawn on terrain). */
export const SPAIN_OUTLINE_URL = "/data/spain-outline.geojson";

type Box = { west: number; south: number; east: number; north: number };

/**
 * Boxes around everything that is rendered (D21, incl. the 200 nm sea band): Peninsula +
 * Balearics + Ceuta/Melilla, and Canarias. Imagery is only requested inside them, so no tiles are fetched for the open sea,
 * Portugal, France or Morocco between them. ~0.1° margin around the outline.
 */
export const SPAIN_IMAGERY_EXTENTS: readonly Box[] = [
  { west: -14.0, south: 33.2, east: 8.7, north: 47.3 },
  { west: -22.1, south: 24.1, east: -9.5, north: 33.0 },
];

/** Default analysis extent (DECISIONS D5): Peninsula + Balearics, lon/lat WGS84. */
export const SPAIN_BBOX = { west: -9.5, south: 35.9, east: 4.4, north: 43.9 } as const;

export const SPAIN_VIEW: OrbitView = {
  target: { latitude: 39.2, longitude: -2.6 },
  heading: 0,
  pitch: -55,
  range: 2_050_000,
  durationSeconds: 3.2,
};

/**
 * Regional views. Mountain views are oblique and terrain-aware (the orbit target is raised to
 * the sampled terrain height) so relief is visible without the camera clipping into slopes.
 * Heading 0 = camera south of the target looking north, i.e. towards sunlit south faces.
 */
export const PLACES: Place[] = [
  { id: "spain", name: "Spain", hint: "Iberian Peninsula", view: SPAIN_VIEW },
  {
    id: "sierra-nevada",
    name: "Sierra Nevada",
    hint: "Mulhacén, 3,479 m",
    view: { target: { latitude: 37.053396, longitude: -3.311535 }, heading: 345, pitch: -20, range: 42_000, durationSeconds: 3.4, terrainAware: true },
  },
  {
    id: "pyrenees",
    name: "Pyrenees",
    hint: "Aneto, 3,404 m",
    view: { target: { latitude: 42.62, longitude: 0.62 }, heading: 10, pitch: -18, range: 95_000, durationSeconds: 3.4, terrainAware: true },
  },
  {
    id: "picos-de-europa",
    name: "Picos de Europa",
    hint: "Cantabrian Mountains",
    view: { target: { latitude: 43.1975, longitude: -4.8525 }, heading: 0, pitch: -22, range: 34_000, durationSeconds: 3.4, terrainAware: true },
  },
  {
    id: "canary-islands",
    name: "Canary Islands",
    hint: "Teide, 3,715 m",
    view: { target: { latitude: 28.27, longitude: -16.64 }, heading: 330, pitch: -24, range: 70_000, durationSeconds: 3.8, terrainAware: true },
  },
];

// --- Layers ------------------------------------------------------------------------------

const GIBS = "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best";

/** Closest camera distance (m) per imagery tier so texels are not stretched into fake detail. */
export const MIN_ZOOM_DISTANCE = { ion: 150, fallback: 2_500 } as const;

/** Base imagery used when no Cesium ion token is configured. */
export const FALLBACK_BASE_IMAGERY = {
  title: "NASA Blue Marble (shaded relief, bathymetry)",
  finestDetail: "~600 m",
  urlTemplate: `${GIBS}/BlueMarble_ShadedRelief_Bathymetry/default/default/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpeg`,
  maximumLevel: 8,
  credit: "NASA Blue Marble · NASA GIBS",
};

/**
 * Terrain without a Cesium ion token. Esri states heights are orthometric metres (above sea
 * level), multi-source (1000 m – 0.5 m); Cesium uses them without geoid conversion.
 */
export const TERRAIN_FALLBACK = {
  title: "Esri World Elevation 3D",
  url: "https://elevation3d.arcgis.com/arcgis/rest/services/WorldElevation3D/Terrain3D/ImageServer",
  credit: "Elevation: Esri World Elevation 3D",
};

/**
 * Detail imagery over the fallback base once zoomed in (Blue Marble stops at ~600 m/pixel).
 * Sentinel-2 cloudless 2024 mosaic, 10 m. Licence CC BY-NC-SA 4.0 (non-commercial use).
 */
export const DETAIL_BASE_IMAGERY = {
  title: "Sentinel-2 cloudless 2024 (EOX), 10 m",
  finestDetail: "10 m",
  urlTemplate: "https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2024_3857/default/g/{z}/{y}/{x}.jpg",
  // Native 10 m ≈ Web Mercator level 14 at Spain's latitude (7.3 m/px). Higher levels served by
  // EOX are resampled, so we stop at 14 and let the zoom limit avoid visibly stretched texels.
  maximumLevel: 14,
  /** Terrain level from which the layer is drawn; the full-globe view stays Blue Marble. */
  minimumTerrainLevel: 6,
  credit:
    "Sentinel-2 cloudless 2024 by EOX IT Services GmbH (contains modified Copernicus Sentinel data 2024) · s2maps.eu",
};

export function buildLayerCatalog(): LayerDescriptor[] {
  return [
    ...([
      ["ign-rivers", "Rivers", "HY.Network", "Official Spanish hydrographic network; cartographic context, not river-discharge measurements."],
      ["ign-waterbodies", "Lakes and reservoirs", "HY.PhysicalWaters.Waterbodies", "Official Spanish water-body map; polygon area is not current water storage."],
    ] as const).map(([id, title, layers, description]) => ({
      id,
      kind: "wms" as const,
      group: "reference" as const,
      title,
      description,
      source: { name: "Instituto Geográfico Nacional (Spain)", url: "https://www.ign.es/web/seccion-hidrografia", product: layers },
      url: "https://servicios.idee.es/wms-inspire/hidrografia",
      layers,
      bounds: { west: -18.5, south: 27, east: 5, north: 44.5 },
      credit: "Hydrography © Instituto Geográfico Nacional (Spain) · WMS INSPIRE",
    })),
    {
      id: "spain-boundary",
      kind: "geojson",
      group: "reference",
      title: "Spain outline",
      description:
        "Mainland, Balearic and Canary Islands, Ceuta and Melilla. Simplified (~300 m) from the official EU boundary.",
      source: {
        name: "Eurostat GISCO",
        product: "NUTS 2021, 1:1 million (country ES)",
        url: "https://ec.europa.eu/eurostat/web/gisco/geodata/administrative-units",
      },
      data: SPAIN_OUTLINE_URL,
      style: { stroke: "#819DB5", strokeWidth: 1.5 },
    },
  ];
}

const ALWAYS_ON_LAYERS: ReadonlySet<string> = new Set(["spain-boundary", "ign-rivers", "ign-waterbodies"]);

export function initialLayerStates(layers: LayerDescriptor[]): LayerStateMap {
  return Object.fromEntries(
    layers.map((l) => [
      l.id,
      {
        // D79: Spain outline plus IGN rivers and lakes are fixed context, not user toggles.
        visible: ALWAYS_ON_LAYERS.has(l.id),
        opacity: l.kind === "wms" ? 0.7 : l.kind === "imagery" ? 0.9 : 1,
        time: l.kind === "imagery" || l.kind === "wms" ? l.time?.default : undefined,
      },
    ]),
  );
}
