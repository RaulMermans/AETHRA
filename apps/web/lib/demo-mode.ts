/**
 * Judge mode is the default build. Exploratory features — the Energy Tech Lab (D44: rankings,
 * suitability scores, 2026–2030 extrapolations), the Energy infrastructure context layer (D49),
 * illustrative 3D / conceptual plant appearance, and the CyL plant-register overlay — are only
 * reachable when the build sets NEXT_PUBLIC_ENABLE_EXPLORATORY=1 (research use).
 * URL parameters (?lab=energy, ?concept=…) are ignored in judge mode. Destinations and research
 * case panels must also honour this flag (D60). Inlined at build time, so a judge cannot switch
 * it from the browser.
 */
export const EXPLORATORY_FEATURES_ENABLED: boolean = process.env.NEXT_PUBLIC_ENABLE_EXPLORATORY === "1";
