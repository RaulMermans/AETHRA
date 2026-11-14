import type { LayerDescriptor, LayerStateMap, OrbitView } from "./types";

// --- Camera views ------------------------------------------------------------------------

export const HOME_VIEW: OrbitView = {
  target: { latitude: 30, longitude: -5 },
  heading: 0,
  pitch: -90,
  range: 21_000_000,
  durationSeconds: 2.4,
};

/** Default analysis extent (DECISIONS D5): Peninsula + Balearics, lon/lat WGS84. */
export const SPAIN_BBOX = { west: -9.5, south: 35.9, east: 4.4, north: 43.9 } as const;

export const SPAIN_VIEW: OrbitView = {
  target: { latitude: 39.2, longitude: -2.6 },
  heading: 0,
  pitch: -55,
  range: 2_050_000,
  durationSeconds: 3.2,
};

// --- Layers ------------------------------------------------------------------------------

const GIBS = "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best";

/** Base imagery used when no Cesium ion token is configured. */
export const FALLBACK_BASE_IMAGERY = {
  title: "NASA Blue Marble (shaded relief, bathymetry)",
  urlTemplate: `${GIBS}/BlueMarble_ShadedRelief_Bathymetry/default/default/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpeg`,
  maximumLevel: 8,
  credit: "NASA Blue Marble · NASA GIBS",
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
        visible: l.id === "spain-extent",
        opacity: l.kind === "imagery" ? 0.9 : 1,
        time: l.kind === "imagery" ? l.time?.default : undefined,
      },
    ]),
  );
}
