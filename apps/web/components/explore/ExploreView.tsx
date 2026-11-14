"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import GlobeClient from "@/components/globe/GlobeClient";
import {
  DEFAULT_ADMIN_SCOPE,
  loadAdminBundle,
  resolveAdminScope,
  type AdminBundle,
  type AdminScopeLevel,
  type AdminScopeSelection,
} from "@/lib/globe/admin-scope";
import { buildLayerCatalog, HOME_VIEW, initialLayerStates } from "@/lib/globe/catalog";
import {
  buildDimensionOverlayGeoJson,
  DIMENSIONS,
  dimensionHasSpatialGrid,
  getEffectiveMeta,
  getMapLegendMeta,
  HEATMAP_BOUNDS,
  loadClimateBundle,
  renderDimensionHeatmapDataUrl,
  type ActiveClimateConfig,
  type ClimateBundle,
  type PaletteId,
} from "@/lib/globe/climate";
// EXPLORATORY: Energy Tech Lab (D44). Opt-in tab, not on the demo path; scores are not validated results.
import {
  buildEnergyConceptOverlayGeoJson,
  ENERGY_CONCEPTS,
  evaluateEnergySites,
  getEnergyConceptMeta,
  renderEnergyConceptHeatmapDataUrl,
  type EnergyConceptId,
  type EnergyOptimizationGoal,
  type EnergyTargetScope,
  type EnergyVariableLens,
  type EvaluatedEnergySite,
} from "@/lib/globe/energy-tech";
import type {
  CameraState,
  GeoCoordinate,
  GlobeController,
  GlobeStatus,
  LayerDescriptor,
  LayerState,
  LayerStateMap,
  OverlayFeature,
  QualityMode,
  SceneDim,
  ToolId,
  ViewMode,
} from "@/lib/globe/types";
import { AdminScopeBar } from "./AdminScopeBar";
import { CameraControls } from "./CameraControls";
import { CoordinateReadout } from "./CoordinateReadout";
import { DimensionDock } from "./DimensionDock";
import { EnergyTechControlsDock, EnergyTechInspectorPanel } from "./EnergyTechAdvisor";
import { EvidencePanel } from "./EvidencePanel";
import { Icon } from "./Icon";
import { ScaleThermometer } from "./ScaleThermometer";
import { StationCatalogPanel } from "./StationCatalogPanel";
import { EvidenceCardPanel } from "./EvidenceCardPanel";
import { ToolsBar, type ToolAction } from "./ToolsBar";
import { TopNav } from "./TopNav";
import { ViewModeToggle } from "./ViewModeToggle";

const QUALITY_KEY = "globe-quality-mode";

/** Shareable view in the URL hash: #cam=lat,lon,height,heading,pitch&mode=spain */
function encodeView(c: CameraState, mode: ViewMode, dim: SceneDim): string {
  const cam = [c.latitude.toFixed(5), c.longitude.toFixed(5), Math.round(c.height), c.heading.toFixed(1), c.pitch.toFixed(1)].join(",");
  return `#cam=${cam}&mode=${mode}${dim === "2d" ? "&dim=2d" : ""}`;
}
function decodeView(hash: string): { camera: CameraState; mode: ViewMode; dim: SceneDim } | null {
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  const nums = (params.get("cam") ?? "").split(",").map(Number);
  if (nums.length !== 5 || nums.some((n) => !Number.isFinite(n))) return null;
  const [latitude, longitude, height, heading, pitch] = nums;
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180 || height <= 0) return null;
  return {
    camera: { latitude, longitude, height, heading, pitch },
    mode: params.get("mode") === "spain" ? "spain" : "world",
    dim: params.get("dim") === "2d" ? "2d" : "3d",
  };
}

export function ExploreView() {
  const [baseLayers] = useState(() => buildLayerCatalog());
  const [layerStates, setLayerStates] = useState<LayerStateMap>(() => ({
    ...initialLayerStates(baseLayers),
    "climate-heatmap": { visible: true, opacity: 0.62 },
    "climate-overlay": { visible: true, opacity: 0.95 },
  }));
  const [hover, setHover] = useState<GeoCoordinate | null>(null);
  const [overlayHover, setOverlayHover] = useState<OverlayFeature | null>(null);
  const [selected, setSelected] = useState<GeoCoordinate | null>(null);
  const [status, setStatus] = useState<GlobeStatus | null>(null);
  const [controller, setController] = useState<GlobeController | null>(null);
  const [creditEl, setCreditEl] = useState<HTMLDivElement | null>(null);
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [qualityMode, setQualityMode] = useState<QualityMode>("auto");
  const [viewMode, setViewMode] = useState<ViewMode>("world");
  const [dim, setDim] = useState<SceneDim>("3d");
  // The whole Earth is always rendered; home always frames Spain. "spain" mode only locks the camera.
  const homeView = HOME_VIEW;

  // --- Workspace Mode: "climate" (validated demo path, default) vs "energy" (EXPLORATORY Energy Tech Lab, opt-in) ---
  const [workspaceMode, setWorkspaceMode] = useState<"energy" | "climate">("climate");
  const [energyConcept, setEnergyConcept] = useState<EnergyConceptId>("hydropower_stability");
  const [energyScope, setEnergyScope] = useState<EnergyTargetScope>("basin");
  const [energyGoal, setEnergyGoal] = useState<EnergyOptimizationGoal>("ideal");
  const [energyLens, setEnergyLens] = useState<EnergyVariableLens>("composite");
  const [selectedEnergySiteId, setSelectedEnergySiteId] = useState<string | null>(null);
  const [energyHeatmap, setEnergyHeatmap] = useState<{
    url: string;
    domain: [number, number];
    palette: PaletteId;
    units: string;
  }>({
    url: "",
    domain: [25, 88],
    palette: "runoff",
    units: "pts",
  });

  // --- Climate bundle + Administrative Scope + dimensions state (observed years only) ---
  const [bundle, setBundle] = useState<ClimateBundle | null>(null);
  const [adminBundle, setAdminBundle] = useState<AdminBundle | null>(null);
  const [adminScope, setAdminScope] = useState<AdminScopeSelection>(DEFAULT_ADMIN_SCOPE);
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

  const resolvedScope = useMemo(
    () => resolveAdminScope(adminBundle, adminScope),
    [adminBundle, adminScope],
  );
  const scaleMeta = getMapLegendMeta(climateConfig, bundle);

  const evaluatedEnergySites = useMemo<EvaluatedEnergySite[]>(() => {
    if (!bundle) return [];
    return evaluateEnergySites(bundle, energyConcept, energyScope, energyGoal, energyLens);
  }, [bundle, energyConcept, energyScope, energyGoal, energyLens]);

  useEffect(() => {
    let active = true;
    loadClimateBundle()
      .then((b) => {
        if (active) setBundle(b);
      })
      .catch((err) => console.error("[climate] failed to load climate bundle", err));
    loadAdminBundle()
      .then((ab) => {
        if (!active) return;
        setAdminBundle(ab);
        const params = new URLSearchParams(window.location.search);
        const labParam = params.get("lab");
        const conceptParam = params.get("concept") as EnergyConceptId | null;
        if (conceptParam && ENERGY_CONCEPTS.some((c) => c.id === conceptParam)) {
          const meta = ENERGY_CONCEPTS.find((c) => c.id === conceptParam)!;
          setWorkspaceMode("energy");
          setEnergyConcept(conceptParam);
          setEnergyScope(meta.recommendedScope);
        } else if (labParam === "energy") {
          setWorkspaceMode("energy");
        }
        // Check URL query params for initial scope (?scope=age|ccaa|provincia&id=...)
        const scopeParam = params.get("scope") as AdminScopeLevel | null;
        const idParam = params.get("id");
        if (scopeParam && ["age", "ccaa", "provincia"].includes(scopeParam)) {
          setAdminScope((prev) => {
            const next = { ...prev, level: scopeParam };
            if (scopeParam === "ccaa" && idParam && ab.ccaa.some((c) => c.id === idParam)) {
              next.ccaaId = idParam;
            } else if (scopeParam === "provincia" && idParam && ab.provinces.some((p) => p.id === idParam)) {
              const prov = ab.provinces.find((p) => p.id === idParam);
              next.provinceId = idParam;
              if (prov) next.ccaaId = prov.ccaaId;
            }
            return next;
          });
        }
      })
      .catch((err) => console.error("[admin] failed to load spain-admin.json", err));
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!bundle) return;
    if (!dimensionHasSpatialGrid(climateConfig.dimension)) {
      setHeatmapUrl("");
      return;
    }
    let active = true;
    renderDimensionHeatmapDataUrl(bundle, climateConfig, resolvedScope)
      .then((url) => {
        if (active) setHeatmapUrl(url);
      })
      .catch((err) => console.error("[climate] failed to render heatmap", err));
    return () => {
      active = false;
    };
  }, [bundle, climateConfig, resolvedScope]);

  useEffect(() => {
    if (!bundle || workspaceMode !== "energy") return;
    let active = true;
    renderEnergyConceptHeatmapDataUrl(bundle, energyConcept, energyScope, energyLens, resolvedScope)
      .then((res) => {
        if (active) setEnergyHeatmap(res);
      })
      .catch((err) => console.error("[energy] failed to render energy heatmap", err));
    return () => {
      active = false;
    };
  }, [bundle, workspaceMode, energyConcept, energyScope, energyLens, resolvedScope]);

  const updateClimateConfig = useCallback((patch: Partial<ActiveClimateConfig>) => {
    setClimateConfig((prev) => ({ ...prev, ...patch }));
  }, []);

  const handleChangeAdminScope = useCallback(
    (next: AdminScopeSelection, fly = true) => {
      setAdminScope(next);
      setSelected(null);
      setEvidenceOpen(true);
      if (fly && controller) {
        const nextResolved = resolveAdminScope(adminBundle, next);
        controller.flyTo(nextResolved.orbitView);
      }
    },
    [controller, adminBundle],
  );

  const handleFocusActiveScope = useCallback(() => {
    if (!controller) return;
    controller.flyTo(resolvedScope.orbitView);
  }, [controller, resolvedScope]);

  const handleChangeEnergyConcept = useCallback((nextConcept: EnergyConceptId) => {
    setEnergyConcept(nextConcept);
    const meta = getEnergyConceptMeta(nextConcept);
    setEnergyScope(meta.recommendedScope);
    setSelectedEnergySiteId(null);
    setEvidenceOpen(true);
    setLayerStates((prev) => ({
      ...prev,
      "climate-heatmap": { ...prev["climate-heatmap"], visible: true, opacity: 0.72 },
      "climate-overlay": { ...prev["climate-overlay"], visible: true, opacity: 1 },
    }));
  }, []);

  const handleSelectEnergySite = useCallback(
    (site: EvaluatedEnergySite) => {
      setSelectedEnergySiteId(site.id);
      setSelected({ latitude: site.lat, longitude: site.lon });
      setEvidenceOpen(true);
      const range =
        site.scope === "reservoir"
          ? 45_000
          : site.scope === "provincia"
            ? 150_000
            : site.scope === "ccaa"
              ? 320_000
              : 340_000;
      controller?.flyTo({
        target: { latitude: site.lat, longitude: site.lon },
        heading: 0,
        pitch: site.scope === "reservoir" ? -50 : -58,
        range,
        durationSeconds: 1.7,
        terrainAware: true,
      });
    },
    [controller],
  );

  const allLayers = useMemo<LayerDescriptor[]>(() => {
    const dimMeta = DIMENSIONS.find((d) => d.id === climateConfig.dimension) ?? DIMENSIONS[0];
    const eff = getEffectiveMeta(climateConfig, bundle);
    const conceptMeta = getEnergyConceptMeta(energyConcept);
    const activeEnergySiteId = selectedEnergySiteId ?? evaluatedEnergySites[0]?.id ?? null;

    const isEnergyMode = workspaceMode === "energy";
    const overlayData = bundle
      ? isEnergyMode
        ? buildEnergyConceptOverlayGeoJson(
            evaluatedEnergySites,
            energyConcept,
            energyLens,
            activeEnergySiteId,
            adminBundle,
          )
        : buildDimensionOverlayGeoJson(bundle, climateConfig, resolvedScope, adminBundle)
      : { type: "FeatureCollection", features: [] };

    const conceptDatasetsLabel = conceptMeta.variablesCrossed.map((v) => v.dataset).join(" · ");

    const analysisLayers: LayerDescriptor[] = [
      {
        id: "climate-heatmap",
        kind: "raster-field",
        group: "analysis",
        title: isEnergyMode ? `${conceptMeta.shortTitle} Surface` : `${dimMeta.label} Heatmap`,
        description: isEnergyMode ? conceptMeta.lensLabels[energyLens] : eff.subtitle,
        source: { name: isEnergyMode ? conceptDatasetsLabel : dimMeta.datasets },
        resolution: isEnergyMode ? "0.25° GLDAS / 0.1° GPM / 0.5° MERRA-2" : dimMeta.spatialNote,
        synthetic: isEnergyMode ? !conceptMeta.coverageBadge.startsWith("100%") : dimMeta.synthetic,
        url: isEnergyMode ? energyHeatmap.url : heatmapUrl,
        science: {
          variable: isEnergyMode ? energyConcept : dimMeta.id,
          units: isEnergyMode ? energyHeatmap.units : eff.units,
          bounds: HEATMAP_BOUNDS,
          spatialResolution: isEnergyMode ? "0.25°–0.5° gridded reanalysis" : dimMeta.spatialNote,
          timeCoverage: { start: "2000-01-01", end: "2025-12-31", step: "P1Y" },
          encoding: "color",
          colorScale: {
            domain: isEnergyMode ? energyHeatmap.domain : eff.domain,
            palette: isEnergyMode ? energyHeatmap.palette : eff.palette,
            kind: isEnergyMode ? "diverging" : climateConfig.mode === "value" ? "sequential" : "diverging",
          },
          missingData: { policy: "hide" },
        },
      },
      {
        id: "climate-overlay",
        kind: "point-values",
        group: "analysis",
        title: isEnergyMode
          ? `Evaluated ${energyScope} sites (${evaluatedEnergySites.length}) · EXPLORATORY`
          : climateConfig.dimension === "water_rivers"
            ? "Basin hubs"
            : "NOAA weather stations",
        description: isEnergyMode
          ? "EXPLORATORY ranking of provinces, CCAA, basins or SWOT reservoirs for the selected concept. Not a validated result."
          : climateConfig.dimension === "water_rivers"
            ? "GPM rainfall averaged inside each basin box — not river gauges."
            : resolvedScope.level === "age"
              ? "NOAA GHCN-Daily reference stations: one per province (longest record). Full list in the station catalog."
              : "Every NOAA GHCN-Daily station inside the selected region.",
        source: { name: isEnergyMode ? conceptDatasetsLabel : "NOAA GHCN-Daily" },
        resolution: isEnergyMode
          ? `${evaluatedEnergySites.length} evaluated sites`
          : resolvedScope.level === "age"
            ? "1 reference station per province"
            : "All stations in scope",
        data: overlayData,
        science: {
          variable: isEnergyMode ? energyConcept : dimMeta.id,
          units: isEnergyMode ? energyHeatmap.units : eff.units,
          bounds: HEATMAP_BOUNDS,
          spatialResolution: "Point stations & centroids",
          timeCoverage: { start: "2001-01-01", end: "2025-12-31", step: "P1Y" },
          encoding: "color",
          missingData: { policy: "hide" },
        },
      },
    ];
    return [...analysisLayers, ...baseLayers];
  }, [
    baseLayers,
    bundle,
    climateConfig,
    heatmapUrl,
    resolvedScope,
    adminBundle,
    workspaceMode,
    energyConcept,
    energyScope,
    energyLens,
    energyHeatmap,
    evaluatedEnergySites,
    selectedEnergySiteId,
  ]);

  // --- Map tools -------------------------------------------------------------------------
  const [activeTool, setActiveTool] = useState<ToolId | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const flash = useCallback((msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice((n) => (n === msg ? null : n)), 2200);
  }, []);

  const closeTool = useCallback(() => setActiveTool(null), []);
  const toggleTool = useCallback((tool: ToolId) => setActiveTool((t) => (t === tool ? null : tool)), []);
  useEffect(() => {
    if (!activeTool) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeTool();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeTool, closeTool]);

  const handleSelectLocation = useCallback(
    (coord: GeoCoordinate | null) => {
      setSelected(coord);
      if (coord) {
        setEvidenceOpen(true);
        if (workspaceMode === "energy" && evaluatedEnergySites.length > 0) {
          let bestSite: EvaluatedEnergySite | null = null;
          let bestDist2 = Infinity;
          for (const s of evaluatedEnergySites) {
            const dlat = s.lat - coord.latitude;
            const dlon = (s.lon - coord.longitude) * 0.76;
            const d2 = dlat * dlat + dlon * dlon;
            if (d2 < bestDist2) {
              bestDist2 = d2;
              bestSite = s;
            }
          }
          if (bestSite && bestDist2 < 1.8) {
            setSelectedEnergySiteId(bestSite.id);
          }
        }
      }
    },
    [workspaceMode, evaluatedEnergySites],
  );

  const inspectStation = useCallback(
    (coord: GeoCoordinate) => {
      handleSelectLocation(coord);
      controller?.flyTo({
        target: { latitude: coord.latitude, longitude: coord.longitude },
        heading: 0,
        pitch: -55,
        range: 90_000,
        durationSeconds: 1.8,
        terrainAware: true,
      });
    },
    [controller, handleSelectLocation],
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
        const hash = encodeView(controller.getCamera(), viewMode, dim);
        history.replaceState(null, "", hash);
        try {
          await navigator.clipboard.writeText(window.location.href);
          flash("Link to this view copied");
        } catch {
          flash("Link is in the address bar");
        }
      }
    },
    [controller, viewMode, dim, flash],
  );

  // Restore a shared view (#cam=…) once the globe is ready.
  const [restored, setRestored] = useState(false);
  useEffect(() => {
    if (!controller || restored) return;
    setRestored(true);
    const shared = decodeView(window.location.hash);
    if (!shared) return;
    setViewMode(shared.mode);
    setDim(shared.dim);
    controller.setDimension(shared.dim, 0);
    controller.setCamera(shared.camera, 0);
  }, [controller, restored]);

  // 2D flat map ↔ 3D globe. Tilt/rotate only make sense in 3D.
  const changeDim = useCallback(
    (d: SceneDim) => {
      setDim(d);
      controller?.setDimension(d);
    },
    [controller],
  );

  const changeViewMode = useCallback(
    (mode: ViewMode) => {
      setViewMode(mode);
      if (mode === "spain") controller?.flyTo(HOME_VIEW);
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

  const updateLayer = useCallback((id: string, patch: Partial<LayerState>) => {
    setLayerStates((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }, []);

  const ready = status?.phase === "ready";

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-space">
      <h1 className="sr-only">Explore observed environmental trends in Spain on a 3D globe</h1>

      {creditEl && (
        <GlobeClient
          className="absolute inset-0 focus-ring"
          layers={allLayers}
          layerStates={layerStates}
          selected={selected}
          qualityMode={qualityMode}
          viewMode={viewMode}
          onHover={setHover}
          onOverlayHover={setOverlayHover}
          onSelect={handleSelectLocation}
          onStatus={setStatus}
          onReady={setController}
          creditContainer={creditEl}
        />
      )}

      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[1] bg-[radial-gradient(ellipse_at_center,transparent_42%,rgb(2_4_10/0.38)_100%)]"
      />

      {/* Loading and error states */}
      {status?.phase !== "error" && (
        <div
          className={`pointer-events-none absolute inset-0 z-[2] grid place-items-center bg-space/55 transition-opacity duration-700 ${
            ready ? "opacity-0" : "opacity-100"
          }`}
          aria-hidden={ready}
        >
          <div className="flex flex-col items-center gap-3" role="status">
            <span className="size-10 animate-pulse rounded-full border border-accent/40 bg-accent/10 shadow-[0_0_28px_rgb(124_196_255/0.35)]" />
            <p className="text-xs tracking-[0.22em] text-muted uppercase">Preparing Spain…</p>
          </div>
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
      <TopNav
        center={
          <ViewModeToggle mode={viewMode} onChange={changeViewMode} dim={dim} onDimChange={changeDim} disabled={!controller} />
        }
      />

      <div className="pointer-events-none absolute top-[4.75rem] left-4 z-10 flex max-h-[calc(100dvh-8.5rem)] w-[min(19.5rem,calc(100vw-2rem))] flex-col gap-2 overflow-y-auto sm:left-6">
        <div
          role="tablist"
          aria-label="Analysis workspace mode"
          className="panel pointer-events-auto grid grid-cols-2 gap-1 p-1 text-xs"
        >
          <button
            type="button"
            role="tab"
            aria-selected={workspaceMode === "climate"}
            onClick={() => setWorkspaceMode("climate")}
            className={`focus-ring rounded-md px-2.5 py-1.5 font-medium transition-colors ${
              workspaceMode === "climate"
                ? "bg-accent/20 text-accent shadow-[inset_0_0_0_1px_rgb(124_196_255/0.35)]"
                : "text-muted hover:text-ink"
            }`}
          >
            Climate trends
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={workspaceMode === "energy"}
            title="Exploratory: suitability scores are not validated results"
            onClick={() => {
              setWorkspaceMode("energy");
              setEvidenceOpen(true);
            }}
            className={`focus-ring rounded-md px-2.5 py-1.5 font-medium transition-colors ${
              workspaceMode === "energy"
                ? "bg-amber-400/15 text-amber-200 shadow-[inset_0_0_0_1px_rgb(251_191_36/0.35)]"
                : "text-muted hover:text-ink"
            }`}
          >
            Energy Lab <span className="text-[9px] tracking-wider uppercase opacity-80">exploratory</span>
          </button>
        </div>

        <AdminScopeBar
          admin={adminBundle}
          scope={adminScope}
          resolved={resolvedScope}
          onChange={handleChangeAdminScope}
          onFocusCamera={handleFocusActiveScope}
        />
        {workspaceMode === "energy" ? (
          <EnergyTechControlsDock
            conceptId={energyConcept}
            scope={energyScope}
            goal={energyGoal}
            lens={energyLens}
            heatmapDomain={energyHeatmap.domain}
            heatmapPalette={energyHeatmap.palette}
            heatmapUnits={energyHeatmap.units}
            onChangeConcept={handleChangeEnergyConcept}
            onChangeScope={(s) => {
              setEnergyScope(s);
              setSelectedEnergySiteId(null);
            }}
            onChangeGoal={(g) => {
              setEnergyGoal(g);
              setSelectedEnergySiteId(null);
            }}
            onChangeLens={setEnergyLens}
          />
        ) : (
          <>
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
            />
            {(layerStates["climate-heatmap"]?.visible ?? true) && dimensionHasSpatialGrid(climateConfig.dimension) && (
              <aside className="pointer-events-none mt-1 pl-1" aria-label="Map color scale">
                <ScaleThermometer
                  thin
                  palette={scaleMeta.palette}
                  domain={scaleMeta.domain}
                  units={scaleMeta.units}
                  height={220}
                />
              </aside>
            )}
          </>
        )}
      </div>

      <div className="pointer-events-none absolute top-28 right-3 bottom-28 z-20 flex items-stretch justify-end gap-2 sm:top-16 sm:right-6 sm:bottom-32">
        {activeTool && (
          <div className="pointer-events-none flex items-end pb-1">
            {activeTool === "stations" && (
              <StationCatalogPanel
                bundle={bundle}
                admin={adminBundle}
                config={climateConfig}
                scope={resolvedScope}
                selected={selected}
                onInspect={inspectStation}
                onClose={closeTool}
              />
            )}
            {activeTool === "evidence" && <EvidenceCardPanel onClose={closeTool} />}
          </div>
        )}
        <div className="flex shrink-0 flex-col justify-center gap-2">
          <ToolsBar
            active={activeTool}
            onToggle={toggleTool}
            onAction={runAction}
            disabled={!controller}
          />
          <CameraControls controller={controller} flat={dim === "2d"} onReset={() => controller?.flyTo(homeView)} />
        </div>
        {evidenceOpen && (
          <div
            className={`flex h-full min-h-0 shrink-0 ${
              workspaceMode === "energy"
                ? "w-[min(30rem,calc(100vw-4.75rem))]"
                : "w-[min(28rem,calc(100vw-4.75rem))]"
            }`}
          >
            {workspaceMode === "energy" ? (
              <EnergyTechInspectorPanel
                conceptId={energyConcept}
                scope={energyScope}
                goal={energyGoal}
                sites={evaluatedEnergySites}
                selectedSiteId={selectedEnergySiteId}
                onSelectSite={handleSelectEnergySite}
                onClose={() => setEvidenceOpen(false)}
              />
            ) : (
              <EvidencePanel
                open={evidenceOpen}
                onClose={() => setEvidenceOpen(false)}
                selected={selected}
                bundle={bundle}
                config={climateConfig}
                resolvedScope={resolvedScope}
                onSelectYear={(year) => updateClimateConfig({ year, mode: "value" })}
                onSelectLocation={handleSelectLocation}
                onOpenStationCatalog={() => setActiveTool("stations")}
                onResetToNational={() => handleChangeAdminScope({ ...adminScope, level: "age" }, true)}
              />
            )}
          </div>
        )}
      </div>

      {notice && (
        <div role="status" className="panel pointer-events-none absolute bottom-28 left-1/2 z-30 -translate-x-1/2 !rounded-full px-4 py-2 text-xs text-ink">
          {notice}
        </div>
      )}

      {ready && !selected && (
        <p className="pointer-events-none absolute bottom-28 left-1/2 z-10 hidden -translate-x-1/2 rounded-full border border-white/10 bg-black/35 px-3 py-1 text-[11px] text-muted backdrop-blur-md sm:block">
          Drag to orbit · Scroll to zoom · Click a ranked site or station
        </p>
      )}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex flex-col gap-2 px-4 pb-8 sm:px-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div className="sm:max-w-[20rem]">
            {(selected || overlayHover) && (
              <CoordinateReadout
                hover={hover}
                selected={selected}
                overlay={overlayHover}
                onClear={() => setSelected(null)}
              />
            )}
          </div>
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setEvidenceOpen((o) => !o)}
              aria-expanded={evidenceOpen}
              aria-controls="evidence-panel"
              className="focus-ring panel pointer-events-auto inline-flex items-center gap-2 !rounded-full px-3.5 py-2 text-xs text-ink transition-colors hover:bg-white/6 sm:mb-1"
            >
              <Icon name="chart" className="size-4 text-muted" />
              {evidenceOpen
                ? workspaceMode === "energy"
                  ? "Hide Energy Advisor"
                  : "Hide trend"
                : workspaceMode === "energy"
                  ? "Ideal Sites & Time Series"
                  : "Trend"}
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
