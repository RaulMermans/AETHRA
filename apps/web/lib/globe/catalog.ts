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

/** Top-down view framing all of Spain: Peninsula, Balearics, Canarias, Ceuta and Melilla. */
export const HOME_VIEW: OrbitView = {
  target: { latitude: 35.7, longitude: -11.5 },
  heading: 0,
  pitch: -90,
  range: 3_900_000,
  durationSeconds: 2.4,
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

/**
 * The camera position is kept inside this box (lon/lat, degrees), generous enough for oblique
 * views from the south and for the home view, so panning can't drift away from Spain.
 */
export const CAMERA_BOUNDS: Box = { west: -30, south: 14, east: 16, north: 52 };

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
    view: { target: { latitude: 37.05, longitude: -3.31 }, heading: 345, pitch: -20, range: 42_000, durationSeconds: 3.4, terrainAware: true },
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
    view: { target: { latitude: 43.19, longitude: -4.85 }, heading: 0, pitch: -22, range: 34_000, durationSeconds: 3.4, terrainAware: true },
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

function isoDateUTC(daysAgo: number, now = new Date()): string {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

/** Closed ring along the bbox, densified so edges follow parallels/meridians on the globe. */
function bboxRing(b: typeof SPAIN_BBOX, step = 0.5): [number, number][] {
  const ring: [number, number][] = [];
  const push = (x0: number, y0: number, x1: number, y1: number) => {
    const n = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) / step));
    for (let i = 0; i < n; i++) ring.push([x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n]);
  };
  push(b.west, b.south, b.east, b.south);
  push(b.east, b.south, b.east, b.north);
  push(b.east, b.north, b.west, b.north);
  push(b.west, b.north, b.west, b.south);
  ring.push([b.west, b.south]);
  return ring;
}

export function buildLayerCatalog(now = new Date()): LayerDescriptor[] {
  return [
    {
      id: "viirs-true-color",
      kind: "imagery",
      group: "imagery",
      title: "True color (daily)",
      description:
        "VIIRS NOAA-20 corrected reflectance. Near-real-time; recent days can be partial and cloudy.",
      source: {
        name: "NASA GIBS",
        product: "VIIRS_NOAA20_CorrectedReflectance_TrueColor",
        url: "https://nasa-gibs.github.io/gibs-api-docs/",
      },
      resolution: "250 m",
      urlTemplate: `${GIBS}/VIIRS_NOAA20_CorrectedReflectance_TrueColor/default/{Time}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg`,
      maximumLevel: 9,
      credit: "VIIRS NOAA-20 Corrected Reflectance · NASA GIBS",
      time: { default: isoDateUTC(2, now), max: isoDateUTC(0, now), step: "P1D" },
    },
    {
      id: "black-marble",
      kind: "imagery",
      group: "imagery",
      title: "Night lights (2016)",
      description: "VIIRS Black Marble annual composite of night-time lights.",
      source: {
        name: "NASA GIBS",
        product: "VIIRS_Black_Marble",
        url: "https://earthobservatory.nasa.gov/features/NightLights",
      },
      resolution: "500 m",
      urlTemplate: `${GIBS}/VIIRS_Black_Marble/default/2016-01-01/GoogleMapsCompatible_Level8/{z}/{y}/{x}.png`,
      maximumLevel: 8,
      credit: "VIIRS Black Marble 2016 · NASA GIBS",
    },
    {
      id: "modis-ndvi-gibs",
      kind: "imagery",
      group: "imagery",
      title: "Vegetation NDVI (MODIS 8-day)",
      description: "NASA Terra MODIS 8-day Normalized Difference Vegetation Index (GIBS WMTS).",
      source: {
        name: "NASA GIBS",
        product: "MODIS_Terra_NDVI_8Day",
        url: "https://nasa-gibs.github.io/gibs-api-docs/",
      },
      resolution: "250 m",
      urlTemplate: `${GIBS}/MODIS_Terra_NDVI_8Day/default/2000-02-18/GoogleMapsCompatible_Level9/{z}/{y}/{x}.png`,
      maximumLevel: 9,
      credit: "MODIS Terra NDVI 8-Day · NASA GIBS",
    },
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
      style: { stroke: "#7cc4ff", strokeWidth: 1.5 },
    },
    {
      id: "spain-rivers",
      kind: "geojson",
      group: "reference",
      title: "Major rivers (8 basins)",
      description: "Ebro, Duero, Tajo, Guadiana, Guadalquivir, Miño-Sil, Júcar and Segura main courses.",
      source: {
        name: "Hydrographic Demarcations",
        product: "Spain 8 primary river courses",
      },
      data: "/data/spain-rivers.geojson",
      style: { stroke: "#38bdf8", strokeWidth: 2.5 },
    },
    {
      id: "spain-extent",
      kind: "geojson",
      group: "reference",
      title: "Analysis extent",
      description: "Default study area: Peninsula + Balearic Islands (DECISIONS D5).",
      source: { name: "Project decision D5", product: "bbox -9.5, 35.9, 4.4, 43.9" },
      data: {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            properties: { name: "Analysis extent (D5)" },
            geometry: { type: "LineString", coordinates: bboxRing(SPAIN_BBOX) },
          },
        ],
      },
      style: { stroke: "#7cc4ff", strokeWidth: 2 },
    },
  ];
}

export function initialLayerStates(layers: LayerDescriptor[]): LayerStateMap {
  return Object.fromEntries(
    layers.map((l) => [
      l.id,
      {
        visible: l.id === "spain-boundary",
        opacity: l.kind === "imagery" ? 0.9 : 1,
        time: l.kind === "imagery" ? l.time?.default : undefined,
      },
    ]),
  );
}
