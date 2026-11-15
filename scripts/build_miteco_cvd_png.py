#!/usr/bin/env python3
"""Colour-blind (CVD) safe variants of the MITECO PV environmental-sensitivity overlays.

Reads the 0.01 deg class rasters in data/miteco_pv_sensitivity_2024 (values 0..4, 255 = no data) and
writes apps/web/public/data/miteco-pv-sensitivity-{peninsula,canarias}-cvd.png with the same size and
bounds as the default PNGs (so miteco-pv-sensitivity.json is reused unchanged; the web app derives the
file name by adding the "-cvd" suffix, see lib/globe/cesium/screening-layers.ts::mitecoCvdFile).

Colours come from the single source of truth CVD_MITECO_COLORS in screening-layers.ts (Okabe-Ito:
vermillion, orange, yellow, sky blue, blue for class 0 maximum .. 4 low sensitivity). Their
distinguishability under protanopia / deuteranopia / tritanopia is checked by tests/test_cvd_palettes.py.

Only Pillow + numpy are needed (no rasterio): the rasters are plain 8-bit single-band GeoTIFFs.
Usage:  python scripts/build_miteco_cvd_png.py
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
MITECO_DIR = ROOT / "data" / "miteco_pv_sensitivity_2024"
OUT = ROOT / "apps" / "web" / "public" / "data"
TS_SOURCE = ROOT / "apps" / "web" / "lib" / "globe" / "cesium" / "screening-layers.ts"
RASTERS = (("peninsula_baleares", "peninsula"), ("canarias", "canarias"))


def cvd_miteco_colors() -> list[str]:
    """Parse CVD_MITECO_COLORS from the TypeScript source (keeps app, PNGs and tests in sync)."""
    text = TS_SOURCE.read_text(encoding="utf-8")
    m = re.search(r"CVD_MITECO_COLORS\s*=\s*\[([^\]]+)\]", text)
    if not m:
        raise SystemExit(f"CVD_MITECO_COLORS not found in {TS_SOURCE}")
    colors = re.findall(r"#[0-9A-Fa-f]{6}", m.group(1))
    if len(colors) != 5:
        raise SystemExit(f"expected 5 MITECO CVD colours, got {colors}")
    return colors


def lut(colors: list[str]) -> np.ndarray:
    table = np.zeros((256, 4), dtype=np.uint8)  # every other value (255 = no data) stays transparent
    for value, hex_color in enumerate(colors):
        h = hex_color.lstrip("#")
        table[value] = [int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), 255]
    return table


def main() -> int:
    table = lut(cvd_miteco_colors())
    for name, tag in RASTERS:
        src = MITECO_DIR / f"miteco_pv_sensitivity_{name}_0p01deg.tif"
        classes = np.array(Image.open(src))
        if classes.ndim != 2:
            raise SystemExit(f"{src}: expected a single band, got shape {classes.shape}")
        default_png = OUT / f"miteco-pv-sensitivity-{tag}.png"
        if default_png.exists():
            w, h = Image.open(default_png).size
            if (w, h) != (classes.shape[1], classes.shape[0]):
                raise SystemExit(f"{src}: size {classes.shape[::-1]} differs from {default_png.name} {(w, h)}")
        out = OUT / f"miteco-pv-sensitivity-{tag}-cvd.png"
        Image.fromarray(table[classes], "RGBA").save(out, optimize=True)
        counts = {int(v): int(n) for v, n in zip(*np.unique(classes, return_counts=True))}
        print(f"wrote {out.relative_to(ROOT)}  {classes.shape[1]}x{classes.shape[0]}  class pixels {counts}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
