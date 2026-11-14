"""Study regions and fractional area weights on regular lat/lon grids.

Regions come from apps/web/public/data/spain-admin.json (Eurostat GISCO NUTS 2021 1:1M:
NUTS-2 CCAA, NUTS-3 grouped to INE provinces). Scope keys match the /explore admin picker:
  "age"            -> R0 Peninsula + Balearics (excludes ES70 Canarias, ES63 Ceuta, ES64 Melilla)
  "ccaa:<NUTS id>" -> Comunidad / Ciudad Autónoma
  "provincia:<INE code>"
Weights = cos(lat) x fraction of the grid cell (centre +/- half spacing) inside the polygon.
"""
from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path

import numpy as np
import shapely
from shapely import make_valid
from shapely.geometry import shape
from shapely.ops import unary_union

ROOT = Path(__file__).resolve().parents[2]
ADMIN = ROOT / "apps/web/public/data/spain-admin.json"
R0_EXCLUDE = {"ES70", "ES63", "ES64"}
R0_LABEL = "Peninsula + Balearics"


def _geom(entry: dict):
    coords = entry["coordinates"]
    coords = json.loads(coords) if isinstance(coords, str) else coords
    return make_valid(shape({"type": "MultiPolygon", "coordinates": coords}))


@lru_cache(maxsize=1)
def scopes() -> dict[str, dict]:
    """scope key -> {"name", "geom"}; coordinates are [lon, lat]."""
    admin = json.loads(ADMIN.read_text())
    out: dict[str, dict] = {}
    ccaa = {c["id"]: _geom(c) for c in admin["ccaa"]}
    out["age"] = {"name": R0_LABEL, "geom": unary_union([g for k, g in ccaa.items() if k not in R0_EXCLUDE])}
    for c in admin["ccaa"]:
        out[f"ccaa:{c['id']}"] = {"name": c["name"], "geom": ccaa[c["id"]]}
    for p in admin["provinces"]:
        out[f"provincia:{p['id']}"] = {"name": p["name"], "geom": _geom(p)}
    return out


def grid_weights(lats: np.ndarray, lons: np.ndarray, geom, dlat: float | None = None, dlon: float | None = None) -> np.ndarray:
    """(n_lat, n_lon) weights: cos(lat) x cell-area fraction inside geom (0 outside)."""
    lats = np.asarray(lats, float)
    lons = np.asarray(lons, float)
    dlat = dlat or float(np.median(np.diff(lats)))
    dlon = dlon or float(np.median(np.diff(lons)))
    w = np.zeros((len(lats), len(lons)))
    minx, miny, maxx, maxy = geom.bounds
    ii = np.where((lats + dlat / 2 >= miny) & (lats - dlat / 2 <= maxy))[0]
    jj = np.where((lons + dlon / 2 >= minx) & (lons - dlon / 2 <= maxx))[0]
    if len(ii) == 0 or len(jj) == 0:
        return w
    LA, LO = np.meshgrid(lats[ii], lons[jj], indexing="ij")
    boxes = shapely.box(LO - dlon / 2, LA - dlat / 2, LO + dlon / 2, LA + dlat / 2)
    shapely.prepare(geom)
    frac = shapely.area(shapely.intersection(boxes, geom)) / (dlat * dlon)
    w[np.ix_(ii, jj)] = frac * np.cos(np.radians(LA))
    return w


def weighted_mean(field: np.ndarray, w: np.ndarray, min_cover: float = 0.95) -> np.ndarray:
    """Weighted mean over the last two axes; NaN where < min_cover of the weight has data."""
    f = np.asarray(field, float)
    valid = np.isfinite(f)
    num = np.nansum(np.where(valid, f, 0.0) * w, axis=(-2, -1))
    den = np.sum(valid * w, axis=(-2, -1))
    out = num / np.where(den > 0, den, np.nan)
    return np.where(den >= min_cover * w.sum(), out, np.nan)
