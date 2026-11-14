"use client";

import { useId } from "react";
import type {
  GlobeStatus,
  LayerDescriptor,
  LayerState,
  LayerStateMap,
  QualityMode,
  QualityProfile,
} from "@/lib/globe/types";
import { Icon } from "./Icon";

const QUALITY_LABEL: Record<QualityProfile, string> = {
  high: "High",
  balanced: "Balanced",
  performance: "Performance",
};

const GROUP_LABEL: Record<LayerDescriptor["group"], string> = {
  imagery: "NASA imagery",
  reference: "Reference",
  analysis: "Analysis",
};

function LayerRow({
  layer,
  state,
  onChange,
}: {
  layer: LayerDescriptor;
  state: LayerState;
  onChange: (patch: Partial<LayerState>) => void;
}) {
  const id = useId();
  const time = "time" in layer ? layer.time : undefined;
  return (
    <li className="py-2.5">
      <div className="flex items-start gap-3">
        <button
          type="button"
          role="switch"
          aria-checked={state.visible}
          aria-labelledby={`${id}-title`}
          onClick={() => onChange({ visible: !state.visible })}
          className={`focus-ring relative mt-0.5 h-4.5 w-8 shrink-0 rounded-full transition-colors ${
            state.visible ? "bg-accent" : "bg-white/15 hover:bg-white/25"
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 size-3.5 rounded-full bg-white shadow transition-transform ${
              state.visible ? "translate-x-3.5" : ""
            }`}
          />
        </button>
        <div className="min-w-0 flex-1">
          <p id={`${id}-title`} className="text-[13px] leading-tight text-ink">
            {layer.title}
            {layer.synthetic && (
              <span className="ml-1.5 rounded bg-warn/15 px-1 py-px text-[10px] text-warn">Synthetic</span>
            )}
          </p>
          <p className="mt-0.5 text-[11px] leading-snug text-muted">{layer.description}</p>
          <p className="mt-1 text-[10px] text-faint">
            {layer.source.url ? (
              <a href={layer.source.url} target="_blank" rel="noreferrer" className="focus-ring rounded underline-offset-2 hover:text-muted hover:underline">
                {layer.source.name}
              </a>
            ) : (
              layer.source.name
            )}
            {layer.source.product && <> · <span className="font-mono break-all">{layer.source.product}</span></>}
            {layer.resolution && <> · {layer.resolution}</>}
          </p>
        </div>
      </div>
      {state.visible && (
        <div className="mt-2 ml-11 space-y-2">
          {time && (
            <label className="flex items-center justify-between gap-2 text-[11px] text-muted">
              Date (UTC)
              {time.locked ? (
                <span className="font-mono text-[11px] text-ink">{state.time ?? time.default}</span>
              ) : time.step === "P1M" ? (
                <input
                  type="month"
                  value={(state.time ?? time.default).slice(0, 7)}
                  min={time.min?.slice(0, 7)}
                  max={time.max?.slice(0, 7)}
                  onChange={(e) => e.target.value && onChange({ time: `${e.target.value}-01` })}
                  className="focus-ring rounded border border-line bg-white/5 px-1.5 py-0.5 font-mono text-[11px] text-ink [color-scheme:dark]"
                />
              ) : (
                <input
                  type="date"
                  value={state.time ?? time.default}
                  min={time.min}
                  max={time.max}
                  onChange={(e) => e.target.value && onChange({ time: e.target.value })}
                  className="focus-ring rounded border border-line bg-white/5 px-1.5 py-0.5 font-mono text-[11px] text-ink [color-scheme:dark]"
                />
              )}
            </label>
          )}
          <label className="flex items-center gap-2 text-[11px] text-muted">
            <span className="w-12">Opacity</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={state.opacity}
              onChange={(e) => onChange({ opacity: Number(e.target.value) })}
              className="focus-ring h-1 flex-1 accent-accent"
              aria-valuetext={`${Math.round(state.opacity * 100)}%`}
            />
            <span className="w-8 text-right font-mono tabular-nums">{Math.round(state.opacity * 100)}%</span>
          </label>
        </div>
      )}
    </li>
  );
}

export function LayerPanel({
  open,
  onToggle,
  layers,
  states,
  onChange,
  status,
  qualityMode,
  onQualityChange,
}: {
  open: boolean;
  onToggle: () => void;
  layers: LayerDescriptor[];
  states: LayerStateMap;
  onChange: (id: string, patch: Partial<LayerState>) => void;
  status: GlobeStatus | null;
  qualityMode: QualityMode;
  onQualityChange: (mode: QualityMode) => void;
}) {
  const groups = (Object.keys(GROUP_LABEL) as LayerDescriptor["group"][])
    .map((g) => [g, layers.filter((l) => l.group === g)] as const)
    .filter(([, ls]) => ls.length > 0);

  return (
    <section aria-label="Layers" className="panel pointer-events-auto w-[min(18rem,calc(100vw-2rem))] overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls="layer-panel-body"
        className="focus-ring flex w-full items-center justify-between gap-2 px-2.5 py-1.5 text-left text-[11px] font-medium text-ink"
      >
        <span className="flex items-center gap-2">
          <Icon name="layers" className="size-4 text-muted" />
          Layers
        </span>
        <Icon name="chevron" className={`size-3.5 text-muted transition-transform ${open ? "rotate-90" : ""}`} />
      </button>
      <div id="layer-panel-body" hidden={!open} className="max-h-[calc(100dvh-14rem)] overflow-y-auto border-t border-line px-3 pb-3">
        {groups.map(([g, ls]) => (
          <div key={g} className="pt-2.5">
            <h3 className="text-[10px] uppercase tracking-[0.12em] text-faint">{GROUP_LABEL[g]}</h3>
            <ul className="divide-y divide-line">
              {ls.map((l) => (
                <LayerRow key={l.id} layer={l} state={states[l.id]} onChange={(p) => onChange(l.id, p)} />
              ))}
            </ul>
          </div>
        ))}
        <div className="mt-2 border-t border-line pt-2.5">
          <h3 className="text-[10px] uppercase tracking-[0.12em] text-faint">Globe</h3>
          <dl className="mt-1.5 grid grid-cols-[4.5rem_1fr] gap-x-2 gap-y-1 text-[11px]">
            <dt className="text-faint">Imagery</dt>
            <dd className="text-muted">
              {status?.imagery.label ?? "—"}
              {status && status.imagery.finestDetail !== "—" && (
                <span className="block text-faint">Finest detail: {status.imagery.finestDetail}</span>
              )}
              {!!status?.imagery.failedTiles && (
                <span className="block text-warn">{status.imagery.failedTiles} imagery tiles failed to load</span>
              )}
            </dd>
            <dt className="text-faint">Terrain</dt>
            <dd className={status?.terrain.available ? "text-muted" : "text-warn"}>
              {status?.terrain.label ?? "—"}
              {status?.terrain.datum && (
                <span className="block text-faint">
                  Heights: {status.terrain.datum === "orthometric" ? "above sea level" : "WGS84 ellipsoidal"} · no
                  exaggeration
                </span>
              )}
              {!!status?.terrain.failedTiles && (
                <span className="block text-warn">{status.terrain.failedTiles} terrain tiles failed to load</span>
              )}
            </dd>
            <dt className="text-faint">
              <label htmlFor="quality-mode">Rendering</label>
            </dt>
            <dd>
              <select
                id="quality-mode"
                value={qualityMode}
                onChange={(e) => onQualityChange(e.target.value as QualityMode)}
                className="focus-ring w-full rounded border border-line bg-white/5 px-1.5 py-0.5 text-[11px] text-ink [color-scheme:dark]"
              >
                <option value="auto">
                  Auto{status && qualityMode === "auto" ? ` — ${QUALITY_LABEL[status.quality.profile]}` : ""}
                </option>
                <option value="high">High quality</option>
                <option value="balanced">Balanced</option>
                <option value="performance">Performance</option>
              </select>
              {status && qualityMode === "auto" && (
                <span className="mt-0.5 block text-[10px] text-faint">{status.quality.reason}</span>
              )}
            </dd>
          </dl>
          {status && status.phase === "ready" && !status.terrain.label.startsWith("Cesium") && (
            <p className="mt-2 text-[10px] leading-snug text-faint">
              Set <code className="font-mono">NEXT_PUBLIC_CESIUM_ION_TOKEN</code> for Cesium World Terrain and
              sub-metre aerial imagery. Zoom is limited to what the current imagery resolves.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
