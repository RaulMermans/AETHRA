#!/usr/bin/env python3
"""Snapshot a curated set of NASA GIBS WMTS layers (EPSG:3857, "best") for the globe.

GIBS imagery is a VISUALIZATION source: rendered colours, not analysis data. Nothing in this
project derives a value or a trend from GIBS tiles; analysis datasets stay in the pipeline.

Why a snapshot: the WMTS GetCapabilities document is ~6 MB (too heavy for the browser),
DescribeDomains is not served, and GIBS returns HTTP 200 (blank tile) for dates outside a
layer's domain. So the identifiers, tile matrix set, formats, legends and the time-domain
intervals are read from GetCapabilities here and written to a small JSON. The UI only offers
dates inside those intervals and states the snapshot date. Re-run to refresh.

Output: apps/web/public/data/geo/gibs-layers.json
Docs: https://nasa-gibs.github.io/gibs-api-docs/
"""

from __future__ import annotations

import argparse
import json
import re
import urllib.request
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "apps" / "web" / "public" / "data" / "geo" / "gibs-layers.json"
CAPABILITIES_URL = "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/1.0.0/WMTSCapabilities.xml"
NS = {
    "wmts": "http://www.opengis.net/wmts/1.0",
    "ows": "http://www.opengis.net/ows/1.1",
    "xlink": "http://www.w3.org/1999/xlink",
}
LEGEND_ROLE_H = "http://earthdata.nasa.gov/gibs/legend-type/horizontal"
TILE_MATRIX_LEVEL = re.compile(r"_Level(\d+)$")
# Only the most recent intervals are kept: enough for a date picker, small enough to ship.
MAX_INTERVALS = 40


@dataclass(frozen=True)
class Curated:
    """A GIBS layer we expose, with the context the capabilities do not state."""

    id: str
    category: str
    product: str  # what the visualization shows, as stated by the GIBS layer title
    units: str | None
    note: str


CURATED: tuple[Curated, ...] = (
    Curated(
        "MODIS_Terra_CorrectedReflectance_TrueColor",
        "surface-imagery",
        "MODIS Terra corrected reflectance, true colour (daily)",
        None,
        "Daily true-colour image. Clouds, swath gaps and polar night are part of the image.",
    ),
    Curated(
        "MODIS_Terra_L3_NDVI_16Day",
        "vegetation",
        "MODIS Terra Level 3 vegetation index, NDVI (16-day composite)",
        "NDVI (unitless)",
        "Rendered colour of a 16-day NDVI composite. Colour is not an NDVI value; see the legend.",
    ),
    Curated(
        "MODIS_Terra_L3_Land_Surface_Temp_8Day_Day",
        "land-surface-temperature",
        "MODIS Terra Level 3 daytime land surface temperature (8-day composite)",
        "K (legend)",
        "Clear-sky skin temperature of the land surface, not 2 m air temperature.",
    ),
)


def text(el: ET.Element | None) -> str | None:
    return el.text.strip() if el is not None and el.text else None


def parse_layer(layer: ET.Element, curated: Curated) -> dict[str, Any]:
    tms = text(layer.find("wmts:TileMatrixSetLink/wmts:TileMatrixSet", NS))
    if tms is None:
        raise ValueError(f"{curated.id}: no TileMatrixSet")
    level = TILE_MATRIX_LEVEL.search(tms)
    if level is None:
        raise ValueError(f"{curated.id}: unexpected tile matrix set {tms}")
    template = next(
        (
            r.get("template")
            for r in layer.findall("wmts:ResourceURL", NS)
            if r.get("resourceType") == "tile" and "{Time}" in (r.get("template") or "")
        ),
        None,
    )
    if template is None:
        raise ValueError(f"{curated.id}: no time-enabled tile template")
    dim = layer.find("wmts:Dimension", NS)
    if dim is None or text(dim.find("ows:Identifier", NS)) != "Time":
        raise ValueError(f"{curated.id}: no Time dimension")
    values = [v.text.strip() for v in dim.findall("wmts:Value", NS) if v.text]
    intervals = []
    for v in values:
        start, end, period = v.split("/")
        intervals.append({"start": start[:10], "end": end[:10], "period": period})
    legend = next(
        (
            lg.get(f"{{{NS['xlink']}}}href")
            for lg in layer.findall("wmts:Style/wmts:LegendURL", NS)
            if lg.get(f"{{{NS['xlink']}}}role") == LEGEND_ROLE_H
        ),
        None,
    )
    return {
        "id": curated.id,
        "title": text(layer.find("ows:Title", NS)),
        "category": curated.category,
        "product": curated.product,
        "units": curated.units,
        "note": curated.note,
        "tileMatrixSet": tms,
        "maximumLevel": int(level.group(1)),
        "format": text(layer.find("wmts:Format", NS)),
        "urlTemplate": template,
        "legendUrl": legend,
        "defaultDate": text(dim.find("wmts:Default", NS)),
        "intervals": intervals[-MAX_INTERVALS:],
        "intervalsTotal": len(intervals),
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--capabilities", type=Path, help="read a saved WMTSCapabilities.xml instead of fetching")
    args = parser.parse_args()
    if args.capabilities:
        xml = args.capabilities.read_bytes()
    else:
        with urllib.request.urlopen(CAPABILITIES_URL, timeout=120) as resp:
            xml = resp.read()
    root = ET.fromstring(xml)
    by_id = {text(lyr.find("ows:Identifier", NS)): lyr for lyr in root.iter(f"{{{NS['wmts']}}}Layer")}
    layers = []
    for c in CURATED:
        layer = by_id.get(c.id)
        if layer is None:
            print(f"GIBS layer not in capabilities: {c.id}")
            return 1
        layers.append(parse_layer(layer, c))
    payload = {
        "schema_version": 1,
        "role": "visualization only (rendered imagery); never an analysis input",
        "capturedAt": datetime.now(UTC).strftime("%Y-%m-%dT%H:%MZ"),
        "capabilitiesUrl": CAPABILITIES_URL,
        "projection": "EPSG:3857 (GoogleMapsCompatible tile matrix sets)",
        "attribution": "NASA EOSDIS Global Imagery Browse Services (GIBS)",
        "docs": "https://nasa-gibs.github.io/gibs-api-docs/available-visualizations/",
        "layers": layers,
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"wrote {OUT.relative_to(ROOT)} ({len(layers)} layers)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
