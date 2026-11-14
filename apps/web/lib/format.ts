/** Signed decimal degrees, WGS84 (5 decimals ≈ 1 m). Uses a true minus sign. */
export function formatDegrees(value: number, digits = 5): string {
  const s = Math.abs(value).toFixed(digits);
  return `${value < 0 ? "−" : ""}${s}°`;
}

export function formatMetres(value: number): string {
  const rounded = Math.round(value) || 0; // avoid "-0 m"
  return `${rounded.toLocaleString("en-US")} m`;
}

/** Terrain elevation with its reference surface, e.g. "≈1,721 m a.s.l." or "1,768 m ellipsoidal". */
export function formatElevation(e: { metres: number; datum: "ellipsoid-wgs84" | "orthometric"; approximate: boolean }): string {
  return `${e.approximate ? "≈" : ""}${formatMetres(e.metres)} ${e.datum === "orthometric" ? "a.s.l." : "ellipsoidal"}`;
}
