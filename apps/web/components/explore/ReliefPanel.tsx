"use client";

import { ToolPanel } from "./ToolPanel";

const STEPS = [1, 1.5, 2, 3, 5];

/** Vertical exaggeration of the rendered relief (visual only; readouts stay in true metres). */
export function ReliefPanel({
  value,
  onChange,
  onClose,
}: {
  value: number;
  onChange: (v: number) => void;
  onClose: () => void;
}) {
  return (
    <ToolPanel icon="mountain" title="Relief" onClose={onClose}>
      <p className="mt-1 text-xs text-muted">Exaggerate the height of the terrain to make relief easier to see.</p>
      <div className="mt-3 flex gap-1" role="radiogroup" aria-label="Vertical exaggeration">
        {STEPS.map((s) => (
          <button
            key={s}
            type="button"
            role="radio"
            aria-checked={value === s}
            onClick={() => onChange(s)}
            className={`focus-ring flex-1 rounded-md px-2 py-1.5 font-mono text-xs transition-colors ${
              value === s ? "bg-accent text-accent-ink" : "border border-line text-ink hover:bg-white/6"
            }`}
          >
            ×{s}
          </button>
        ))}
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-faint">
        Visual only: heights shown in readouts and profiles are always true metres. ×1 is true scale.
      </p>
    </ToolPanel>
  );
}
