#!/usr/bin/env python3
"""Download SWOT river/lake features for Spain (SWORD + PLD via Theia WFS, series via Hydrocron).

The SWOT L4 Europe discharge NetCDF is ~7 GB; this script keeps the Spain subset instead:
  1. River reaches (SWORD) and prior lakes (PLD) intersecting Spain.
  2. Hydrocron L2 time series (water-surface elevation, width) for wide rivers and larger lakes.

Requires Earthdata Login (.env or ~/.netrc), same as scripts/download_nasa_data.py.
"""
from __future__ import annotations

import datetime as dt
import json
import os
import time
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "data" / "raw" / "swot"
PROC = ROOT / "data" / "processed" / "spain" / "swot"
BOUNDARY = ROOT / "data" / "processed" / "spain" / "spain_boundary_nuts2021_01m.geojson"

THEIA_WFS = "https://hydroweb.next.theia-land.fr/geoserver/REF_DATA/ows"
HYDROCRON = "https://soto.podaac.earthdatacloud.nasa.gov/hydrocron/v1/timeseries"
# Iberia + Canarias request boxes (clipped to Spain afterwards).
BBOXES = [(-9.6, 35.1, 4.6, 44.0), (-18.5, 27.4, -13.2, 29.6)]
SWOT_START = "2023-03-29T00:00:00Z"
PAGE = 1000
MIN_RIVER_WIDTH_M = 80.0
MIN_LAKE_KM2 = 0.5


def log(msg: str) -> None:
    print(msg, flush=True)


def session() -> requests.Session:
    from dotenv import load_dotenv
    load_dotenv(ROOT / ".env")
    import earthaccess
    user, pw = os.getenv("EARTHDATA_USERNAME"), os.getenv("EARTHDATA_PASSWORD")
    strategy = "environment" if user and pw else "netrc"
    auth = earthaccess.login(strategy=strategy)
    if not auth or not auth.authenticated:
        raise SystemExit("Earthdata Login failed (set EARTHDATA_USERNAME/PASSWORD or ~/.netrc).")
    s = requests.Session()
    token = auth.token["access_token"]
    s.headers["Authorization"] = f"Bearer {token}"
    return s


def wfs_pages(type_name: str) -> list[dict]:
    feats, seen = [], set()
    for west, south, east, north in BBOXES:
        start = 0
        while True:
            bbox = f"{west},{south},{east},{north},EPSG:4326"
            r = requests.get(THEIA_WFS, params={
                "service": "WFS", "version": "2.0.0", "request": "GetFeature",
                "typeName": type_name, "outputFormat": "application/json",
                "bbox": bbox, "count": PAGE, "startIndex": start,
            }, timeout=120)
            r.raise_for_status()
            data = r.json()
            batch = data.get("features") or []
            for f in batch:
                fid = str((f.get("properties") or {}).get("fid") or (f.get("properties") or {}).get("reach_id")
                          or f.get("id"))
                if fid in seen:
                    continue
                seen.add(fid)
                feats.append(f)
            log(f"  {type_name} bbox {west},{south} -> {len(feats)} unique (page {start})")
            if len(batch) < PAGE:
                break
            start += PAGE
            time.sleep(0.3)
    return feats


def clip_to_spain(features: list[dict], id_field: str):
    import geopandas as gpd
    from shapely.geometry import shape
    from shapely.validation import make_valid
    spain = make_valid(gpd.read_file(BOUNDARY).to_crs("EPSG:4326").union_all())
    rows = []
    for f in features:
        geom = f.get("geometry")
        if not geom:
            continue
        g = make_valid(shape(geom))
        if g.is_empty:
            continue
        try:
            if not g.intersects(spain):
                continue
            clipped = g.intersection(spain)
        except Exception:  # noqa: BLE001 - skip one bad geometry
            continue
        if clipped.is_empty:
            continue
        props = dict(f.get("properties") or {})
        props["geometry"] = clipped
        rows.append(props)
    if not rows:
        return gpd.GeoDataFrame(columns=[id_field, "geometry"], crs="EPSG:4326")
    return gpd.GeoDataFrame(rows, geometry="geometry", crs="EPSG:4326")


def hydrocron(s: requests.Session, feature: str, feature_id: str, fields: str, end: str) -> list[dict]:
    import csv
    import io
    params = {
        "feature": feature, "feature_id": str(feature_id), "output": "csv",
        "start_time": SWOT_START, "end_time": end, "fields": fields,
    }
    r = s.get(HYDROCRON, params=params, timeout=120)
    if r.status_code in (400, 404):
        return []
    r.raise_for_status()
    body = r.json()
    csv_text = (body.get("results") or {}).get("csv") or ""
    if not csv_text.strip():
        return []
    rows = list(csv.DictReader(io.StringIO(csv_text)))
    for p in rows:
        p["feature"] = feature
        p["feature_id"] = str(feature_id)
    return rows


def main() -> None:
    if not BOUNDARY.exists():
        raise SystemExit(f"Missing {BOUNDARY}; run scripts/download_nasa_data.py first.")
    RAW.mkdir(parents=True, exist_ok=True)
    PROC.mkdir(parents=True, exist_ok=True)
    end = dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT00:00:00Z")

    import geopandas as gpd
    reach_path, lake_path = PROC / "sword_reaches_spain.geojson", PROC / "pld_lakes_spain.geojson"
    if reach_path.exists() and lake_path.exists():
        log("== using existing SWORD/PLD GeoJSON")
        reaches = gpd.read_file(reach_path)
        lakes = gpd.read_file(lake_path)
    else:
        log("== SWORD river reaches (Theia WFS)")
        reaches = clip_to_spain(wfs_pages("swot_prior_river_db"), "reach_id")
        log(f"  in Spain: {len(reaches)}")
        log("== PLD lakes (Theia WFS)")
        lakes = clip_to_spain(wfs_pages("swot_prior_lake_db"), "fid")
        log(f"  in Spain: {len(lakes)}")
        reaches.to_file(reach_path, driver="GeoJSON")
        lakes.to_file(lake_path, driver="GeoJSON")
    if "lake_id" not in lakes.columns and "fid" in lakes.columns:
        lakes["lake_id"] = lakes["fid"]
    (RAW / "wfs_meta.json").write_text(json.dumps({
        "source": THEIA_WFS, "clipped_to": str(BOUNDARY.relative_to(ROOT)),
        "n_reaches": int(len(reaches)), "n_lakes": int(len(lakes)),
        "retrieved_at": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"),
    }, indent=2) + "\n")

    wide = reaches
    if "p_width" in wide.columns:
        wide = wide[wide["p_width"].fillna(0) >= MIN_RIVER_WIDTH_M]
    big_lakes = lakes
    if "p_ref_area" in big_lakes.columns:
        big_lakes = big_lakes[big_lakes["p_ref_area"].fillna(0) >= MIN_LAKE_KM2]
    log(f"== Hydrocron series: {len(wide)} reaches (width>={MIN_RIVER_WIDTH_M} m), "
        f"{len(big_lakes)} lakes (area>={MIN_LAKE_KM2} km2)")

    s = session()
    reach_rows, lake_rows = [], []
    for i, rec in enumerate(wide.itertuples(index=False), 1):
        rid = str(getattr(rec, "reach_id"))
        try:
            reach_rows.extend(hydrocron(s, "Reach", rid, "reach_id,time_str,wse,width,slope", end))
        except Exception as e:  # noqa: BLE001
            log(f"  ! reach {rid}: {e}")
        if i % 25 == 0:
            log(f"  reaches {i}/{len(wide)} rows={len(reach_rows)}")
            time.sleep(0.4)
    for i, rec in enumerate(big_lakes.itertuples(index=False), 1):
        lid = str(getattr(rec, "lake_id"))
        try:
            lake_rows.extend(hydrocron(s, "PriorLake", lid, "lake_id,time_str,wse,area_total", end))
        except Exception as e:  # noqa: BLE001
            log(f"  ! lake {lid}: {e}")
        if i % 25 == 0:
            log(f"  lakes {i}/{len(big_lakes)} rows={len(lake_rows)}")
            time.sleep(0.4)

    import pandas as pd
    rdf = pd.DataFrame(reach_rows)
    ldf = pd.DataFrame(lake_rows)
    if not rdf.empty:
        rdf.to_csv(PROC / "hydrocron_reaches_spain.csv", index=False)
    if not ldf.empty:
        ldf.to_csv(PROC / "hydrocron_lakes_spain.csv", index=False)
    (PROC / "README.md").write_text(
        "# SWOT rivers and lakes in Spain\n\n"
        f"- SWORD reaches: `{len(reaches)}` (`sword_reaches_spain.geojson`)\n"
        f"- PLD lakes: `{len(lakes)}` (`pld_lakes_spain.geojson`)\n"
        f"- Hydrocron river series: `{len(rdf)}` rows, `{rdf['feature_id'].nunique() if not rdf.empty else 0}` reaches "
        f"(width ≥ {MIN_RIVER_WIDTH_M:.0f} m)\n"
        f"- Hydrocron lake series: `{len(ldf)}` rows, `{ldf['feature_id'].nunique() if not ldf.empty else 0}` lakes "
        f"(area ≥ {MIN_LAKE_KM2} km²)\n"
        f"- Period: {SWOT_START[:10]} → {end[:10]} (SWOT science orbit; short for climate trends)\n"
        "- Variables: water-surface elevation (m), river width (m), lake area. Not in-situ discharge.\n"
        "- Source: SWOT L2 HR RiverSP / LakeSP via Hydrocron; SWORD/PLD via Theia WFS. NASA/CNES/CSA.\n"
    )
    log(f"done: reaches series {len(rdf)} rows, lakes series {len(ldf)} rows → {PROC}")


if __name__ == "__main__":
    main()
