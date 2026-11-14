/** Visual playback of observed annual heatmaps, then a fitted-trend chapter. Does not invent years. */

import {
  FIRST_OBSERVED_YEAR,
  LAST_COMPLETE_YEAR,
  type ActiveClimateConfig,
} from "./climate";

/** One observed year → next, as a cross-fade. Longer = more obvious morph. */
export const MS_PER_OBSERVED_YEAR = 1_400;

/** Hold the last observed year before cutting to the slope map (units change; do not blend). */
export const MS_TREND_SUMMARY_HOLD = 700;

export const OBSERVED_YEAR_COUNT = LAST_COMPLETE_YEAR - FIRST_OBSERVED_YEAR + 1;

/** Scrubber index after the last observed year. Not a calendar year. */
export const TIMELINE_TREND_INDEX = OBSERVED_YEAR_COUNT;

export type ClimateTimelineSlot =
  | { kind: "observed"; year: number }
  | { kind: "trend-summary" };

export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function smoothstep01(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
}

export function timelineSlotFromIndex(index: number): ClimateTimelineSlot {
  const clamped = Math.min(TIMELINE_TREND_INDEX, Math.max(0, Math.round(index)));
  if (clamped >= TIMELINE_TREND_INDEX) return { kind: "trend-summary" };
  return { kind: "observed", year: FIRST_OBSERVED_YEAR + clamped };
}

export function timelineIndexFromConfig(mode: ActiveClimateConfig["mode"], year: number): number {
  if (mode === "trend") return TIMELINE_TREND_INDEX;
  const clamped = Math.min(LAST_COMPLETE_YEAR, Math.max(FIRST_OBSERVED_YEAR, year));
  return clamped - FIRST_OBSERVED_YEAR;
}

export function configPatchFromSlot(slot: ClimateTimelineSlot): Partial<ActiveClimateConfig> {
  if (slot.kind === "trend-summary") {
    return { mode: "trend", year: LAST_COMPLETE_YEAR };
  }
  return { mode: "value", year: slot.year };
}

export function restartPlaybackConfig(cfg: ActiveClimateConfig): ActiveClimateConfig {
  const atEnd = cfg.mode === "trend" || cfg.year >= LAST_COMPLETE_YEAR;
  return {
    ...cfg,
    mode: "value",
    year: atEnd ? FIRST_OBSERVED_YEAR : cfg.year,
  };
}

/** Dual-layer playback while observed years cross-fade. Mix 0 = outgoing year fully visible. */
export type TimelinePlayback = {
  frontIsA: boolean;
  yearA: number;
  yearB: number;
  mix: number;
};

export function outgoingObservedYear(playback: TimelinePlayback): number {
  return playback.frontIsA ? playback.yearA : playback.yearB;
}

export function incomingObservedYear(playback: TimelinePlayback): number {
  return playback.frontIsA ? playback.yearB : playback.yearA;
}

/** Year shown on the HUD. Mid-blend is still a visual mix, not a new observation. */
export function labelledObservedYear(playback: TimelinePlayback): number {
  return playback.mix >= 0.5 ? incomingObservedYear(playback) : outgoingObservedYear(playback);
}
