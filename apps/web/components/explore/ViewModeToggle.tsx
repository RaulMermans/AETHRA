"use client";

import type { SceneDim } from "@/lib/globe/types";
import { useLocale } from "@/lib/i18n/locale";
import { Icon } from "./Icon";
import { Segmented } from "./Segmented";

/** Top-centre: fly the camera back to Spain (D32) and 2D / 3D. */
export function ViewModeToggle({
  onRecenterSpain,
  dim,
  onDimChange,
  disabled,
}: {
  onRecenterSpain: () => void;
  dim: SceneDim;
  onDimChange: (dim: SceneDim) => void;
  disabled?: boolean;
}) {
  const { m } = useLocale();
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        disabled={disabled}
        onClick={onRecenterSpain}
        title={m.view.spainTitle}
        aria-label={m.view.spainTitle}
        className="focus-ring flex items-center gap-1.5 rounded-md border border-line bg-atlantic/70 px-2.5 py-1.5 text-xs text-muted backdrop-blur-md transition hover:border-nav/50 hover:text-ink disabled:opacity-50"
      >
        <Icon name="home" className="size-3.5" />
        {m.view.spain}
      </button>
      <Segmented
        label={m.view.mapType}
        value={dim}
        onChange={onDimChange}
        disabled={disabled}
        options={[
          { value: "2d", label: "2D", hint: m.view.flatHint },
          { value: "3d", label: "3D", hint: m.view.globeHint },
        ]}
      />
    </div>
  );
}
