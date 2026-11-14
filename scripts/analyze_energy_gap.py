#!/usr/bin/env python3
"""Hidden Energy Gap analysis — implements docs/ENERGY_RESEARCH.md §0 (frozen v1, A1–A2).

Inputs : data/raw/power/**.json.gz + data/metadata/power_manifest.json (scripts/fetch_power_spain.py)
Outputs: data/processed/spain/power/power_regional_daily_2001-2025.csv
         data/processed/spain/power/region_weights.json
         data/results/energy_gap/analysis_bundle.json   (AnalysisBundle: spec + results + provenance)
         data/results/energy_gap/annual_series.csv
         data/results/energy_gap/*.svg                   (time-series plots)

Resource variables only: surface irradiance and 50 m wind speed. Not generation.
"""
from __future__ import annotations

import gzip
import hashlib
import json
import math
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd
from shapely import make_valid
from shapely.geometry import MultiPolygon, box, shape
from shapely.ops import unary_union

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "packages/science"))
import trends as T  # noqa: E402

RAW = ROOT / "data/raw/power"
MANIFEST = ROOT / "data/metadata/power_manifest.json"
ADMIN = ROOT / "apps/web/public/data/spain-admin.json"
PROC = ROOT / "data/processed/spain/power"
OUT = ROOT / "data/results/energy_gap"

YEARS = list(range(2001, 2026))
REF = (2001, 2020)
REF_ALT = (2001, 2010)
PARAMS = {"solar": "ALLSKY_SFC_SW_DWN", "wind": "WS50M"}
UNITS = {"solar": "kWh m⁻² day⁻¹", "wind": "m s⁻¹"}
REGIONS = {  # frozen §0
    "R0": "Peninsula + Balearics",
    "ES11": "Galicia",
    "ES41": "Castilla y León",
    "ES24": "Aragón",
    "ES61": "Andalucía",
}
EXCLUDE_FROM_R0 = {"ES70", "ES63", "ES64"}
MIN_COMPLETE_FRAC = 0.95
MIN_YEARS = 20
MIN_MEDIAN_COUNT = 5
BH_Q = 0.10


# ----------------------------------------------------------------------------- loading
def load_param(param: str) -> tuple[pd.DataFrame, float]:
    """Return a (date x cell) DataFrame with NaN for fill values, plus the fill value."""
    frames = {}
    fill = None
    for f in sorted((RAW / param).glob("*.json.gz")):
        d = json.loads(gzip.decompress(f.read_bytes()))
        fill = d["header"]["fill_value"]
        for feat in d["features"]:
            lon, lat = feat["geometry"]["coordinates"][:2]
            key = (round(lon, 4), round(lat, 4))
            s = pd.Series(feat["properties"]["parameter"][param], dtype=float)
            frames.setdefault(key, []).append(s)
    cols = {}
    for key, parts in frames.items():
        s = pd.concat(parts)
        s = s[~s.index.duplicated()]
        cols[key] = s
    df = pd.DataFrame(cols)
    df.index = pd.to_datetime(df.index, format="%Y%m%d")
    df = df.sort_index().replace(fill, np.nan)
    return df, fill


def spacing(vals) -> float:
    v = np.unique(np.round(vals, 4))
    return float(np.min(np.diff(v)))


def region_polygons() -> dict[str, MultiPolygon]:
    admin = json.loads(ADMIN.read_text())
    polys = {}
    for c in admin["ccaa"]:
        coords = json.loads(c["coordinates"]) if isinstance(c["coordinates"], str) else c["coordinates"]
        geom = make_valid(shape({"type": "MultiPolygon", "coordinates": coords}))  # simplified file has self-intersections
        polys[c["id"]] = geom
    sample = next(iter(polys.values())).centroid
    if not (-20 < sample.x < 6 and 27 < sample.y < 45):  # stored as [lat, lon] -> swap
        from shapely.ops import transform

        polys = {k: transform(lambda x, y, z=None: (y, x), g) for k, g in polys.items()}
    out = {k: polys[k] for k in REGIONS if k != "R0"}
    out["R0"] = unary_union([g for k, g in polys.items() if k not in EXCLUDE_FROM_R0])
    return out


def cell_weights(cells, dlon: float, dlat: float, poly) -> dict:
    w = {}
    for lon, lat in cells:
        cell = box(lon - dlon / 2, lat - dlat / 2, lon + dlon / 2, lat + dlat / 2)
        frac = cell.intersection(poly).area / cell.area
        if frac > 0:
            w[(lon, lat)] = frac * math.cos(math.radians(lat))
    return w


def regional_series(df: pd.DataFrame, w: dict) -> pd.Series:
    cols = list(w)
    wv = np.array([w[c] for c in cols])
    x = df[cols].to_numpy()
    valid = np.isfinite(x)
    num = np.nansum(x * wv, axis=1)
    den = (valid * wv).sum(axis=1)
    out = num / np.where(den > 0, den, np.nan)
    out[den < 0.95 * wv.sum()] = np.nan  # day missing if >5 % of weight missing
    return pd.Series(out, index=df.index)


# ----------------------------------------------------------------------------- indicators
def monthly_thresholds(s: pd.Series, q: float, ref) -> pd.Series:
    r = s[(s.index.year >= ref[0]) & (s.index.year <= ref[1])]
    thr = r.groupby(r.index.month).quantile(q)
    return pd.Series(thr.reindex(s.index.month).to_numpy(), index=s.index)


def runs(mask: np.ndarray) -> list[int]:
    out, n = [], 0
    for m in mask:
        if m:
            n += 1
        elif n:
            out.append(n)
            n = 0
    if n:
        out.append(n)
    return out


def annual_indicators(S: pd.Series, W: pd.Series, q: float, ref) -> pd.DataFrame:
    sl = S < monthly_thresholds(S, q, ref)
    wl = W < monthly_thresholds(W, q, ref)
    jl = sl & wl
    rows = []
    for y in YEARS:
        m = S.index.year == y
        both = (S[m].notna() & W[m].notna()).to_numpy()
        complete = both.mean() >= MIN_COMPLETE_FRAC
        j = (jl[m] & both).to_numpy()
        ep = runs(j)  # runs within the calendar year
        rows.append(
            {
                "year": y,
                "complete": bool(complete),
                "valid_days": int(both.sum()),
                "joint_low_days": int(j.sum()),
                "solar_low_days": int((sl[m] & both).sum()),
                "wind_low_days": int((wl[m] & both).sum()),
                "joint_low_episodes_2d": int(sum(1 for r in ep if r >= 2)),
                "joint_low_max_run": int(max(ep) if ep else 0),
            }
        )
    return pd.DataFrame(rows).set_index("year")


def annual_tau(S: pd.Series, W: pd.Series, ref) -> pd.Series:
    def anom(s):
        r = s[(s.index.year >= ref[0]) & (s.index.year <= ref[1])]
        mu = r.groupby(r.index.month).mean()
        return s - mu.reindex(s.index.month).to_numpy()

    a, b = anom(S), anom(W)
    return pd.Series({y: T.kendall_tau_b(a[a.index.year == y].to_numpy(), b[b.index.year == y].to_numpy()) for y in YEARS})


# ----------------------------------------------------------------------------- outcome
def e1_outcome(res, p_bh, sens_signs, med_count, n_complete, mdt):
    if n_complete < MIN_YEARS or med_count < MIN_MEDIAN_COUNT:
        return "insufficient_evidence"
    sign = np.sign(res["slope_per_decade"])
    ci_excl = res["ci_low_per_decade"] > 0 or res["ci_high_per_decade"] < 0
    if p_bh < BH_Q and ci_excl and sign != 0 and all(s == sign for s in sens_signs):
        return "supported_increase" if sign > 0 else "supported_decrease"
    if np.isfinite(mdt) and mdt <= 2 * abs(res["slope_per_decade"]):
        return "no_robust_trend"
    return "insufficient_evidence"


def git_rev() -> str:
    try:
        rev = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ROOT, text=True).strip()
        dirty = subprocess.call(["git", "diff", "--quiet", "--", "scripts", "packages"], cwd=ROOT) != 0
        untracked = subprocess.check_output(
            ["git", "ls-files", "--others", "--exclude-standard", "scripts", "packages"], cwd=ROOT, text=True
        ).strip()
        return rev + ("+uncommitted" if dirty or untracked else "")
    except Exception:
        return "unknown"


def sha(p: Path) -> str:
    return hashlib.sha256(p.read_bytes()).hexdigest()


# ----------------------------------------------------------------------------- plots (plain SVG)
def svg_panel(x, y, complete, slope_dec, intercept, title, ylabel, w=300, h=190):
    pl, pr, pt, pb = 46, 10, 30, 30
    xs = np.asarray(x, float)
    ys = np.asarray(y, float)
    ok = np.isfinite(ys)
    lo, hi = float(np.nanmin(ys)), float(np.nanmax(ys))
    pad = (hi - lo) * 0.12 or 1
    lo = max(lo - pad, 0.0) if np.nanmin(ys) >= 0 else lo - pad  # counts and speeds never below 0
    hi = hi + pad
    fx = lambda v: pl + (v - xs.min()) / (xs.max() - xs.min()) * (w - pl - pr)  # noqa: E731
    fy = lambda v: pt + (hi - v) / (hi - lo) * (h - pt - pb)  # noqa: E731
    head, _, sub = title.partition(" · ")
    g = [f'<text x="{pl}" y="12" font-size="11" font-weight="600">{head}</text>']
    g.append(f'<text x="{pl}" y="24" font-size="9" fill="#555">{sub + " · " if sub else ""}{ylabel}</text>')
    g.append(f'<line x1="{pl}" y1="{h-pb}" x2="{w-pr}" y2="{h-pb}" stroke="#999"/>')
    g.append(f'<line x1="{pl}" y1="{pt}" x2="{pl}" y2="{h-pb}" stroke="#999"/>')
    for k in range(5):
        v = lo + (hi - lo) * k / 4
        g.append(f'<text x="{pl-4}" y="{fy(v)+3:.1f}" font-size="8" text-anchor="end">{v:.3g}</text>')
    for yr in (2001, 2005, 2010, 2015, 2020, 2025):
        g.append(f'<text x="{fx(yr):.1f}" y="{h-pb+12}" font-size="8" text-anchor="middle">{yr}</text>')
    pts = " ".join(f"{fx(a):.1f},{fy(b):.1f}" for a, b in zip(xs[ok], ys[ok]))
    g.append(f'<polyline points="{pts}" fill="none" stroke="#2b6cb0" stroke-width="1.2"/>')
    for a, b, c in zip(xs, ys, complete):
        if np.isfinite(b):
            fill = "#2b6cb0" if c else "#fff"
            g.append(f'<circle cx="{fx(a):.1f}" cy="{fy(b):.1f}" r="2.4" fill="{fill}" stroke="#2b6cb0"/>')
    y0 = intercept + slope_dec / 10 * xs.min()
    y1 = intercept + slope_dec / 10 * xs.max()
    g.append(
        f'<line x1="{fx(xs.min()):.1f}" y1="{fy(y0):.1f}" x2="{fx(xs.max()):.1f}" y2="{fy(y1):.1f}" '
        'stroke="#c05621" stroke-width="1.5" stroke-dasharray="5 3"/>'
    )
    return g, w, h


def svg_figure(path: Path, panels, caption: str, cols: int = 3):
    import textwrap

    rows = math.ceil(len(panels) / cols)
    pw, ph = 300, 190
    W = pw * cols
    legend = ("Blue: annual values (hollow = incomplete year). Dashed orange: Theil–Sen line. "
              "Source: NASA POWER daily API (CERES SYN1deg Ed4.2; MERRA-2), local solar time.")
    lines = textwrap.wrap(caption, int(W / 5.2)) + textwrap.wrap(legend, int(W / 5.2))
    H = ph * rows + 14 * len(lines) + 12
    body = []
    for i, (g, _, _) in enumerate(panels):
        x, y = (i % cols) * pw, (i // cols) * ph
        body.append(f'<g transform="translate({x},{y})">' + "".join(g) + "</g>")
    cap = "".join(
        f'<text x="8" y="{ph * rows + 14 * (k + 1)}" font-size="9" fill="#333">{ln}</text>' for k, ln in enumerate(lines)
    )
    path.write_text(
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" '
        f'font-family="Helvetica,Arial,sans-serif"><rect width="100%" height="100%" fill="#fff"/>{"".join(body)}{cap}</svg>'
    )


# ----------------------------------------------------------------------------- main
def main() -> None:
    PROC.mkdir(parents=True, exist_ok=True)
    OUT.mkdir(parents=True, exist_ok=True)
    manifest = json.loads(MANIFEST.read_text())
    excluded = {k: v["excluded_source_present"] for k, v in manifest["files"].items() if v["excluded_source_present"]}
    if excluded:
        raise SystemExit(f"Excluded sources found in 2001–2025 requests: {excluded}")

    grids, weights_out = {}, {}
    for key, param in PARAMS.items():
        df, _ = load_param(param)
        df = df[(df.index.year >= YEARS[0]) & (df.index.year <= YEARS[-1])]
        lons = [c[0] for c in df.columns]
        lats = [c[1] for c in df.columns]
        grids[key] = (df, spacing(lons), spacing(lats))

    polys = region_polygons()
    daily = {}
    for rid in REGIONS:
        for key, (df, dlon, dlat) in grids.items():
            w = cell_weights(df.columns, dlon, dlat, polys[rid])
            weights_out.setdefault(rid, {})[key] = {
                "grid_spacing_deg": [dlon, dlat],
                "n_cells_touching": len(w),
                "effective_cells": round(sum(v / math.cos(math.radians(c[1])) for c, v in w.items()), 2),
                "cells": [[c[0], c[1], round(v, 4)] for c, v in sorted(w.items())],
            }
            daily[(rid, key)] = regional_series(df, w)

    rows = []
    for rid in REGIONS:
        for d, sv, wv in zip(daily[(rid, "solar")].index, daily[(rid, "solar")], daily[(rid, "wind")]):
            rows.append({"date": d.date().isoformat(), "region": rid, "solar_kwh_m2_day": sv, "ws50m_m_s": wv})
    pd.DataFrame(rows).to_csv(PROC / "power_regional_daily_2001-2025.csv", index=False, float_format="%.4f")
    (PROC / "region_weights.json").write_text(json.dumps(weights_out, indent=1))

    t = np.array(YEARS, float)
    results, annual_rows, e1_p = {}, [], []
    for rid in REGIONS:
        S, W = daily[(rid, "solar")], daily[(rid, "wind")]
        base = annual_indicators(S, W, 0.20, REF)
        sens = {
            "P10_ref2001-2020": annual_indicators(S, W, 0.10, REF),
            "P30_ref2001-2020": annual_indicators(S, W, 0.30, REF),
            "P20_ref2001-2010": annual_indicators(S, W, 0.20, REF_ALT),
        }
        tau = annual_tau(S, W, REF)
        comp = base["complete"].to_numpy()
        tc = t[comp]
        ann_solar = S.groupby(S.index.year).mean().reindex(YEARS)
        ann_wind = W.groupby(W.index.year).mean().reindex(YEARS)

        def tr(series):
            return T.trend(tc, np.asarray(series, float)[comp]).to_dict()

        e1 = tr(base["joint_low_days"])
        mdt = T.minimum_detectable_trend(tc, base["joint_low_days"].to_numpy()[comp], n_sim=400)
        sens_res = {k: tr(v["joint_low_days"]) for k, v in sens.items()}
        r = {
            "region": REGIONS[rid],
            "n_complete_years": int(comp.sum()),
            "expected_joint_low_days_if_independent": round(0.2 * 0.2 * 365.25, 1),
            "median_joint_low_days": float(np.median(base["joint_low_days"][comp])),
            "E1_joint_low_days_P20": e1,
            "E1_minimum_detectable_trend_per_decade": round(mdt, 3) if np.isfinite(mdt) else None,
            "E1_sensitivity": sens_res,
            "E0_annual_mean_solar": tr(ann_solar),
            "E0_annual_mean_wind": tr(ann_wind),
            "E2_solar_low_days": tr(base["solar_low_days"]),
            "E2_wind_low_days": tr(base["wind_low_days"]),
            "E3_kendall_tau_solar_wind": tr(tau),
            "E3_median_annual_tau": round(float(np.nanmedian(tau)), 3),
            "E4_episodes_ge2d": tr(base["joint_low_episodes_2d"]),
            "E4_max_run": tr(base["joint_low_max_run"]),
        }
        results[rid] = r
        e1_p.append(e1["p"])
        for y in YEARS:
            annual_rows.append(
                {
                    "region": rid,
                    "year": y,
                    "complete": bool(base.loc[y, "complete"]),
                    "valid_days": int(base.loc[y, "valid_days"]),
                    "solar_mean_kwh_m2_day": round(float(ann_solar[y]), 4),
                    "ws50m_mean_m_s": round(float(ann_wind[y]), 4),
                    "joint_low_days_P20": int(base.loc[y, "joint_low_days"]),
                    "solar_low_days_P20": int(base.loc[y, "solar_low_days"]),
                    "wind_low_days_P20": int(base.loc[y, "wind_low_days"]),
                    "joint_low_episodes_ge2d": int(base.loc[y, "joint_low_episodes_2d"]),
                    "joint_low_max_run_days": int(base.loc[y, "joint_low_max_run"]),
                    "kendall_tau_anomalies": round(float(tau[y]), 4),
                    "joint_low_days_P10": int(sens["P10_ref2001-2020"].loc[y, "joint_low_days"]),
                    "joint_low_days_P30": int(sens["P30_ref2001-2020"].loc[y, "joint_low_days"]),
                }
            )

    p_bh = T.benjamini_hochberg(e1_p)
    for (rid, r), pb in zip(results.items(), p_bh):
        r["E1_p_BH"] = round(float(pb), 6)
        signs = [np.sign(r["E1_sensitivity"][k]["slope_per_decade"]) for k in ("P10_ref2001-2020", "P30_ref2001-2020")]
        mdt = r["E1_minimum_detectable_trend_per_decade"]
        r["E1_outcome"] = e1_outcome(
            r["E1_joint_low_days_P20"], pb, signs, r["median_joint_low_days"], r["n_complete_years"],
            mdt if mdt is not None else float("nan"),
        )

    annual = pd.DataFrame(annual_rows)
    annual.to_csv(OUT / "annual_series.csv", index=False)

    # plots
    def fig(col, key, title, ylabel, fname, caption):
        panels = []
        for rid in REGIONS:
            a = annual[annual.region == rid]
            res = results[rid][key]
            g = svg_panel(
                a.year, a[col], a.complete, res["slope_per_decade"], res["intercept"],
                f"{REGIONS[rid]} · {res['slope_per_decade']:+.2f}/decade (p={res['p']:.2f})", ylabel,
            )
            panels.append(g)
        svg_figure(OUT / fname, panels, caption)

    fig("joint_low_days_P20", "E1_joint_low_days_P20", "", "days per year", "e1_joint_low_days.svg",
        "E1 · Annual count of days with BOTH daily insolation and daily mean 50 m wind below their monthly 20th percentile (ref 2001–2020), 2001–2025. p unadjusted; see bundle for BH.")
    fig("solar_mean_kwh_m2_day", "E0_annual_mean_solar", "", "kWh m⁻² day⁻¹", "e0_solar.svg",
        "E0 · Annual mean all-sky surface shortwave downward irradiance (horizontal plane), NASA POWER ALLSKY_SFC_SW_DWN, 1° grid, 2001–2025. Descriptive.")
    fig("ws50m_mean_m_s", "E0_annual_mean_wind", "", "m s⁻¹", "e0_wind.svg",
        "E0 · Annual mean wind speed at 50 m (MERRA-2 via NASA POWER WS50M), 0.5° × 0.625° grid, 2001–2025. Reanalysis, not turbine output. Descriptive.")

    raw_files = sorted(manifest["files"])
    bundle = {
        "bundle_version": "energy_gap/v1",
        "generated_utc": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "status": "EXPLORATORY until reviewed by a second team member (Gate 3)",
        "analysis_spec": {
            "document": "docs/ENERGY_RESEARCH.md §0 (frozen v1, amendments A1–A2)",
            "inputs": {
                "solar": {"product": "NASA POWER ALLSKY_SFC_SW_DWN", "lineage": "CERES SYN1deg Ed4.2 (2001–2025)", "units": UNITS["solar"], "native_grid": "1° × 1°"},
                "wind": {"product": "NASA POWER WS50M", "lineage": "GMAO MERRA-2", "units": UNITS["wind"], "native_grid": "0.5° × 0.625°", "type": "reanalysis"},
                "api": "https://power.larc.nasa.gov/api/temporal/daily/regional (community RE, LST)",
            },
            "period": "2001-01-01/2025-12-31",
            "regions": REGIONS,
            "region_weighting": "cos(lat) × fraction of grid-cell area inside GISCO NUTS 2021 polygon",
            "thresholds": "monthly 20th percentile, reference 2001–2020",
            "sensitivity": ["P10 ref 2001–2020", "P30 ref 2001–2020", "P20 ref 2001–2010"],
            "complete_year": f">= {MIN_COMPLETE_FRAC:.0%} of days with both variables",
            "trend_method": "Theil–Sen (Gilbert 95% CI) + Mann–Kendall (ties-corrected); Hamed–Rao if |lag-1 r| > 1.96/√n",
            "confirmatory_family": f"E1 across 5 regions, Benjamini–Hochberg q = {BH_Q}",
            "outcome_rule": "supported if BH p < 0.10 and CI excludes 0 and same sign at P10 and P30; no_robust_trend if MDT(80% power) <= 2|slope|; else insufficient_evidence",
            "headline_card": "E1 for R0 at P20 (pre-specified)",
            "not_measured": "electricity generation, capacity factor, grid reliability, site suitability, future conditions",
        },
        "results": results,
        "provenance": {
            "raw_manifest": "data/metadata/power_manifest.json",
            "raw_manifest_sha256": sha(MANIFEST),
            "n_raw_files": len(raw_files),
            "api_versions": sorted({v["api_version"] for v in manifest["files"].values()}),
            "sources_seen": sorted({s for v in manifest["files"].values() for s in v["sources"]}),
            "code": {
                "scripts/analyze_energy_gap.py": sha(Path(__file__)),
                "packages/science/trends.py": sha(ROOT / "packages/science/trends.py"),
                "git": git_rev(),
            },
            "boundaries": "apps/web/public/data/spain-admin.json (Eurostat GISCO NUTS 2021 1:1M)",
            "boundaries_sha256": sha(ADMIN),
        },
    }
    (OUT / "analysis_bundle.json").write_text(json.dumps(bundle, indent=1, ensure_ascii=False, default=float))
    print(json.dumps({k: {"E1": v["E1_joint_low_days_P20"]["slope_per_decade"], "p": v["E1_joint_low_days_P20"]["p"], "p_bh": v["E1_p_BH"], "outcome": v["E1_outcome"]} for k, v in results.items()}, indent=1))


if __name__ == "__main__":
    main()
