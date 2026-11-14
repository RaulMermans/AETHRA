/** Visual playback of observed annual heatmaps. Does not invent years or statistics. */

/** One observed year → next, as a cross-fade. Longer = more obvious morph. */
export const MS_PER_OBSERVED_YEAR = 1_400;

export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function smoothstep01(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
}
