"use client";

import { EXPLORATORY_FEATURES_ENABLED } from "@/lib/demo-mode";
import type { PanelToolId, ToolId } from "@/lib/globe/types";
import { useLocale } from "@/lib/i18n/locale";
import { Icon, type IconName } from "./Icon";

export type ToolAction = "screenshot" | "share";

interface ToolDef<T> {
  id: T;
  icon: IconName;
  /** Hidden in judge mode (default build). */
  exploratory?: boolean;
}

/**
 * Map tools. Only tools that help answer the trend questions stay here (see D45 in
 * docs/DECISIONS.md). To add one: extend `PanelToolId` in lib/globe/types.ts and add it here.
 */
const ALL_PANEL_TOOLS: ToolDef<PanelToolId>[] = [
  { id: "stations", icon: "station" },
  { id: "evidence", icon: "chart" },
  // D49: P1 context layer, opt-in, off the demo path.
  { id: "infrastructure", icon: "pylon", exploratory: true },
];

export const PANEL_TOOLS: ToolDef<PanelToolId>[] = ALL_PANEL_TOOLS.filter((t) => EXPLORATORY_FEATURES_ENABLED || !t.exploratory);

const ACTIONS: ToolDef<ToolAction>[] = [
  { id: "screenshot", icon: "camera" },
  { id: "share", icon: "link" },
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
  const { m } = useLocale();
  const panelCopy: Record<PanelToolId, { label: string; hint: string }> = {
    stations: { label: m.tools.stations, hint: m.tools.stationsHint },
    evidence: { label: m.tools.evidence, hint: m.tools.evidenceHint },
    infrastructure: { label: m.tools.infrastructure, hint: m.tools.infrastructureHint },
  };
  const actionCopy: Record<ToolAction, { label: string; hint: string }> = {
    screenshot: { label: m.tools.screenshot, hint: m.tools.screenshotHint },
    share: { label: m.tools.share, hint: m.tools.shareHint },
  };
  const btn = (on: boolean) =>
    `focus-ring grid size-9 place-items-center transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
      on ? "bg-accent text-accent-ink" : "text-muted hover:bg-white/6 hover:text-ink active:bg-white/10"
    }`;
  const group = "panel flex flex-col overflow-hidden !rounded-lg";
  return (
    <div role="toolbar" aria-label={m.tools.mapTools} aria-orientation="vertical" className="pointer-events-auto flex flex-col gap-2">
      <div className={group}>
        {PANEL_TOOLS.map((t) => (
          <button
            key={t.id}
            type="button"
            aria-pressed={t.id === active}
            aria-label={panelCopy[t.id].label}
            title={panelCopy[t.id].hint}
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
            aria-label={actionCopy[a.id].label}
            title={actionCopy[a.id].hint}
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
