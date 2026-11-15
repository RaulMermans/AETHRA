#!/usr/bin/env python3
"""Colour-blind (CVD) palette verification for AETHRA's inclusive colour-blind mode.

Plain script (no pytest needed):  python tests/test_cvd_palettes.py
(also collected by pytest: every check is a test_* function).

Colours are PARSED from the web sources, so the app and this test cannot drift apart:
  - apps/web/lib/globe/cesium/screening-layers.ts : CVD_VERDICT_COLORS, CVD_MITECO_COLORS
  - apps/web/lib/globe/climate.ts                 : VIRIDIS/INFERNO/CIVIDIS/BLUE_ORANGE + CVD_PALETTES

Method
  * Dichromacy simulated with Machado, Oliveira & Fernandes (2009) matrices, severity 1.0, applied in
    linear sRGB (protanopia, deuteranopia, tritanopia), plus normal vision.
  * Categorical palettes: minimum pairwise CIEDE2000 dE >= 10 between classes in every vision type.
  * Sequential palettes: CIELAB L* strictly increasing (or decreasing) along the ramp in every vision
    type, sampled with the app's own linear interpolation (33 samples).
  * Diverging palettes: L* rises monotonically to the centre and falls after it; both ends dE >= 10
    apart in every vision type.
  * MITECO -cvd PNGs: every class pixel has exactly the CVD class colour (checked against the rasters).
"""

from __future__ import annotations

import math
import re
import sys
from itertools import combinations
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WEB = ROOT / "apps" / "web"
SCREENING_TS = WEB / "lib" / "globe" / "cesium" / "screening-layers.ts"
CLIMATE_TS = WEB / "lib" / "globe" / "climate.ts"

MIN_DE = 10.0

MACHADO = {
    "protanopia": ((0.152286, 1.052583, -0.204868), (0.114503, 0.786281, 0.099216), (-0.003882, -0.048116, 1.051998)),
    "deuteranopia": ((0.367322, 0.860646, -0.227968), (0.280085, 0.672501, 0.047413), (-0.011820, 0.042940, 0.968881)),
    "tritanopia": ((1.255528, -0.076749, -0.178779), (-0.078411, 0.930809, 0.147602), (0.004733, 0.691367, 0.303900)),
}
VISIONS = ("normal", *MACHADO)

RGB = tuple[float, float, float]
RESULTS: list[str] = []


# ----------------------------------------------------------------------------- colour maths
def hex_rgb(h: str) -> RGB:
    h = h.lstrip("#")
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16))


def _lin(c: float) -> float:
    c /= 255.0
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def _gam(c: float) -> float:
    c = min(1.0, max(0.0, c))
    return 255.0 * (12.92 * c if c <= 0.0031308 else 1.055 * c ** (1 / 2.4) - 0.055)


def simulate(rgb: RGB, vision: str) -> RGB:
    if vision == "normal":
        return rgb
    m = MACHADO[vision]
    lin = [_lin(c) for c in rgb]
    out = [sum(m[i][j] * lin[j] for j in range(3)) for i in range(3)]
    return (_gam(out[0]), _gam(out[1]), _gam(out[2]))


def lab(rgb: RGB) -> tuple[float, float, float]:
    r, g, b = (_lin(c) for c in rgb)
    x = (0.4124564 * r + 0.3575761 * g + 0.1804375 * b) / 0.95047
    y = 0.2126729 * r + 0.7151522 * g + 0.0721750 * b
    z = (0.0193339 * r + 0.1191920 * g + 0.9503041 * b) / 1.08883

    def f(t: float) -> float:
        return t ** (1 / 3) if t > 216 / 24389 else (24389 / 27 * t + 16) / 116

    fx, fy, fz = f(x), f(y), f(z)
    return (116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz))


def ciede2000(c1: RGB, c2: RGB) -> float:
    L1, a1, b1 = lab(c1)
    L2, a2, b2 = lab(c2)
    C1, C2 = math.hypot(a1, b1), math.hypot(a2, b2)
    Cb = (C1 + C2) / 2
    G = 0.5 * (1 - math.sqrt(Cb**7 / (Cb**7 + 25**7)))
    a1p, a2p = (1 + G) * a1, (1 + G) * a2
    C1p, C2p = math.hypot(a1p, b1), math.hypot(a2p, b2)
    h1p = math.degrees(math.atan2(b1, a1p)) % 360
    h2p = math.degrees(math.atan2(b2, a2p)) % 360
    dLp = L2 - L1
    dCp = C2p - C1p
    if C1p * C2p == 0:
        dhp = 0.0
    elif abs(h2p - h1p) <= 180:
        dhp = h2p - h1p
    elif h2p - h1p > 180:
        dhp = h2p - h1p - 360
    else:
        dhp = h2p - h1p + 360
    dHp = 2 * math.sqrt(C1p * C2p) * math.sin(math.radians(dhp / 2))
    Lbp = (L1 + L2) / 2
    Cbp = (C1p + C2p) / 2
    if C1p * C2p == 0:
        hbp = h1p + h2p
    elif abs(h1p - h2p) <= 180:
        hbp = (h1p + h2p) / 2
    elif h1p + h2p < 360:
        hbp = (h1p + h2p + 360) / 2
    else:
        hbp = (h1p + h2p - 360) / 2
    T = (
        1
        - 0.17 * math.cos(math.radians(hbp - 30))
        + 0.24 * math.cos(math.radians(2 * hbp))
        + 0.32 * math.cos(math.radians(3 * hbp + 6))
        - 0.20 * math.cos(math.radians(4 * hbp - 63))
    )
    dtheta = 30 * math.exp(-(((hbp - 275) / 25) ** 2))
    Rc = 2 * math.sqrt(Cbp**7 / (Cbp**7 + 25**7))
    Sl = 1 + 0.015 * (Lbp - 50) ** 2 / math.sqrt(20 + (Lbp - 50) ** 2)
    Sc = 1 + 0.045 * Cbp
    Sh = 1 + 0.015 * Cbp * T
    Rt = -math.sin(math.radians(2 * dtheta)) * Rc
    return math.sqrt((dLp / Sl) ** 2 + (dCp / Sc) ** 2 + (dHp / Sh) ** 2 + Rt * (dCp / Sc) * (dHp / Sh))


def _self_check_ciede2000() -> None:
    # Sharma et al. (2005) test pair 1 (Lab inputs), via a direct Lab path.
    global lab
    saved = lab
    pairs = {(1, 1, 1): (50.0, 2.6772, -79.7751), (2, 2, 2): (50.0, 0.0, -82.7485)}
    lab = lambda c: pairs[c]  # noqa: E731
    try:
        d = ciede2000((1, 1, 1), (2, 2, 2))
    finally:
        lab = saved
    assert abs(d - 2.0425) < 1e-3, f"CIEDE2000 self-check failed: {d}"


# ----------------------------------------------------------------------------- parse web sources
def _hexes(text: str, const: str) -> list[str]:
    m = re.search(rf"{const}\s*=\s*[\[{{]([^\]}}]+)[\]}}]", text)
    assert m, f"{const} not found"
    return re.findall(r"#[0-9A-Fa-f]{6}", m.group(1))


def categorical_palettes() -> dict[str, list[str]]:
    text = SCREENING_TS.read_text(encoding="utf-8")
    verdict = _hexes(text, "CVD_VERDICT_COLORS")
    miteco = _hexes(text, "CVD_MITECO_COLORS")
    assert len(verdict) == 3 and len(miteco) == 5, (verdict, miteco)
    return {"verdict (good/mixed/avoid)": verdict, "MITECO classes 0-4": miteco}


def ramp_palettes() -> dict[str, list[RGB]]:
    text = CLIMATE_TS.read_text(encoding="utf-8")
    bases: dict[str, list[RGB]] = {}
    for m in re.finditer(r"const (\w+): RGB\[\] = \[(.*?)\n\];", text, re.S):
        stops = [tuple(int(v) for v in t) for t in re.findall(r"\[(\d+),\s*(\d+),\s*(\d+)\]", m.group(2))]
        bases[m.group(1)] = stops  # type: ignore[assignment]
    block = re.search(r"CVD_PALETTES: Record<PaletteId, RGB\[\]> = \{(.*?)\n\};", text, re.S)
    assert block, "CVD_PALETTES not found"
    out: dict[str, list[RGB]] = {}
    for key, expr in re.findall(r"^\s*(\w+):\s*([^,\n]+),", block.group(1), re.M):
        expr = expr.strip()
        rm = re.fullmatch(r"rev\((\w+)\)", expr)
        name = rm.group(1) if rm else expr
        assert name in bases, f"{key}: unknown base palette {name}"
        out[key] = list(reversed(bases[name])) if rm else list(bases[name])
    assert len(out) == 10, f"expected 10 palette ids, got {sorted(out)}"
    return out


DIVERGING = {"rdbu_rev", "brbg", "drought_spi"}


def sample(stops: list[RGB], n: int = 33) -> list[RGB]:
    """Same linear interpolation as climate.ts::samplePalette."""
    out = []
    for k in range(n):
        pos = k / (n - 1) * (len(stops) - 1)
        i = min(len(stops) - 2, int(math.floor(pos)))
        f = pos - i
        a, b = stops[i], stops[i + 1]
        out.append(tuple(round(a[c] + (b[c] - a[c]) * f) for c in range(3)))
    return out  # type: ignore[return-value]


def _strict(seq: list[float], increasing: bool) -> bool:
    return all((b > a) if increasing else (b < a) for a, b in zip(seq, seq[1:]))


# ----------------------------------------------------------------------------- tests
def test_ciede2000_reference() -> None:
    _self_check_ciede2000()


def test_categorical_min_delta_e() -> None:
    for name, hexes in categorical_palettes().items():
        for vision in VISIONS:
            sims = [simulate(hex_rgb(h), vision) for h in hexes]
            worst = min(
                ((ciede2000(sims[i], sims[j]), hexes[i], hexes[j]) for i, j in combinations(range(len(sims)), 2)),
                key=lambda x: x[0],
            )
            RESULTS.append(f"categorical  {name:28s} {vision:13s} min dE2000 = {worst[0]:5.1f}  ({worst[1]} vs {worst[2]})")
            assert worst[0] >= MIN_DE, f"{name} under {vision}: {worst[1]} vs {worst[2]} dE={worst[0]:.1f} < {MIN_DE}"


def test_sequential_monotonic_lightness() -> None:
    for key, stops in ramp_palettes().items():
        if key in DIVERGING:
            continue
        for vision in VISIONS:
            Ls = [lab(simulate(c, vision))[0] for c in sample(stops)]
            inc = Ls[-1] > Ls[0]
            RESULTS.append(f"sequential   {key:28s} {vision:13s} L* {Ls[0]:5.1f} -> {Ls[-1]:5.1f}  monotonic={_strict(Ls, inc)}")
            assert _strict(Ls, inc), f"{key} under {vision}: L* not monotonic {[round(x, 1) for x in Ls]}"


def test_diverging_lightness_and_ends() -> None:
    for key, stops in ramp_palettes().items():
        if key not in DIVERGING:
            continue
        for vision in VISIONS:
            samples = [simulate(c, vision) for c in sample(stops)]
            Ls = [lab(c)[0] for c in samples]
            mid = len(Ls) // 2
            ok = _strict(Ls[: mid + 1], True) and _strict(Ls[mid:], False)
            ends = ciede2000(samples[0], samples[-1])
            RESULTS.append(
                f"diverging    {key:28s} {vision:13s} L* ends {Ls[0]:5.1f}/{Ls[-1]:5.1f} centre {Ls[mid]:5.1f}  ends dE2000 = {ends:5.1f}"
            )
            assert ok, f"{key} under {vision}: lightness not peaked at centre {[round(x, 1) for x in Ls]}"
            assert ends >= MIN_DE, f"{key} under {vision}: ends dE={ends:.1f} < {MIN_DE}"


def test_default_palette_baseline_is_reported() -> None:
    """Negative control (informational): the default green/amber/red verdicts collapse for dichromats."""
    default = ["#22c55e", "#f59e0b", "#ef4444"]
    for vision in VISIONS:
        sims = [simulate(hex_rgb(h), vision) for h in default]
        worst = min(ciede2000(sims[i], sims[j]) for i, j in combinations(range(3), 2))
        RESULTS.append(f"baseline     default verdict (non-CVD)    {vision:13s} min dE2000 = {worst:5.1f}")


def test_miteco_cvd_pngs_match_rasters() -> None:
    try:
        import numpy as np
        from PIL import Image
    except ImportError:  # pragma: no cover
        RESULTS.append("MITECO PNGs: skipped (numpy/Pillow not installed)")
        return
    colors = [hex_rgb(h) for h in categorical_palettes()["MITECO classes 0-4"]]
    for name, tag in (("peninsula_baleares", "peninsula"), ("canarias", "canarias")):
        classes = np.array(Image.open(ROOT / "data" / "miteco_pv_sensitivity_2024" / f"miteco_pv_sensitivity_{name}_0p01deg.tif"))
        png = WEB / "public" / "data" / f"miteco-pv-sensitivity-{tag}-cvd.png"
        assert png.exists(), f"{png} missing: run python scripts/build_miteco_cvd_png.py"
        rgba = np.array(Image.open(png).convert("RGBA"))
        assert rgba.shape[:2] == classes.shape, (png, rgba.shape, classes.shape)
        for v, rgb in enumerate(colors):
            px = rgba[classes == v]
            assert (px[:, :3] == rgb).all() and (px[:, 3] == 255).all(), f"{png.name}: class {v} colour mismatch"
        assert (rgba[classes == 255][:, 3] == 0).all(), f"{png.name}: no-data pixels must be transparent"
        RESULTS.append(f"MITECO PNG   {png.name:28s} {rgba.shape[1]}x{rgba.shape[0]} classes 0-4 exact, no-data transparent")


def main() -> int:
    tests = [v for k, v in globals().items() if k.startswith("test_") and callable(v)]
    failed = 0
    for t in tests:
        try:
            t()
            print(f"PASS {t.__name__}")
        except AssertionError as e:
            failed += 1
            print(f"FAIL {t.__name__}: {e}")
    print()
    for line in RESULTS:
        print(line)
    print(f"\n{len(tests) - failed}/{len(tests)} checks passed (threshold dE2000 >= {MIN_DE})")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
