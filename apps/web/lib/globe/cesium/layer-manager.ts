import type * as CesiumNS from "cesium";
import { spainRectangles } from "./providers";
import type {
  GeoJsonLayerDescriptor,
  ImageryLayerDescriptor,
  LayerDescriptor,
  LayerState,
  LayerStateMap,
  PointValuesLayerDescriptor,
  RasterFieldLayerDescriptor,
  ViewMode,
} from "../types";

type Cesium = typeof CesiumNS;

/** Runtime handle for one layer on the globe. */
interface LayerHandle {
  /** Value of the state that requires re-creating the layer (e.g. the date or data URL). */
  key: string;
  /** Present for imagery layers (one per Spain extent), used to keep stacking order. */
  imagery?: CesiumNS.ImageryLayer[];
  apply(state: LayerState): void;
  destroy(): void;
}

interface AdapterContext {
  Cesium: Cesium;
  viewer: CesiumNS.Viewer;
  /** Spain mode: imagery requested only inside these. Undefined: whole globe. */
  rectangles?: CesiumNS.Rectangle[];
}

type Adapter<D extends LayerDescriptor> = (
  ctx: AdapterContext,
  descriptor: D,
  state: LayerState,
) => Promise<LayerHandle>;

const imageryAdapter: Adapter<ImageryLayerDescriptor> = async ({ Cesium, viewer, rectangles }, d, state) => {
  const time = state.time ?? d.time?.default ?? "";
  // Spain mode (D21): request tiles only inside the Spain extents.
  const layers = (rectangles ?? [undefined]).map((rectangle) => {
    const provider = new Cesium.UrlTemplateImageryProvider({
      url: d.urlTemplate.replace("{Time}", time),
      maximumLevel: d.maximumLevel,
      credit: new Cesium.Credit(time && d.time ? `${d.credit} (${time})` : d.credit, true),
    });
    // Missing tiles (e.g. a date without data) are expected: render nothing for them.
    provider.errorEvent.addEventListener((err: CesiumNS.TileProviderError) => {
      err.retry = false;
    });
    const layer = new Cesium.ImageryLayer(provider, { rectangle });
    viewer.imageryLayers.add(layer);
    return layer;
  });
  return {
    key: `${time}|${rectangles ? "spain" : "world"}`,
    imagery: layers,
    apply(s) {
      for (const layer of layers) {
        layer.show = s.visible;
        layer.alpha = s.opacity;
      }
    },
    destroy() {
      if (viewer.isDestroyed()) return;
      for (const layer of layers) viewer.imageryLayers.remove(layer, true);
    },
  };
};

const rasterFieldAdapter: Adapter<RasterFieldLayerDescriptor> = async ({ Cesium, viewer }, d, state) => {
  if (!d.url) {
    return {
      key: "empty",
      apply() {},
      destroy() {},
    };
  }
  const b = d.science.bounds;
  const rectangle = Cesium.Rectangle.fromDegrees(b.west, b.south, b.east, b.north);
  const provider = await Cesium.SingleTileImageryProvider.fromUrl(d.url, {
    rectangle,
    credit: new Cesium.Credit(`${d.source.name}${d.source.product ? ` · ${d.source.product}` : ""}`, false),
  });
  const layer = new Cesium.ImageryLayer(provider, { rectangle });
  layer.show = state.visible;
  layer.alpha = state.opacity;
  viewer.imageryLayers.add(layer);

  return {
    key: d.url,
    imagery: [layer],
    apply(s) {
      layer.show = s.visible;
      layer.alpha = s.opacity;
    },
    destroy() {
      if (!viewer.isDestroyed()) viewer.imageryLayers.remove(layer, true);
    },
  };
};

interface OverlayFeature {
  type: "Feature";
  properties?: Record<string, unknown>;
  geometry:
    | { type: "Point"; coordinates: [number, number] }
    | { type: "LineString"; coordinates: [number, number][] };
}

const pointValuesAdapter: Adapter<PointValuesLayerDescriptor> = async ({ Cesium, viewer }, d, state) => {
  const ds = new Cesium.CustomDataSource(`points-${d.id}`);
  const fc = (typeof d.data === "object" && d.data !== null ? d.data : { features: [] }) as {
    features?: OverlayFeature[];
  };

  for (const f of fc.features ?? []) {
    const props = f.properties ?? {};
    const cssColor = typeof props.color === "string" ? props.color : "#7cc4ff";
    const color = Cesium.Color.fromCssColorString(cssColor);

    if (f.geometry.type === "Point") {
      const [lon, lat] = f.geometry.coordinates;
      const isBasinHub = props.kind === "basin-hub";
      const px = typeof props.pixelSize === "number" ? props.pixelSize : 7.5;
      ds.entities.add({
        position: Cesium.Cartesian3.fromDegrees(lon, lat, 120),
        point: {
          pixelSize: px,
          color: color.withAlpha(state.opacity),
          outlineColor: isBasinHub ? Cesium.Color.fromCssColorString("#38bdf8") : Cesium.Color.fromCssColorString("#0b1424"),
          outlineWidth: isBasinHub ? 2.5 : 1.5,
          heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
      });
    } else if (f.geometry.type === "LineString") {
      const flatCoords: number[] = [];
      for (const [lon, lat] of f.geometry.coordinates) {
        flatCoords.push(lon, lat);
      }
      const isAdminActive = props.kind === "admin-active-outline";
      const isAdminParent = props.kind === "admin-parent-outline" || props.kind === "admin-province-outline";
      ds.entities.add({
        polyline: {
          positions: Cesium.Cartesian3.fromDegreesArray(flatCoords),
          width: isAdminActive ? 4.5 : isAdminParent ? 2.0 : 3.5,
          material: new Cesium.PolylineGlowMaterialProperty({
            glowPower: isAdminActive ? 0.32 : 0.2,
            color: color.withAlpha(isAdminParent ? state.opacity * 0.55 : state.opacity),
          }),
          clampToGround: true,
        },
      });
    }
  }

  ds.show = state.visible;
  await viewer.dataSources.add(ds);
  const lastProps = fc.features?.[fc.features.length - 1]?.properties as Record<string, unknown> | undefined;
  const dataKey =
    JSON.stringify(d.time ?? "") +
    `|${(fc.features ?? []).length}|${(fc.features?.[0]?.properties as Record<string, unknown> | undefined)?.value ?? ""}|${lastProps?.name ?? ""}`;

  return {
    key: dataKey,
    apply(s) {
      ds.show = s.visible;
    },
    destroy() {
      if (!viewer.isDestroyed()) viewer.dataSources.remove(ds, true);
    },
  };
};

const geoJsonAdapter: Adapter<GeoJsonLayerDescriptor> = async ({ Cesium, viewer }, d) => {
  const stroke = Cesium.Color.fromCssColorString(d.style.stroke);
  const fill = d.style.fill ? Cesium.Color.fromCssColorString(d.style.fill) : Cesium.Color.TRANSPARENT;
  const ds = await Cesium.GeoJsonDataSource.load(d.data, {
    stroke,
    fill,
    strokeWidth: d.style.strokeWidth ?? 2,
    clampToGround: true,
  });
  await viewer.dataSources.add(ds);
  return {
    key: "",
    apply(s) {
      ds.show = s.visible;
      for (const e of ds.entities.values) {
        if (e.polyline) e.polyline.material = new Cesium.ColorMaterialProperty(stroke.withAlpha(s.opacity));
        if (e.polygon) e.polygon.material = new Cesium.ColorMaterialProperty(fill.withAlpha(fill.alpha * s.opacity));
      }
    },
    destroy() {
      if (!viewer.isDestroyed()) viewer.dataSources.remove(ds, true);
    },
  };
};

const adapters: { [K in LayerDescriptor["kind"]]?: Adapter<Extract<LayerDescriptor, { kind: K }>> } = {
  imagery: imageryAdapter,
  geojson: geoJsonAdapter,
  "raster-field": rasterFieldAdapter,
  "point-values": pointValuesAdapter,
};

function computeLayerKey(d: LayerDescriptor, state: LayerState, mode: ViewMode): string {
  if (d.kind === "imagery") return `${state.time ?? d.time?.default ?? ""}|${mode}`;
  if (d.kind === "raster-field") return d.url;
  if (d.kind === "point-values") {
    const fc = d.data as { features?: Array<{ properties?: Record<string, unknown> }> };
    const firstVal = fc?.features?.[0]?.properties?.value ?? "";
    const firstColor = fc?.features?.[0]?.properties?.color ?? "";
    const lastName = fc?.features?.[fc.features.length - 1]?.properties?.name ?? "";
    return `${fc?.features?.length ?? 0}|${firstVal}|${firstColor}|${lastName}`;
  }
  return "";
}

/**
 * Reconciles declarative layer descriptors + state with the Cesium scene. Layers are created
 * lazily on first show, and re-created when their key (e.g. date or data URL) changes. Calls are
 * serialized so rapid UI changes never race.
 */
export class CesiumLayerManager {
  private handles = new Map<string, LayerHandle>();
  private queue: Promise<void> = Promise.resolve();
  private destroyed = false;

  constructor(
    private readonly Cesium: Cesium,
    private readonly viewer: CesiumNS.Viewer,
    private readonly onError: (layerId: string, error: unknown) => void,
  ) {}

  sync(layers: LayerDescriptor[], states: LayerStateMap, mode: ViewMode): Promise<void> {
    this.queue = this.queue.then(() => this.reconcile(layers, states, mode));
    return this.queue;
  }

  private async reconcile(layers: LayerDescriptor[], states: LayerStateMap, mode: ViewMode) {
    const rectangles = mode === "spain" ? spainRectangles(this.Cesium) : undefined;
    for (const d of layers) {
      if (this.destroyed) return;
      const state = states[d.id];
      if (!state) continue;
      let handle = this.handles.get(d.id);
      const key = computeLayerKey(d, state, mode);
      if (handle && handle.key !== key) {
        handle.destroy();
        this.handles.delete(d.id);
        handle = undefined;
      }
      if (!handle && state.visible) {
        try {
          const adapter = adapters[d.kind] as Adapter<LayerDescriptor> | undefined;
          if (!adapter) throw new Error(`No Cesium adapter for layer kind "${d.kind}" yet`);
          handle = await adapter({ Cesium: this.Cesium, viewer: this.viewer, rectangles }, d, state);
        } catch (err) {
          this.onError(d.id, err);
          continue;
        }
        if (this.destroyed) {
          handle.destroy();
          return;
        }
        this.handles.set(d.id, handle);
      }
      handle?.apply(state);
    }
    this.orderImagery(layers);
    this.viewer.scene.requestRender();
  }

  /** Keep imagery stacking order equal to catalog order (first = lowest, above base map). */
  private orderImagery(layers: LayerDescriptor[]) {
    for (const d of layers) {
      for (const layer of this.handles.get(d.id)?.imagery ?? []) this.viewer.imageryLayers.raiseToTop(layer);
    }
  }

  destroy() {
    this.destroyed = true;
    for (const h of this.handles.values()) h.destroy();
    this.handles.clear();
  }
}
