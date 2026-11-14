"use client";

import type { SceneDim, ViewMode } from "@/lib/globe/types";
import { Icon } from "./Icon";
import { Segmented } from "./Segmented";

/** Top-centre view switches: Lock camera on Spain (D32) and 2D / 3D. */
export function ViewModeToggle({
  mode,
  onChange,
  dim,
  onDimChange,
  disabled,
}: {
  mode: ViewMode;
  onChange: (mode: ViewMode) => void;
  dim: SceneDim;
  onDimChange: (dim: SceneDim) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        aria-pressed={mode === "spain"}
        disabled={disabled}
        onClick={() => onChange(mode === "spain" ? "world" : "spain")}
        title={mode === "spain" ? "Unlock the camera (move freely around the Earth)" : "Lock the camera on Spain"}
        className={`focus-ring flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs backdrop-blur-md transition disabled:opacity-50 ${
          mode === "spain" ? "bg-amber-400/20 text-amber-200" : "bg-black/35 text-muted hover:text-ink"
        }`}
      >
        <Icon name={mode === "spain" ? "lock" : "unlock"} className="size-3.5" />
        Lock Spain
      </button>
      <Segmented
        label="Map type"
        value={dim}
        onChange={onDimChange}
        disabled={disabled}
        options={[
          { value: "2d", label: "2D", hint: "Flat map seen from above" },
          { value: "3d", label: "3D", hint: "3D globe with relief" },
        ]}
      />
    </div>
  );
}
