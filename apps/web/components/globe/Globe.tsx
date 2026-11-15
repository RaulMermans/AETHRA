"use client";

import "cesium/Build/Cesium/Widgets/widgets.css";
import type * as CesiumNS from "cesium";
import { useEffect, useRef, type KeyboardEvent } from "react";
import { HOME_VIEW, MIN_ZOOM_DISTANCE } from "@/lib/globe/catalog";
import { createCameraController, setOrbitView } from "@/lib/globe/cesium/camera";
import { CesiumLayerManager } from "@/lib/globe/cesium/layer-manager";
import { drawMeasure } from "@/lib/globe/cesium/measure-draw";
import { drawPreview } from "@/lib/globe/cesium/preview-draw";
import { loadCesium } from "@/lib/globe/cesium/load";
import { attachSpaceAmbiance } from "@/lib/globe/cesium/space-ambiance";
import { syncIllustrativeWindTurbine, type IllustrativeAssetView } from "@/lib/globe/cesium/illustrative-model";
import { pickCoordinate, pickOverlayFeature } from "@/lib/globe/cesium/picking";
import {
  createBaseImagery,
  createFallbackImagery,
  loadTerrain,
  sampleProfile,
  sampleTerrainHeight,
  spainRectangles,
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
  MeasureState,
  OverlayFeature,
  PreviewPoint,
  QualityMode,
  QualityProfile,
  ViewMode,
} from "@/lib/globe/types";

export interface GlobeProps {
  layers: LayerDescriptor[];
  layerStates: LayerStateMap;
  selected: GeoCoordinate | null;
  qualityMode: QualityMode;
  /** Layer clip mode for overlays. The whole globe is always rendered; the camera is free. */
  viewMode: ViewMode;
  /** Active map tool (distance, offset…). While set, clicks go to `onToolClick`, not `onSelect`. */
  measure?: MeasureState | null;
  onToolClick?: (coordinate: GeoCoordinate) => void;
  /** Locations to point out while browsing a list (station catalog scroll); empty hides them. */
  preview?: readonly PreviewPoint[];
  onHover?: (coordinate: GeoCoordinate | null) => void;
  onOverlayHover?: (feature: OverlayFeature | null) => void;
  onSelect?: (coordinate: GeoCoordinate | null) => void;
  onStatus?: (status: GlobeStatus) => void;
  onReady?: (controller: GlobeController | null) => void;
  /** Element that receives imagery/terrain attribution. */
  creditContainer?: HTMLElement | null;
  /** Accessible name of the globe, including its keyboard help (localized by the caller). */
  ariaLabel?: string;
  /** One illustrative / conceptual 3D symbol; null hides it. Point markers stay. */
  illustrativeAsset?: IllustrativeAssetView | null;
  className?: string;
}

const ACCENT = "#819DB5";

function isContextLost(canvas: HTMLCanvasElement): boolean {
  const gl = (canvas.getContext("webgl2") ?? canvas.getContext("webgl")) as WebGLRenderingContext | null;
  return gl?.isContextLost() ?? false;
}

/**
 * PNG of the next rendered frame (read inside postRender, so no preserveDrawingBuffer is needed),
 * with the imagery/terrain attribution drawn along the bottom as the providers require.
 */
function captureScreenshot(scene: CesiumNS.Scene, credits: string): Promise<Blob | null> {
  return new Promise((resolve) => {
    const remove = scene.postRender.addEventListener(() => {
      remove();
      const src = scene.canvas;
      const out = document.createElement("canvas");
      out.width = src.width;
      out.height = src.height;
      const ctx = out.getContext("2d");
      if (!ctx) return resolve(null);
      ctx.drawImage(src, 0, 0);
      const scale = src.width / (src.clientWidth || src.width);
      const pad = 8 * scale;
      const size = Math.round(11 * scale);
      const text = `${credits.replace(/Data attribution/g, "").replace(/\s+/g, " ").trim()} · ${new Date().toISOString().slice(0, 10)}`;
      ctx.font = `${size}px ui-sans-serif, system-ui, sans-serif`;
      ctx.fillStyle = "rgba(3,5,10,0.75)";
      ctx.fillRect(0, out.height - size - 2 * pad, out.width, size + 2 * pad);
      ctx.fillStyle = "#e8edf3";
      ctx.textBaseline = "bottom";
      ctx.fillText(text, pad, out.height - pad, out.width - 2 * pad);
      out.toBlob((blob) => resolve(blob), "image/png");
    });
    scene.requestRender();
  });
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
    placeMarker: (at: GeoCoordinate | null) => void;
    setQuality: (mode: QualityMode) => void;
    setViewMode: (mode: ViewMode) => void;
    measureSource: CesiumNS.CustomDataSource;
    illustrativeSource: CesiumNS.CustomDataSource;
    previewSource: CesiumNS.CustomDataSource;
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
    let stopSpaceAmbiance: (() => void) | undefined;
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

      // Base imagery (see providers.ts): one set limited to the Spain extents and one for the
      // whole globe; only the set of the current view mode is shown (hidden layers fetch nothing).
      // If ion imagery fails, fall back explicitly.
      let viewMode: ViewMode = propsRef.current.viewMode;
      let baseSets: Record<ViewMode, CesiumNS.ImageryLayer[]> = { spain: [], world: [] };
      const showBase = () => {
        for (const m of ["spain", "world"] as const) for (const l of baseSets[m]) l.show = m === "world"; // whole Earth always shown
      };
      const installBase = (make: (rectangles?: CesiumNS.Rectangle[]) => ReturnType<typeof createFallbackImagery>) => {
        for (const l of [...baseSets.spain, ...baseSets.world]) v.imageryLayers.remove(l, true);
        const spainSet = make(spainRectangles(Cesium));
        const worldSet = make(undefined);
        baseSets = { spain: spainSet.layers, world: worldSet.layers };
        [...worldSet.layers, ...spainSet.layers].forEach((l, i) => v.imageryLayers.add(l, i));
        showBase();
        return spainSet;
      };
      const tier = token ? "ion" : "fallback"; // createBaseImagery uses ion iff a token is set
      const base = installBase((r) => createBaseImagery(Cesium, token, onImageryFailures, r));
      ctrl.minimumZoomDistance = MIN_ZOOM_DISTANCE[tier];
      emit({ imagery: { label: base.label, finestDetail: base.finestDetail, failedTiles: 0 } });
      if (tier === "ion") {
        let fellBack = false;
        const fallBack = () => {
          if (fellBack || v.isDestroyed()) return;
          fellBack = true;
          const fb = installBase((r) => createFallbackImagery(Cesium, onImageryFailures, r));
          ctrl.minimumZoomDistance = MIN_ZOOM_DISTANCE.fallback;
          emit({
            imagery: { label: `${fb.label} (ion imagery failed)`, finestDetail: fb.finestDetail, failedTiles: 0 },
          });
        };
        [...baseSets.spain, ...baseSets.world].forEach((l) => l.errorEvent.addEventListener(fallBack));
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

      scene.backgroundColor = Cesium.Color.fromCssColorString("#02040a");
      scene.globe.enableLighting = true;
      scene.globe.dynamicAtmosphereLighting = true;
      scene.globe.dynamicAtmosphereLightingFromSun = true;
      scene.globe.atmosphereLightIntensity = 12;
      scene.globe.depthTestAgainstTerrain = true; // markers/lines are hidden behind mountains
      scene.fog.enabled = true;
      scene.fog.density = 0.00022;
      scene.fog.minimumBrightness = 0.04;
      if (scene.sun) scene.sun.show = true;
      scene.canvas.style.cursor = "grab";
      // Sun fixed at 12:00 UTC today: real solar geometry for that instant, so Europe is lit
      // regardless of the viewer's clock. Cosmetic lighting only; not tied to any data timestamp.
      const noon = new Date();
      noon.setUTCHours(12, 0, 0, 0);
      v.clock.currentTime = Cesium.JulianDate.fromDate(noon);
      v.clock.shouldAnimate = false;
      stopSpaceAmbiance = attachSpaceAmbiance(Cesium, v, {
        reduceMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      });

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

      setOrbitView(Cesium, v, HOME_VIEW);

      // Selected-location marker: ground halo + point. The point is placed at an explicit height
      // (sampled terrain × vertical exaggeration) because Cesium's ground clamping of points
      // does not follow later exaggeration changes.
      const marker = v.entities.add({
        id: "selected-location",
        show: false,
        position: Cesium.Cartesian3.fromDegrees(0, 0),
        point: {
          pixelSize: 14,
          color: Cesium.Color.fromCssColorString(ACCENT),
          outlineColor: Cesium.Color.WHITE,
          outlineWidth: 3,
          scaleByDistance: new Cesium.NearFarScalar(2.0e4, 1.35, 1.6e6, 0.7),
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
        ellipse: {
          semiMajorAxis: 4_200,
          semiMinorAxis: 4_200,
          material: Cesium.Color.fromCssColorString(ACCENT).withAlpha(0.28),
          outline: true,
          outlineColor: Cesium.Color.fromCssColorString(ACCENT).withAlpha(0.55),
          outlineWidth: 2,
        },
      });
      let markerRequest = 0;
      let markerAt: GeoCoordinate | null = null;
      const placeMarker = (at: GeoCoordinate | null) => {
        markerAt = at;
        marker.show = at !== null;
        if (!at) return scene.requestRender();
        const id = ++markerRequest;
        const put = (h: number) => {
          marker.position = new Cesium.ConstantPositionProperty(
            Cesium.Cartesian3.fromDegrees(at.longitude, at.latitude, h * (scene.verticalExaggeration || 1)),
          );
          scene.requestRender();
        };
        put(at.elevation?.metres ?? 0);
        void sampleTerrainHeight(Cesium, v, at.latitude, at.longitude).then((h) => {
          if (id === markerRequest && h !== undefined && !v.isDestroyed()) put(h);
        });
      };

      // View mode. The whole Earth is always rendered (Spain's outline is drawn by the outline
      // layer and the climate heatmaps are clipped to Spain). The camera is free.
      const applyViewMode = () => {
        const is3D = scene.mode === Cesium.SceneMode.SCENE3D;
        showBase();
        scene.globe.baseColor = Cesium.Color.fromCssColorString("#0b1424");
        scene.globe.showGroundAtmosphere = is3D;
        if (scene.skyAtmosphere) scene.skyAtmosphere.show = is3D;
        scene.fog.enabled = is3D;
        ctrl.maximumZoomDistance = 40_000_000;
        scene.requestRender();
      };
      const setViewMode = (mode: ViewMode) => {
        if (mode === viewMode) return;
        viewMode = mode;
        applyViewMode();
        if (layers) void layers.sync(propsRef.current.layers, propsRef.current.layerStates, mode);
      };
      applyViewMode();
      const pickSpain = (p: CesiumNS.Cartesian2 | undefined) => pickCoordinate(Cesium, v, p, terrain);

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
          const overlay = pickOverlayFeature(Cesium, v, pending);
          propsRef.current.onOverlayHover?.(overlay);
          propsRef.current.onHover?.(pickSpain(pending));
          scene.canvas.style.cursor = overlay && !propsRef.current.measure ? "pointer" : "grab";
        });
      }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
      handler.setInputAction(() => {
        if (!propsRef.current.measure) scene.canvas.style.cursor = "grabbing";
      }, Cesium.ScreenSpaceEventType.LEFT_DOWN);
      handler.setInputAction(() => {
        if (!propsRef.current.measure) scene.canvas.style.cursor = "grab";
      }, Cesium.ScreenSpaceEventType.LEFT_UP);
      let selectionId = 0;
      handler.setInputAction((c: CesiumNS.ScreenSpaceEventHandler.PositionedEvent) => {
        const overlay = pickOverlayFeature(Cesium, v, c.position);
        const coord = overlay
          ? { latitude: overlay.latitude, longitude: overlay.longitude }
          : pickSpain(c.position);
        if (!coord) return; // sky / outside Spain: keep the current selection
        if (propsRef.current.measure) {
          propsRef.current.onToolClick?.(coord);
          return;
        }
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
      scene.canvas.addEventListener("pointerleave", () => {
        propsRef.current.onHover?.(null);
        propsRef.current.onOverlayHover?.(null);
        scene.canvas.style.cursor = "";
      });

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
      const measureSource = new Cesium.CustomDataSource("measure");
      const illustrativeSource = new Cesium.CustomDataSource("illustrative-infra");
      void v.dataSources.add(measureSource);
      void v.dataSources.add(illustrativeSource);
      const previewSource = new Cesium.CustomDataSource("list-preview");
      void v.dataSources.add(previewSource);
      drawPreview(Cesium, previewSource, propsRef.current.preview ?? [], scene.verticalExaggeration || 1);
      drawMeasure(Cesium, measureSource, propsRef.current.measure ?? null);
      const cameraCtl = createCameraController(Cesium, v);
      const controller: GlobeController = {
        ...cameraCtl,
        setDimension(dim, durationSeconds = 1.2) {
          const target = dim === "2d" ? Cesium.SceneMode.SCENE2D : Cesium.SceneMode.SCENE3D;
          if (scene.mode === target) return;
          // Keep looking at the same place at a similar scale after the switch.
          const before = cameraCtl.getCamera();
          const centre = cameraCtl.centre() ?? before;
          const duration = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : durationSeconds;
          const stop = scene.morphComplete.addEventListener(() => {
            stop();
            applyViewMode();
            cameraCtl.setCamera(
              { latitude: centre.latitude, longitude: centre.longitude, height: before.height, heading: 0, pitch: -90 },
              duration ? 0.6 : 0,
            );
          });
          applyViewMode();
          if (dim === "2d") scene.morphTo2D(duration);
          else scene.morphTo3D(duration);
          scene.requestRender();
        },
        sampleProfile: (a, b, samples) => sampleProfile(Cesium, v, a, b, samples),
        setVerticalExaggeration(factor) {
          scene.verticalExaggeration = factor;
          // Ground-clamped entities don't re-clamp on their own when the exaggeration changes:
          // re-set them so they sit on the (re-scaled) surface.
          placeMarker(markerAt);
          // Measurement entities are re-created once the re-scaled terrain tiles are in (doing
          // it immediately would clamp them to the old surface).
          const reclamp = () => {
            if (v.isDestroyed()) return;
            drawMeasure(Cesium, measureSource, propsRef.current.measure ?? null);
            scene.requestRender();
          };
          let frames = 0;
          const stop = scene.postRender.addEventListener(() => {
            // Wait at least a couple of frames, then until all visible tiles are loaded (max ~5 s).
            if (++frames < 3 || (!scene.globe.tilesLoaded && frames < 300)) return scene.requestRender();
            stop();
            reclamp();
          });
          scene.requestRender();
        },
        screenshot: () => captureScreenshot(scene, propsRef.current.creditContainer?.innerText ?? ""),
      };
      engine.current = {
        Cesium,
        viewer: v,
        layers,
        controller,
        placeMarker,
        setQuality,
        setViewMode,
        measureSource,
        illustrativeSource,
        previewSource,
      };
      void syncIllustrativeWindTurbine(Cesium, v, illustrativeSource, propsRef.current.illustrativeAsset ?? null);
      placeMarker(propsRef.current.selected);
      if (process.env.NODE_ENV === "development") {
        // Debug hook for local testing only (stripped from production builds).
        (window as unknown as { __globe?: unknown }).__globe = { controller, viewer: v, Cesium };
      }
      void layers.sync(propsRef.current.layers, propsRef.current.layerStates, viewMode);
      if (propsRef.current.viewMode !== viewMode) setViewMode(propsRef.current.viewMode);
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
      stopSpaceAmbiance?.();
      layers?.destroy();
      if (handler && !handler.isDestroyed()) handler.destroy();
      if (viewer && !viewer.isDestroyed()) viewer.destroy();
    };
  }, []);

  // --- Quality override -------------------------------------------------------------------
  useEffect(() => {
    engine.current?.setQuality(props.qualityMode);
  }, [props.qualityMode]);

  // --- View mode --------------------------------------------------------------------------
  useEffect(() => {
    engine.current?.setViewMode(props.viewMode);
  }, [props.viewMode]);

  // --- Layers -----------------------------------------------------------------------------
  useEffect(() => {
    void engine.current?.layers.sync(props.layers, props.layerStates, props.viewMode);
    // viewMode changes are synced by setViewMode.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.layers, props.layerStates]);

  // --- Map tools (measurements) -----------------------------------------------------------
  useEffect(() => {
    const e = engine.current;
    if (!e) return;
    drawMeasure(e.Cesium, e.measureSource, props.measure ?? null);
    e.viewer.scene.requestRender();
  }, [props.measure]);

  // --- Selected marker --------------------------------------------------------------------
  useEffect(() => {
    const e = engine.current;
    if (!e) return;
    e.placeMarker(props.selected);
  }, [props.selected]);

  // --- List preview (station catalog scroll) ---------------------------------------------
  useEffect(() => {
    const e = engine.current;
    if (!e) return;
    drawPreview(e.Cesium, e.previewSource, props.preview ?? [], e.viewer.scene.verticalExaggeration || 1);
    e.viewer.scene.requestRender();
  }, [props.preview]);

  // --- Illustrative / conceptual 3D plant (one entity set) --------------------------------
  useEffect(() => {
    const e = engine.current;
    if (!e) return;
    void syncIllustrativeWindTurbine(e.Cesium, e.viewer, e.illustrativeSource, props.illustrativeAsset ?? null);
  }, [props.illustrativeAsset]);

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
      style={props.measure ? { cursor: "crosshair" } : undefined}
      tabIndex={0}
      role="application"
      aria-label={
        props.ariaLabel ??
        "Interactive 3D globe. Drag to rotate, scroll or pinch to zoom, Ctrl-drag or middle-drag to tilt. Keyboard: arrow keys rotate and tilt, plus and minus zoom, N resets north."
      }
      onKeyDown={onKeyDown}
    />
  );
}
