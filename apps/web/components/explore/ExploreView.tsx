"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import GlobeClient from "@/components/globe/GlobeClient";
import { buildLayerCatalog, CAMERA_BOUNDS, HOME_VIEW, initialLayerStates, WORLD_VIEW } from "@/lib/globe/catalog";
import {
  buildDimensionOverlayGeoJson,
  DIMENSIONS,
  getEffectiveMeta,
  HEATMAP_BOUNDS,
  loadClimateBundle,
  renderDimensionHeatmapDataUrl,
  type ActiveClimateConfig,
  type ClimateBundle,
} from "@/lib/globe/climate";
import type {
  CameraState,
  ClickToolId,
  GeoCoordinate,
  GlobeController,
  GlobeStatus,
  LayerDescriptor,
  LayerState,
  LayerStateMap,
  MeasureState,
  QualityMode,
  SceneDim,
  ToolId,
  ViewMode,
} from "@/lib/globe/types";
import { CameraControls } from "./CameraControls";
import { CoordinateReadout } from "./CoordinateReadout";
import { DimensionDock } from "./DimensionDock";
import { EvidencePanel } from "./EvidencePanel";
import { ExploreSpain } from "./ExploreSpain";
import { GoToPanel } from "./GoToPanel";
import { Icon } from "./Icon";
import { LayerPanel } from "./LayerPanel";
import { MeasurePanel } from "./MeasurePanel";
import { ReliefPanel } from "./ReliefPanel";
import { CLICK_TOOLS, ToolsBar, type ToolAction } from "./ToolsBar";
import { TopNav } from "./TopNav";
import { ViewModeToggle } from "./ViewModeToggle";

const QUALITY_KEY = "globe-quality-mode";

const isClickTool = (t: ToolId): t is ClickToolId => CLICK_TOOLS.some((c) => c.id === t);

/** Shareable view in the URL hash: #cam=lat,lon,height,heading,pitch&mode=spain&ex=2 */
function encodeView(c: CameraState, mode: ViewMode, ex: number, dim: SceneDim): string {
  const cam = [c.latitude.toFixed(5), c.longitude.toFixed(5), Math.round(c.height), c.heading.toFixed(1), c.pitch.toFixed(1)].join(",");
  return `#cam=${cam}&mode=${mode}${ex !== 1 ? `&ex=${ex}` : ""}${dim === "2d" ? "&dim=2d" : ""}`;
}
function decodeView(hash: string): { camera: CameraState; mode: ViewMode; ex: number; dim: SceneDim } | null {
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  const nums = (params.get("cam") ?? "").split(",").map(Number);
  if (nums.length !== 5 || nums.some((n) => !Number.isFinite(n))) return null;
  const [latitude, longitude, height, heading, pitch] = nums;
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180 || height <= 0) return null;
  const ex = Number(params.get("ex") ?? 1);
  return {
    camera: { latitude, longitude, height, heading, pitch },
    mode: params.get("mode") === "world" ? "world" : "spain",
    ex: [1, 1.5, 2, 3, 5].includes(ex) ? ex : 1,
    dim: params.get("dim") === "2d" ? "2d" : "3d",
  };
}

export function ExploreView() {
  const [baseLayers] = useState(() => buildLayerCatalog());
  const [layerStates, setLayerStates] = useState<LayerStateMap>(() => ({
    ...initialLayerStates(baseLayers),
    "climate-heatmap": { visible: true, opacity: 0.78 },
    "climate-overlay": { visible: true, opacity: 0.95 },
  }));
  const [hover, setHover] = useState<GeoCoordinate | null>(null);
  const [selected, setSelected] = useState<GeoCoordinate | null>(null);
  const [status, setStatus] = useState<GlobeStatus | null>(null);
  const [controller, setController] = useState<GlobeController | null>(null);
  const [creditEl, setCreditEl] = useState<HTMLDivElement | null>(null);
  const [layersOpen, setLayersOpen] = useState(false);
  const [evidenceOpen, setEvidenceOpen] = useState(true);
  const [qualityMode, setQualityMode] = useState<QualityMode>("auto");
  const [viewMode, setViewMode] = useState<ViewMode>("spain");
  const [dim, setDim] = useState<SceneDim>("3d");
  const homeView = viewMode === "spain" ? HOME_VIEW : WORLD_VIEW;

  // --- Climate bundle + 9 Dimensions & 2030 Extrapolation state --------------------------
  const [bundle, setBundle] = useState<ClimateBundle | null>(null);
  const [climateConfig, setClimateConfig] = useState<ActiveClimateConfig>({
    dimension: "temperature",
    year: 2025,
    mode: "value",
    scenario: "central",
    heatMetric: "tropical_nights",
    rainMetric: "max_dry_spell",
    vegMetric: "ndvi",
  });
  const [heatmapUrl, setHeatmapUrl] = useState<string>("");
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    let active = true;
    loadClimateBundle()
      .then((b) => {
        if (active) setBundle(b);
      })
      .catch((err) => console.error("[climate] failed to load climate bundle", err));
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!bundle) return;
    let active = true;
    renderDimensionHeatmapDataUrl(bundle, climateConfig)
      .then((url) => {
        if (active) setHeatmapUrl(url);
      })
      .catch((err) => console.error("[climate] failed to render heatmap", err));
    return () => {
      active = false;
    };
  }, [bundle, climateConfig]);

  const updateClimateConfig = useCallback((patch: Partial<ActiveClimateConfig>) => {
    setClimateConfig((prev) => ({ ...prev, ...patch }));
  }, []);

  const allLayers = useMemo<LayerDescriptor[]>(() => {
    const dimMeta = DIMENSIONS.find((d) => d.id === climateConfig.dimension) ?? DIMENSIONS[0];
    const eff = getEffectiveMeta(climateConfig);
    const overlayData = bundle
      ? buildDimensionOverlayGeoJson(bundle, climateConfig)
      : { type: "FeatureCollection", features: [] };

    const analysisLayers: LayerDescriptor[] = [
      {
        id: "climate-heatmap",
        kind: "raster-field",
        group: "analysis",
        title: `${dimMeta.label} Heatmap`,
        description: eff.subtitle,
        source: { name: dimMeta.datasets },
        resolution: dimMeta.spatialNote,
        synthetic: dimMeta.synthetic,
        url: heatmapUrl,
        science: {
          variable: dimMeta.id,
          units: eff.units,
          bounds: HEATMAP_BOUNDS,
          spatialResolution: dimMeta.spatialNote,
          timeCoverage: { start: "2000-01-01", end: "2030-12-31", step: "P1Y" },
          encoding: "color",
          colorScale: {
            domain: eff.domain,
            palette: eff.palette,
            kind: climateConfig.mode === "value" ? "sequential" : "diverging",
          },
          missingData: { policy: "hide" },
        },
      },
      {
        id: "climate-overlay",
        kind: "point-values",
        group: "analysis",
        title:
          climateConfig.dimension === "water_rivers"
            ? "Major Rivers & Basin Hubs"
            : "NOAA Weather Stations & Rivers",
        description: "Ground-truth station observations (NOAA GHCN-Daily) and major Spanish river courses.",
        source: { name: "NOAA GHCN-Daily + Hydrographic Demarcations" },
        resolution: "175 stations + 8 basins",
        data: overlayData,
        science: {
          variable: dimMeta.id,
          units: eff.units,
          bounds: HEATMAP_BOUNDS,
          spatialResolution: "Point stations",
          timeCoverage: { start: "2001-01-01", end: "2030-12-31", step: "P1Y" },
          encoding: "color",
          missingData: { policy: "hide" },
        },
      },
    ];
    return [...analysisLayers, ...baseLayers];
  }, [baseLayers, bundle, climateConfig, heatmapUrl]);

  // --- Map tools -------------------------------------------------------------------------
  const [activeTool, setActiveTool] = useState<ToolId | null>(null);
  const [measure, setMeasure] = useState<MeasureState | null>(null);
  const [exaggeration, setExaggeration] = useState(1);
  const [notice, setNotice] = useState<string | null>(null);
  const flash = useCallback((msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice((n) => (n === msg ? null : n)), 2200);
  }, []);

  const closeTool = useCallback(() => {
    setActiveTool(null);
    setMeasure(null);
  }, []);
  const toggleTool = useCallback(
    (tool: ToolId) => {
      const next = activeTool === tool ? null : tool;
      setActiveTool(next);
      setMeasure(next && isClickTool(next) ? { tool: next, points: [] } : null);
    },
    [activeTool],
  );
  const addToolPoint = useCallback(
    (p: GeoCoordinate) =>
      setMeasure((m) => {
        if (!m) return m;
        if (m.tool === "area") return m.closed ? { ...m, points: [p], closed: false } : { ...m, points: [...m.points, p] };
        return { ...m, points: m.points.length >= 2 ? [p] : [...m.points, p] };
      }),
    [],
  );
  const finishPolygon = useCallback(() => setMeasure((m) => (m && m.points.length >= 3 ? { ...m, closed: true } : m)), []);
  const undoPoint = useCallback(() => setMeasure((m) => (m ? { ...m, points: m.points.slice(0, -1), closed: false } : m)), []);

  useEffect(() => {
    if (!activeTool) return;
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName);
      if (e.key === "Escape") closeTool();
      else if (!typing && e.key === "Enter") finishPolygon();
      else if (!typing && e.key === "Backspace") undoPoint();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeTool, closeTool, finishPolygon, undoPoint]);

  // Cursor preview while a measurement is incomplete.
  const previewing = !!measure && (measure.tool === "area" ? !measure.closed && measure.points.length > 0 : measure.points.length === 1);
  const measureWithPreview = useMemo(
    () => (measure ? { ...measure, preview: previewing ? hover : null } : null),
    [measure, previewing, hover],
  );

  const changeExaggeration = useCallback(
    (v: number) => {
      setExaggeration(v);
      controller?.setVerticalExaggeration(v);
    },
    [controller],
  );

  const handleSelectLocation = useCallback((coord: GeoCoordinate | null) => {
    setSelected(coord);
    if (coord) setEvidenceOpen(true);
  }, []);

  const goTo = useCallback(
    (t: GeoCoordinate & { kind?: "city" | "peak" }) => {
      if (!controller) return;
      const { west, south, east, north } = CAMERA_BOUNDS;
      const outside = t.longitude < west || t.longitude > east || t.latitude < south || t.latitude > north;
      if (outside && viewMode === "spain") setViewMode("world");
      const peak = t.kind === "peak";
      controller.flyTo({
        target: { latitude: t.latitude, longitude: t.longitude },
        heading: 0,
        pitch: peak ? -25 : -60,
        range: peak ? 30_000 : 60_000,
        durationSeconds: 2.5,
        terrainAware: true,
      });
      handleSelectLocation({ latitude: t.latitude, longitude: t.longitude });
      closeTool();
    },
    [controller, viewMode, closeTool, handleSelectLocation],
  );

  const runAction = useCallback(
    async (action: ToolAction) => {
      if (!controller) return;
      if (action === "screenshot") {
        const blob = await controller.screenshot();
        if (!blob) return flash("Screenshot failed");
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `trend-detective-${new Date().toISOString().slice(0, 19).replace(/[T:]/g, "-")}.png`;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 5_000);
        flash("Screenshot saved");
      } else {
        const hash = encodeView(controller.getCamera(), viewMode, exaggeration, dim);
        history.replaceState(null, "", hash);
        try {
          await navigator.clipboard.writeText(window.location.href);
          flash("Link to this view copied");
        } catch {
          flash("Link is in the address bar");
        }
      }
    },
    [controller, viewMode, exaggeration, dim, flash],
  );

  // Restore a shared view (#cam=…) once the globe is ready.
  const [restored, setRestored] = useState(false);
  useEffect(() => {
    if (!controller || restored) return;
    setRestored(true);
    const shared = decodeView(window.location.hash);
    if (!shared) return;
    setViewMode(shared.mode);
    setExaggeration(shared.ex);
    controller.setVerticalExaggeration(shared.ex);
    setDim(shared.dim);
    controller.setDimension(shared.dim, 0);
    controller.setCamera(shared.camera, 0);
  }, [controller, restored]);

  // 2D flat map ↔ 3D globe. Relief exaggeration and tilt/rotate only make sense in 3D.
  const changeDim = useCallback(
    (d: SceneDim) => {
      setDim(d);
      controller?.setDimension(d);
      if (d === "2d" && activeTool === "relief") {
        setActiveTool(null);
      }
    },
    [controller, activeTool],
  );

  const changeViewMode = useCallback(
    (mode: ViewMode) => {
      setViewMode(mode);
      controller?.flyTo(mode === "spain" ? HOME_VIEW : WORLD_VIEW);
    },
    [controller],
  );

  useEffect(() => {
    try {
      const saved = localStorage.getItem(QUALITY_KEY);
      if (saved && ["auto", "high", "balanced", "performance"].includes(saved)) setQualityMode(saved as QualityMode);
    } catch {
      /* storage unavailable: keep auto */
    }
  }, []);

  const changeQuality = useCallback((mode: QualityMode) => {
    setQualityMode(mode);
    try {
      localStorage.setItem(QUALITY_KEY, mode);
    } catch {
      /* ignore */
    }
  }, []);

  const updateLayer = useCallback((id: string, patch: Partial<LayerState>) => {
    setLayerStates((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }, []);

  const ready = status?.phase === "ready";

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-space">
      <h1 className="sr-only">Explore Spain environmental trends and 2030 projections on a 3D globe</h1>

      {creditEl && (
        <GlobeClient
          className="absolute inset-0 focus-ring"
          layers={allLayers}
          layerStates={layerStates}
          selected={selected}
          qualityMode={qualityMode}
          viewMode={viewMode}
          measure={measureWithPreview}
          onToolClick={addToolPoint}
          onHover={setHover}
          onSelect={handleSelectLocation}
          onStatus={setStatus}
          onReady={setController}
          creditContainer={creditEl}
        />
      )}

      {/* Loading and error states */}
      {status?.phase !== "error" && (
        <div
          className={`pointer-events-none absolute inset-0 grid place-items-center transition-opacity duration-700 ${
            ready ? "opacity-0" : "opacity-100"
          }`}
          aria-hidden={ready}
        >
          <p className="animate-pulse text-xs tracking-[0.2em] text-muted uppercase" role="status">
            Loading globe…
          </p>
        </div>
      )}
      {status?.phase === "error" && (
        <div className="absolute inset-0 z-30 grid place-items-center p-6">
          <div role="alert" className="panel max-w-md p-5 text-center">
            <p className="text-sm text-ink">3D globe unavailable</p>
            <p className="mt-2 text-xs leading-relaxed text-muted">{status.error}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="focus-ring mt-4 rounded-full border border-line px-4 py-1.5 text-xs text-ink hover:bg-white/6"
            >
              Reload
            </button>
          </div>
        </div>
      )}

      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 z-10 h-24 bg-gradient-to-b from-black/60 to-transparent" />
      <TopNav />

      <div className="pointer-events-none absolute top-14 right-3 z-20 sm:top-3 sm:right-auto sm:left-1/2 sm:-translate-x-1/2">
        <ViewModeToggle mode={viewMode} onChange={changeViewMode} dim={dim} onDimChange={changeDim} disabled={!controller} />
        {exaggeration !== 1 && dim === "3d" && (
          <p className="mt-2 text-center text-[11px] text-warn" role="note">
            Relief exaggerated ×{exaggeration} — not to scale
          </p>
        )}
      </div>

      {/* Left column: Layers panel + Dimension Dock (narrow so the globe stays visible) */}
      <div className="pointer-events-none absolute top-14 left-4 z-10 flex w-[min(20rem,calc(100vw-2rem))] flex-col gap-2 sm:left-6">
        <LayerPanel
          open={layersOpen}
          onToggle={() => setLayersOpen((o) => !o)}
          layers={allLayers}
          states={layerStates}
          onChange={updateLayer}
          status={status}
          qualityMode={qualityMode}
          onQualityChange={changeQuality}
        />
        <DimensionDock
          config={climateConfig}
          heatmapVisible={layerStates["climate-heatmap"]?.visible ?? true}
          stationsVisible={layerStates["climate-overlay"]?.visible ?? true}
          playing={playing}
          onChange={updateClimateConfig}
          onToggleHeatmap={() =>
            updateLayer("climate-heatmap", { visible: !(layerStates["climate-heatmap"]?.visible ?? true) })
          }
          onToggleStations={() =>
            updateLayer("climate-overlay", { visible: !(layerStates["climate-overlay"]?.visible ?? true) })
          }
          onTogglePlay={() => setPlaying((p) => !p)}
          onOpenEvidence={() => setEvidenceOpen(true)}
        />
      </div>

      <div className="pointer-events-none absolute top-1/2 right-3 z-10 -translate-y-1/2 sm:right-6">
        <div className="flex flex-col gap-2">
          <ToolsBar
            active={activeTool}
            onToggle={toggleTool}
            onAction={runAction}
            disabled={!controller}
            unavailable={dim === "2d" ? ["relief"] : []}
          />
          <CameraControls controller={controller} flat={dim === "2d"} onReset={() => controller?.flyTo(homeView)} />
        </div>
      </div>

      {activeTool && (
        <div className="pointer-events-none absolute right-4 bottom-36 z-20 sm:right-20 sm:bottom-24">
          {measure ? (
            <MeasurePanel
              measure={measure}
              hover={hover}
              controller={controller}
              terrainLabel={
                status?.terrain.available
                  ? `${status.terrain.label} · ${status.terrain.datum === "orthometric" ? "above sea level" : "ellipsoidal heights"}`
                  : null
              }
              onClear={() => setMeasure((m) => (m ? { ...m, points: [], closed: false } : m))}
              onUndo={undoPoint}
              onFinish={finishPolygon}
              onClose={closeTool}
            />
          ) : activeTool === "goto" ? (
            <GoToPanel onGo={goTo} onClose={closeTool} />
          ) : (
            <ReliefPanel value={exaggeration} onChange={changeExaggeration} onClose={closeTool} />
          )}
        </div>
      )}

      {notice && (
        <div role="status" className="panel pointer-events-none absolute bottom-28 left-1/2 z-30 -translate-x-1/2 !rounded-full px-4 py-2 text-xs text-ink">
          {notice}
        </div>
      )}

      {/* Bottom bar: coordinates · primary action · evidence */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex flex-col gap-3 px-4 pb-8 sm:px-6">
        <div className="flex justify-end sm:pr-14">
          <EvidencePanel
            open={evidenceOpen}
            onClose={() => setEvidenceOpen(false)}
            selected={selected}
            bundle={bundle}
            config={climateConfig}
            onSelectYear={(year) => updateClimateConfig({ year, mode: "value" })}
            onSelectLocation={handleSelectLocation}
          />
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="sm:w-[22rem]">
            <CoordinateReadout hover={hover} selected={selected} onClear={() => setSelected(null)} />
          </div>
          <div className="flex items-center justify-between gap-2 sm:contents">
            <ExploreSpain controller={controller} />
            <button
              type="button"
              onClick={() => setEvidenceOpen((o) => !o)}
              aria-expanded={evidenceOpen}
              aria-controls="evidence-panel"
              className="focus-ring panel pointer-events-auto relative inline-flex items-center gap-2 !rounded-full px-4 py-2.5 text-xs text-ink transition-colors hover:bg-white/6 sm:mb-1"
            >
              <Icon name="chart" className="size-4 text-muted" />
              2030 Evidence & Decisions
              <span className="size-1.5 rounded-full bg-accent" aria-hidden />
            </button>
          </div>
        </div>
      </div>

      {/* Imagery / terrain attribution (required by providers) */}
      <div
        ref={setCreditEl}
        className="globe-credits pointer-events-auto absolute inset-x-4 bottom-1.5 z-10 sm:inset-x-6"
      />
    </main>
  );
}
