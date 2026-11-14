#!/usr/bin/env python3
"""Build a compact Spain hydrography GeoJSON for the globe (rivers, reservoirs, lakes).

Sources:
  - Natural Earth 10m + Europe river centre-lines (public domain)
  - Wikidata coordinates + surface area for Spanish reservoirs, lakes and lagoons
  - The existing 8-basin main stems in apps/web/public/data/spain-rivers.geojson

Output: apps/web/public/data/spain-hydrography.geojson
"""
from __future__ import annotations

import io
import json
import math
import zipfile
from pathlib import Path

import geopandas as gpd
import requests
from shapely.geometry import LineString, Point, mapping, shape
from shapely.ops import unary_union

ROOT = Path(__file__).resolve().parents[1]
BOUNDARY = ROOT / "data" / "processed" / "spain" / "spain_boundary_nuts2021_01m.geojson"
EXISTING_RIVERS = ROOT / "apps" / "web" / "public" / "data" / "spain-rivers.geojson"
OUT = ROOT / "apps" / "web" / "public" / "data" / "spain-hydrography.geojson"
NE_DIR = ROOT / "data" / "raw" / "natural_earth"

NE_ZIPS = {
    "rivers": "https://naciscdn.org/naturalearth/10m/physical/ne_10m_rivers_lake_centerlines.zip",
    "rivers_europe": "https://naciscdn.org/naturalearth/10m/physical/ne_10m_rivers_europe.zip",
    "lakes": "https://naciscdn.org/naturalearth/10m/physical/ne_10m_lakes.zip",
}
SPARQL = "https://query.wikidata.org/sparql"
WIKIDATA_CACHE = ROOT / "data" / "raw" / "wikidata_spain_water.json"
UA = {"User-Agent": "NASASpaceAppsSpain/1.0 (Earth System Trend Detective; hydrography layer)"}
SIMPLIFY_DEG = 0.0025
CRS = "EPSG:4326"
KM2 = "http://www.wikidata.org/entity/Q25479711"  # square kilometre (also Q25343)
KM2_ALT = "http://www.wikidata.org/entity/Q25343"
HA = "http://www.wikidata.org/entity/Q35852"
M2 = "http://www.wikidata.org/entity/Q25343"  # wait - Q25343 is km²; m² is Q25327


def log(msg: str) -> None:
    print(msg, flush=True)


def spain_mask():
    if BOUNDARY.exists():
        gdf = gpd.read_file(BOUNDARY).to_crs(CRS)
        return unary_union(gdf.geometry)
    return None


def clip_gdf(gdf: gpd.GeoDataFrame, mask) -> gpd.GeoDataFrame:
    gdf = gdf[gdf.geometry.notna() & ~gdf.geometry.is_empty].copy()
    gdf = gdf.set_crs(CRS, allow_override=True)
    if mask is None:
        return gdf
    try:
        return gpd.clip(gdf, mask)
    except Exception:
        return gdf[gdf.intersects(mask)]


def fetch_zip(url: str, dest_dir: Path) -> Path:
    dest_dir.mkdir(parents=True, exist_ok=True)
    marker = dest_dir / ".downloaded"
    # Always extract; skip download if a shp already exists in dest_dir
    existing = list(dest_dir.glob("*.shp"))
    if existing:
        return existing[0]
    log(f"  GET {url}")
    r = requests.get(url, timeout=120, headers=UA)
    r.raise_for_status()
    with zipfile.ZipFile(io.BytesIO(r.content)) as zf:
        zf.extractall(dest_dir)
    return next(dest_dir.glob("*.shp"))


def load_ne_rivers(mask) -> gpd.GeoDataFrame:
    log("== Natural Earth rivers")
    frames = []
    for key, sub in (("rivers", "rivers_world"), ("rivers_europe", "rivers_europe")):
        shp = fetch_zip(NE_ZIPS[key], NE_DIR / sub)
        gdf = gpd.read_file(shp).to_crs(CRS)
        name = gdf.get("name_es", gdf.get("name")).fillna("")
        if "name" in gdf.columns:
            name = name.mask(name.eq(""), gdf["name"].fillna(""))
        gdf = gdf.assign(name=name.astype(str))
        gdf = gdf[gdf["name"].str.len() > 0][["name", "geometry"]]
        frames.append(gdf)
    rivers = gpd.GeoDataFrame(pd_concat(frames), crs=CRS)
    rivers = clip_gdf(rivers, mask)
    rivers["geometry"] = rivers.geometry.simplify(SIMPLIFY_DEG, preserve_topology=True)
    rivers = rivers[~rivers.geometry.is_empty]
    rivers = rivers.drop_duplicates(subset=["name"])
    log(f"  named rivers in Spain: {len(rivers)}")
    return rivers


def pd_concat(frames):
    import pandas as pd
    return pd.concat(frames, ignore_index=True)


def load_existing_stems(mask) -> gpd.GeoDataFrame:
    if not EXISTING_RIVERS.exists():
        return gpd.GeoDataFrame(columns=["name", "geometry"], geometry="geometry", crs=CRS)
    gdf = gpd.read_file(EXISTING_RIVERS).to_crs(CRS)
    gdf["name"] = gdf.get("river", gdf.get("name")).astype(str)
    return clip_gdf(gdf[["name", "geometry"]], mask)


def circle_polygon(lon: float, lat: float, radius_km: float, n: int = 32):
    """Approximate geodesic circle in WGS84 (equirectangular)."""
    dlat = radius_km / 111.32
    dlon = radius_km / (111.32 * max(0.2, math.cos(math.radians(lat))))
    coords = []
    for i in range(n):
        a = 2 * math.pi * i / n
        coords.append((lon + dlon * math.cos(a), lat + dlat * math.sin(a)))
    coords.append(coords[0])
    return shape({"type": "Polygon", "coordinates": [coords]})


def parse_point(wkt: str) -> tuple[float, float] | None:
    # Point(lon lat)
    wkt = wkt.replace("Point(", "").replace(")", "").strip()
    parts = wkt.split()
    if len(parts) < 2:
        return None
    lon, lat = float(parts[0]), float(parts[1])
    if not (-20 <= lon <= 6 and 27 <= lat <= 45):
        return None
    return lon, lat


def area_to_km2(amount: float | None, unit: str | None) -> float | None:
    if amount is None:
        return None
    unit = unit or ""
    if "Q35852" in unit:  # hectare
        return amount / 100.0
    if "Q25327" in unit:  # square metre
        return amount / 1e6
    if "Q25343" in unit or "Q25479711" in unit:  # km²
        return amount
    # Heuristic when unit is missing
    if amount > 50_000:
        return amount / 1e6  # m²
    if amount > 200:
        return amount / 100.0  # hectares
    return amount  # already km²


def wikidata_water() -> list[dict]:
    log("== Wikidata reservoirs, lakes, lagoons in Spain")
    query = """
    SELECT DISTINCT ?item ?itemLabel ?kind ?coord ?amount ?unit WHERE {
      {
        ?item wdt:P31/wdt:P279* wd:Q131681.
        BIND("reservoir" AS ?kind)
      } UNION {
        ?item wdt:P31/wdt:P279* wd:Q187223.
        BIND("lagoon" AS ?kind)
      } UNION {
        ?item wdt:P31/wdt:P279* wd:Q23397.
        BIND("lake" AS ?kind)
      }
      ?item wdt:P17 wd:Q29.
      ?item wdt:P625 ?coord.
      OPTIONAL {
        ?item p:P2046 [ psv:P2046 [ wikibase:quantityAmount ?amount; wikibase:quantityUnit ?unit ] ].
      }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "es,en". }
    }
    """
    if WIKIDATA_CACHE.exists():
        log(f"  cache {WIKIDATA_CACHE}")
        data = json.loads(WIKIDATA_CACHE.read_text())
    else:
        r = requests.get(SPARQL, params={"query": query, "format": "json"}, headers=UA, timeout=120)
        r.raise_for_status()
        data = r.json()
        WIKIDATA_CACHE.parent.mkdir(parents=True, exist_ok=True)
        WIKIDATA_CACHE.write_text(json.dumps(data), encoding="utf-8")
    rows = []
    seen = set()
    for b in data["results"]["bindings"]:
        name = b["itemLabel"]["value"]
        if name.startswith("Q") and name[1:].isdigit():
            continue
        kind = b["kind"]["value"]
        pt = parse_point(b["coord"]["value"])
        if not pt:
            continue
        key = (kind, name.lower())
        if key in seen:
            continue
        seen.add(key)
        amount = float(b["amount"]["value"]) if "amount" in b else None
        unit = b["unit"]["value"] if "unit" in b else None
        km2 = area_to_km2(amount, unit)
        rows.append({"name": name, "hydro": kind, "lon": pt[0], "lat": pt[1], "area_km2": km2})
    log(f"  unique named water bodies: {len(rows)}")
    return rows


def water_features(rows: list[dict], mask) -> list[dict]:
    feats = []
    for row in rows:
        km2 = row["area_km2"]
        kind = row["hydro"]
        name_l = row["name"].lower()
        if "salina" in name_l or name_l.startswith("ría ") or name_l.startswith("ria "):
            continue
        if "ibón" in name_l or "ibon " in name_l:
            continue
        # Area values on Wikidata are often missing a unit; drop implausible sizes
        # (Mar Menor ~135 km², La Serena ~140 km² are the largest we want).
        if km2 is not None and km2 > 180:
            km2 = None
        if kind == "lake":
            notable = any(
                k in name_l
                for k in ("lago de", "lagos de", "laguna de", "lagunas de", "estany", "albufera", "mar menor", "sanabria", "banyoles", "bañolas", "gallocanta")
            )
            if km2 is None:
                # Without a reported area, keep only named natural lakes (not every "laguna").
                if not name_l.startswith("lago ") and "sanabria" not in name_l and "banyoles" not in name_l and "bañolas" not in name_l:
                    continue
            elif km2 < 0.5 and not notable:
                continue
        if kind == "reservoir" and km2 is not None and km2 < 0.2:
            continue
        if km2 and km2 > 0:
            radius_km = max(0.45, min(8.5, math.sqrt(km2 / math.pi)))
        else:
            radius_km = 1.15 if kind == "reservoir" else 0.8
        geom = circle_polygon(row["lon"], row["lat"], radius_km)
        if mask is not None and not geom.intersects(mask):
            continue
        extra = {}
        if km2:
            extra["area_km2"] = round(km2, 2)
            extra["value"] = round(km2, 2)
            extra["units"] = "km²"
        feats.append(feature(kind, row["name"], geom, extra, row["lon"], row["lat"]))
    return feats


def centroid_lonlat(geom) -> tuple[float, float]:
    c = geom.centroid
    return round(float(c.x), 4), round(float(c.y), 4)


def feature(hydro: str, name: str, geom, extra: dict | None = None, lon: float | None = None, lat: float | None = None) -> dict:
    if geom.geom_type in {"LineString", "MultiLineString"}:
        geom = geom.simplify(SIMPLIFY_DEG, preserve_topology=True)
    if lon is None or lat is None:
        lon, lat = centroid_lonlat(geom)
    props = {
        "kind": "river-line" if hydro == "river" else hydro,
        "hydro": hydro,
        "id": f"{hydro}:{name}".lower().replace(" ", "_")[:80],
        "name": name,
        "latitude": lat,
        "longitude": lon,
    }
    if extra:
        props.update(extra)
    return {"type": "Feature", "properties": props, "geometry": mapping(geom)}


def ne_lake_polygons(mask) -> list[dict]:
    log("== Natural Earth 10m lakes/reservoirs")
    shp = fetch_zip(NE_ZIPS["lakes"], NE_DIR / "lakes")
    gdf = gpd.read_file(shp).to_crs(CRS)
    gdf["name"] = gdf.get("name_es", gdf["name"]).fillna(gdf["name"]).fillna("")
    gdf = clip_gdf(gdf, mask)
    gdf = gdf[gdf["name"].astype(str).str.len() > 0]
    feats = []
    for rec in gdf.itertuples(index=False):
        kind = "reservoir" if str(getattr(rec, "featurecla", "")).lower() == "reservoir" else "lake"
        geom = rec.geometry.simplify(SIMPLIFY_DEG, preserve_topology=True)
        if geom.is_empty:
            continue
        feats.append(feature(kind, str(rec.name), geom))
    log(f"  NE water polygons in Spain: {len(feats)}")
    return feats


def main() -> None:
    mask = spain_mask()
    features: list[dict] = []

    rivers = load_ne_rivers(mask)
    stems = load_existing_stems(mask)
    have = {n.lower() for n in rivers["name"]}
    extra_stems = stems[~stems["name"].str.lower().isin(have)]
    all_rivers = rivers
    if len(extra_stems):
        all_rivers = gpd.GeoDataFrame(pd_concat([rivers, extra_stems]), crs=CRS)
    for rec in all_rivers.itertuples(index=False):
        features.append(feature("river", rec.name, rec.geometry))

    # Prefer real NE polygons over Wikidata circles when names match
    ne_water = ne_lake_polygons(mask)
    ne_names = {f["properties"]["name"].lower() for f in ne_water}
    features.extend(ne_water)

    wd = wikidata_water()
    wd_feats = water_features(wd, mask)
    for f in wd_feats:
        if f["properties"]["name"].lower() in ne_names:
            continue
        features.append(f)

    features = [f for f in features if f.get("geometry") and f["geometry"].get("coordinates")]
    counts = {}
    for f in features:
        counts[f["properties"]["hydro"]] = counts.get(f["properties"]["hydro"], 0) + 1

    fc = {
        "type": "FeatureCollection",
        "name": "Spain rivers, reservoirs and lakes",
        "features": features,
        "properties": {
            "sources": [
                "Natural Earth 10m rivers & lakes (public domain)",
                "Wikidata Spanish reservoirs/lakes/lagoons (CC0)",
                "Eight Spanish hydrographic demarcation main stems",
            ],
            "counts": counts,
            "note": "River lines are Natural Earth centre-lines. Most reservoirs/lakes are Wikidata points buffered to reported (or typical) surface area — schematic at country scale, not cadastral shorelines.",
        },
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(fc, ensure_ascii=False), encoding="utf-8")
    log(f"wrote {OUT}  {OUT.stat().st_size/1024:.0f} KB  {counts}")


if __name__ == "__main__":
    main()
