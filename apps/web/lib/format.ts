/** Signed decimal degrees, WGS84 (5 decimals ≈ 1 m). Uses a true minus sign. */
export function formatDegrees(value: number, digits = 5): string {
  const s = Math.abs(value).toFixed(digits);
  return `${value < 0 ? "−" : ""}${s}°`;
}

export function formatMetres(value: number): string {
  return `${Math.round(value).toLocaleString("en-US")} m`;
}
