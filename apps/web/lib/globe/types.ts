// Engine-agnostic globe types. Nothing in this file imports Cesium, so application state,
// layer catalogs and UI can be written (and tested) without the 3D engine.

/** A WGS84 coordinate in decimal degrees. `height` is metres above the ellipsoid, if known. */
export interface GeoCoordinate {
  latitude: number;
  longitude: number;
  height?: number;
}

/** A camera view that orbits a target point (heading/pitch in degrees, range in metres). */
export interface OrbitView {
  target: { latitude: number; longitude: number };
  heading: number;
  pitch: number;
  range: number;
  durationSeconds?: number;
}

/** Time dimension for time-dependent layers. Dates are ISO `YYYY-MM-DD` (UTC). */
export interface TimeDimension {
  default: string;
  min?: string;
  max?: string;
  step: "P1D" | "P1M" | "P1Y";
}

export interface LayerSource {
  name: string;
  url?: string;
  /** Short product identifier, e.g. the GIBS layer name or a dataset short name. */
  product?: string;
}

interface LayerBase {
  id: string;
  title: string;
  description: string;
  group: "imagery" | "reference" | "analysis";
  source: LayerSource;
  /** Native resolution, as stated by the provider (e.g. "250 m"). */
  resolution?: string;
  /** Set for any placeholder data so the UI can label it clearly. */
  synthetic?: boolean;
}

/** XYZ / WMTS tiled imagery. `{Time}` in the template is replaced by the selected date. */
export interface ImageryLayerDescriptor extends LayerBase {
  kind: "imagery";
  urlTemplate: string;
  maximumLevel: number;
  credit: string;
  time?: TimeDimension;
}

/** Vector features (GeoJSON object or URL). */
export interface GeoJsonLayerDescriptor extends LayerBase {
  kind: "geojson";
  data: object | string;
  style: { stroke: string; fill?: string; strokeWidth?: number };
}

// Future kinds (raster overlays, heatmaps, extruded columns) are added here as new union
// members plus one adapter each in lib/globe/cesium/layer-manager.ts.
export type LayerDescriptor = ImageryLayerDescriptor | GeoJsonLayerDescriptor;

/** User-controlled state of one layer. Kept separate from the descriptor. */
export interface LayerState {
  visible: boolean;
  opacity: number;
  time?: string;
}

export type LayerStateMap = Record<string, LayerState>;

export interface GlobeStatus {
  phase: "loading" | "ready" | "error";
  error?: string;
  baseImagery: string;
  terrain: { available: boolean; label: string };
}

/** Imperative camera API exposed by the globe to the surrounding UI. */
export interface GlobeController {
  flyTo(view: OrbitView): void;
  zoom(direction: 1 | -1): void;
  tilt(direction: 1 | -1): void;
  rotate(direction: 1 | -1): void;
  resetNorth(): void;
}
