"use client";

import { paletteGradientCss, type PaletteId } from "@/lib/globe/climate";

function tickLabel(n: number, decimals?: number): string {
  const d = decimals ?? (Math.abs(n) >= 10 ? 0 : 1);
  return n.toFixed(d).replace(/\.0$/, "");
}

function clamp01(t: number) {
  return Math.min(1, Math.max(0, t));
}

export function ScaleThermometer({
  palette,
  domain,
  units,
  value,
  label,
  compare,
  height = 120,
  thin = false,
}: {
  palette: PaletteId;
  domain: [number, number];
  units: string;
  value?: number;
  label?: string;
  compare?: { value: number; label: string };
  height?: number;
  thin?: boolean;
}) {
  const [lo, hi] = domain;
  const span = hi - lo || 1;
  const t = value === undefined ? undefined : clamp01((value - lo) / span);
  const t2 = compare ? clamp01((compare.value - lo) / span) : undefined;
  const mid = lo + span / 2;
  const fillPct = t === undefined ? 100 : t * 100;
  const ticksOnRight = thin;

  const ticks = (
    <div
      className={`flex flex-col justify-between py-0.5 font-mono leading-none tabular-nums ${
        ticksOnRight
          ? "text-left text-[12px] font-medium text-ink drop-shadow-[0_1px_2px_rgb(0_0_0/0.9)]"
          : "text-right text-[9px] text-faint"
      }`}
    >
      <span>
        {tickLabel(hi)}
        <span className={ticksOnRight ? "ml-1 text-[11px] font-normal text-muted" : "ml-0.5 text-[8px]"}>{units}</span>
      </span>
      <span>{tickLabel(mid)}</span>
      <span>{tickLabel(lo)}</span>
    </div>
  );

  return (
    <div className={`flex flex-col ${thin ? "items-start gap-1.5" : "items-center gap-1"} ${value !== undefined && !thin ? "min-w-[4.75rem] pr-6" : ""}`}>
      {label && (
        <p className={`text-[10px] font-medium uppercase tracking-[0.12em] text-muted ${thin ? "pl-0" : ""}`}>
          {label}
        </p>
      )}
      <div className={`flex items-stretch ${thin ? "gap-1.5" : "gap-1.5"}`}>
        {!ticksOnRight && ticks}
        <div className={thin ? "relative w-1.5" : "relative w-4"} style={{ height }}>
          <div
            className={
              thin
                ? "relative h-full w-1.5 overflow-hidden rounded-full bg-black/40 shadow-[0_0_0_1px_rgb(255_255_255/0.35)]"
                : "relative mx-auto h-full w-3.5 overflow-hidden rounded-full border border-white/30 bg-white/10"
            }
            role="img"
            aria-label={`${label ?? "Scale"} ${tickLabel(lo)} to ${tickLabel(hi)} ${units}${
              value !== undefined ? `, ${tickLabel(value)} ${units}` : ""
            }`}
          >
            <div className="absolute inset-x-0 bottom-0 overflow-hidden" style={{ height: `${fillPct}%` }}>
              <div
                className="absolute bottom-0 left-0 right-0"
                style={{ height, background: paletteGradientCss(palette, "y") }}
              />
            </div>
            {!thin && <div className="pointer-events-none absolute inset-y-1 left-[3px] w-[3px] rounded-full bg-white/25" />}
            {t2 !== undefined && (
              <span
                className="absolute right-0 left-0 h-px bg-white/70"
                style={{ bottom: `${t2 * 100}%` }}
                title={compare!.label}
              />
            )}
          </div>
          {t !== undefined && (
            <span
              className="absolute left-full z-[1] ml-1.5 whitespace-nowrap font-mono text-[11px] font-semibold tabular-nums text-ink"
              style={{ top: `calc(${(1 - t) * 100}% - 0.55rem)` }}
            >
              {tickLabel(value!, 1)}
            </span>
          )}
        </div>
        {ticksOnRight && ticks}
      </div>
    </div>
  );
}
