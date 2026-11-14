/** Canvas billboards for registered plants. Colour + shape so meaning is not colour-only. */

const cache: Record<string, string> = {};

export function plantMarkerImage(kind: "wind" | "solar", color: string): string {
  const key = `${kind}|${color}`;
  const cached = cache[key];
  if (cached) return cached;
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const g = canvas.getContext("2d");
  if (!g) return "";
  g.fillStyle = color;
  g.strokeStyle = "#0b1424";
  g.lineWidth = 4;
  g.beginPath();
  if (kind === "wind") {
    g.moveTo(32, 6);
    g.lineTo(58, 56);
    g.lineTo(6, 56);
    g.closePath();
  } else {
    g.rect(10, 10, 44, 44);
  }
  g.fill();
  g.stroke();
  const url = canvas.toDataURL("image/png");
  cache[key] = url;
  return url;
}
