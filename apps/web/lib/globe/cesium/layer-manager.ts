import type * as CesiumNS from "cesium";
import { spainRectangles } from "./providers";
import type {
  GeoJsonLayerDescriptor,
  ImageryLayerDescriptor,
  LayerDescriptor,
  LayerState,
  LayerStateMap,
} from "../types";

type Cesium = typeof CesiumNS;

/** Runtime handle for one layer on the globe. */
interface LayerHandle {
  /** Value of the state that requires re-creating the layer (e.g. the date). */
  key: string;
  /** Present for imagery layers (one per Spain extent), used to keep stacking order. */
  imagery?: CesiumNS.ImageryLayer[];
  apply(state: LayerState): void;
  destroy(): void;
}

interface AdapterContext {
  Cesium: Cesium;
  viewer: CesiumNS.Viewer;
}

type Adapter<D extends LayerDescriptor> = (
  ctx: AdapterContext,
  descriptor: D,
  state: LayerState,
) => Promise<LayerHandle>;

const imageryAdapter: Adapter<ImageryLayerDescriptor> = async ({ Cesium, viewer }, d, state) => {
  const time = state.time ?? d.time?.default ?? "";
  // Only Spain is rendered (D21): request tiles only inside the Spain extents.
  const layers = spainRectangles(Cesium).map((rectangle) => {
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
    key: time,
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

// Kinds without an adapter yet (raster-field, point-values) are reported via onError and skipped.
const adapters: { [K in LayerDescriptor["kind"]]?: Adapter<Extract<LayerDescriptor, { kind: K }>> } = {
  imagery: imageryAdapter,
  geojson: geoJsonAdapter,
};

/**
 * Reconciles declarative layer descriptors + state with the Cesium scene. Layers are created
 * lazily on first show, and re-created when their key (e.g. date) changes. Calls are
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

  sync(layers: LayerDescriptor[], states: LayerStateMap): Promise<void> {
    this.queue = this.queue.then(() => this.reconcile(layers, states));
    return this.queue;
  }

  private async reconcile(layers: LayerDescriptor[], states: LayerStateMap) {
    for (const d of layers) {
      if (this.destroyed) return;
      const state = states[d.id];
      if (!state) continue;
      let handle = this.handles.get(d.id);
      const key = d.kind === "imagery" ? (state.time ?? d.time?.default ?? "") : "";
      if (handle && handle.key !== key) {
        handle.destroy();
        this.handles.delete(d.id);
        handle = undefined;
      }
      if (!handle && state.visible) {
        try {
          const adapter = adapters[d.kind] as Adapter<LayerDescriptor> | undefined;
          if (!adapter) throw new Error(`No Cesium adapter for layer kind "${d.kind}" yet`);
          handle = await adapter({ Cesium: this.Cesium, viewer: this.viewer }, d, state);
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
