"use client";

import type { ClickToolId, PanelToolId, ToolId } from "@/lib/globe/types";
import { Icon, type IconName } from "./Icon";

export type ToolAction = "screenshot" | "share";

interface ToolDef<T> {
  id: T;
  label: string;
  icon: IconName;
  hint: string;
}

/**
 * Map tools. To add one: extend the ids in lib/globe/types.ts, add it here, then handle it in
 * MeasurePanel (results) and lib/globe/cesium/measure-draw.ts (drawing on the globe).
 */
export const CLICK_TOOLS: ToolDef<ClickToolId>[] = [
  { id: "distance", label: "Distance", icon: "ruler", hint: "Distance between two points" },
  { id: "offset", label: "Lat/Lon offset", icon: "axes", hint: "North–south (Y, latitude) and east–west (X, longitude) offset between two points" },
  { id: "area", label: "Area", icon: "polygon", hint: "Area and perimeter of a polygon: click its corners" },
  { id: "radius", label: "Radius", icon: "radius", hint: "Circle around a point: click the centre, then the edge" },
  { id: "profile", label: "Elevation profile", icon: "profile", hint: "Terrain profile along a line between two points" },
];

export const PANEL_TOOLS: ToolDef<PanelToolId>[] = [
  { id: "goto", label: "Go to", icon: "search", hint: "Go to a place or coordinates" },
  { id: "relief", label: "Relief", icon: "mountain", hint: "Vertical exaggeration of the relief" },
];

const ACTIONS: ToolDef<ToolAction>[] = [
  { id: "screenshot", label: "Screenshot", icon: "camera", hint: "Download a PNG of the current view" },
  { id: "share", label: "Copy link", icon: "link", hint: "Copy a link to this exact view" },
];

export const ALL_TOOLS: ToolDef<ToolId>[] = [...CLICK_TOOLS, ...PANEL_TOOLS];

export function ToolsBar({
  active,
  onToggle,
  onAction,
  disabled,
  unavailable = [],
}: {
  active: ToolId | null;
  onToggle: (tool: ToolId) => void;
  onAction: (action: ToolAction) => void;
  disabled?: boolean;
  /** Tools that don't apply right now (e.g. relief in the flat 2D map). */
  unavailable?: ToolId[];
}) {
  const btn = (on: boolean) =>
    `focus-ring grid size-9 place-items-center transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
      on ? "bg-accent text-accent-ink" : "text-muted hover:bg-white/6 hover:text-ink active:bg-white/10"
    }`;
  const group = "panel flex flex-col overflow-hidden !rounded-lg";
  return (
    <div role="toolbar" aria-label="Map tools" aria-orientation="vertical" className="pointer-events-auto flex flex-col gap-2">
      {[CLICK_TOOLS, PANEL_TOOLS].map((tools, i) => (
        <div key={i} className={group}>
          {tools.map((t) => (
            <button
              key={t.id}
              type="button"
              aria-pressed={t.id === active}
              aria-label={t.label}
              title={unavailable.includes(t.id) ? `${t.label}: only in 3D` : t.hint}
              disabled={disabled || unavailable.includes(t.id)}
              onClick={() => onToggle(t.id)}
              className={btn(t.id === active)}
            >
              <Icon name={t.icon} />
            </button>
          ))}
          {i === 1 &&
            ACTIONS.map((a) => (
              <button
                key={a.id}
                type="button"
                aria-label={a.label}
                title={a.hint}
                disabled={disabled}
                onClick={() => onAction(a.id)}
                className={btn(false)}
              >
                <Icon name={a.icon} />
              </button>
            ))}
        </div>
      ))}
    </div>
  );
}
