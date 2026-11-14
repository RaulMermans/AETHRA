// Engine-agnostic globe types. Nothing in this file imports Cesium, so application state,
// layer catalogs and UI can be written (and tested) without the 3D engine.

/** Physical terrain elevation (never a graphically extruded value). */
export interface Elevation {
  metres: number;
  /** Reference surface of `metres`. Ellipsoidal (WGS84) and orthometric (sea level) differ by ~50 m in Spain. */
  datum: "ellipsoid-wgs84" | "orthometric";
  /** Terrain source the value came from. */
  source: string;
  /** True when read from the currently rendered (level-of-detail) mesh rather than the most detailed data. */
  approximate: boolean;
}

/** A WGS84 coordinate in decimal degrees, with terrain elevation when valid data exists. */
export interface GeoCoordinate {
  latitude: number;
  longitude: number;
  elevation?: Elevation;
}

/** Identified overlay under the cursor (NOAA station, basin hub, river, lake or reservoir). */
export interface OverlayFeature {
  kind: "station" | "basin-hub" | "river-line" | "lake" | "reservoir" | "lagoon";
  id: string;
  name: string;
  value?: number;
  units?: string;
  elevationM?: number;
  basin?: string;
  latitude: number;
  longitude: number;
}

/** A camera view that orbits a target point (heading/pitch in degrees, range in metres). */
export interface OrbitView {
  target: { latitude: number; longitude: number };
  heading: number;
  pitch: number;
  range: number;
  durationSeconds?: number;
  /** Raise the orbit target to the terrain surface (mountain views). */
  terrainAware?: boolean;
}

export interface Place {
  id: string;
  name: string;
  hint: string;
  view: OrbitView;
}

/** Time dimension for time-dependent layers. Dates are ISO `YYYY-MM-DD` (UTC). */
export interface TimeDimension {
  default: string;
  min?: string;
  max?: string;
  step: "P1D" | "P1M" | "P1Y";
  /** When true the UI shows the date but does not let the user change it. */
  locked?: boolean;
}

export interface LayerSource {
  name: string;
  url?: string;
  /** Short product identifier, e.g. the GIBS layer name or a dataset short name. */
  product?: string;
  version?: string;
  /** DOI or CMR concept ID for traceability. */
  doi?: string;
}

/** WGS84 bounding box in decimal degrees. */
export interface GeoBounds {
  west: number;
  south: number;
  east: number;
  north: number;
}

/**
 * Metadata every scientific (data-bearing) layer must carry. Visual-only layers (base maps,
 * reference outlines) omit it. Values come from the API / packages/science, never the browser.
 */
export interface ScientificLayerMetadata {
  variable: string;
  units: string;
  bounds: GeoBounds;
  /** Native spatial support, e.g. "0.1°" or "250 m". Rendering must not imply finer detail. */
  spatialResolution: string;
  timeCoverage: { start: string; end: string; step: TimeDimension["step"] };
  encoding: "color" | "extrusion" | "color+extrusion";
  colorScale?: {
    /** Numeric domain in `units`. */
    domain: [number, number];
    /** Colorblind-safe palette id (sequential, or diverging only around a meaningful zero). */
    palette: string;
    kind: "sequential" | "diverging";
  };
  /** Extrusion scale for 3D columns: metres of graphic height per unit. Never physical terrain. */
  extrusion?: { metresPerUnit: number };
  /** How missing / invalid cells are shown; must stay visually distinct from zero. */
  missingData: { policy: "hide" | "hatch" | "neutral-color"; fillValue?: number };
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
  /** Present on data-bearing layers. */
  science?: ScientificLayerMetadata;
}

/** XYZ / WMTS tiled imagery. `{Time}` in the template is replaced by the selected date. */
export interface ImageryLayerDescriptor extends LayerBase {
  kind: "imagery";
  urlTemplate: string;
  /** Highest level the source natively serves; Cesium upsamples beyond it. */
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

/** Gridded field delivered by the API as georeferenced tiles or an image + bounds. */
export interface RasterFieldLayerDescriptor extends LayerBase {
  kind: "raster-field";
  science: ScientificLayerMetadata;
  url: string;
  time?: TimeDimension;
}

/** Point values (stations, sampled cells) shown as markers and/or extruded columns. */
export interface PointValuesLayerDescriptor extends LayerBase {
  kind: "point-values";
  science: ScientificLayerMetadata;
  /** GeoJSON FeatureCollection of Points (or URL) with a numeric `value` property. */
  data: object | string;
  time?: TimeDimension;
}

// Imagery and GeoJSON have Cesium adapters today. Raster fields and point values are typed
// now so API contracts and UI can be built; their adapters come with the first real dataset.
export type LayerDescriptor =
  | ImageryLayerDescriptor
  | GeoJsonLayerDescriptor
  | RasterFieldLayerDescriptor
  | PointValuesLayerDescriptor;

/** User-controlled state of one layer. Kept separate from the descriptor. */
export interface LayerState {
  visible: boolean;
  opacity: number;
  time?: string;
}

export type LayerStateMap = Record<string, LayerState>;

export type QualityProfile = "high" | "balanced" | "performance";
export type QualityMode = "auto" | QualityProfile;

export interface GlobeStatus {
  phase: "loading" | "ready" | "error";
  error?: string;
  imagery: {
    label: string;
    /** Finest native ground resolution available, for honest zoom limits. */
    finestDetail: string;
    failedTiles: number;
  };
  terrain: {
    available: boolean;
    label: string;
    datum?: Elevation["datum"];
    failedTiles: number;
  };
  quality: { profile: QualityProfile; mode: QualityMode; reason: string };
}

/** Imperative camera API exposed by the globe to the surrounding UI. */
/** Map tools that take clicks on the globe. Add new ids here and in components/explore/ToolsBar.tsx. */
export type ClickToolId = "distance" | "offset" | "area" | "radius" | "profile";
/** Tools that only open a panel (no clicks on the globe). */
export type PanelToolId = "stations" | "evidence";
/** Tools shown in the /explore Map tools bar (click tools are not exposed in the UI — see D45). */
export type ToolId = PanelToolId;

/**
 * Active click tool with the points clicked so far. `preview` follows the cursor while a
 * measurement is incomplete; `closed` marks a finished polygon (area tool).
 */
export interface MeasureState {
  tool: ClickToolId;
  points: GeoCoordinate[];
  preview?: GeoCoordinate | null;
  closed?: boolean;
}

/** One sample of a terrain profile: distance from A along the geodesic and terrain height. */
export interface ProfileSample {
  distance: number;
  height: number;
  latitude: number;
  longitude: number;
}

/** Camera position (degrees, metres) — used for shareable links. */
export interface CameraState {
  latitude: number;
  longitude: number;
  height: number;
  heading: number;
  pitch: number;
}

/** "spain": only Spain + surrounding sea is rendered (D21). "world": the whole globe. */
export type ViewMode = "spain" | "world";

/** Flat map (2D, Web-Mercator-like projection seen from above) or the 3D globe. */
export type SceneDim = "2d" | "3d";

export interface GlobeController {
  flyTo(view: OrbitView): void;
  /** Animated switch between the flat map and the globe (0 s = instant). */
  setDimension(dim: SceneDim, durationSeconds?: number): void;
  getCamera(): CameraState;
  setCamera(camera: CameraState, durationSeconds?: number): void;
  /** Terrain heights along the A→B geodesic; null without real terrain. */
  sampleProfile(a: GeoCoordinate, b: GeoCoordinate, samples?: number): Promise<ProfileSample[] | null>;
  /** Visual relief exaggeration (1 = true scale). Readouts stay in true metres. */
  setVerticalExaggeration(factor: number): void;
  /** PNG of the current view with attribution burned in. */
  screenshot(): Promise<Blob | null>;
  zoom(direction: 1 | -1): void;
  tilt(direction: 1 | -1): void;
  rotate(direction: 1 | -1): void;
  resetNorth(): void;
}
