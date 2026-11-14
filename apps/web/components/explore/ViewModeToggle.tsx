"use client";

import type { SceneDim, ViewMode } from "@/lib/globe/types";
import { Segmented } from "./Segmented";

/** Top-centre view switches: World / Spain (D21) and 2D / 3D. */
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
      <Segmented
        label="Area shown"
        value={mode}
        onChange={onChange}
        disabled={disabled}
        options={[
          { value: "world", label: "World", icon: "globe", hint: "Show the whole Earth" },
          { value: "spain", label: "Spain", icon: "target", hint: "Show only Spain and its surrounding sea" },
        ]}
      />
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
