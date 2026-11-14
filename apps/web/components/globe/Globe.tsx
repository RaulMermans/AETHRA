"use client";

import "cesium/Build/Cesium/Widgets/widgets.css";
import type * as CesiumNS from "cesium";
import { useEffect, useRef, type KeyboardEvent } from "react";
import { HOME_VIEW, MIN_ZOOM_DISTANCE } from "@/lib/globe/catalog";
import { createCameraController, setOrbitView } from "@/lib/globe/cesium/camera";
import { CesiumLayerManager } from "@/lib/globe/cesium/layer-manager";
import { loadCesium } from "@/lib/globe/cesium/load";
import { pickCoordinate } from "@/lib/globe/cesium/picking";
import {
  createBaseImagery,
  createFallbackImagery,
  loadTerrain,
  sampleTerrainHeight,
  type TerrainResult,
} from "@/lib/globe/cesium/providers";
import {
  applyQualityProfile,
  detectQualityProfile,
  nextLowerProfile,
  QUALITY_PROFILES,
  watchFrameTimes,
} from "@/lib/globe/cesium/quality";
import type {
  GeoCoordinate,
  GlobeController,
  GlobeStatus,
  LayerDescriptor,
  LayerStateMap,
  QualityMode,
  QualityProfile,
} from "@/lib/globe/types";

export interface GlobeProps {
  layers: LayerDescriptor[];
  layerStates: LayerStateMap;
  selected: GeoCoordinate | null;
  qualityMode: QualityMode;
  onHover?: (coordinate: GeoCoordinate | null) => void;
  onSelect?: (coordinate: GeoCoordinate | null) => void;
  onStatus?: (status: GlobeStatus) => void;
  onReady?: (controller: GlobeController | null) => void;
  /** Element that receives imagery/terrain attribution. */
  creditContainer?: HTMLElement | null;
  className?: string;
}

const ACCENT = "#7cc4ff";

function isContextLost(canvas: HTMLCanvasElement): boolean {
  const gl = (canvas.getContext("webgl2") ?? canvas.getContext("webgl")) as WebGLRenderingContext | null;
  return gl?.isContextLost() ?? false;
}

/**
 * CesiumJS globe. Client-only: load it through `GlobeClient` (next/dynamic, ssr: false).
 * Owns the Cesium Viewer lifecycle; everything else (layer state, selection, quality mode)
 * comes in via props.
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
    setQuality: (mode: QualityMode) => void;
  } | null>(null);

  // --- Viewer lifecycle -------------------------------------------------------------------
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let disposed = false;
    let viewer: CesiumNS.Viewer | undefined;
    let handler: CesiumNS.ScreenSpaceEventHandler | undefined;
    let layers: CesiumLayerManager | undefined;
    let stopFrameWatch: (() => void) | undefined;
    let frame = 0;

    const detected = detectQualityProfile();
    const initialMode = propsRef.current.qualityMode;
    const status: GlobeStatus = {
      phase: "loading",
      imagery: { label: "Loading…", finestDetail: "—", failedTiles: 0 },
      terrain: { available: false, label: "Loading…", failedTiles: 0 },
      quality: {
        mode: initialMode,
        profile: initialMode === "auto" ? detected.profile : initialMode,
        reason: initialMode === "auto" ? detected.reason : "manual",
      },
    };
    const emit = (patch: Partial<GlobeStatus>) => {
      Object.assign(status, patch);
      if (!disposed) propsRef.current.onStatus?.({ ...status });
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

      const token = process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN?.trim() || undefined;
      Cesium.Ion.defaultAccessToken = token ?? "";

      const onImageryFailures = (n: number) =>
        emit({ imagery: { ...status.imagery, failedTiles: n } });
      const base = createBaseImagery(Cesium, token, onImageryFailures);

      try {
        viewer = new Cesium.Viewer(container, {
          baseLayer: false,
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
          msaaSamples: QUALITY_PROFILES[status.quality.profile].msaaSamples,
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
      const ctrl = scene.screenSpaceCameraController;

      // Base imagery (see providers.ts). If ion imagery fails, fall back explicitly.
      base.layers.forEach((l, i) => v.imageryLayers.add(l, i));
      ctrl.minimumZoomDistance = MIN_ZOOM_DISTANCE[base.tier];
      emit({ imagery: { label: base.label, finestDetail: base.finestDetail, failedTiles: 0 } });
      if (base.tier === "ion") {
        base.layers[0].errorEvent.addEventListener(() => {
          if (v.isDestroyed()) return;
          v.imageryLayers.remove(base.layers[0], true);
          const fb = createFallbackImagery(Cesium, onImageryFailures);
          fb.layers.forEach((l, i) => v.imageryLayers.add(l, i));
          ctrl.minimumZoomDistance = MIN_ZOOM_DISTANCE.fallback;
          emit({
            imagery: { label: `${fb.label} (ion imagery failed)`, finestDetail: fb.finestDetail, failedTiles: 0 },
          });
        });
      }

      // Rendering quality (adaptive) and atmosphere.
      applyQualityProfile(v, status.quality.profile);
      const setQuality = (mode: QualityMode) => {
        const profile: QualityProfile = mode === "auto" ? detected.profile : mode;
        applyQualityProfile(v, profile);
        emit({ quality: { mode, profile, reason: mode === "auto" ? detected.reason : "manual" } });
      };
      stopFrameWatch = watchFrameTimes(v, (median) => {
        if (status.quality.mode !== "auto") return;
        const lower = nextLowerProfile(status.quality.profile);
        if (!lower) return;
        applyQualityProfile(v, lower);
        emit({ quality: { mode: "auto", profile: lower, reason: `measured ${Math.round(median)} ms/frame` } });
      });

      scene.backgroundColor = Cesium.Color.BLACK;
      scene.globe.baseColor = Cesium.Color.fromCssColorString("#0b1424");
      scene.globe.enableLighting = true;
      scene.globe.dynamicAtmosphereLighting = true;
      scene.globe.dynamicAtmosphereLightingFromSun = true;
      scene.globe.showGroundAtmosphere = true;
      scene.globe.depthTestAgainstTerrain = true; // markers/lines are hidden behind mountains
      if (scene.skyAtmosphere) scene.skyAtmosphere.show = true;
      scene.fog.enabled = true;
      // Sun fixed at 12:00 UTC today: real solar geometry for that instant, so Europe is lit
      // regardless of the viewer's clock. Cosmetic lighting only; not tied to any data timestamp.
      const noon = new Date();
      noon.setUTCHours(12, 0, 0, 0);
      v.clock.currentTime = Cesium.JulianDate.fromDate(noon);
      v.clock.shouldAnimate = false;

      ctrl.maximumZoomDistance = 40_000_000;
      ctrl.enableCollisionDetection = true;
      v.cesiumWidget.screenSpaceEventHandler.removeInputAction(
        Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK,
      );

      // GPU context loss cannot be recovered by Cesium: show a clear state instead of a frozen canvas.
      const CONTEXT_LOST =
        "The GPU context was lost (driver reset or memory pressure). Reload to restore the globe.";
      let contextLost = false;
      scene.canvas.addEventListener("webglcontextlost", (e) => {
        e.preventDefault();
        contextLost = true;
        emit({ phase: "error", error: CONTEXT_LOST });
      });

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
          semiMajorAxis: 1_500,
          semiMinorAxis: 1_500,
          material: Cesium.Color.fromCssColorString(ACCENT).withAlpha(0.2),
          outline: false, // no height => drawn on the ground (terrain-clamped)
        },
      });

      // Pointer interaction.
      let terrain: TerrainResult | null = null;
      handler = new Cesium.ScreenSpaceEventHandler(scene.canvas);
      let pending: CesiumNS.Cartesian2 | undefined;
      handler.setInputAction((m: CesiumNS.ScreenSpaceEventHandler.MotionEvent) => {
        pending = m.endPosition;
        if (frame) return;
        frame = requestAnimationFrame(() => {
          frame = 0;
          if (v.isDestroyed()) return;
          propsRef.current.onHover?.(pickCoordinate(Cesium, v, pending, terrain));
        });
      }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
      let selectionId = 0;
      handler.setInputAction((c: CesiumNS.ScreenSpaceEventHandler.PositionedEvent) => {
        const coord = pickCoordinate(Cesium, v, c.position, terrain);
        if (!coord) return; // sky / off-globe click: keep the current selection
        const id = ++selectionId;
        propsRef.current.onSelect?.(coord);
        if (!terrain) return;
        const source = terrain;
        // Replace the mesh (level-of-detail) height with the most detailed terrain sample.
        void sampleTerrainHeight(Cesium, v, coord.latitude, coord.longitude).then((h) => {
          if (disposed || id !== selectionId || h === undefined) return;
          propsRef.current.onSelect?.({
            ...coord,
            elevation: { metres: h, datum: source.datum, source: source.label, approximate: false },
          });
        });
      }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
      scene.canvas.addEventListener("pointerleave", () => propsRef.current.onHover?.(null));

      scene.renderError.addEventListener((_s: CesiumNS.Scene, err: unknown) => {
        console.error("[globe] render error", err);
        const lost = contextLost || isContextLost(scene.canvas);
        emit({
          phase: "error",
          error: lost ? CONTEXT_LOST : `Rendering stopped: ${err instanceof Error ? err.message : String(err)}`,
        });
      });

      layers = new CesiumLayerManager(Cesium, v, (id, err) =>
        console.warn(`[globe] layer "${id}" failed`, err),
      );
      const controller = createCameraController(Cesium, v);
      engine.current = { Cesium, viewer: v, layers, controller, marker, setQuality };
      if (process.env.NODE_ENV === "development") {
        // Debug hook for local testing only (stripped from production builds).
        (window as unknown as { __globe?: unknown }).__globe = { controller, viewer: v, Cesium };
      }
      void layers.sync(propsRef.current.layers, propsRef.current.layerStates);
      if (propsRef.current.qualityMode !== initialMode) setQuality(propsRef.current.qualityMode);

      emit({ phase: "ready" });
      propsRef.current.onReady?.(controller);
      controller.flyTo(HOME_VIEW);

      // Real terrain (see providers.ts). Without it the globe is a smooth ellipsoid and the UI
      // says so; elevation is then never shown.
      terrain = await loadTerrain(Cesium, v, token, (n) =>
        emit({ terrain: { ...status.terrain, failedTiles: n } }),
      );
      if (disposed) return;
      emit({
        terrain: terrain
          ? { available: true, label: terrain.label, datum: terrain.datum, failedTiles: 0 }
          : { available: false, label: "Unavailable — showing smooth ellipsoid, no relief", failedTiles: 0 },
      });
    })();

    return () => {
      disposed = true;
      if (frame) cancelAnimationFrame(frame);
      propsRef.current.onReady?.(null);
      engine.current = null;
      stopFrameWatch?.();
      layers?.destroy();
      if (handler && !handler.isDestroyed()) handler.destroy();
      if (viewer && !viewer.isDestroyed()) viewer.destroy();
    };
  }, []);

  // --- Quality override -------------------------------------------------------------------
  useEffect(() => {
    engine.current?.setQuality(props.qualityMode);
  }, [props.qualityMode]);

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
