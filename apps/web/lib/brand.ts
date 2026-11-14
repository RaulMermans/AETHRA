/**
 * Visible product identity (D56, D58). Not a trademark clearance.
 * Internal packages, routes and scientific files keep their existing names.
 */

export const BRAND_NAME = "AETHRA";
export const BRAND_DESCRIPTOR = "Earth Intelligence";
export const BRAND_PLATFORM = "Earth Intelligence Platform";
export const BRAND_TAGLINE = "Earth's signals, revealed.";
export const BRAND_SUPPORTING = "Understand Earth's past. Investigate its future.";
/** Product identity only — not rendered in header chrome. */
export const BRAND_MISSION = "MISSION 01 / SPAIN";
export const BRAND_MISSION_LONG = "MISSION 01 — SPAIN";
export const CHALLENGE_NAME = "Be An Earth System Trend Detective!";

/** Raster kit v1.0 under `public/brand/aethra`. Not a vector master. */
export const BRAND_ASSETS = {
  lockupOnDark: "/brand/aethra/PNG/03_Full_Color_Transparent.png",
  lockupOnLight: "/brand/aethra/PNG/04_Full_Color_Light.png",
  symbolOnDark: "/brand/aethra/PNG/10_Symbol_Color_Transparent.png",
  wordmarkOnDark: "/brand/aethra/PNG/15_Wordmark_White_Transparent.png",
} as const;

/** UI chrome only. Never use these as quantitative data colors. */
export const BRAND_CHROME = {
  atlanticMidnight: "#101C2B",
  deepSpace: "#03050A",
  mineralWhite: "#F5F1E9",
  scientificBlue: "#819DB5",
  solarGold: "#D6B47E",
  terracotta: "#BD694E",
} as const;
