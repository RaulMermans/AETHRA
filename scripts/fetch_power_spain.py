#!/usr/bin/env python3
"""Download NASA POWER daily regional data for Spain (Gate B, docs/ENERGY_RESEARCH.md §0).

One request per parameter x year x tile (API limit: 10 degrees of longitude).
Raw responses are stored unchanged (gzip) in data/raw/power/<PARAM>/<year>_<tile>.json.gz.
data/metadata/power_manifest.json records, per file: request URL, retrieval time (UTC),
API version, the `sources` the API reports for that request, SHA-256 of the uncompressed bytes,
grid size and fill-value count.

Usage:  .venv/bin/python scripts/fetch_power_spain.py [--start 2001 --end 2025]
Re-running skips files already on disk whose checksum matches the manifest.
"""
from __future__ import annotations

import argparse
import gzip
import hashlib
import json
import time
from datetime import datetime, timezone
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "data/raw/power"
MANIFEST = ROOT / "data/metadata/power_manifest.json"
API = "https://power.larc.nasa.gov/api/temporal/daily/regional"
PARAMS = ["ALLSKY_SFC_SW_DWN", "WS50M"]
TILES = {  # frozen in ENERGY_RESEARCH.md §0
    "west": {"longitude-min": -9.5, "longitude-max": 0.0},
    "east": {"longitude-min": 0.0, "longitude-max": 4.5},
}
LAT = {"latitude-min": 35.5, "latitude-max": 44.0}
EXCLUDED_SOURCES = {"FLASHFLUX", "GEOSIT", "SRB"}  # not climate-quality / pre-2001 lineage


def build_url(param: str, year: int, tile: str) -> str:
    q = {
        "parameters": param,
        "community": "RE",
        **LAT,
        **TILES[tile],
        "start": f"{year}0101",
        "end": f"{year}1231",
        "format": "JSON",
        "time-standard": "LST",
    }
    return API + "?" + "&".join(f"{k}={v}" for k, v in q.items())


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--start", type=int, default=2001)
    ap.add_argument("--end", type=int, default=2025)
    args = ap.parse_args()

    manifest = json.loads(MANIFEST.read_text(encoding="utf-8")) if MANIFEST.exists() else {"files": {}}
    manifest["description"] = (
        "NASA POWER daily regional downloads for docs/ENERGY_RESEARCH.md (Gate B). "
        "sha256 is of the uncompressed API response."
    )
    session = requests.Session()
    for param in PARAMS:
        for year in range(args.start, args.end + 1):
            for tile in TILES:
                rel = f"data/raw/power/{param}/{year}_{tile}.json.gz"
                path = ROOT / rel
                entry = manifest["files"].get(rel)
                if path.exists() and entry:
                    if hashlib.sha256(gzip.decompress(path.read_bytes())).hexdigest() == entry["sha256"]:
                        continue
                url = build_url(param, year, tile)
                for attempt in range(4):
                    r = session.get(url, timeout=300)
                    if r.status_code == 200:
                        break
                    time.sleep(5 * (attempt + 1))
                r.raise_for_status()
                body = r.content
                d = json.loads(body)
                fill = d["header"]["fill_value"]
                n_fill = sum(
                    1
                    for f in d["features"]
                    for v in f["properties"]["parameter"][param].values()
                    if v == fill
                )
                sources = d["header"]["sources"]
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_bytes(gzip.compress(body, mtime=0))
                manifest["files"][rel] = {
                    "url": url,
                    "retrieved_utc": datetime.now(timezone.utc).isoformat(timespec="seconds"),
                    "api_version": d["header"]["api"]["version"],
                    "sources": sources,
                    "excluded_source_present": sorted(set(sources) & EXCLUDED_SOURCES),
                    "units": d["parameters"][param]["units"],
                    "time_standard": d["header"]["time_standard"],
                    "n_points": len(d["features"]),
                    "n_fill_values": n_fill,
                    "sha256": hashlib.sha256(body).hexdigest(),
                }
                print(f"{rel}: {len(d['features'])} pts, sources={sources}, fill={n_fill}")
                MANIFEST.write_text(json.dumps(manifest, indent=1, sort_keys=True), encoding="utf-8", newline="\n")
                time.sleep(0.5)
    MANIFEST.write_text(json.dumps(manifest, indent=1, sort_keys=True), encoding="utf-8", newline="\n")
    bad = {k: v["excluded_source_present"] for k, v in manifest["files"].items() if v["excluded_source_present"]}
    print("files with excluded sources:", bad or "none")


if __name__ == "__main__":
    main()
