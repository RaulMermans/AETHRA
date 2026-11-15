"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import GlobeClient from "@/components/globe/GlobeClient";
import { HydroFeatureCard } from "@/components/explore/HydroFeatureCard";
import {
  DEFAULT_ADMIN_SCOPE,
  buildGateAExtentOverlayGeoJson,
  loadAdminBundle,
  resolveAdminScope,
  type AdminBundle,
  type AdminScopeLevel,
  type AdminScopeSelection,
} from "@/lib/globe/admin-scope";
import { EXPLORATORY_FEATURES_ENABLED } from "@/lib/demo-mode";
import { buildLayerCatalog, HOME_VIEW, SPAIN_VIEW, WORLD_VIEW, initialLayerStates } from "@/lib/globe/catalog";
import type { OrbitView } from "@/lib/globe/types";
import { IGN_HYDRO_LAYERS, queryIgnHydroFeature, type IgnHydroFeature } from "@/lib/globe/ign-hydro";
import type { IllustrativeAssetView } from "@/lib/globe/cesium/illustrative-model";
import {
  DESTINATIONS,
  destinationAllowedInJudgeMode,
  destinationById,
  HOME_DESTINATION_VIEW,
  type GeographicDestination,
} from "@/lib/globe/destinations";
import { caseById } from "@/lib/globe/energy-research-cases";
import {
  buildDimensionOverlayGeoJson,
  DIMENSIONS,
  dimensionHasSpatialGrid,
  FIRST_OBSERVED_YEAR,
  getEffectiveMeta,
  getMapLegendMeta,
  HEATMAP_BOUNDS,
  LAST_COMPLETE_YEAR,
  loadClimateBundle,
  periodColorDomain,
  renderDimensionHeatmapDataUrl,
  type ActiveClimateConfig,
  type ClimateBundle,
  type PaletteId,
} from "@/lib/globe/climate";
import {
  labelledObservedYear,
  MS_PER_OBSERVED_YEAR,
  MS_TREND_SUMMARY_HOLD,
  prefersReducedMotion,
  restartPlaybackConfig,
  smoothstep01,
} from "@/lib/globe/climate-timeline";
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
// D49: Energy infrastructure context layer (P1, opt-in, off the demo path). Registered metadata only.
import {
  buildInfrastructureOverlay,
  loadInfrastructureFile,
  type InfrastructureFile,
  type Installation,
} from "@/lib/globe/energy-infrastructure";
import type {
  CameraState,
  GeoCoordinate,
  GlobeController,
  GlobeStatus,
  LayerDescriptor,
  LayerState,
  LayerStateMap,
  OverlayFeature,
  PreviewPoint,
  QualityMode,
  SceneDim,
  ToolId,
  ViewMode,
} from "@/lib/globe/types";
import { AdminScopeBar } from "./AdminScopeBar";
import { CameraControls } from "./CameraControls";
import { EnergyCasePanel } from "./EnergyCasePanel";
import { ExploreSpain } from "./ExploreSpain";
import { MapMarkerLegend } from "./MapMarkerLegend";
import { MapEncodingKey } from "./MapEncodingKey";
import { CoordinateReadout } from "./CoordinateReadout";
import { DimensionDock, dockTitle } from "./DimensionDock";
import { EnergyInfrastructurePanel } from "./EnergyInfrastructurePanel";
import { EnergyTechControlsDock, EnergyTechInspectorPanel } from "./EnergyTechAdvisor";
import { EvidencePanel } from "./EvidencePanel";
import { FindingsBriefPanel } from "./FindingsBriefPanel";
import { Icon } from "./Icon";
import { ScaleThermometer } from "./ScaleThermometer";
import { StationCatalogPanel } from "./StationCatalogPanel";
import { AethraCorePanel } from "./AethraCorePanel";
import { TaroPortrait } from "./TaroPortrait";
import { EvidenceCardPanel, type EvidenceTopic } from "./EvidenceCardPanel";
import { PlanetToProof, type ProofStage } from "./PlanetToProof";
import { RelationshipPanel } from "./RelationshipPanel";
import {
  buildRelationOverlay,
  loadRelationships,
  renderCouplingRaster,
  type RelationMapId,
  type RelationshipsFile,
} from "@/lib/globe/relationships";
import type { AgentSuggestedAction } from "@/lib/agent/types";
import type { EvidenceCard } from "@/lib/agent/cards";
import { useLocale } from "@/lib/i18n/locale";
import type { Messages } from "@/lib/i18n/messages";
import { ToolsBar, type ToolAction } from "./ToolsBar";
import { TopNav } from "./TopNav";
import { ViewModeToggle } from "./ViewModeToggle";
// Evidence-based solar PV screening (EVIDENCE_SCREENING_PLAN.md): visible in judge mode, labelled exploratory.
import { SolarScreeningPanel, SunGlyph } from "./SolarScreeningPanel";
import { cellAt, loadPvScreeningData, plantAt, type PvScreeningData, type SolarPlant } from "@/lib/globe/pv-screening";
import { buildScreeningLayers, screeningLayerStates, screeningPlants, type ScreeningToggles } from "@/lib/globe/cesium/screening-layers";
import { screeningCopy } from "@/lib/i18n/screening-copy";

const QUALITY_KEY = "globe-quality-mode";

/** Shareable view in the URL hash: #cam=lat,lon,height,heading,pitch */
/** Globe.tsx emits English error text; restate the known cases in the active language, keeping the raw detail. */
function localizeGlobeError(error: string | undefined, e: Messages["explore"]): string {
  if (!error) return "";
  const start = "The 3D globe could not start. WebGL may be unavailable or disabled in this browser.";
  if (error.startsWith(start)) return e.webglFailed + error.slice(start.length);
  if (error.startsWith("The GPU context was lost")) return e.contextLost;
  const stopped = "Rendering stopped: ";
  if (error.startsWith(stopped)) return e.renderingStopped(error.slice(stopped.length));
  return error;
}

function encodeView(c: CameraState, dim: SceneDim): string {
  const cam = [c.latitude.toFixed(5), c.longitude.toFixed(5), Math.round(c.height), c.heading.toFixed(1), c.pitch.toFixed(1)].join(",");
  return `#cam=${cam}&mode=world${dim === "2d" ? "&dim=2d" : ""}`;
}
function decodeView(hash: string): { camera: CameraState; dim: SceneDim } | null {
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  const nums = (params.get("cam") ?? "").split(",").map(Number);
  if (nums.length !== 5 || nums.some((n) => !Number.isFinite(n))) return null;
  const [latitude, longitude, height, heading, pitch] = nums;
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180 || height <= 0) return null;
  return {
    camera: { latitude, longitude, height, heading, pitch },
    dim: params.get("dim") === "2d" ? "2d" : "3d",
  };
}

/** Planet to Proof below lg: Spain sits above the bottom-sheet guide instead of behind it. */
const PROOF_COMPACT_VIEW: OrbitView = {
  target: { latitude: 36.2, longitude: -3.4 },
  heading: 0,
  pitch: -62,
  range: 3_400_000,
  durationSeconds: 3.2,
};

export function ExploreView() {
  const { m, locale } = useLocale();
  const [baseLayers] = useState(() => buildLayerCatalog());
  const [layerStates, setLayerStates] = useState<LayerStateMap>(() => ({
    ...initialLayerStates(baseLayers),
    "climate-heatmap": { visible: true, opacity: 0.62 },
    "climate-overlay": { visible: true, opacity: 0.95 },
  }));
  const mapLayerVisible = layerStates["climate-heatmap"]?.visible ?? true;
  const stationsLayerVisible = layerStates["climate-overlay"]?.visible ?? true;
  const [selectedHydro, setSelectedHydro] = useState<IgnHydroFeature | null>(null);
  const [hydroSelectionStatus, setHydroSelectionStatus] = useState<"idle" | "loading" | "empty" | "error">("idle");
  const [layerErrors, setLayerErrors] = useState<Record<string, string>>({});
  const hydroRequest = useRef<AbortController | null>(null);
  const lastHydroClick = useRef("");
  useEffect(() => () => hydroRequest.current?.abort(), []);
  const [hover, setHover] = useState<GeoCoordinate | null>(null);
  const [stationPreview, setStationPreview] = useState<PreviewPoint[]>([]);
  const [overlayHover, setOverlayHover] = useState<OverlayFeature | null>(null);
  const [selected, setSelected] = useState<GeoCoordinate | null>(null);
  const [status, setStatus] = useState<GlobeStatus | null>(null);
  const [controller, setController] = useState<GlobeController | null>(null);
  const [creditEl, setCreditEl] = useState<HTMLDivElement | null>(null);
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  // Below the sm breakpoint only; on wider screens the controls are always shown.
  const [controlsOpen, setControlsOpen] = useState(true);
  const foldOnPhone = controlsOpen ? "contents" : "contents max-sm:hidden";
  const [proofStage, setProofStage] = useState<ProofStage | null>(null);
  // Height of the bottom bar (wraps on narrow screens, grows with the point readout).
  const [bottomBarHeight, setBottomBarHeight] = useState(0);
  const bottomBarObserver = useRef<ResizeObserver | null>(null);
  const bottomBarRef = useCallback((el: HTMLDivElement | null) => {
    bottomBarObserver.current?.disconnect();
    bottomBarObserver.current = null;
    if (!el) return;
    const observer = new ResizeObserver(() => setBottomBarHeight(Math.ceil(el.getBoundingClientRect().height)));
    observer.observe(el);
    bottomBarObserver.current = observer;
  }, []);
  const [proofCard, setProofCard] = useState<EvidenceCard | null>(null);
  // First view leads with the research question and its answer (Study findings), not a bare globe.
  const [trendTab, setTrendTab] = useState<"series" | "findings">("findings");
  useEffect(() => {
    // Wide screens only: below 1200 px the open panel hides the left controls (see inspectorOpen).
    if (window.matchMedia("(min-width: 1200px)").matches) setEvidenceOpen(true);
    // Phones: start with the map controls folded so Spain is visible (summary chip stays on screen).
    if (window.matchMedia("(max-width: 639px)").matches) setControlsOpen(false);
  }, []);
  const [qualityMode, setQualityMode] = useState<QualityMode>("auto");
  const viewMode: ViewMode = "world";
  const [dim, setDim] = useState<SceneDim>("3d");
  // The whole Earth is always rendered; home always frames Spain. The camera is free.
  const homeView = HOME_VIEW;

  // --- Workspace Mode: "climate" (validated demo path, default) vs "energy" (EXPLORATORY Energy Tech Lab, opt-in) ---
  const [rawWorkspaceMode, setWorkspaceMode] = useState<"energy" | "climate">("climate");
  // Judge mode (default build): the exploratory Energy Lab can never become active, whatever the URL or state.
  const workspaceMode: "energy" | "climate" = EXPLORATORY_FEATURES_ENABLED ? rawWorkspaceMode : "climate";
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
  const activeClimateDim = DIMENSIONS.find((d) => d.id === climateConfig.dimension) ?? DIMENSIONS[0];
  const [heatmapUrl, setHeatmapUrl] = useState<string>("");
  const [playing, setPlaying] = useState(false);
  const [heatmapByYear, setHeatmapByYear] = useState<ReadonlyMap<number, string>>(new Map());
  const [heatSlotA, setHeatSlotA] = useState("");
  const [heatSlotB, setHeatSlotB] = useState("");
  const [frontIsA, setFrontIsA] = useState(true);
  const [blendT, setBlendT] = useState(0);
  const [timelineReady, setTimelineReady] = useState(true);
  const playbackRef = useRef({
    frontIsA: true,
    yearA: FIRST_OBSERVED_YEAR,
    yearB: FIRST_OBSERVED_YEAR + 1,
    mix: 0,
  });
  const heatmapByYearRef = useRef(heatmapByYear);
  heatmapByYearRef.current = heatmapByYear;
  const heatmapTrendUrlRef = useRef("");

  const resolvedScope = useMemo(
    () => resolveAdminScope(adminBundle, adminScope),
    [adminBundle, adminScope],
  );
  const scaleMeta = useMemo(() => {
    const base = getMapLegendMeta(climateConfig, bundle);
    if (playing && bundle && climateConfig.mode === "value") {
      return { ...base, domain: periodColorDomain(bundle, climateConfig) };
    }
    return base;
  }, [bundle, climateConfig, playing]);

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
        // ?lab=energy / ?concept=… only work in exploratory builds (judge mode ignores them).
        const labParam = EXPLORATORY_FEATURES_ENABLED ? params.get("lab") : null;
        const conceptParam = EXPLORATORY_FEATURES_ENABLED ? (params.get("concept") as EnergyConceptId | null) : null;
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
        // Only switch scope when the id exists. An unknown id keeps the national view instead of
        // silently showing another region's result (no scope substitution, D76).
        const validCcaa = scopeParam === "ccaa" && idParam !== null && ab.ccaa.some((c) => c.id === idParam);
        const validProvince = scopeParam === "provincia" && idParam !== null && ab.provinces.some((p) => p.id === idParam);
        if (scopeParam === "age" || validCcaa || validProvince) {
          setAdminScope((prev) => {
            if (scopeParam === "age") return { ...prev, level: "age" };
            if (validCcaa && idParam) return { ...prev, level: "ccaa", ccaaId: idParam };
            const prov = ab.provinces.find((p) => p.id === idParam);
            return prov ? { ...prev, level: "provincia", provinceId: prov.id, ccaaId: prov.ccaaId } : prev;
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
    const locked = playing ? periodColorDomain(bundle, climateConfig) : undefined;
    renderDimensionHeatmapDataUrl(bundle, climateConfig, resolvedScope, locked)
      .then((url) => {
        if (active) setHeatmapUrl(url);
      })
      .catch((err: unknown) => console.error("[climate] failed to render heatmap", err));
    return () => {
      active = false;
    };
  }, [bundle, climateConfig, resolvedScope, playing]);

  useEffect(() => {
    if (!playing || !bundle || climateConfig.mode !== "value") {
      setTimelineReady(true);
      return;
    }
    // Station-symbol dimensions have no raster: frames render as "" and only the symbols animate.
    let cancelled = false;
    setTimelineReady(false);
    const frameCfg = {
      dimension: climateConfig.dimension,
      mode: "value" as const,
      scenario: climateConfig.scenario,
      heatMetric: climateConfig.heatMetric,
      rainMetric: climateConfig.rainMetric,
      vegMetric: climateConfig.vegMetric,
    };
    const domain = periodColorDomain(bundle, { ...frameCfg, year: LAST_COMPLETE_YEAR });
    const years: number[] = [];
    for (let year = FIRST_OBSERVED_YEAR; year <= LAST_COMPLETE_YEAR; year++) years.push(year);
    const trendCfg: ActiveClimateConfig = {
      ...climateConfig,
      ...frameCfg,
      mode: "trend",
      year: LAST_COMPLETE_YEAR,
    };
    void Promise.all([
      ...years.map((year) => renderDimensionHeatmapDataUrl(bundle, { ...frameCfg, year }, resolvedScope, domain)),
      renderDimensionHeatmapDataUrl(bundle, trendCfg, resolvedScope),
    ])
      .then((urls) => {
        if (cancelled) return;
        const next = new Map<number, string>();
        years.forEach((year, i) => {
          const url = urls[i];
          if (url) next.set(year, url);
        });
        heatmapTrendUrlRef.current = urls[years.length] ?? "";
        setHeatmapByYear(next);
        const startYear = Math.min(
          LAST_COMPLETE_YEAR - 1,
          Math.max(FIRST_OBSERVED_YEAR, climateConfig.year >= LAST_COMPLETE_YEAR ? FIRST_OBSERVED_YEAR : climateConfig.year),
        );
        const urlStart = next.get(startYear) ?? "";
        const urlNext = next.get(startYear + 1) ?? "";
        setHeatSlotA(urlStart);
        setHeatSlotB(urlNext);
        setFrontIsA(true);
        setBlendT(0);
        playbackRef.current = {
          frontIsA: true,
          yearA: startYear,
          yearB: startYear + 1,
          mix: 0,
        };
        setClimateConfig((prev) => (prev.year === startYear ? prev : { ...prev, year: startYear }));
        setTimelineReady(true);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          console.error("[climate] timeline prefetch failed", err);
          heatmapTrendUrlRef.current = "";
          setTimelineReady(true);
        }
      });
    return () => {
      cancelled = true;
    };
    // Year is read once when play starts; listing it would rebuild textures every annual tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- start year is snapshotted in this effect
  }, [
    playing,
    bundle,
    resolvedScope,
    climateConfig.dimension,
    climateConfig.mode,
    climateConfig.heatMetric,
    climateConfig.rainMetric,
    climateConfig.vegMetric,
    climateConfig.scenario,
  ]);

  useEffect(() => {
    if (!playing || climateConfig.mode !== "value") return;
    const enterTrendSummary = () => {
      const trendUrl = heatmapTrendUrlRef.current;
      setBlendT(0);
      setHeatSlotA("");
      setHeatSlotB("");
      if (trendUrl) setHeatmapUrl(trendUrl);
      setClimateConfig((prev) => ({ ...prev, mode: "trend", year: LAST_COMPLETE_YEAR }));
      setPlaying(false);
    };
    if (prefersReducedMotion()) {
      let codaTimer = 0;
      const timer = window.setInterval(() => {
        setClimateConfig((prev) => {
          if (prev.mode === "trend" || codaTimer) {
            return prev;
          }
          if (prev.year >= LAST_COMPLETE_YEAR) {
            codaTimer = window.setTimeout(enterTrendSummary, MS_TREND_SUMMARY_HOLD);
            return prev;
          }
          return { ...prev, year: prev.year + 1 };
        });
      }, 700);
      return () => {
        window.clearInterval(timer);
        window.clearTimeout(codaTimer);
      };
    }
    if (!timelineReady) return;
    let raf = 0;
    let last = 0;
    let linear = 0;
    let sent = -1;
    let codaTimer = 0;
    const tick = (now: number) => {
      const dt = now - last;
      last = now;
      linear += dt / MS_PER_OBSERVED_YEAR;
      if (linear >= 1) {
        const pb = playbackRef.current;
        const shownYear = pb.frontIsA ? pb.yearB : pb.yearA;
        if (shownYear >= LAST_COMPLETE_YEAR) {
          playbackRef.current.mix = 1;
          setBlendT(1);
          setClimateConfig((prev) => ({ ...prev, year: LAST_COMPLETE_YEAR }));
          codaTimer = window.setTimeout(enterTrendSummary, MS_TREND_SUMMARY_HOLD);
          return;
        }
        const incomingYear = shownYear + 1;
        const incomingUrl = heatmapByYearRef.current.get(incomingYear) ?? "";
        const nextFrontIsA = !pb.frontIsA;
        if (nextFrontIsA) {
          setHeatSlotB(incomingUrl);
          playbackRef.current = { frontIsA: true, yearA: shownYear, yearB: incomingYear, mix: 0 };
        } else {
          setHeatSlotA(incomingUrl);
          playbackRef.current = { frontIsA: false, yearA: incomingYear, yearB: shownYear, mix: 0 };
        }
        setFrontIsA(nextFrontIsA);
        setClimateConfig((prev) => ({ ...prev, year: shownYear }));
        linear = 0;
        sent = 0;
        setBlendT(0);
      } else {
        playbackRef.current.mix = linear;
        const eased = smoothstep01(linear);
        if (Math.abs(eased - sent) >= 0.016) {
          sent = eased;
          setBlendT(eased);
        }
        const labelled = labelledObservedYear(playbackRef.current);
        setClimateConfig((prev) => (prev.year === labelled ? prev : { ...prev, year: labelled }));
      }
      raf = window.requestAnimationFrame(tick);
    };
    const start = window.setTimeout(() => {
      last = performance.now();
      raf = window.requestAnimationFrame(tick);
    }, 200);
    return () => {
      window.clearTimeout(start);
      window.cancelAnimationFrame(raf);
      window.clearTimeout(codaTimer);
    };
  }, [playing, timelineReady, climateConfig.mode]);

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
    if (
      patch.year !== undefined ||
      patch.dimension !== undefined ||
      patch.mode !== undefined ||
      patch.heatMetric !== undefined ||
      patch.rainMetric !== undefined
    ) {
      setPlaying(false);
      setBlendT(0);
    }
    setClimateConfig((prev) => ({ ...prev, ...patch }));
  }, []);

  const handleChangeAdminScope = useCallback(
    (next: AdminScopeSelection, fly = true) => {
      setProofStage(null);
      setAdminScope(next);
      setSelected(null);
      setTrendTab("series");
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

  const urlA = playing && heatSlotA ? heatSlotA : heatmapUrl;
  const urlB = playing ? heatSlotB : "";

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
        : buildDimensionOverlayGeoJson(
            bundle,
            climateConfig,
            resolvedScope,
            adminBundle,
            // During playback the scale is locked to 2000–2025; symbols must use the same scale.
            playing && climateConfig.mode === "value" ? periodColorDomain(bundle, climateConfig) : undefined,
          )
      : { type: "FeatureCollection", features: [] };

    const conceptDatasetsLabel = conceptMeta.variablesCrossed.map((v) => v.dataset).join(" · ");

    const heatmapDomain =
      isEnergyMode
        ? energyHeatmap.domain
        : playing && bundle
          ? periodColorDomain(bundle, climateConfig)
          : eff.domain;
    const heatmapBase: LayerDescriptor = {
      id: "climate-heatmap",
      kind: "raster-field",
      group: "analysis",
      title: isEnergyMode ? `${conceptMeta.shortTitle} Surface` : `${dimMeta.label} map`,
      description: isEnergyMode ? conceptMeta.lensLabels[energyLens] : eff.subtitle,
      source: { name: isEnergyMode ? conceptDatasetsLabel : dimMeta.datasets },
      resolution: isEnergyMode ? "0.25° GLDAS / 0.1° GPM / 0.5° MERRA-2" : dimMeta.spatialNote,
      synthetic: isEnergyMode ? !conceptMeta.coverageBadge.startsWith("100%") : dimMeta.synthetic,
      url: isEnergyMode ? energyHeatmap.url : urlA,
      science: {
        variable: isEnergyMode ? energyConcept : dimMeta.id,
        units: isEnergyMode ? energyHeatmap.units : eff.units,
        bounds: HEATMAP_BOUNDS,
        spatialResolution: isEnergyMode ? "0.25°–0.5° gridded reanalysis" : dimMeta.spatialNote,
        timeCoverage: { start: "2000-01-01", end: "2025-12-31", step: "P1Y" },
        encoding: "color",
        colorScale: {
          domain: heatmapDomain,
          palette: isEnergyMode ? energyHeatmap.palette : eff.palette,
          kind: isEnergyMode ? "diverging" : climateConfig.mode === "value" ? "sequential" : "diverging",
        },
        missingData: { policy: "hide" },
      },
    };
    const analysisLayers: LayerDescriptor[] = [heatmapBase];
    if (!isEnergyMode && urlB && heatmapBase.kind === "raster-field") {
      analysisLayers.push({
        ...heatmapBase,
        id: "climate-heatmap-blend",
        title: `${dimMeta.label} map (next observed year)`,
        url: urlB,
      });
    }
    analysisLayers.push({
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
    });
    return [...analysisLayers, ...baseLayers];
  }, [
    baseLayers,
    bundle,
    climateConfig,
    urlA,
    urlB,
    playing,
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

  // --- Energy infrastructure (D49): loaded only when the tool is first opened ----------------
  const [infraFile, setInfraFile] = useState<InfrastructureFile | null>(null);
  const [infraError, setInfraError] = useState<string | null>(null);
  const [selectedInstallationId, setSelectedInstallationId] = useState<string | null>(null);
  const [destinationId, setDestinationId] = useState<string | null>(null);
  const [coreOpen, setCoreOpen] = useState(false);
  const [casePanelOpen, setCasePanelOpen] = useState(false);
  const [activeCaseId, setActiveCaseId] = useState<string | null>(null);
  const [showPlantRegister, setShowPlantRegister] = useState(false);
  const [showIllustrativeModel, setShowIllustrativeModel] = useState(false);
  const [modelAppearance, setModelAppearance] = useState<"existing" | "conceptual">("existing");
  const [conceptualOpacity, setConceptualOpacity] = useState(0.35);
  const infraOpen = activeTool === "infrastructure";
  const bunielId = "RE-114777";
  const energyLayerOn =
    EXPLORATORY_FEATURES_ENABLED &&
    (infraOpen ||
      showIllustrativeModel ||
      showPlantRegister ||
      destinationId === "installation-buniel");
  const needInfra = energyLayerOn;
  useEffect(() => {
    if (!needInfra || infraFile || infraError) return;
    let active = true;
    loadInfrastructureFile()
      .then((f) => {
        if (active) setInfraFile(f);
      })
      .catch((err: unknown) => {
        if (active) setInfraError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      active = false;
    };
  }, [needInfra, infraFile, infraError]);
  // --- Solar PV evidence screening: loaded on first open; missing files = "not available yet" ---
  const [screeningOpen, setScreeningOpen] = useState(false);
  const [screeningData, setScreeningData] = useState<PvScreeningData | null>(null);
  const screeningAutoFocusRef = useRef(false);
  const [screeningToggles, setScreeningToggles] = useState<ScreeningToggles>({ cells: true, miteco: false, plants: false });
  const [screeningCellId, setScreeningCellId] = useState<string | null>(null);
  const [screeningPlant, setScreeningPlant] = useState<SolarPlant | null>(null);
  useEffect(() => {
    if (!screeningOpen || screeningData) return;
    let active = true;
    void loadPvScreeningData().then((d) => {
      if (active) setScreeningData(d);
    });
    return () => {
      active = false;
    };
  }, [screeningOpen, screeningData]);
  useEffect(() => {
    if (!screeningOpen || !screeningData?.screening || !controller || screeningAutoFocusRef.current) return;
    const { featured_case: featuredCase, cells } = screeningData.screening;
    const cell = cells.find((candidate) => candidate.id === featuredCase?.cell_id);
    if (!cell) return;
    screeningAutoFocusRef.current = true;
    controller.flyTo({
      target: { latitude: cell.lat, longitude: cell.lon },
      heading: 0,
      pitch: -60,
      range: 180_000,
      durationSeconds: 1.7,
      terrainAware: false,
    });
  }, [screeningOpen, screeningData, controller]);
  const screeningCell = useMemo(
    () => screeningData?.screening?.cells.find((c) => c.id === screeningCellId) ?? null,
    [screeningData, screeningCellId],
  );
  const screeningPlantList = useMemo(
    () => (screeningData ? screeningPlants(screeningData).map((p) => p.plant) : []),
    [screeningData],
  );
  const selectedInstallation = useMemo(
    () => infraFile?.installations.find((i) => i.id === selectedInstallationId) ?? null,
    [infraFile, selectedInstallationId],
  );
  const globeLayers = useMemo<LayerDescriptor[]>(() => {
    const hydrologySelection: LayerDescriptor[] = selectedHydro ? [{
      id: "ign-selected-feature",
      kind: "geojson",
      group: "reference",
      title: "Selected IGN feature",
      description: "Selected source geometry for geographic context only.",
      cacheKey: `${selectedHydro.layerId}:${selectedHydro.id}`,
      source: { name: "Instituto Geográfico Nacional (Spain)", url: "https://www.ign.es/web/seccion-hidrografia" },
      data: { type: "FeatureCollection", features: [{ type: "Feature", properties: {}, geometry: selectedHydro.geometry }] },
      style: { stroke: "#67e8f9", fill: "#67e8f933", strokeWidth: 4 },
    }] : [];
    if (!infraFile || !energyLayerOn) return [...allLayers, ...hydrologySelection];
    const infraLayer: LayerDescriptor = {
      id: "energy-infrastructure",
      kind: "point-values",
      group: "reference",
      title: "Registered energy installations (Castilla y León)",
      description: "Wind and PV installations in operation from the regional production-installation register. Not generation.",
      source: { name: "Junta de Castilla y León (PRETOR register)", url: infraFile.source.metadataUrl },
      resolution: "Point inside each official perimeter",
      data: buildInfrastructureOverlay(infraFile.installations, selectedInstallation),
      science: {
        variable: "registered_capacity",
        units: "MW",
        bounds: { west: -7.1, south: 40.0, east: -1.7, north: 43.3 },
        spatialResolution: "Facility point; outline = containing MERRA-2 0.5° × 0.625° cell",
        timeCoverage: {
          start: infraFile.source.infoDateRange?.[0] ?? "2024-01-01",
          end: infraFile.source.infoDateRange?.[1] ?? "2025-12-31",
          step: "P1D",
        },
        encoding: "color",
        missingData: { policy: "hide" },
      },
    };
    return [...allLayers, infraLayer, ...hydrologySelection];
  }, [allLayers, infraFile, energyLayerOn, selectedInstallation, selectedHydro]);
  const globeLayerStates = useMemo<LayerStateMap>(() => {
    const heat = layerStates["climate-heatmap"] ?? { visible: true, opacity: 0.62 };
    const blending = Boolean(urlB) && playing;
    const opacityA = blending ? heat.opacity * (frontIsA ? 1 - blendT : blendT) : heat.opacity;
    const opacityB = blending ? heat.opacity * (frontIsA ? blendT : 1 - blendT) : 0;
    return {
      ...layerStates,
      "climate-heatmap": {
        visible: heat.visible,
        opacity: opacityA,
      },
      "climate-heatmap-blend": {
        visible: heat.visible && blending,
        opacity: opacityB,
      },
      "energy-infrastructure": { visible: energyLayerOn, opacity: 1 },
      "ign-selected-feature": { visible: selectedHydro !== null, opacity: 1 },
    };
  }, [layerStates, energyLayerOn, urlB, playing, blendT, frontIsA, selectedHydro]);

  // --- Relationship maps tool (D74): while open, the globe shows the chosen relationship ------
  // Judge mode (D75): unreachable even if state is set some other way, not just hidden in the toolbar.
  const relationsOpen = EXPLORATORY_FEATURES_ENABLED && activeTool === "relationships";
  /** Topic the Evidence cards panel opens on: research cases are joint-low studies (demo step 4). */
  const [evidenceTopic, setEvidenceTopic] = useState<EvidenceTopic>("temperature");
  const [relationFile, setRelationFile] = useState<RelationshipsFile | null>(null);
  const [relationError, setRelationError] = useState<string | null>(null);
  const [relationMap, setRelationMap] = useState<RelationMapId>("temp-precip");
  const [relationUrl, setRelationUrl] = useState("");
  useEffect(() => {
    if (!relationsOpen || relationFile || relationError) return;
    let active = true;
    loadRelationships()
      .then((f) => {
        if (active) setRelationFile(f);
      })
      .catch((err: unknown) => {
        if (active) setRelationError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      active = false;
    };
  }, [relationsOpen, relationFile, relationError]);
  useEffect(() => {
    if (!relationFile || relationUrl) return;
    let active = true;
    renderCouplingRaster(relationFile)
      .then((url) => {
        if (active) setRelationUrl(url);
      })
      .catch((err: unknown) => console.error("[relationships] failed to render map", err));
    return () => {
      active = false;
    };
  }, [relationFile, relationUrl]);
  const proofExtentLayer = useMemo<LayerDescriptor | null>(() => {
    if (!adminBundle || (proofStage !== "extent" && proofStage !== "trend")) return null;
    return {
      id: "gate-a-study-extent",
      kind: "geojson",
      group: "reference",
      title: "Gate A study extent: Peninsula + Balearics",
      description: "GISCO NUTS-2 regions used for the temperature analysis; excludes Canarias, Ceuta and Melilla.",
      source: { name: "Eurostat GISCO NUTS 2021", url: "https://ec.europa.eu/eurostat/web/gisco/geodata/administrative-units" },
      data: buildGateAExtentOverlayGeoJson(adminBundle),
      style: { stroke: "#fbbf24", strokeWidth: 3 },
    };
  }, [adminBundle, proofStage]);
  const displayLayers = useMemo<LayerDescriptor[]>(() => {
    if (!relationsOpen || !relationFile) return proofExtentLayer ? [...globeLayers, proofExtentLayer] : globeLayers;
    const overlay = buildRelationOverlay(relationFile, relationMap, {
      robust: m.relations.robustPoint,
      notRobust: m.relations.notRobustPoint,
      insufficient: m.relations.insufficientPoint,
      agreement: m.relations.agreementPoint,
      trendGap: m.relations.trendGapPoint,
    });
    const title = m.relations.maps[relationMap].title;
    const relationshipLayers = globeLayers.map((l): LayerDescriptor => {
      if (l.kind === "raster-field" && l.id === "climate-heatmap") {
        return { ...l, title, url: relationMap === "temp-precip" ? relationUrl : "" };
      }
      if (l.kind === "raster-field" && l.id === "climate-heatmap-blend") return { ...l, url: "" };
      if (l.kind === "point-values" && l.id === "climate-overlay") return { ...l, title, data: overlay };
      return l;
    });
    return proofExtentLayer ? [...relationshipLayers, proofExtentLayer] : relationshipLayers;
  }, [globeLayers, proofExtentLayer, relationsOpen, relationFile, relationMap, relationUrl, m]);
  const displayLayerStates = useMemo<LayerStateMap>(() => {
    if (!relationsOpen) return { ...globeLayerStates, "gate-a-study-extent": { visible: proofExtentLayer !== null, opacity: 1 } };
    return {
      ...globeLayerStates,
      "gate-a-study-extent": { visible: proofExtentLayer !== null, opacity: 1 },
      "climate-heatmap": { visible: true, opacity: 0.85 },
      "climate-heatmap-blend": { visible: false, opacity: 0 },
      "climate-overlay": { visible: true, opacity: 0.95 },
    };
  }, [globeLayerStates, proofExtentLayer, relationsOpen]);
  const toggleTool = useCallback((tool: ToolId) => {
    setProofStage(null);
    setActiveTool((t) => (t === tool ? null : tool));
    setCoreOpen(false);
  }, []);
  const startProof = (card: EvidenceCard) => {
    if (!controller || !adminBundle) return;
    setProofCard(card);
    setProofStage("planet");
    setWorkspaceMode("climate");
    setActiveTool(null);
    setCasePanelOpen(false);
    setCoreOpen(false);
    setEvidenceOpen(false);
    setAdminScope((scope) => ({ ...scope, level: "age" }));
    setSelected(null);
    setDim("3d");
    controller.setDimension("3d", 0);
    updateClimateConfig({ dimension: "temperature", mode: "value", year: LAST_COMPLETE_YEAR });
    controller.flyTo(WORLD_VIEW);
  };
  const revealProof = () => {
    setProofStage(null);
    setProofCard(null);
    setEvidenceTopic("temperature");
    setActiveTool("evidence");
    setEvidenceOpen(false);
  };
  useEffect(() => {
    if (!activeTool && !casePanelOpen && !proofStage) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (proofStage) setProofStage(null);
      else if (activeTool) closeTool();
      else setCasePanelOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeTool, casePanelOpen, proofStage, closeTool]);

  const selectInstallation = useCallback(
    (inst: Installation | null) => {
      setSelectedInstallationId(inst?.id ?? null);
      if (!inst) return;
      controller?.flyTo({
        target: { latitude: inst.lat, longitude: inst.lon },
        heading: 0,
        pitch: -60,
        range: 170_000, // frames the ~55 km MERRA-2 cell outline around the facility
        durationSeconds: 1.6,
        terrainAware: true,
      });
    },
    [controller],
  );

  const illustrativeAsset = useMemo<IllustrativeAssetView | null>(() => {
    if (!showIllustrativeModel) return null;
    const dest = destinationById("installation-buniel");
    if (!dest) return null;
    return {
      installationId: bunielId,
      latitude: dest.latitude,
      longitude: dest.longitude,
      technology: "wind_onshore",
      appearance: modelAppearance,
      conceptualOpacity,
    };
  }, [showIllustrativeModel, modelAppearance, conceptualOpacity]);

  const handleSelectDestination = useCallback(
    (dest: GeographicDestination) => {
      if (!EXPLORATORY_FEATURES_ENABLED && !destinationAllowedInJudgeMode(dest)) {
        return;
      }
      setDestinationId(dest.id);
      setWorkspaceMode("climate");
      controller?.flyTo(dest.view);

      if (dest.id === "spain") {
        setCasePanelOpen(false);
        setActiveCaseId(null);
        setShowIllustrativeModel(false);
        setShowPlantRegister(false);
        handleChangeAdminScope({ ...adminScope, level: "age" }, false);
        return;
      }
      if (dest.caseStudyId) {
        const study = caseById(dest.caseStudyId);
        setActiveTool(null);
        setCoreOpen(false);
        setCasePanelOpen(true);
        setActiveCaseId(dest.caseStudyId);
        if (study?.adminCcaaId) {
          handleChangeAdminScope(
            { ...adminScope, level: "ccaa", ccaaId: study.adminCcaaId, clipToScope: true },
            false,
          );
        } else {
          handleChangeAdminScope({ ...adminScope, level: "age", clipToScope: true }, false);
        }
        if (!study?.hasPlantRegister) {
          setShowPlantRegister(false);
          if (dest.installationId !== bunielId) setShowIllustrativeModel(false);
        }
        setEvidenceOpen(false);
      } else {
        setCasePanelOpen(false);
        setActiveCaseId(null);
      }
      if (EXPLORATORY_FEATURES_ENABLED && dest.installationId === bunielId) {
        setShowIllustrativeModel(true);
        setSelectedInstallationId(bunielId);
        setSelected({ latitude: dest.latitude, longitude: dest.longitude });
      } else if (dest.protectedLandscape || !EXPLORATORY_FEATURES_ENABLED) {
        setShowIllustrativeModel(false);
        setShowPlantRegister(false);
      }
    },
    [adminScope, controller, handleChangeAdminScope],
  );

  const returnToSpain = useCallback(() => {
    const spain = DESTINATIONS.find((d) => d.id === "spain");
    if (spain) handleSelectDestination(spain);
    else controller?.flyTo(HOME_DESTINATION_VIEW);
  }, [controller, handleSelectDestination]);

  const handleCoreAction = useCallback(
    (action: AgentSuggestedAction) => {
      if (action.type === "FLY_TO_REGION") {
        const dest = destinationById(action.targetId);
        if (dest) {
          handleSelectDestination(dest);
          return;
        }
        if (action.latitude !== undefined && action.longitude !== undefined) {
          controller?.flyTo({
            target: { latitude: action.latitude, longitude: action.longitude },
            heading: 10,
            pitch: -48,
            range: 380_000,
            durationSeconds: 2.8,
            terrainAware: false,
          });
        }
        return;
      }
      setCoreOpen(false);
      setEvidenceTopic("temperature");
      setActiveTool("evidence");
      setEvidenceOpen(true);
    },
    [controller, handleSelectDestination],
  );

  const activeCase = casePanelOpen && activeCaseId ? caseById(activeCaseId) : undefined;
  const activeDestination = destinationId ? destinationById(destinationId) : undefined;
  // A map tool opened from elsewhere takes the panel; the screening panel returns when it closes.
  const secondaryPanel = activeTool ? "tool" : screeningOpen ? "screening" : coreOpen ? "core" : activeCase ? "case" : null;
  const screeningActive = secondaryPanel === "screening";
  const inspectorOpen = evidenceOpen || secondaryPanel !== null;

  // "Open in Trend panel": the province scope whose precomputed MERRA-2 result the panel shows.
  const openInstallationRegion = useCallback(
    (inst: Installation) => {
      setWorkspaceMode("climate");
      updateClimateConfig({ dimension: "temperature", mode: "value" });
      const prov = adminBundle?.provinces.find((p) => p.id === inst.provinceId);
      handleChangeAdminScope(
        { ...adminScope, level: "provincia", provinceId: inst.provinceId, ccaaId: prov?.ccaaId ?? adminScope.ccaaId },
        true,
      );
    },
    [adminBundle, adminScope, handleChangeAdminScope, updateClimateConfig],
  );

  const handleSelectLocation = useCallback(
    (coord: GeoCoordinate | null) => {
      if (coord) {
        const clickKey = `${coord.longitude.toFixed(6)},${coord.latitude.toFixed(6)}`;
        if (lastHydroClick.current !== clickKey) {
          lastHydroClick.current = clickKey;
          hydroRequest.current?.abort();
          const visibleLayers = IGN_HYDRO_LAYERS.filter((id) => layerStates[id]?.visible);
          setSelectedHydro(null);
          setHydroSelectionStatus(visibleLayers.length ? "loading" : "idle");
          if (visibleLayers.length) {
            const request = new AbortController();
            hydroRequest.current = request;
            void (async () => {
              try {
                for (const id of visibleLayers) {
                  const feature = await queryIgnHydroFeature(coord, id, request.signal);
                  if (feature) {
                    if (!request.signal.aborted) {
                      setSelectedHydro(feature);
                      setHydroSelectionStatus("idle");
                    }
                    return;
                  }
                }
                if (!request.signal.aborted) setHydroSelectionStatus("empty");
              } catch (error) {
                if (!request.signal.aborted) {
                  console.warn("IGN feature lookup failed", error);
                  setHydroSelectionStatus("error");
                }
              }
            })();
          }
        }
      }
      // Solar screening: a click picks a plant (exact marker coordinates) or the native cell under it.
      if (screeningActive) {
        if (coord && screeningData) {
          const plant = screeningToggles.plants ? plantAt(screeningPlantList, coord.latitude, coord.longitude) : null;
          const cell =
            !plant && screeningToggles.cells && screeningData.screening
              ? cellAt(screeningData.screening, coord.latitude, coord.longitude)
              : null;
          if (plant) {
            setScreeningPlant(plant);
            setScreeningCellId(null);
          } else if (cell) {
            setScreeningCellId(cell.id);
            setScreeningPlant(null);
          }
        }
        return;
      }
      // A click on an installation marker selects the installation (exact marker coordinates).
      if (coord && infraOpen && infraFile) {
        const hit = infraFile.installations.find(
          (i) => Math.abs(i.lat - coord.latitude) < 1e-7 && Math.abs(i.lon - coord.longitude) < 1e-7,
        );
        if (hit) {
          // Globe re-sends the same click with a refined terrain height: don't restart the flight.
          if (hit.id !== selectedInstallationId) selectInstallation(hit);
          return;
        }
      }
      setSelected(coord);
      if (coord) {
        setTrendTab("series");
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
    [workspaceMode, evaluatedEnergySites, infraOpen, infraFile, selectedInstallationId, selectInstallation, layerStates, screeningActive, screeningData, screeningToggles, screeningPlantList],
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
        if (!blob) return flash(m.explore.screenshotFailed);
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `trend-detective-${new Date().toISOString().slice(0, 19).replace(/[T:]/g, "-")}.png`;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 5_000);
        flash(m.explore.screenshotSaved);
      } else {
        const hash = encodeView(controller.getCamera(), dim);
        history.replaceState(null, "", hash);
        try {
          await navigator.clipboard.writeText(window.location.href);
          flash(m.explore.linkCopied);
        } catch {
          flash(m.explore.linkInBar);
        }
      }
    },
    [controller, dim, flash, m],
  );

  // Restore a shared view (#cam=…) once the globe is ready.
  const [restored, setRestored] = useState(false);
  useEffect(() => {
    if (!controller || restored) return;
    setRestored(true);
    const shared = decodeView(window.location.hash);
    if (!shared) return;
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
    if (patch.visible === true) setLayerErrors((prev) => ({ ...prev, [id]: "" }));
    if (patch.visible === false) setSelectedHydro((feature) => feature?.layerId === id ? null : feature);
  }, []);

  const ready = status?.phase === "ready";

  const screeningText = useMemo(() => screeningCopy(locale), [locale]);
  const screeningLayers = useMemo<LayerDescriptor[]>(
    () => (screeningActive && screeningData ? buildScreeningLayers(screeningData, screeningCell, screeningText.plantDetail) : []),
    [screeningActive, screeningData, screeningCell, screeningText],
  );
  const sceneLayers = useMemo(
    () => (screeningLayers.length ? [...displayLayers, ...screeningLayers] : displayLayers),
    [displayLayers, screeningLayers],
  );
  const sceneLayerStates = useMemo<LayerStateMap>(() => {
    if (!screeningActive) return displayLayerStates;
    // The screening map replaces the climate map while it is shown (one colour meaning at a time).
    const hideClimate = screeningToggles.cells || screeningToggles.miteco;
    return {
      ...displayLayerStates,
      // Station and infrastructure symbols have unrelated colour meanings; keep the solar view legible.
      "climate-overlay": { ...(displayLayerStates["climate-overlay"] ?? { opacity: 1 }), visible: false },
      "energy-infrastructure": { visible: false, opacity: 0 },
      ...(hideClimate
        ? {
            "climate-heatmap": { ...(displayLayerStates["climate-heatmap"] ?? { opacity: 0.62 }), visible: false },
            "climate-heatmap-blend": { visible: false, opacity: 0 },
            "climate-overlay": { ...(displayLayerStates["climate-overlay"] ?? { opacity: 1 }), visible: false },
          }
        : {}),
      ...screeningLayerStates(screeningLayers, screeningToggles),
    };
  }, [screeningActive, displayLayerStates, screeningLayers, screeningToggles]);
  const toggleScreening = () => {
    if (screeningOpen) {
      setScreeningOpen(false);
      screeningAutoFocusRef.current = false;
      setScreeningCellId(null);
      setScreeningPlant(null);
      return;
    }
    setActiveTool(null);
    setCoreOpen(false);
    setCasePanelOpen(false);
    setEvidenceOpen(false);
    setPlaying(false);
    screeningAutoFocusRef.current = false;
    setScreeningOpen(true);
  };

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-space">
      <h1 className="sr-only">{m.explore.h1}</h1>

      {creditEl && (
        <GlobeClient
          className="absolute inset-0 focus-ring"
          ariaLabel={m.explore.globeAria}
          layers={sceneLayers}
          layerStates={sceneLayerStates}
          selected={selected}
          preview={stationPreview}
          qualityMode={qualityMode}
          viewMode={viewMode}
          onHover={setHover}
          onOverlayHover={setOverlayHover}
          onSelect={handleSelectLocation}
          onStatus={setStatus}
          onLayerError={(id, message) => setLayerErrors((prev) => ({ ...prev, [id]: message }))}
          onReady={setController}
          creditContainer={creditEl}
          illustrativeAsset={illustrativeAsset}
        />
      )}

      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[1] bg-[radial-gradient(ellipse_at_center,transparent_42%,rgb(2_4_10/0.38)_100%)]"
      />

      {/* Loading and error states */}
      {status?.phase !== "error" && !ready && (
        <div
          className="pointer-events-none absolute inset-0 z-[2] grid place-items-center bg-space/55"
        >
          <div className="flex flex-col items-center gap-3" role="status">
            <span className="size-10 animate-pulse rounded-full border border-nav/40 bg-atlantic/80" />
            <p className="text-xs tracking-[0.22em] text-faint uppercase">{m.explore.preparing}</p>
          </div>
        </div>
      )}
      {status?.phase === "error" && (
        <div className="absolute inset-0 z-30 grid place-items-center p-6">
          <div role="alert" className="panel max-w-md p-5 text-center">
            <p className="text-sm text-ink">{m.explore.globeUnavailable}</p>
            <p className="mt-2 text-xs leading-relaxed text-muted">{localizeGlobeError(status.error, m.explore)}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="focus-ring mt-4 rounded-full border border-line px-4 py-1.5 text-xs text-ink hover:bg-white/6"
            >
              {m.explore.reload}
            </button>
          </div>
        </div>
      )}

      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 z-10 h-24 bg-gradient-to-b from-atlantic/80 to-transparent" />
      <TopNav
        center={
          <ViewModeToggle
            onRecenterSpain={() => controller?.flyTo(homeView)}
            dim={dim}
            onDimChange={changeDim}
            disabled={!controller}
          />
        }
      />

      {proofStage && proofCard && (
        <PlanetToProof
          card={proofCard}
          stage={proofStage}
          scale={scaleMeta}
          onRegion={() => {
            setProofStage("extent");
            // Below lg the guide is a bottom sheet: frame Spain in the free upper part of the screen.
            const compact = typeof window !== "undefined" && window.matchMedia("(max-width: 1023px)").matches;
            controller?.flyTo(compact ? PROOF_COMPACT_VIEW : SPAIN_VIEW);
          }}
          onTrend={() => {
            updateClimateConfig({ dimension: "temperature", mode: "trend", year: LAST_COMPLETE_YEAR });
            setLayerStates((states) => ({
              ...states,
              "climate-heatmap": { ...states["climate-heatmap"], visible: true },
            }));
            setProofStage("trend");
          }}
          onReveal={revealProof}
          onExit={() => setProofStage(null)}
        />
      )}

      <div
        // Ends above the measured bottom bar (buttons + point readout), so the two never overlap.
        style={{ maxHeight: `calc(100dvh - 4.75rem - ${bottomBarHeight}px - 0.75rem)` }}
        className={`pointer-events-none absolute top-[4.75rem] left-4 z-10 flex w-[min(19.5rem,calc(100vw-2rem))] flex-col gap-2 overflow-x-hidden overflow-y-auto sm:left-6 [&>*]:shrink-0 [&>.contents>*]:shrink-0 ${
          inspectorOpen ? "max-[1199px]:hidden" : ""
        } ${proofStage ? "max-lg:hidden" : ""}`}
      >
        <button
          type="button"
          onClick={() => setControlsOpen((o) => !o)}
          aria-expanded={controlsOpen}
          aria-controls="map-controls map-dock"
          aria-label={controlsOpen ? m.explore.hideControls : m.explore.showControls}
          className="focus-ring panel pointer-events-auto flex min-h-11 items-center gap-2 px-3 py-2 text-left text-xs text-ink sm:hidden"
        >
          <span className="min-w-0 flex-1 truncate font-medium">
            {workspaceMode === "energy"
              ? m.explore.energyLab
              : `${dockTitle(climateConfig, m)} · ${climateConfig.mode === "trend" ? m.dock.trend : climateConfig.year}`}
            {workspaceMode !== "energy" && activeClimateDim.synthetic && (
              <span className="ml-1 rounded bg-warn/15 px-1 py-px text-[9px] font-normal text-warn">
                {activeClimateDim.badge ?? m.dock.pilot}
              </span>
            )}
          </span>
          <span aria-hidden className="text-muted">{controlsOpen ? "▴" : "▾"}</span>
        </button>

        <div id="map-controls" className={foldOnPhone}>
        {EXPLORATORY_FEATURES_ENABLED && (
        <div
          role="tablist"
          aria-label={m.explore.workspace}
          className="panel pointer-events-auto grid grid-cols-2 gap-1 p-1 text-xs"
        >
          <button
            type="button"
            role="tab"
            aria-selected={workspaceMode === "climate"}
            onClick={() => setWorkspaceMode("climate")}
            className={`focus-ring rounded-md px-2.5 py-1.5 font-medium transition-colors ${
              workspaceMode === "climate"
                ? "bg-accent/20 text-accent shadow-[inset_0_0_0_1px_rgb(214_180_126/0.4)]"
                : "text-muted hover:text-ink"
            }`}
          >
            {m.explore.climateTrends}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={workspaceMode === "energy"}
            title={m.explore.energyLabTitle}
            onClick={() => {
              setPlaying(false);
              setBlendT(0);
              setWorkspaceMode("energy");
              setEvidenceOpen(true);
            }}
            className={`focus-ring rounded-md px-2.5 py-1.5 font-medium transition-colors ${
              workspaceMode === "energy"
                ? "bg-amber-400/15 text-amber-200 shadow-[inset_0_0_0_1px_rgb(251_191_36/0.35)]"
                : "text-muted hover:text-ink"
            }`}
          >
            {m.explore.energyLab} <span className="text-[9px] tracking-wider uppercase opacity-80">{m.explore.energyLabTag}</span>
          </button>
        </div>
        )}

        <MapMarkerLegend
          stationsVisible={layerStates["climate-overlay"]?.visible ?? true}
          energyVisible={energyLayerOn && infraFile !== null}
        />
        <AdminScopeBar
          admin={adminBundle}
          scope={adminScope}
          resolved={resolvedScope}
          onChange={handleChangeAdminScope}
          onFocusCamera={handleFocusActiveScope}
        />
        </div>
        {workspaceMode === "energy" ? (
          <div id="map-dock" className={foldOnPhone}>
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
          </div>
        ) : (
          <>
            <div id="map-dock" className={foldOnPhone}>
            <DimensionDock
              config={climateConfig}
              heatmapVisible={layerStates["climate-heatmap"]?.visible ?? true}
              stationsVisible={layerStates["climate-overlay"]?.visible ?? true}
              playing={playing}
              timelineReady={timelineReady}
              onChange={(patch) => {
                setProofStage(null);
                updateClimateConfig(patch);
              }}
              onToggleHeatmap={() =>
                updateLayer("climate-heatmap", { visible: !(layerStates["climate-heatmap"]?.visible ?? true) })
              }
              onToggleStations={() =>
                updateLayer("climate-overlay", { visible: !(layerStates["climate-overlay"]?.visible ?? true) })
              }
              onTogglePlay={() => {
                setPlaying((p) => {
                  if (p) {
                    const year = labelledObservedYear(playbackRef.current);
                    setClimateConfig((cfg) => ({ ...cfg, mode: "value", year }));
                    setHeatSlotA("");
                    setHeatSlotB("");
                  } else {
                    setClimateConfig((cfg) => restartPlaybackConfig(cfg));
                  }
                  setBlendT(0);
                  return !p;
                });
              }}
            />
            </div>
            {/* The climate scale and key describe the climate map, not a relationship map. */}
            {!relationsOpen && (
            <div className="mt-1 flex items-start gap-3 pl-1">
              {/* The scale colours the raster or, for station-only dimensions, the station symbols. */}
              {(dimensionHasSpatialGrid(climateConfig.dimension)
                ? mapLayerVisible
                : stationsLayerVisible) && (
                <aside className="pointer-events-none" aria-label={m.explore.mapScale}>
                  <ScaleThermometer
                    thin
                    palette={scaleMeta.palette}
                    domain={scaleMeta.domain}
                    units={scaleMeta.units}
                    height={220}
                  />
                </aside>
              )}
              <MapEncodingKey
                bundle={bundle}
                config={climateConfig}
                mapVisible={mapLayerVisible}
                stationsVisible={stationsLayerVisible}
              />
            </div>
            )}
          </>
        )}
      </div>

      <div
        className={`pointer-events-none absolute top-[4.75rem] right-3 bottom-24 z-20 isolate flex min-h-0 max-w-[calc(100vw-1.25rem)] items-stretch justify-end gap-2 sm:right-6 ${
          proofStage ? "max-lg:hidden" : ""
        }`}
      >
        <div className="flex shrink-0 flex-col justify-center gap-2">
          <ToolsBar
            active={activeTool}
            onToggle={toggleTool}
            onAction={runAction}
            disabled={!controller}
          />
          <CameraControls controller={controller} flat={dim === "2d"} onReset={() => controller?.flyTo(homeView)} />
        </div>
        {inspectorOpen && (
          <div
            className={`flex min-h-0 min-w-0 flex-col gap-2 ${
              workspaceMode === "energy"
                ? "w-[min(34rem,calc(100vw-4.75rem))]"
                : "w-[min(30rem,calc(100vw-4.75rem))]"
            }`}
          >
            {secondaryPanel !== null && (
              <div className={`min-h-0 overflow-hidden ${evidenceOpen ? "max-h-[min(42%,22rem)] shrink-0" : "flex-1"}`}>
                {activeTool === "stations" && (
                  <StationCatalogPanel
                    bundle={bundle}
                    admin={adminBundle}
                    config={climateConfig}
                    scope={resolvedScope}
                    selected={selected}
                    onInspect={inspectStation}
                    onPreview={setStationPreview}
                    onClose={closeTool}
                  />
                )}
                {activeTool === "evidence" && (
                  <EvidenceCardPanel
                    scope={resolvedScope}
                    key={evidenceTopic}
                    initialTopic={evidenceTopic}
                    onOpenTrend={() => {
                      closeTool();
                      setTrendTab("series");
                      setEvidenceOpen(true);
                    }}
                    onClose={closeTool}
                  />
                )}
                {relationsOpen && (
                  <RelationshipPanel
                    file={relationFile}
                    error={relationError}
                    active={relationMap}
                    onChange={setRelationMap}
                    onClose={closeTool}
                  />
                )}
                {secondaryPanel === "screening" && (
                  <SolarScreeningPanel
                    data={screeningData}
                    loading={screeningData === null}
                    toggles={screeningToggles}
                    onToggle={(key) => setScreeningToggles((tg) => ({ ...tg, [key]: !tg[key] }))}
                    selectedCell={screeningCell}
                    selectedPlant={screeningPlant}
                    onClearSelection={() => {
                      setScreeningCellId(null);
                      setScreeningPlant(null);
                    }}
                    onSelectFeatured={(cellId) => {
                      const cell = screeningData?.screening?.cells.find((item) => item.id === cellId);
                      if (!cell) return;
                      setScreeningToggles((current) => ({ ...current, cells: true }));
                      setScreeningCellId(cell.id);
                      setScreeningPlant(null);
                      controller?.flyTo({
                        target: { latitude: cell.lat, longitude: cell.lon },
                        heading: 0,
                        pitch: -60,
                        range: 180_000,
                        durationSeconds: 1.7,
                        terrainAware: false,
                      });
                    }}
                    onClose={toggleScreening}
                  />
                )}
                {EXPLORATORY_FEATURES_ENABLED && activeTool === "infrastructure" && (
                  <EnergyInfrastructurePanel
                    file={infraFile}
                    error={infraError}
                    bundle={bundle}
                    selectedId={selectedInstallationId}
                    onSelect={selectInstallation}
                    onOpenRegion={openInstallationRegion}
                    onClose={closeTool}
                  />
                )}
                {EXPLORATORY_FEATURES_ENABLED && secondaryPanel === "core" && (
                  <AethraCorePanel
                    open={coreOpen}
                    regionScope={resolvedScope ? (resolvedScope.level === "age" ? "age" : `${resolvedScope.level}:${resolvedScope.id}`) : "age"}
                    onClose={() => setCoreOpen(false)}
                    onAction={handleCoreAction}
                  />
                )}
                {secondaryPanel === "case" && activeCase && (
                  <EnergyCasePanel
                    study={activeCase}
                    showModel={showIllustrativeModel}
                    showPlantRegister={showPlantRegister}
                    appearance={modelAppearance}
                    conceptualOpacity={conceptualOpacity}
                    allowInfrastructureControls={EXPLORATORY_FEATURES_ENABLED}
                    onSelectCase={(id) => {
                      const dest = DESTINATIONS.find((d) => d.id === id && d.caseStudyId === id);
                      if (dest) handleSelectDestination(dest);
                    }}
                    onShowModel={setShowIllustrativeModel}
                    onShowPlantRegister={setShowPlantRegister}
                    onAppearance={setModelAppearance}
                    onOpacity={setConceptualOpacity}
                    onOpenEvidence={() => {
                      setCasePanelOpen(false);
                      setCoreOpen(false);
                      setEvidenceTopic("joint_low");
                      setActiveTool("evidence");
                    }}
                    onReturnOverview={returnToSpain}
                    onClose={() => {
                      setCasePanelOpen(false);
                      setActiveCaseId(null);
                      setShowPlantRegister(false);
                    }}
                  />
                )}
              </div>
            )}
            {evidenceOpen && (
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
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
                  <div className="pointer-events-auto flex h-full min-h-0 flex-col gap-2">
                    <div role="tablist" aria-label={m.explore.trendPanel} className="panel flex shrink-0 gap-1 p-1">
                      <button
                        type="button"
                        role="tab"
                        aria-selected={trendTab === "series"}
                        onClick={() => setTrendTab("series")}
                        className={`focus-ring flex-1 rounded-md px-2 py-1.5 text-[13px] ${
                          trendTab === "series" ? "bg-white/10 text-ink" : "text-muted hover:bg-white/6"
                        }`}
                      >
                        {m.explore.thisPlace}
                      </button>
                      <button
                        type="button"
                        role="tab"
                        aria-selected={trendTab === "findings"}
                        onClick={() => setTrendTab("findings")}
                        className={`focus-ring flex-1 rounded-md px-2 py-1.5 text-[13px] ${
                          trendTab === "findings" ? "bg-white/10 text-ink" : "text-muted hover:bg-white/6"
                        }`}
                      >
                        {m.explore.studyFindings}
                      </button>
                    </div>
                    <div className="min-h-0 flex-1 overflow-hidden">
                      {trendTab === "series" ? (
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
                      ) : (
                        <FindingsBriefPanel
                          onClose={() => setEvidenceOpen(false)}
                          onStartProof={startProof}
                          canStartProof={ready && adminBundle !== null}
                          onOpenCard={() => {
                            setEvidenceOpen(false);
                            setEvidenceTopic("temperature");
                            setActiveTool("evidence");
                          }}
                          onOpenCase={(id) => {
                            const dest = DESTINATIONS.find((d) => d.id === id && d.caseStudyId === id);
                            if (dest) handleSelectDestination(dest);
                          }}
                        />
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {notice && (
        <div role="status" className="panel pointer-events-none absolute bottom-28 left-1/2 z-30 -translate-x-1/2 !rounded-full px-4 py-2 text-xs text-ink">
          {notice}
        </div>
      )}

      {ready && !selected && !inspectorOpen && (
        <p className="pointer-events-none absolute bottom-28 left-1/2 z-10 hidden -translate-x-1/2 rounded-full border border-white/10 bg-black/35 px-3 py-1 text-[11px] text-muted backdrop-blur-md sm:block">
          {EXPLORATORY_FEATURES_ENABLED ? m.explore.orbitRanked : m.explore.orbitStation}
        </p>
      )}

      <div
        ref={bottomBarRef}
        className={`pointer-events-none absolute inset-x-0 bottom-0 z-30 flex flex-col gap-2 px-4 pb-8 sm:px-6 ${
          // Inspector = 30rem (energy 34rem) + 1.5rem right offset; keep a 1rem gap so buttons never sit under it.
          inspectorOpen
            ? workspaceMode === "energy"
              ? "max-sm:hidden sm:pr-[min(36.5rem,calc(100vw-5.5rem))]"
              : "max-sm:hidden sm:pr-[min(32.5rem,calc(100vw-5.5rem))]"
            : ""
        } ${proofStage ? "max-lg:hidden" : ""}`}
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div className="sm:max-w-[20rem]">
            {(selected || overlayHover) && (
              <CoordinateReadout
                hover={hover}
                selected={selected}
                overlay={overlayHover}
                onClear={() => {
                  setSelected(null);
                  setSelectedHydro(null);
                  setHydroSelectionStatus("idle");
                  setLayerErrors((prev) => ({ ...prev, "ign-rivers": "", "ign-waterbodies": "" }));
                }}
              >
                {selected && (
                  <HydroFeatureCard
                    feature={selectedHydro}
                    unavailable={hydroSelectionStatus === "error" || Boolean(layerErrors["ign-rivers"] || layerErrors["ign-waterbodies"])}
                  />
                )}
              </CoordinateReadout>
            )}
          </div>
          {/* With the inspector open below 1280 px there is no room beside it: the panel has its own close button. */}
          <div className={`flex flex-wrap items-end justify-end gap-2 ${inspectorOpen ? "max-[1279px]:hidden" : ""}`}>
            {activeDestination && activeDestination.id !== "spain" && (
              <p className="pointer-events-none mb-1 max-w-[16rem] text-[10px] leading-snug text-muted">
                {activeDestination.protectedLandscape
                  ? m.explore.navOnly(activeDestination.name)
                  : m.explore.destSource(activeDestination.name, activeDestination.source.name)}
              </p>
            )}
            {/* Competition cut (D76): TARO is research-build only; the timed demo never depends on it. */}
            {EXPLORATORY_FEATURES_ENABLED && (
            <button
              type="button"
              onClick={() => {
                setCoreOpen((o) => {
                  const next = !o;
                  if (next) setActiveTool(null);
                  return next;
                });
              }}
              aria-expanded={coreOpen}
              aria-controls="taro"
              aria-label="TARO"
              className="focus-ring panel pointer-events-auto inline-flex size-11 items-center overflow-hidden !rounded-full p-0 text-xs text-ink transition-colors hover:bg-white/6 sm:mb-1"
            >
              <TaroPortrait className="size-11" />
            </button>
            )}
            <ExploreSpain
              selectedId={destinationId}
              onSelect={handleSelectDestination}
              disabled={!controller}
            />
            <button
              type="button"
              onClick={toggleScreening}
              aria-pressed={screeningOpen}
              disabled={!controller}
              className={`focus-ring panel pointer-events-auto inline-flex items-center gap-2 !rounded-full px-3.5 py-2 text-xs font-medium text-amber-100 transition-colors disabled:opacity-50 sm:mb-1 ${
                screeningOpen ? "!bg-amber-400/20" : "hover:bg-amber-400/10"
              }`}
            >
              <SunGlyph className="size-4 text-amber-300" />
              {screeningText.entry}
            </button>
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
                  ? m.explore.hideAdvisor
                  : m.explore.hideTrend
                : workspaceMode === "energy"
                  ? m.explore.idealSites
                  : m.explore.trend}
            </button>
          </div>
        </div>
      </div>

      {/* Imagery / terrain attribution (required by providers) */}
      <div
        ref={setCreditEl}
        className={`globe-credits pointer-events-auto absolute inset-x-4 bottom-1.5 z-10 sm:inset-x-6 ${
          inspectorOpen
            ? workspaceMode === "energy"
              ? "sm:pr-[min(36.5rem,calc(100vw-5.5rem))]"
              : "sm:pr-[min(32.5rem,calc(100vw-5.5rem))]"
            : ""
        }`}
      />
    </main>
  );
}
