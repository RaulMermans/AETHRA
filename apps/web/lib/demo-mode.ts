/**
 * Judge mode is the default build. Exploratory features — the Energy Tech Lab (D44: rankings,
 * suitability scores, 2026–2030 extrapolations) and the Energy infrastructure context layer
 * (D49) — are only reachable when the build sets NEXT_PUBLIC_ENABLE_EXPLORATORY=1 (research use).
 * URL parameters (?lab=energy, ?concept=…) are ignored in judge mode. Inlined at build time, so a
 * judge cannot switch it from the browser.
 */
export const EXPLORATORY_FEATURES_ENABLED: boolean = process.env.NEXT_PUBLIC_ENABLE_EXPLORATORY === "1";
