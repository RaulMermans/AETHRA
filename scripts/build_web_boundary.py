"""Build the lightweight Spain shapes used by the web globe (apps/web/public/data/).

Sources
- Land: data/processed/spain/spain_boundary_nuts2021_01m.geojson, produced by
  download_nasa_data.py from Eurostat GISCO NUTS 2021 level 2, 1:1M, EPSG:4326 (country ES:
  mainland, Balearic and Canary Islands, Ceuta, Melilla).
- Neighbour land: Eurostat GISCO Countries 2020, 1:3M, EPSG:4326 (downloaded to
  data/raw/boundary/ if missing). Used to remove neighbours' land from the sea band.

Outputs
- spain-boundary.geojson  Spain land (polygons), simplified ~300 m, islets < 5 km² dropped.
- spain-outline.geojson   Same rings as lines (coastline/border layer on the globe).
- spain-render-area.geojson  Land + a 200 nautical-mile (≈370 km) sea band around every Spanish
  coast (including small islets), minus the land of every other country. This is what the globe renders and where clicks are accepted.
  VISUAL context only: a plain buffer from the coastline, roughly EEZ-sized, but NOT the official
  EEZ — it ignores baselines and median lines, so it overlaps neighbours' waters.

Usage:  python scripts/build_web_boundary.py      (needs shapely, pyproj)
"""

import json
import math
import urllib.request
from pathlib import Path

import numpy as np
import shapely
from pyproj import Transformer
from shapely.geometry import MultiPolygon, Polygon, shape
from shapely.ops import unary_union

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "data/processed/spain/spain_boundary_nuts2021_01m.geojson"
COUNTRIES = ROOT / "data/raw/boundary/CNTR_RG_03M_2020_4326.geojson"
COUNTRIES_URL = ("https://gisco-services.ec.europa.eu/distribution/v2/countries/geojson/"
                 "CNTR_RG_03M_2020_4326.geojson")
OUT_DIR = ROOT / "apps/web/public/data"

TOLERANCE_DEG = 0.003  # ≈ 300 m
MIN_AREA_KM2 = 5.0
SEA_BAND_M = 200 * 1852  # 200 nautical miles (≈370 km): wide sea context around Spain
KM_PER_DEG = 111.32


def area_km2(poly) -> float:
    return poly.area * KM_PER_DEG**2 * math.cos(math.radians(poly.centroid.y))


def parts(geom) -> list[Polygon]:
    return list(geom.geoms) if isinstance(geom, MultiPolygon) else [geom]


def buffer_metres(poly: Polygon, metres: float) -> Polygon:
    """Buffer in a local azimuthal equidistant projection centred on the polygon."""
    c = poly.centroid
    aeqd = f"+proj=aeqd +lat_0={c.y} +lon_0={c.x} +datum=WGS84 +units=m"
    fwd = Transformer.from_crs("EPSG:4326", aeqd, always_xy=True)
    inv = Transformer.from_crs(aeqd, "EPSG:4326", always_xy=True)
    project = lambda t: (lambda c: np.column_stack(t.transform(c[:, 0], c[:, 1])))  # noqa: E731
    return shapely.transform(shapely.transform(poly, project(fwd)).buffer(metres, 32), project(inv))


def outer(polys, min_km2=0.0) -> list[Polygon]:
    """Simplified exterior rings (interior holes are artefacts at this scale)."""
    out = []
    for p in polys:
        if area_km2(p) < min_km2:
            continue
        s = p.simplify(TOLERANCE_DEG, preserve_topology=True)
        for q in parts(s):
            out.append(Polygon(q.exterior))
    return out


def rings(polys) -> list:
    return [[[round(x, 4), round(y, 4)] for x, y in p.exterior.coords] for p in polys]


def write(name: str, geometry: dict, props: dict) -> None:
    fc = {"type": "FeatureCollection", "features": [{"type": "Feature", "properties": props, "geometry": geometry}]}
    path = OUT_DIR / name
    path.write_text(json.dumps(fc, separators=(",", ":")), encoding="utf-8", newline="\n")
    print(f"{path.relative_to(ROOT)}: {path.stat().st_size / 1024:.0f} KiB")


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    src = json.loads(SRC.read_text(encoding="utf-8"))
    land = unary_union([shape(f["geometry"]) for f in src["features"]])

    # 1. Land
    land_polys = outer(parts(land), MIN_AREA_KM2)
    source = "Eurostat GISCO NUTS 2021 (1:1M), country ES, dissolved"
    processing = f"simplified {TOLERANCE_DEG}°, islets < {MIN_AREA_KM2} km² dropped"
    write("spain-boundary.geojson", {"type": "MultiPolygon", "coordinates": [[r] for r in rings(land_polys)]},
          {"name": "España", "source": source, "processing": processing})
    write("spain-outline.geojson", {"type": "MultiLineString", "coordinates": rings(land_polys)},
          {"name": "España", "source": source, "processing": processing})

    # 2. Land + sea band, minus every other country's land
    if not COUNTRIES.exists():
        COUNTRIES.parent.mkdir(parents=True, exist_ok=True)
        print(f"Downloading {COUNTRIES_URL}")
        urllib.request.urlretrieve(COUNTRIES_URL, COUNTRIES)
    countries = json.loads(COUNTRIES.read_text(encoding="utf-8"))
    neighbours = unary_union([shape(f["geometry"]) for f in countries["features"]
                              if f["properties"]["CNTR_ID"] != "ES"])
    band = unary_union([buffer_metres(p, SEA_BAND_M) for p in parts(land)])
    area = unary_union([band, land]).difference(neighbours)
    area_polys = outer(parts(area), 1.0)
    write("spain-render-area.geojson", {"type": "MultiPolygon", "coordinates": [[r] for r in rings(area_polys)]},
          {"name": "España + mar (contexto visual)", "source": source + "; neighbours: GISCO Countries 2020 (1:3M)",
           "processing": f"{SEA_BAND_M / 1852:.0f} nm buffer from coastline (visual context, not the official EEZ), "
                         f"other countries' land removed, simplified {TOLERANCE_DEG}°"})
    print(f"  render area: {len(area_polys)} polygons, {sum(len(p.exterior.coords) for p in area_polys)} vertices")
    for p in sorted(area_polys, key=area_km2, reverse=True):
        w, s, e, n = p.bounds
        print(f"  {area_km2(p):9.0f} km²  bbox {w:.2f},{s:.2f},{e:.2f},{n:.2f}")


if __name__ == "__main__":
    main()
