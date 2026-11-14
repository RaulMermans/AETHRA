"use client";

import { useState } from "react";
import { formatMetres } from "@/lib/format";
import { formatDistance } from "@/lib/globe/measure";
import type { ProfileSample } from "@/lib/globe/types";

const W = 256;
const H = 120;
const PAD = { top: 8, right: 6, bottom: 18, left: 40 };

/** Terrain profile (height vs. distance) with a hover readout. */
export function ProfileChart({ samples, onHover }: { samples: ProfileSample[]; onHover?: (s: ProfileSample | null) => void }) {
  const [hover, setHover] = useState<number | null>(null);
  const valid = samples.filter((s) => Number.isFinite(s.height));
  if (valid.length < 2) return <p className="text-xs text-muted">No terrain heights along this line.</p>;
  const length = samples[samples.length - 1].distance;
  let min = Math.min(...valid.map((s) => s.height));
  let max = Math.max(...valid.map((s) => s.height));
  if (max - min < 10) [min, max] = [min - 5, max + 5];
  const x = (d: number) => PAD.left + (d / length) * (W - PAD.left - PAD.right);
  const y = (h: number) => PAD.top + (1 - (h - min) / (max - min)) * (H - PAD.top - PAD.bottom);
  const line = valid.map((s, i) => `${i ? "L" : "M"}${x(s.distance).toFixed(1)},${y(s.height).toFixed(1)}`).join("");
  const area = `${line}L${x(valid[valid.length - 1].distance)},${H - PAD.bottom}L${x(valid[0].distance)},${H - PAD.bottom}Z`;
  const h = hover !== null ? samples[hover] : null;

  const pick = (clientX: number, el: SVGSVGElement) => {
    const r = el.getBoundingClientRect();
    const d = (((clientX - r.left) / r.width) * W - PAD.left) / (W - PAD.left - PAD.right);
    const i = Math.round(Math.max(0, Math.min(1, d)) * (samples.length - 1));
    setHover(i);
    onHover?.(samples[i]);
  };

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full touch-none select-none"
      role="img"
      aria-label={`Elevation profile over ${formatDistance(length)}, from ${formatMetres(min)} to ${formatMetres(max)}`}
      onPointerMove={(e) => pick(e.clientX, e.currentTarget)}
      onPointerLeave={() => {
        setHover(null);
        onHover?.(null);
      }}
    >
      <path d={area} fill="var(--color-accent)" opacity={0.15} />
      <path d={line} fill="none" stroke="var(--color-accent)" strokeWidth={1.5} />
      <line x1={PAD.left} x2={W - PAD.right} y1={H - PAD.bottom} y2={H - PAD.bottom} stroke="var(--color-line)" />
      <text x={PAD.left - 4} y={y(max) + 3} textAnchor="end" className="fill-[var(--color-faint)] text-[8px]">{formatMetres(max)}</text>
      <text x={PAD.left - 4} y={y(min) + 3} textAnchor="end" className="fill-[var(--color-faint)] text-[8px]">{formatMetres(min)}</text>
      <text x={PAD.left} y={H - 5} className="fill-[var(--color-faint)] text-[8px]">A</text>
      <text x={W - PAD.right} y={H - 5} textAnchor="end" className="fill-[var(--color-faint)] text-[8px]">B · {formatDistance(length)}</text>
      {h && Number.isFinite(h.height) && (
        <g>
          <line x1={x(h.distance)} x2={x(h.distance)} y1={PAD.top} y2={H - PAD.bottom} stroke="var(--color-ink)" strokeOpacity={0.4} />
          <circle cx={x(h.distance)} cy={y(h.height)} r={2.5} fill="var(--color-ink)" />
          <text
            x={Math.min(x(h.distance) + 4, W - 70)}
            y={PAD.top + 8}
            className="fill-[var(--color-ink)] text-[8px]"
          >
            {formatDistance(h.distance)} · {formatMetres(h.height)}
          </text>
        </g>
      )}
    </svg>
  );
}
