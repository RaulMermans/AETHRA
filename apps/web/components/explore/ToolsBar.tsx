"use client";

import { EXPLORATORY_FEATURES_ENABLED } from "@/lib/demo-mode";
import type { PanelToolId, ToolId } from "@/lib/globe/types";
import { Icon, type IconName } from "./Icon";

export type ToolAction = "screenshot" | "share";

interface ToolDef<T> {
  id: T;
  label: string;
  icon: IconName;
  hint: string;
  /** Hidden in judge mode (default build). */
  exploratory?: boolean;
}

/**
 * Map tools. Only tools that help answer the trend questions stay here (see D45 in
 * docs/DECISIONS.md). To add one: extend `PanelToolId` in lib/globe/types.ts and add it here.
 */
const ALL_PANEL_TOOLS: ToolDef<PanelToolId>[] = [
  { id: "stations", label: "Station catalog", icon: "station", hint: "Weather station catalog (NOAA ground truth)" },
  { id: "evidence", label: "Evidence cards", icon: "chart", hint: "Verified trend results with sources (EvidenceCards)" },
  // D49: P1 context layer, opt-in, off the demo path.
  {
    id: "infrastructure",
    label: "Energy infrastructure",
    icon: "pylon",
    hint: "Registered wind and solar installations (Castilla y León register) and their NASA analysis region",
    exploratory: true,
  },
];

export const PANEL_TOOLS: ToolDef<PanelToolId>[] = ALL_PANEL_TOOLS.filter((t) => EXPLORATORY_FEATURES_ENABLED || !t.exploratory);

const ACTIONS: ToolDef<ToolAction>[] = [
  { id: "screenshot", label: "Screenshot", icon: "camera", hint: "Download a PNG of the current view" },
  { id: "share", label: "Copy link", icon: "link", hint: "Copy a link to this exact view" },
];

export function ToolsBar({
  active,
  onToggle,
  onAction,
  disabled,
}: {
  active: ToolId | null;
  onToggle: (tool: ToolId) => void;
  onAction: (action: ToolAction) => void;
  disabled?: boolean;
}) {
  const btn = (on: boolean) =>
    `focus-ring grid size-9 place-items-center transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
      on ? "bg-accent text-accent-ink" : "text-muted hover:bg-white/6 hover:text-ink active:bg-white/10"
    }`;
  const group = "panel flex flex-col overflow-hidden !rounded-lg";
  return (
    <div role="toolbar" aria-label="Map tools" aria-orientation="vertical" className="pointer-events-auto flex flex-col gap-2">
      <div className={group}>
        {PANEL_TOOLS.map((t) => (
          <button
            key={t.id}
            type="button"
            aria-pressed={t.id === active}
            aria-label={t.label}
            title={t.hint}
            disabled={disabled}
            onClick={() => onToggle(t.id)}
            className={btn(t.id === active)}
          >
            <Icon name={t.icon} />
          </button>
        ))}
        {ACTIONS.map((a) => (
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
    </div>
  );
}
