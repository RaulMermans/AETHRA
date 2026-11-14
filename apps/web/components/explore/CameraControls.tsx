"use client";

import type { GlobeController } from "@/lib/globe/types";
import { useLocale } from "@/lib/i18n/locale";
import { Icon, type IconName } from "./Icon";

type Action = { icon: IconName; label: string; run: (c: GlobeController) => void };

export function CameraControls({
  controller,
  onReset,
  flat = false,
}: {
  controller: GlobeController | null;
  onReset: () => void;
  /** Flat 2D map: no tilt or rotation, only zoom and reset. */
  flat?: boolean;
}) {
  const { m } = useLocale();
  const groups: Action[][] = [
    [
      { icon: "plus", label: m.camera.zoomIn, run: (c) => c.zoom(1) },
      { icon: "minus", label: m.camera.zoomOut, run: (c) => c.zoom(-1) },
    ],
    [
      { icon: "tiltUp", label: m.camera.tiltHorizon, run: (c) => c.tilt(1) },
      { icon: "tiltDown", label: m.camera.tiltTop, run: (c) => c.tilt(-1) },
    ],
    [
      { icon: "rotateLeft", label: m.camera.rotateLeft, run: (c) => c.rotate(-1) },
      { icon: "rotateRight", label: m.camera.rotateRight, run: (c) => c.rotate(1) },
      { icon: "compass", label: m.camera.resetNorth, run: (c) => c.resetNorth() },
    ],
  ];
  const disabled = !controller;
  const btn =
    "focus-ring grid size-9 place-items-center text-muted transition-colors hover:bg-white/6 hover:text-ink active:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40";
  return (
    <div role="toolbar" aria-label={m.camera.toolbar} aria-orientation="vertical" className="pointer-events-auto flex flex-col gap-2">
      {(flat ? groups.slice(0, 1) : groups).map((group, i) => (
        <div key={i} className={`panel flex-col overflow-hidden !rounded-lg ${i === 0 ? "flex" : "hidden sm:flex [@media(max-height:760px)]:!hidden"}`}>
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
        <button type="button" className={btn} aria-label={m.camera.resetView} title={m.camera.resetView} disabled={disabled} onClick={onReset}>
          <Icon name="home" />
        </button>
      </div>
    </div>
  );
}
