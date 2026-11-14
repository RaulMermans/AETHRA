"""Build the lightweight Spain outline files used by the web globe (apps/web/public/data/).

Source: data/processed/spain/spain_boundary_nuts2021_01m.geojson, produced by
download_nasa_data.py from Eurostat GISCO NUTS 2021 level 2, 1:1M, EPSG:4326 (country ES:
mainland, Balearic and Canary Islands, Ceuta, Melilla).

Steps: dissolve the NUTS-2 regions into one country shape, simplify (topology-preserving,
~300 m tolerance) and drop islets smaller than MIN_AREA_KM2 so the globe clipping stays cheap.
Ceuta (~19 km²), Melilla (~12 km²) and every inhabited Canary/Balearic island are kept.

Usage:  python scripts/build_web_boundary.py      (needs shapely)
"""

import json
import math
from pathlib import Path

from shapely.geometry import MultiPolygon, mapping, shape
from shapely.ops import unary_union

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "data/processed/spain/spain_boundary_nuts2021_01m.geojson"
OUT = ROOT / "apps/web/public/data/spain-boundary.geojson"  # polygons: globe clipping
OUT_LINES = ROOT / "apps/web/public/data/spain-outline.geojson"  # same rings as lines: outline layer

TOLERANCE_DEG = 0.003  # ≈ 300 m
MIN_AREA_KM2 = 5.0
KM_PER_DEG = 111.32


def area_km2(poly) -> float:
    lat = math.radians(poly.centroid.y)
    return poly.area * KM_PER_DEG**2 * math.cos(lat)


def main() -> None:
    src = json.loads(SRC.read_text())
    country = unary_union([shape(f["geometry"]) for f in src["features"]])
    parts = list(country.geoms) if isinstance(country, MultiPolygon) else [country]
    kept = [p.simplify(TOLERANCE_DEG, preserve_topology=True) for p in parts if area_km2(p) >= MIN_AREA_KM2]
    # Exterior rings only: interior holes in Spain's land shape are artefacts at this scale.
    kept = [type(p)(p.exterior) for p in kept]
    geom = MultiPolygon(kept)

    def rounded(coords):
        return [[round(x, 4), round(y, 4)] for x, y in coords]

    feature = {
        "type": "Feature",
        "properties": {
            "name": "España",
            "source": "Eurostat GISCO NUTS 2021 (1:1M), country ES, dissolved",
            "processing": f"simplified {TOLERANCE_DEG}°, islets < {MIN_AREA_KM2} km² dropped",
        },
        "geometry": {
            "type": "MultiPolygon",
            "coordinates": [[rounded(p.exterior.coords)] for p in geom.geoms],
        },
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({"type": "FeatureCollection", "features": [feature]}, separators=(",", ":")))
    lines = {**feature, "geometry": {"type": "MultiLineString",
                                      "coordinates": [poly[0] for poly in feature["geometry"]["coordinates"]]}}
    OUT_LINES.write_text(json.dumps({"type": "FeatureCollection", "features": [lines]}, separators=(",", ":")))
    n_vertices = sum(len(p.exterior.coords) for p in geom.geoms)
    print(f"{OUT.relative_to(ROOT)}: {len(geom.geoms)} polygons, {n_vertices} vertices, "
          f"{OUT.stat().st_size / 1024:.0f} KiB")
    for p in sorted(geom.geoms, key=area_km2, reverse=True):
        print(f"  {area_km2(p):9.0f} km²  at {p.centroid.y:.2f}, {p.centroid.x:.2f}")


if __name__ == "__main__":
    main()
