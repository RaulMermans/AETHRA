"use client";

import "cesium/Build/Cesium/Widgets/widgets.css";
import type * as CesiumNS from "cesium";
import { useEffect, useRef, type KeyboardEvent } from "react";
import { FALLBACK_BASE_IMAGERY, HOME_VIEW } from "@/lib/globe/catalog";
import { createCameraController, setOrbitView } from "@/lib/globe/cesium/camera";
import { CesiumLayerManager } from "@/lib/globe/cesium/layer-manager";
import { loadCesium } from "@/lib/globe/cesium/load";
import { pickCoordinate } from "@/lib/globe/cesium/picking";
import type {
  GeoCoordinate,
  GlobeController,
  GlobeStatus,
  LayerDescriptor,
  LayerStateMap,
} from "@/lib/globe/types";

export interface GlobeProps {
  layers: LayerDescriptor[];
  layerStates: LayerStateMap;
  selected: GeoCoordinate | null;
  onHover?: (coordinate: GeoCoordinate | null) => void;
  onSelect?: (coordinate: GeoCoordinate | null) => void;
  onStatus?: (status: GlobeStatus) => void;
  onReady?: (controller: GlobeController | null) => void;
  /** Element that receives imagery/terrain attribution. */
  creditContainer?: HTMLElement | null;
  className?: string;
}

const ACCENT = "#7cc4ff";

/**
 * CesiumJS globe. Client-only: load it through `GlobeClient` (next/dynamic, ssr: false).
 * Owns the Cesium Viewer lifecycle; everything else (layer state, selection) comes in via props.
 */
export default function Globe(props: GlobeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const propsRef = useRef(props);
  propsRef.current = props;

  const engine = useRef<{
    Cesium: typeof CesiumNS;
    viewer: CesiumNS.Viewer;
    layers: CesiumLayerManager;
    controller: GlobeController;
    marker: CesiumNS.Entity;
  } | null>(null);

  // --- Viewer lifecycle -------------------------------------------------------------------
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let disposed = false;
    let viewer: CesiumNS.Viewer | undefined;
    let handler: CesiumNS.ScreenSpaceEventHandler | undefined;
    let layers: CesiumLayerManager | undefined;
    let frame = 0;

    const status: GlobeStatus = {
      phase: "loading",
      baseImagery: FALLBACK_BASE_IMAGERY.title,
      terrain: { available: false, label: "Loading…" },
    };
    const emit = (patch: Partial<GlobeStatus>) => {
      Object.assign(status, patch);
      propsRef.current.onStatus?.({ ...status });
    };
    emit({});

    (async () => {
      let Cesium: typeof CesiumNS;
      try {
        Cesium = await loadCesium();
      } catch (err) {
        if (!disposed) emit({ phase: "error", error: err instanceof Error ? err.message : String(err) });
        return;
      }
      if (disposed) return;

      const token = process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN?.trim();
      Cesium.Ion.defaultAccessToken = token ?? "";

      const fallbackBase = () =>
        new Cesium.ImageryLayer(
          new Cesium.UrlTemplateImageryProvider({
            url: FALLBACK_BASE_IMAGERY.urlTemplate,
            maximumLevel: FALLBACK_BASE_IMAGERY.maximumLevel,
            credit: new Cesium.Credit(FALLBACK_BASE_IMAGERY.credit, true),
          }),
        );

      try {
        viewer = new Cesium.Viewer(container, {
          baseLayer: token ? Cesium.ImageryLayer.fromWorldImagery({}) : fallbackBase(),
          animation: false,
          timeline: false,
          baseLayerPicker: false,
          geocoder: false,
          homeButton: false,
          sceneModePicker: false,
          navigationHelpButton: false,
          fullscreenButton: false,
          infoBox: false,
          selectionIndicator: false,
          creditContainer: propsRef.current.creditContainer ?? undefined,
          requestRenderMode: true,
          maximumRenderTimeChange: Infinity,
          showRenderLoopErrors: false,
          msaaSamples: 4,
        });
      } catch (err) {
        emit({
          phase: "error",
          error:
            "The 3D globe could not start. WebGL may be unavailable or disabled in this browser." +
            (err instanceof Error ? ` (${err.message})` : ""),
        });
        return;
      }
      const v = viewer;
      const { scene } = v;

      if (token) {
        emit({ baseImagery: "Cesium World Imagery (Bing Maps Aerial)" });
        const base = v.imageryLayers.get(0);
        base.errorEvent.addEventListener(() => {
          if (v.isDestroyed()) return;
          v.imageryLayers.remove(base, true);
          v.imageryLayers.add(fallbackBase(), 0);
          emit({ baseImagery: `${FALLBACK_BASE_IMAGERY.title} (ion imagery failed)` });
        });
      }

      // Rendering quality and atmosphere.
      v.resolutionScale = Math.min(window.devicePixelRatio || 1, 2) / (window.devicePixelRatio || 1);
      v.useBrowserRecommendedResolution = false;
      scene.backgroundColor = Cesium.Color.BLACK;
      scene.globe.baseColor = Cesium.Color.fromCssColorString("#0b1424");
      scene.globe.enableLighting = true;
      scene.globe.dynamicAtmosphereLighting = true;
      scene.globe.dynamicAtmosphereLightingFromSun = true;
      scene.globe.showGroundAtmosphere = true;
      scene.globe.depthTestAgainstTerrain = false;
      if (scene.skyAtmosphere) scene.skyAtmosphere.show = true;
      scene.fog.enabled = true;
      scene.postProcessStages.fxaa.enabled = true;
      // Sun fixed at 12:00 UTC today so Europe/Spain is lit regardless of the viewer's clock.
      // Cosmetic lighting only; not tied to any data timestamp.
      const noon = new Date();
      noon.setUTCHours(12, 0, 0, 0);
      v.clock.currentTime = Cesium.JulianDate.fromDate(noon);
      v.clock.shouldAnimate = false;

      const ctrl = scene.screenSpaceCameraController;
      ctrl.minimumZoomDistance = 100;
      ctrl.maximumZoomDistance = 40_000_000;
      ctrl.enableCollisionDetection = true;
      v.cesiumWidget.screenSpaceEventHandler.removeInputAction(
        Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK,
      );

      setOrbitView(Cesium, v, { ...HOME_VIEW, range: HOME_VIEW.range * 1.6 });

      // Selected-location marker (halo + point), hidden until a location is chosen.
      const marker = v.entities.add({
        id: "selected-location",
        show: false,
        position: Cesium.Cartesian3.fromDegrees(0, 0),
        point: {
          pixelSize: 11,
          color: Cesium.Color.fromCssColorString(ACCENT),
          outlineColor: Cesium.Color.WHITE,
          outlineWidth: 2,
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
        ellipse: {
          semiMajorAxis: 12_000,
          semiMinorAxis: 12_000,
          material: Cesium.Color.fromCssColorString(ACCENT).withAlpha(0.18),
          outline: false, // no height => drawn on the ground (terrain-clamped)
        },
      });

      // Pointer interaction.
      handler = new Cesium.ScreenSpaceEventHandler(scene.canvas);
      let pending: CesiumNS.Cartesian2 | undefined;
      handler.setInputAction((m: CesiumNS.ScreenSpaceEventHandler.MotionEvent) => {
        pending = m.endPosition;
        if (frame) return;
        frame = requestAnimationFrame(() => {
          frame = 0;
          if (v.isDestroyed()) return;
          propsRef.current.onHover?.(pickCoordinate(Cesium, v, pending, status.terrain.available));
        });
      }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
      handler.setInputAction((c: CesiumNS.ScreenSpaceEventHandler.PositionedEvent) => {
        const coord = pickCoordinate(Cesium, v, c.position, status.terrain.available);
        if (coord) propsRef.current.onSelect?.(coord);
      }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
      scene.canvas.addEventListener("pointerleave", () => propsRef.current.onHover?.(null));

      scene.renderError.addEventListener((_s: CesiumNS.Scene, err: unknown) => {
        emit({
          phase: "error",
          error: `Rendering stopped: ${err instanceof Error ? err.message : String(err)}`,
        });
      });

      layers = new CesiumLayerManager(Cesium, v, (id, err) =>
        console.warn(`[globe] layer "${id}" failed`, err),
      );
      const controller = createCameraController(Cesium, v);
      engine.current = { Cesium, viewer: v, layers, controller, marker };
      void layers.sync(propsRef.current.layers, propsRef.current.layerStates);

      emit({ phase: "ready" });
      propsRef.current.onReady?.(controller);
      controller.flyTo(HOME_VIEW);

      // Terrain (needs Cesium ion). Without a token the globe is a smooth ellipsoid.
      if (!token) {
        emit({ terrain: { available: false, label: "Off — no Cesium ion token" } });
        return;
      }
      try {
        const terrain = await Cesium.createWorldTerrainAsync({
          requestVertexNormals: true,
          requestWaterMask: true,
        });
        if (disposed || v.isDestroyed()) return;
        v.terrainProvider = terrain;
        emit({ terrain: { available: true, label: "Cesium World Terrain" } });
      } catch {
        if (!disposed) emit({ terrain: { available: false, label: "Unavailable — ion request failed" } });
      }
    })();

    return () => {
      disposed = true;
      if (frame) cancelAnimationFrame(frame);
      propsRef.current.onReady?.(null);
      engine.current = null;
      layers?.destroy();
      if (handler && !handler.isDestroyed()) handler.destroy();
      if (viewer && !viewer.isDestroyed()) viewer.destroy();
    };
  }, []);

  // --- Layers -----------------------------------------------------------------------------
  useEffect(() => {
    void engine.current?.layers.sync(props.layers, props.layerStates);
  }, [props.layers, props.layerStates]);

  // --- Selected marker --------------------------------------------------------------------
  useEffect(() => {
    const e = engine.current;
    if (!e) return;
    const { Cesium, viewer, marker } = e;
    marker.show = props.selected !== null;
    if (props.selected) {
      marker.position = new Cesium.ConstantPositionProperty(
        Cesium.Cartesian3.fromDegrees(props.selected.longitude, props.selected.latitude),
      );
    }
    viewer.scene.requestRender();
  }, [props.selected]);

  // --- Keyboard ---------------------------------------------------------------------------
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const c = engine.current?.controller;
    if (!c) return;
    const actions: Record<string, () => void> = {
      ArrowLeft: () => c.rotate(-1),
      ArrowRight: () => c.rotate(1),
      ArrowUp: () => c.tilt(1),
      ArrowDown: () => c.tilt(-1),
      "+": () => c.zoom(1),
      "=": () => c.zoom(1),
      "-": () => c.zoom(-1),
      n: () => c.resetNorth(),
    };
    const action = actions[event.key];
    if (action) {
      event.preventDefault();
      action();
    }
  };

  return (
    <div
      ref={containerRef}
      className={props.className}
      tabIndex={0}
      role="application"
      aria-label="Interactive 3D globe. Drag to rotate, scroll or pinch to zoom, Ctrl-drag or middle-drag to tilt. Keyboard: arrow keys rotate and tilt, plus and minus zoom, N resets north."
      onKeyDown={onKeyDown}
    />
  );
}
