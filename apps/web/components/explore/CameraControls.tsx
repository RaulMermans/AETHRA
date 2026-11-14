"use client";

import type { GlobeController } from "@/lib/globe/types";
import { Icon, type IconName } from "./Icon";

type Action = { icon: IconName; label: string; run: (c: GlobeController) => void };

const GROUPS: Action[][] = [
  [
    { icon: "plus", label: "Zoom in", run: (c) => c.zoom(1) },
    { icon: "minus", label: "Zoom out", run: (c) => c.zoom(-1) },
  ],
  [
    { icon: "tiltUp", label: "Tilt toward horizon", run: (c) => c.tilt(1) },
    { icon: "tiltDown", label: "Tilt to top-down", run: (c) => c.tilt(-1) },
  ],
  [
    { icon: "rotateLeft", label: "Rotate left", run: (c) => c.rotate(-1) },
    { icon: "rotateRight", label: "Rotate right", run: (c) => c.rotate(1) },
    { icon: "compass", label: "Reset north", run: (c) => c.resetNorth() },
  ],
];

export function CameraControls({
  controller,
  onReset,
}: {
  controller: GlobeController | null;
  onReset: () => void;
}) {
  const disabled = !controller;
  const btn =
    "focus-ring grid size-9 place-items-center text-muted transition-colors hover:bg-white/6 hover:text-ink active:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40";
  return (
    <div role="toolbar" aria-label="Camera" aria-orientation="vertical" className="pointer-events-auto flex flex-col gap-2">
      {GROUPS.map((group, i) => (
        <div key={i} className={`panel flex-col overflow-hidden !rounded-lg ${i === 0 ? "flex" : "hidden sm:flex"}`}>
          {group.map((a) => (
            <button
              key={a.label}
              type="button"
              className={btn}
              aria-label={a.label}
              title={a.label}
              disabled={disabled}
              onClick={() => controller && a.run(controller)}
            >
              <Icon name={a.icon} />
            </button>
          ))}
        </div>
      ))}
      <div className="panel flex flex-col overflow-hidden !rounded-lg">
        <button type="button" className={btn} aria-label="Reset to global view" title="Reset to global view" disabled={disabled} onClick={onReset}>
          <Icon name="home" />
        </button>
      </div>
    </div>
  );
}
