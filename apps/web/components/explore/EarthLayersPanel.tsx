"use client";

import { useEffect, useState } from "react";
import type { LayerDescriptor, LayerState, LayerStateMap } from "@/lib/globe/types";
import type { IgnHydroFeature } from "@/lib/globe/ign-hydro";

interface Props {
  layers: readonly LayerDescriptor[];
  states: LayerStateMap;
  onChange: (id: string, patch: Partial<LayerState>) => void;
  selectedFeature: IgnHydroFeature | null;
  selectionStatus: "idle" | "loading" | "empty" | "error";
  errors: Readonly<Record<string, string>>;
}

const LAYER_IDS = ["ign-rivers", "ign-waterbodies", "ign-catchments", "nasa-modis-truecolor"] as const;

export function EarthLayersPanel({ layers, states, onChange, selectedFeature, selectionStatus, errors }: Props) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (selectedFeature) setOpen(true);
  }, [selectedFeature]);
  return (
    <div className="pointer-events-auto absolute bottom-16 left-4 z-[45] w-[min(19.5rem,calc(100vw-2rem))] sm:left-6">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="earth-layers-panel"
        onClick={() => setOpen((value) => !value)}
        className="panel focus-ring px-4 py-2 text-sm text-ink hover:bg-white/10"
      >
        Earth layers
      </button>
      {open && (
        <section id="earth-layers-panel" aria-label="Earth layers" className="panel absolute bottom-full mb-2 max-h-[50dvh] w-full overflow-y-auto p-4">
          <p className="text-xs leading-relaxed text-muted">Official Spanish cartographic context. No scientific result is inferred from these maps.</p>
          <div className="mt-3 space-y-4">
            {LAYER_IDS.map((id) => {
              const layer = layers.find((item) => item.id === id);
              const state = states[id];
              if (!layer || !state) return null;
              return (
                <div key={id} className="border-t border-line pt-3">
                  {id === "nasa-modis-truecolor" && <p className="mb-2 text-[10px] font-semibold tracking-widest text-cyan-300 uppercase">NASA imagery</p>}
                  <label className="flex items-center gap-2 text-sm text-ink">
                    <input type="checkbox" checked={state.visible} onChange={(event) => onChange(id, { visible: event.target.checked })} />
                    {layer.title}
                  </label>
                  <p className="mt-1 text-xs leading-relaxed text-muted">{layer.description}</p>
                  {layer.kind === "wms" && layer.time && <p className="mt-1 text-xs text-muted">Date: {layer.time.default}</p>}
                  {errors[id] && <p role="alert" className="mt-1 text-xs text-rose-300">Layer unavailable: {errors[id]}</p>}
                  {state.visible && (
                    <label className="mt-2 block text-xs text-muted">
                      Opacity {Math.round(state.opacity * 100)}%
                      <input
                        className="mt-1 w-full accent-cyan-400"
                        type="range"
                        min="0"
                        max="100"
                        value={Math.round(state.opacity * 100)}
                        onChange={(event) => onChange(id, { opacity: Number(event.target.value) / 100 })}
                      />
                    </label>
                  )}
                  {layer.source.url && <a className="focus-ring text-xs text-cyan-300 underline" href={layer.source.url} target="_blank" rel="noreferrer">Source: {layer.source.name}</a>}
                </div>
              );
            })}
          </div>
          <div className="mt-4 border-t border-line pt-3 text-xs text-muted" aria-live="polite">
            {selectionStatus === "loading" && <p>Looking up the selected feature…</p>}
            {selectionStatus === "empty" && <p>No mapped feature at this point. Zoom in and click a visible river, water body or catchment.</p>}
            {selectionStatus === "error" && <p role="alert">IGN feature information is unavailable. The map layer may still be visible.</p>}
            {selectedFeature && (
              <div>
                <p className="text-sm font-medium text-ink">{selectedFeature.name ?? "Unnamed mapped feature"}</p>
                <p className="mt-1 break-all">{selectedFeature.id}</p>
                <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
                  {Object.entries(selectedFeature.attributes).map(([key, value]) => (
                    <div key={key} className="col-span-2 grid grid-cols-subgrid"><dt>{key}</dt><dd className="break-all text-ink">{value}</dd></div>
                  ))}
                </dl>
                <p className="mt-2">Geographic context from IGN. No basin-level NASA analysis is implied.</p>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
