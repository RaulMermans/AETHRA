"use client";

import { useCallback, useEffect, useState } from "react";
import GlobeClient from "@/components/globe/GlobeClient";
import { buildLayerCatalog, HOME_VIEW, initialLayerStates } from "@/lib/globe/catalog";
import type {
  GeoCoordinate,
  GlobeController,
  GlobeStatus,
  LayerState,
  LayerStateMap,
  QualityMode,
} from "@/lib/globe/types";
import { CameraControls } from "./CameraControls";
import { CoordinateReadout } from "./CoordinateReadout";
import { EvidencePanel } from "./EvidencePanel";
import { ExploreSpain } from "./ExploreSpain";
import { Icon } from "./Icon";
import { LayerPanel } from "./LayerPanel";
import { TopNav } from "./TopNav";

const QUALITY_KEY = "globe-quality-mode";

export function ExploreView() {
  const [layers] = useState(() => buildLayerCatalog());
  const [layerStates, setLayerStates] = useState<LayerStateMap>(() => initialLayerStates(layers));
  const [hover, setHover] = useState<GeoCoordinate | null>(null);
  const [selected, setSelected] = useState<GeoCoordinate | null>(null);
  const [status, setStatus] = useState<GlobeStatus | null>(null);
  const [controller, setController] = useState<GlobeController | null>(null);
  const [creditEl, setCreditEl] = useState<HTMLDivElement | null>(null);
  const [layersOpen, setLayersOpen] = useState(false);
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [qualityMode, setQualityMode] = useState<QualityMode>("auto");

  // Layer panel starts open on wider screens only; rendering override is remembered per browser.
  useEffect(() => {
    setLayersOpen(window.matchMedia("(min-width: 640px)").matches);
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
      <h1 className="sr-only">Explore Spain on a 3D globe</h1>

      {creditEl && (
        <GlobeClient
          className="absolute inset-0 focus-ring"
          layers={layers}
          layerStates={layerStates}
          selected={selected}
          qualityMode={qualityMode}
          onHover={setHover}
          onSelect={setSelected}
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

      <div className="pointer-events-none absolute top-14 left-4 z-10 sm:left-6">
        <LayerPanel
          open={layersOpen}
          onToggle={() => setLayersOpen((o) => !o)}
          layers={layers}
          states={layerStates}
          onChange={updateLayer}
          status={status}
          qualityMode={qualityMode}
          onQualityChange={changeQuality}
        />
      </div>

      <div className="pointer-events-none absolute top-1/2 right-3 z-10 -translate-y-1/2 sm:right-6">
        <CameraControls controller={controller} onReset={() => controller?.flyTo(HOME_VIEW)} />
      </div>

      {/* Bottom bar: coordinates · primary action · evidence */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex flex-col gap-3 px-4 pb-8 sm:px-6">
        <div className="flex justify-end sm:pr-14">
          <EvidencePanel open={evidenceOpen} onClose={() => setEvidenceOpen(false)} selected={selected} />
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
              Evidence
              {selected && <span className="absolute top-1.5 right-2 size-1.5 rounded-full bg-accent" aria-hidden />}
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
