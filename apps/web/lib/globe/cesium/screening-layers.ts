import type { LayerDescriptor, LayerStateMap } from "../types";
import {
  mitecoImageUrl,
  VERDICT_COLORS,
  type Bounds4,
  type PvCell,
  type PvScreeningData,
  type SolarPlant,
} from "../pv-screening";

/**
 * Solar PV screening layers for the Cesium scene. They are plain LayerDescriptors so the existing
 * CesiumLayerManager creates, toggles and removes them (no second rendering path):
 *  (a) verdict cells: one flat translucent rectangle per native MERRA-2 cell (no interpolation),
 *      one GeoJSON layer per verdict so each keeps its own colour; `no_data` cells are not drawn;
 *  (b) MITECO environmental-sensitivity PNGs as single-tile imagery with their stated bounds;
 *  (c) solar plants as points sized by MW; landmarks keep a label, construction = ring symbol.
 */

export type ScreeningToggles = { cells: boolean; miteco: boolean; plants: boolean };

export const SCREENING_LAYER_IDS = {
  cells: ["pv-cells-good", "pv-cells-mixed", "pv-cells-avoid"] as const,
  selected: "pv-cell-selected",
  mitecoPrefix: "pv-miteco-",
  plants: "pv-solar-plants",
};

const CELL_FILL_ALPHA = { good: "66", mixed: "5c", avoid: "52" } as const; // hex alpha ≈ 0.40 / 0.36 / 0.32

function ring(b: Bounds4): [number, number][] {
  const [w, s, e, n] = b;
  return [
    [w, s],
    [e, s],
    [e, n],
    [w, n],
    [w, s],
  ];
}

function cellLayer(verdict: "good" | "mixed" | "avoid", cells: PvCell[], period: [number, number]): LayerDescriptor {
  const color = VERDICT_COLORS[verdict];
  const subset = cells.filter((c) => c.verdict === verdict);
  return {
    id: `pv-cells-${verdict}`,
    kind: "geojson",
    group: "analysis",
    title: `PV screening: ${verdict}`,
    description: `Evidence-based PV screening verdict per native MERRA-2 cell, ${period[0]}–${period[1]}. Exploratory.`,
    cacheKey: `pv-${verdict}-${subset.length}-${subset[0]?.id ?? ""}`,
    source: { name: "AETHRA PV screening (NASA MERRA-2 + MITECO)" },
    resolution: "MERRA-2 0.5° × 0.625° cell",
    data: {
      type: "FeatureCollection",
      features: subset.map((c) => ({
        type: "Feature",
        properties: { id: c.id },
        geometry: { type: "Polygon", coordinates: [ring(c.bounds)] },
      })),
    },
    style: { stroke: color, fill: `${color}${CELL_FILL_ALPHA[verdict]}`, strokeWidth: 1 },
  };
}

function plantSize(mw: number): number {
  // Area ∝ MW (sqrt), clamped so small plants stay clickable and big ones do not cover a region.
  return Math.max(4, Math.min(15, 3.5 + 1.6 * Math.sqrt(Math.max(0, mw) / 10)));
}

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/** Plants to draw: the plant register if present, otherwise just the landmarks. */
export function screeningPlants(data: PvScreeningData): { plant: SolarPlant; landmark: boolean }[] {
  const landmarks = data.screening?.landmarks ?? [];
  const landmarkNames = landmarks.map((l) => norm(l.name));
  // Register names carry suffixes ("… solar farm (phase 1)"): match by position or by name prefix.
  const isLandmark = (p: SolarPlant) =>
    landmarks.some((l) => Math.abs(l.lat - p.lat) < 1e-4 && Math.abs(l.lon - p.lon) < 1e-4) ||
    landmarkNames.some((n) => n.length > 0 && norm(p.name).startsWith(n));
  const fromLandmark = (l: (typeof landmarks)[number]) => ({
    plant: { name: l.name, mw: l.mw, tech: l.tech, status: "operating", lat: l.lat, lon: l.lon, miteco_class: l.miteco_class } as SolarPlant,
    landmark: true,
  });
  if (data.plants?.plants.length) {
    const drawn = data.plants.plants
      .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lon))
      .map((plant) => ({ plant, landmark: isLandmark(plant) }));
    // Landmarks missing from the register (e.g. aggregated CSP complexes) are still drawn and labelled.
    const unmatched = landmarks.filter(
      (l, i) =>
        !drawn.some(
          ({ plant: p }) =>
            (Math.abs(l.lat - p.lat) < 1e-4 && Math.abs(l.lon - p.lon) < 1e-4) || norm(p.name).startsWith(landmarkNames[i]),
        ),
    );
    return [...drawn, ...unmatched.map(fromLandmark)];
  }
  return landmarks.map(fromLandmark);
}

export function buildScreeningLayers(
  data: PvScreeningData,
  selectedCell: PvCell | null,
  plantDetail: (p: SolarPlant) => string,
): LayerDescriptor[] {
  const out: LayerDescriptor[] = [];
  const s = data.screening;

  if (data.miteco) {
    data.miteco.images.forEach((img, i) => {
      const [w, so, e, n] = img.bounds;
      out.push({
        id: `${SCREENING_LAYER_IDS.mitecoPrefix}${i}`,
        kind: "raster-field",
        group: "analysis",
        title: "MITECO environmental sensitivity for PV",
        description: "Official environmental zoning for renewable energy (MITECO). Class 0 = maximum sensitivity (not recommended).",
        source: { name: "MITECO · Zonificación ambiental para energías renovables (fotovoltaica)" },
        resolution: "As published by MITECO (rasterised)",
        url: mitecoImageUrl(img.file),
        science: {
          variable: "environmental_sensitivity_class",
          units: "class 0–4",
          bounds: { west: w, south: so, east: e, north: n },
          spatialResolution: "As published by MITECO",
          timeCoverage: { start: "2024-01-01", end: "2024-12-31", step: "P1Y" },
          encoding: "color",
          missingData: { policy: "hide" },
        },
      });
    });
  }

  if (s) {
    out.push(cellLayer("good", s.cells, s.period), cellLayer("mixed", s.cells, s.period), cellLayer("avoid", s.cells, s.period));
    if (selectedCell) {
      out.push({
        id: SCREENING_LAYER_IDS.selected,
        kind: "geojson",
        group: "analysis",
        title: "Selected screening cell",
        description: "Outline of the selected native cell.",
        cacheKey: `pv-sel-${selectedCell.id}`,
        source: { name: "AETHRA PV screening" },
        data: {
          type: "FeatureCollection",
          features: [{ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: ring(selectedCell.bounds) } }],
        },
        style: { stroke: "#f8fafc", strokeWidth: 3 },
      });
    }
  }

  const plants = screeningPlants(data);
  if (plants.length) {
    out.push({
      id: SCREENING_LAYER_IDS.plants,
      kind: "point-values",
      group: "reference",
      title: "Solar plants (operating and under construction)",
      description: "Real solar plants. Markers sized by capacity (MW). Not generation.",
      source: { name: typeof data.plants?.source === "string" ? data.plants.source : "Global Energy Monitor · Global Solar Power Tracker" },
      resolution: "Plant point (as reported)",
      data: {
        type: "FeatureCollection",
        features: plants.map(({ plant, landmark }, i) => ({
          type: "Feature",
          properties: {
            kind: "installation",
            id: `pv-plant-${i}`,
            name: plant.name,
            value: plant.mw,
            units: "MW",
            detail: plantDetail(plant),
            color: landmark ? "#fde68a" : "#e2e8f0",
            pixelSize: plantSize(plant.mw),
            symbol: plant.status === "construction" ? "ring" : undefined,
            hideLabel: landmark ? 0 : 1,
            latitude: plant.lat,
            longitude: plant.lon,
          },
          geometry: { type: "Point", coordinates: [plant.lon, plant.lat] },
        })),
      },
      science: {
        variable: "installed_capacity",
        units: "MW",
        bounds: { west: -18.5, south: 27.5, east: 4.5, north: 44 },
        spatialResolution: "Plant point",
        timeCoverage: { start: "2026-02-01", end: "2026-02-28", step: "P1M" },
        encoding: "color",
        missingData: { policy: "hide" },
      },
    });
  }
  return out;
}

export function screeningLayerStates(layers: LayerDescriptor[], toggles: ScreeningToggles): LayerStateMap {
  const states: LayerStateMap = {};
  for (const l of layers) {
    if (l.id.startsWith(SCREENING_LAYER_IDS.mitecoPrefix)) states[l.id] = { visible: toggles.miteco, opacity: 0.72 };
    else if (l.id === SCREENING_LAYER_IDS.plants) states[l.id] = { visible: toggles.plants, opacity: 1 };
    else if (l.id === SCREENING_LAYER_IDS.selected) states[l.id] = { visible: true, opacity: 1 };
    else states[l.id] = { visible: toggles.cells, opacity: 1 };
  }
  return states;
}
