"""Build administrative hierarchy and boundaries for Spain (AGE, CCAA, Provincias).

Pure Python implementation (zero external dependencies):
- CCAA: Eurostat GISCO NUTS-2 2021 1:1M (`spain_boundary_nuts2021_01m.geojson`)
- Provinces: Eurostat GISCO NUTS-3 2021 1:1M, grouped to INE provinces (island NUTS-3
  units are unioned for Illes Balears, Las Palmas and Santa Cruz de Tenerife)
- Rings simplified with Ramer-Douglas-Peucker
- Outputs apps/web/public/data/spain-admin.json
"""

from __future__ import annotations

import json
import math
import re
import unicodedata
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
NUTS2_SRC = ROOT / "data/processed/spain/spain_boundary_nuts2021_01m.geojson"
NUTS3_URL = (
    "https://gisco-services.ec.europa.eu/distribution/v2/nuts/geojson/"
    "NUTS_RG_01M_2021_4326_LEVL_3.geojson"
)
NUTS3_RAW = ROOT / "data/raw/boundary/NUTS_RG_01M_2021_4326_LEVL_3.geojson"
NUTS3_PROC = ROOT / "data/processed/spain/spain_nuts3_2021_01m.geojson"
OUT_PATH = ROOT / "apps/web/public/data/spain-admin.json"

TOLERANCE_DEG = 0.005
MIN_RING_AREA_DEG2 = 0.0004

Ring = list[list[float]]


def slugify(text: str) -> str:
    s = unicodedata.normalize("NFD", text)
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    s = re.sub(r"[^a-zA-Z0-9]+", "-", s.lower()).strip("-")
    return s


def ring_signed_area(ring: Ring) -> float:
    if len(ring) < 3:
        return 0.0
    area = 0.0
    for i in range(len(ring) - 1):
        x1, y1 = ring[i]
        x2, y2 = ring[i + 1]
        area += x1 * y2 - x2 * y1
    return 0.5 * area


def ring_area(ring: Ring) -> float:
    return abs(ring_signed_area(ring))


def ring_centroid(ring: Ring) -> tuple[float, float]:
    if not ring:
        return (0.0, 0.0)
    xs = [p[0] for p in ring]
    ys = [p[1] for p in ring]
    return (sum(xs) / len(xs), sum(ys) / len(ys))


def rdp_open(pts: Ring, eps: float) -> Ring:
    """Iterative Ramer-Douglas-Peucker simplification on an open polyline."""
    n = len(pts)
    if n <= 2:
        return pts
    keep = [False] * n
    keep[0] = True
    keep[n - 1] = True
    stack = [(0, n - 1)]
    eps2 = eps * eps
    while stack:
        i, j = stack.pop()
        if j - i <= 1:
            continue
        x1, y1 = pts[i]
        x2, y2 = pts[j]
        dx = x2 - x1
        dy = y2 - y1
        denom = dx * dx + dy * dy
        max_d2 = -1.0
        max_k = i
        for k in range(i + 1, j):
            px, py = pts[k]
            if denom == 0.0:
                d2 = (px - x1) ** 2 + (py - y1) ** 2
            else:
                t = max(0.0, min(1.0, ((px - x1) * dx + (py - y1) * dy) / denom))
                proj_x = x1 + t * dx
                proj_y = y1 + t * dy
                d2 = (px - proj_x) ** 2 + (py - proj_y) ** 2
            if d2 > max_d2:
                max_d2 = d2
                max_k = k
        if max_d2 > eps2:
            keep[max_k] = True
            stack.append((i, max_k))
            stack.append((max_k, j))
    return [pts[idx] for idx in range(n) if keep[idx]]


def simplify_ring(ring: Ring, eps: float = TOLERANCE_DEG) -> Ring:
    if len(ring) < 6:
        return [[round(x, 4), round(y, 4)] for x, y in ring]
    closed = ring[0] == ring[-1]
    pts = ring[:-1] if closed else ring[:]
    mid = len(pts) // 2
    first_half = rdp_open(pts[: mid + 1], eps)
    second_half = rdp_open(pts[mid:] + [pts[0]], eps)
    merged = first_half[:-1] + second_half
    if merged[0] != merged[-1]:
        merged.append(merged[0])
    return [[round(x, 4), round(y, 4)] for x, y in merged]


def extract_outer_rings(geom: dict, min_area: float = MIN_RING_AREA_DEG2) -> list[Ring]:
    gtype = geom["type"]
    raw_polys = [geom["coordinates"]] if gtype == "Polygon" else geom["coordinates"]
    rings: list[Ring] = []
    for poly in raw_polys:
        outer = poly[0]
        if ring_area(outer) >= min_area:
            s = simplify_ring(outer)
            if len(s) >= 4 and ring_area(s) >= min_area * 0.5:
                rings.append(s)
    if not rings and raw_polys:
        biggest = max((p[0] for p in raw_polys), key=ring_area)
        rings.append(simplify_ring(biggest))
    rings.sort(key=ring_area, reverse=True)
    return rings


def rings_bbox_and_center(rings: list[Ring]) -> tuple[list[float], list[float]]:
    xs = [pt[0] for r in rings for pt in r]
    ys = [pt[1] for r in rings for pt in r]
    w, s, e, n = min(xs), min(ys), max(xs), max(ys)
    # Area-weighted centroid of largest ring
    cx, cy = ring_centroid(rings[0])
    return [round(w, 4), round(s, 4), round(e, 4), round(n, 4)], [round(cy, 4), round(cx, 4)]


def compute_view_range(bbox: list[float], min_range: int = 90_000, max_range: int = 950_000) -> int:
    w, s, e, n = bbox
    lat_span = max(0.15, n - s)
    lon_span = max(0.15, (e - w) * math.cos(math.radians((n + s) / 2.0)))
    span_km = max(lat_span, lon_span) * 111.32
    return int(max(min_range, min(max_range, round(span_km * 1450, -3))))


CCAA_META: dict[str, dict[str, str]] = {
    "ES61": {
        "name": "Andalucía",
        "institution": "Junta de Andalucía · Consejería de Sostenibilidad y Medio Ambiente",
    },
    "ES24": {
        "name": "Aragón",
        "institution": "Gobierno de Aragón · Departamento de Medio Ambiente y Turismo",
    },
    "ES12": {
        "name": "Principado de Asturias",
        "institution": "Gobierno del Principado de Asturias · Transición Ecológica",
    },
    "ES53": {
        "name": "Illes Balears",
        "institution": "Govern de les Illes Balears · Conselleria de la Mar i del Cicle de l'Aigua",
    },
    "ES70": {
        "name": "Canarias",
        "institution": "Gobierno de Canarias · Consejería de Transición Ecológica y Energía",
    },
    "ES13": {
        "name": "Cantabria",
        "institution": "Gobierno de Cantabria · Consejería de Fomento y Medio Ambiente",
    },
    "ES41": {
        "name": "Castilla y León",
        "institution": "Junta de Castilla y León · Consejería de Medio Ambiente, Vivienda y Ordenación",
    },
    "ES42": {
        "name": "Castilla-La Mancha",
        "institution": "Junta de Comunidades de Castilla-La Mancha · Desarrollo Sostenible",
    },
    "ES51": {
        "name": "Cataluña",
        "institution": "Generalitat de Catalunya · Departament d'Acció Climàtica (ACA / SMC)",
    },
    "ES52": {
        "name": "Comunitat Valenciana",
        "institution": "Generalitat Valenciana · Conselleria de Medio Ambiente, Agua e Infraestructuras",
    },
    "ES43": {
        "name": "Extremadura",
        "institution": "Junta de Extremadura · Consejería de Agricultura, Ganadería y Desarrollo Sostenible",
    },
    "ES11": {
        "name": "Galicia",
        "institution": "Xunta de Galicia · Consellería de Medio Ambiente e Cambio Climático (Augas de Galicia)",
    },
    "ES30": {
        "name": "Comunidad de Madrid",
        "institution": "Comunidad de Madrid · Consejería de Medio Ambiente, Agricultura e Interior",
    },
    "ES62": {
        "name": "Región de Murcia",
        "institution": "Gobierno de la Región de Murcia · Consejería de Medio Ambiente, Agua y Emergencias",
    },
    "ES22": {
        "name": "Comunidad Foral de Navarra",
        "institution": "Gobierno de Navarra · Departamento de Desarrollo Rural y Medio Ambiente",
    },
    "ES21": {
        "name": "País Vasco",
        "institution": "Gobierno Vasco / Eusko Jaurlaritza · Agencia Vasca del Agua (URA)",
    },
    "ES23": {
        "name": "La Rioja",
        "institution": "Gobierno de La Rioja · Consejería de Agricultura, Ganadería, Mundo Rural y Medio Ambiente",
    },
    "ES63": {
        "name": "Ciudad Autónoma de Ceuta",
        "institution": "Ciudad Autónoma de Ceuta · Consejería de Medio Ambiente y Servicios Urbanos",
    },
    "ES64": {
        "name": "Ciudad Autónoma de Melilla",
        "institution": "Ciudad Autónoma de Melilla · Consejería de Medio Ambiente y Naturaleza",
    },
}

# (id, name, ccaa_id, capital, institution, center_lat, center_lon, unused, unused, unused)
# Last three fields are kept so existing rows stay parseable; province rings come from NUTS-3.
PROVINCES_SPEC = [
    # Andalucía (ES61)
    ("04", "Almería", "ES61", "Almería", "Diputación Provincial de Almería", 36.84, -2.46, 37.15, -2.30, 0.02),
    ("11", "Cádiz", "ES61", "Cádiz", "Diputación Provincial de Cádiz", 36.53, -6.29, 36.50, -5.80, -0.02),
    ("14", "Córdoba", "ES61", "Córdoba", "Diputación Provincial de Córdoba", 37.88, -4.78, 38.00, -4.80, 0.05),
    ("18", "Granada", "ES61", "Granada", "Diputación Provincial de Granada", 37.18, -3.60, 37.25, -3.35, 0.04),
    ("21", "Huelva", "ES61", "Huelva", "Diputación Provincial de Huelva", 37.26, -6.95, 37.55, -6.85, 0.02),
    ("23", "Jaén", "ES61", "Jaén", "Diputación Provincial de Jaén", 37.77, -3.79, 38.05, -3.50, 0.04),
    ("29", "Málaga", "ES61", "Málaga", "Diputación Provincial de Málaga", 36.72, -4.42, 36.80, -4.65, -0.03),
    ("41", "Sevilla", "ES61", "Sevilla", "Diputación Provincial de Sevilla", 37.39, -5.98, 37.45, -5.70, 0.06),
    # Aragón (ES24)
    ("22", "Huesca", "ES24", "Huesca", "Diputación Provincial de Huesca", 42.14, -0.41, 42.25, -0.10, 0.05),
    ("44", "Teruel", "ES24", "Teruel", "Diputación Provincial de Teruel", 40.34, -1.11, 40.65, -0.80, 0.04),
    ("50", "Zaragoza", "ES24", "Zaragoza", "Diputación Provincial de Zaragoza", 41.65, -0.89, 41.65, -1.05, 0.08),
    # Principado de Asturias (ES12)
    ("33", "Asturias", "ES12", "Oviedo", "Principado de Asturias (Administración Autonómica / Provincial)", 43.36, -5.85, 43.36, -5.85, 0.0),
    # Illes Balears (ES53)
    ("07", "Illes Balears", "ES53", "Palma", "Consells Insulars (Mallorca, Menorca, Eivissa y Formentera)", 39.57, 2.65, 39.57, 2.65, 0.0),
    # Canarias (ES70)
    ("35", "Las Palmas", "ES70", "Las Palmas de Gran Canaria", "Cabildos Insulares de Gran Canaria, Fuerteventura y Lanzarote", 28.12, -15.43, 28.35, -14.50, 0.0),
    ("38", "Santa Cruz de Tenerife", "ES70", "Santa Cruz de Tenerife", "Cabildos Insulares de Tenerife, La Palma, La Gomera y El Hierro", 28.46, -16.25, 28.35, -16.80, 0.0),
    # Cantabria (ES13)
    ("39", "Cantabria", "ES13", "Santander", "Gobierno de Cantabria (Administración Autonómica / Provincial)", 43.46, -3.80, 43.30, -4.00, 0.0),
    # Castilla y León (ES41)
    ("05", "Ávila", "ES41", "Ávila", "Diputación Provincial de Ávila", 40.66, -4.70, 40.58, -4.85, -0.02),
    ("09", "Burgos", "ES41", "Burgos", "Diputación Provincial de Burgos", 42.34, -3.70, 42.38, -3.55, 0.06),
    ("24", "León", "ES41", "León", "Diputación Provincial de León", 42.60, -5.57, 42.62, -5.85, 0.08),
    ("34", "Palencia", "ES41", "Palencia", "Diputación Provincial de Palencia", 42.01, -4.53, 42.35, -4.55, -0.02),
    ("37", "Salamanca", "ES41", "Salamanca", "Diputación Provincial de Salamanca", 40.97, -5.66, 40.80, -6.00, 0.04),
    ("40", "Segovia", "ES41", "Segovia", "Diputación Provincial de Segovia", 40.95, -4.12, 41.15, -4.05, -0.03),
    ("42", "Soria", "ES41", "Soria", "Diputación Provincial de Soria", 41.76, -2.46, 41.65, -2.55, 0.03),
    ("47", "Valladolid", "ES41", "Valladolid", "Diputación Provincial de Valladolid", 41.65, -4.72, 41.65, -4.85, -0.01),
    ("49", "Zamora", "ES41", "Zamora", "Diputación Provincial de Zamora", 41.50, -5.75, 41.75, -5.95, 0.03),
    # Castilla-La Mancha (ES42)
    ("02", "Albacete", "ES42", "Albacete", "Diputación Provincial de Albacete", 38.99, -1.86, 38.85, -1.95, 0.04),
    ("13", "Ciudad Real", "ES42", "Ciudad Real", "Diputación Provincial de Ciudad Real", 38.99, -3.93, 38.95, -3.85, 0.08),
    ("16", "Cuenca", "ES42", "Cuenca", "Diputación Provincial de Cuenca", 40.07, -2.13, 39.95, -2.20, 0.05),
    ("19", "Guadalajara", "ES42", "Guadalajara", "Diputación Provincial de Guadalajara", 40.63, -3.17, 40.85, -2.55, 0.02),
    ("45", "Toledo", "ES42", "Toledo", "Diputación Provincial de Toledo", 39.86, -4.03, 39.85, -4.20, 0.06),
    # Cataluña (ES51)
    ("08", "Barcelona", "ES51", "Barcelona", "Diputació de Barcelona", 41.39, 2.17, 41.65, 2.00, 0.01),
    ("17", "Girona", "ES51", "Girona", "Diputació de Girona", 41.98, 2.82, 42.10, 2.65, -0.01),
    ("25", "Lleida", "ES51", "Lleida", "Diputació de Lleida", 41.62, 0.62, 42.05, 1.05, 0.06),
    ("43", "Tarragona", "ES51", "Tarragona", "Diputació de Tarragona", 41.12, 1.25, 41.05, 0.95, 0.0),
    # Comunitat Valenciana (ES52)
    ("03", "Alicante / Alacant", "ES52", "Alicante", "Diputació d'Alacant / Diputación de Alicante", 38.35, -0.48, 38.45, -0.55, 0.0),
    ("12", "Castellón / Castelló", "ES52", "Castellón de la Plana", "Diputació de Castelló / Diputación de Castellón", 39.99, -0.05, 40.25, -0.15, 0.01),
    ("46", "Valencia / València", "ES52", "Valencia", "Diputació de València / Diputación de Valencia", 39.47, -0.38, 39.35, -0.65, 0.04),
    # Extremadura (ES43)
    ("06", "Badajoz", "ES43", "Badajoz", "Diputación Provincial de Badajoz", 38.88, -6.97, 38.65, -6.15, 0.04),
    ("10", "Cáceres", "ES43", "Cáceres", "Diputación Provincial de Cáceres", 39.47, -6.37, 39.85, -6.15, 0.02),
    # Galicia (ES11)
    ("15", "A Coruña", "ES11", "A Coruña", "Deputación da Coruña", 43.37, -8.40, 43.15, -8.55, 0.02),
    ("27", "Lugo", "ES11", "Lugo", "Deputación de Lugo", 43.01, -7.56, 43.05, -7.45, 0.04),
    ("32", "Ourense", "ES11", "Ourense", "Deputación de Ourense", 42.34, -7.86, 42.20, -7.60, 0.01),
    ("36", "Pontevedra", "ES11", "Pontevedra", "Deputación de Pontevedra", 42.43, -8.64, 42.40, -8.55, -0.02),
    # Comunidad de Madrid (ES30)
    ("28", "Madrid", "ES30", "Madrid", "Comunidad de Madrid (Administración Autonómica / Provincial)", 40.42, -3.70, 40.42, -3.70, 0.0),
    # Región de Murcia (ES62)
    ("30", "Murcia", "ES62", "Murcia", "Región de Murcia (Administración Autonómica / Provincial)", 37.99, -1.13, 37.99, -1.13, 0.0),
    # Comunidad Foral de Navarra (ES22)
    ("31", "Navarra", "ES22", "Pamplona / Iruña", "Gobierno de Navarra / Nafarroako Gobernua", 42.81, -1.64, 42.81, -1.64, 0.0),
    # País Vasco (ES21)
    ("01", "Álava / Araba", "ES21", "Vitoria-Gasteiz", "Diputación Foral de Álava / Arabako Foru Aldundia", 42.85, -2.67, 42.80, -2.75, 0.02),
    ("48", "Bizkaia", "ES21", "Bilbao", "Diputación Foral de Bizkaia / Bizkaiko Foru Aldundia", 43.26, -2.93, 43.28, -2.90, 0.0),
    ("20", "Gipuzkoa", "ES21", "Donostia / San Sebastián", "Diputación Foral de Gipuzkoa / Gipuzkoako Foru Aldundia", 43.32, -1.98, 43.18, -2.15, -0.01),
    # La Rioja (ES23)
    ("26", "La Rioja", "ES23", "Logroño", "Gobierno de La Rioja (Administración Autonómica / Provincial)", 42.47, -2.45, 42.47, -2.45, 0.0),
    # Ceuta & Melilla
    ("51", "Ceuta", "ES63", "Ceuta", "Ciudad Autónoma de Ceuta", 35.89, -5.32, 35.89, -5.32, 0.0),
    ("52", "Melilla", "ES64", "Melilla", "Ciudad Autónoma de Melilla", 35.29, -2.94, 35.29, -2.94, 0.0),
]

# INE province code -> GISCO NUTS 2021 level-3 ids. Island NUTS-3 units are unioned to
# match INE provinces (Illes Balears; Las Palmas; Santa Cruz de Tenerife).
PROVINCE_NUTS3: dict[str, tuple[str, ...]] = {
    "01": ("ES211",),
    "02": ("ES421",),
    "03": ("ES521",),
    "04": ("ES611",),
    "05": ("ES411",),
    "06": ("ES431",),
    "07": ("ES531", "ES532", "ES533"),
    "08": ("ES511",),
    "09": ("ES412",),
    "10": ("ES432",),
    "11": ("ES612",),
    "12": ("ES522",),
    "13": ("ES422",),
    "14": ("ES613",),
    "15": ("ES111",),
    "16": ("ES423",),
    "17": ("ES512",),
    "18": ("ES614",),
    "19": ("ES424",),
    "20": ("ES212",),
    "21": ("ES615",),
    "22": ("ES241",),
    "23": ("ES616",),
    "24": ("ES413",),
    "25": ("ES513",),
    "26": ("ES230",),
    "27": ("ES112",),
    "28": ("ES300",),
    "29": ("ES617",),
    "30": ("ES620",),
    "31": ("ES220",),
    "32": ("ES113",),
    "33": ("ES120",),
    "34": ("ES414",),
    "35": ("ES704", "ES705", "ES708"),
    "36": ("ES114",),
    "37": ("ES415",),
    "38": ("ES703", "ES706", "ES707", "ES709"),
    "39": ("ES130",),
    "40": ("ES416",),
    "41": ("ES618",),
    "42": ("ES417",),
    "43": ("ES514",),
    "44": ("ES242",),
    "45": ("ES425",),
    "46": ("ES523",),
    "47": ("ES418",),
    "48": ("ES213",),
    "49": ("ES419",),
    "50": ("ES243",),
    "51": ("ES630",),
    "52": ("ES640",),
}


def load_spain_nuts3_geometries() -> dict[str, dict]:
    """NUTS_ID -> GeoJSON geometry for Spanish NUTS-3 units."""
    if not NUTS3_PROC.exists():
        if not NUTS3_RAW.exists():
            NUTS3_RAW.parent.mkdir(parents=True, exist_ok=True)
            print(f"Downloading {NUTS3_URL} ...")
            urllib.request.urlretrieve(NUTS3_URL, NUTS3_RAW)
        europe = json.loads(NUTS3_RAW.read_text(encoding="utf-8"))
        feats = [
            {
                "type": "Feature",
                "properties": {
                    "NUTS_ID": feat["properties"]["NUTS_ID"],
                    "NAME_LATN": feat["properties"].get("NAME_LATN", ""),
                },
                "geometry": feat["geometry"],
            }
            for feat in europe["features"]
            if feat.get("properties", {}).get("CNTR_CODE") == "ES"
        ]
        if len(feats) < 52:
            raise RuntimeError(f"Spain NUTS-3 extract has {len(feats)} features; expected 59")
        NUTS3_PROC.parent.mkdir(parents=True, exist_ok=True)
        collection = {"type": "FeatureCollection", "features": feats}
        NUTS3_PROC.write_text(
            json.dumps(collection, ensure_ascii=False, separators=(",", ":")),
            encoding="utf-8",
        )
        print(f"Wrote {NUTS3_PROC.relative_to(ROOT)} ({len(feats)} NUTS-3 units)")
    raw = json.loads(NUTS3_PROC.read_text(encoding="utf-8"))
    return {feat["properties"]["NUTS_ID"]: feat["geometry"] for feat in raw["features"]}


def rings_for_province(nuts3_geoms: dict[str, dict], nuts_ids: tuple[str, ...]) -> list[Ring]:
    rings: list[Ring] = []
    for nid in nuts_ids:
        geom = nuts3_geoms.get(nid)
        if geom is None:
            raise KeyError(f"Missing GISCO NUTS-3 geometry for {nid}")
        rings.extend(extract_outer_rings(geom))
    if not rings:
        raise RuntimeError(f"No rings extracted for NUTS-3 {nuts_ids}")
    rings.sort(key=ring_area, reverse=True)
    return rings


MUNICIPALITIES_RAW = [
    # 04 Almería
    ("Almería", "04", 36.84, -2.46, 15),
    ("El Ejido", "04", 36.78, -2.81, 14),
    ("Roquetas de Mar", "04", 36.76, -2.61, 12),
    ("Níjar", "04", 36.97, -2.21, 18),
    ("Adra", "04", 36.75, -3.02, 11),
    ("Huércal-Overa", "04", 37.39, -1.94, 14),
    ("Vera", "04", 37.25, -1.87, 12),
    # 11 Cádiz
    ("Cádiz", "11", 36.53, -6.29, 10),
    ("Jerez de la Frontera", "11", 36.68, -6.14, 22),
    ("Algeciras", "11", 36.13, -5.45, 13),
    ("El Puerto de Santa María", "11", 36.60, -6.23, 12),
    ("San Fernando", "11", 36.47, -6.20, 10),
    ("Chiclana de la Frontera", "11", 36.42, -6.15, 13),
    ("Sanlúcar de Barrameda", "11", 36.78, -6.35, 13),
    ("La Línea de la Concepción", "11", 36.16, -5.35, 10),
    ("Tarifa", "11", 36.01, -5.60, 16),
    # 14 Córdoba
    ("Córdoba", "14", 37.88, -4.78, 22),
    ("Lucena", "14", 37.41, -4.49, 15),
    ("Puente Genil", "14", 37.39, -4.77, 13),
    ("Montilla", "14", 37.59, -4.64, 13),
    ("Priego de Córdoba", "14", 37.44, -4.20, 14),
    ("Montoro", "14", 38.02, -4.38, 15),
    ("Pozoblanco", "14", 38.38, -4.85, 14),
    # 18 Granada
    ("Granada", "18", 37.18, -3.60, 14),
    ("Motril", "18", 36.75, -3.52, 13),
    ("Almuñécar", "18", 36.73, -3.69, 11),
    ("Baza", "18", 37.49, -2.77, 16),
    ("Guadix", "18", 37.30, -3.14, 15),
    ("Loja", "18", 37.17, -4.15, 15),
    ("Monachil (Sierra Nevada)", "18", 37.10, -3.44, 14),
    # 21 Huelva
    ("Huelva", "21", 37.26, -6.95, 14),
    ("Lepe", "21", 37.25, -7.20, 12),
    ("Almonte (Doñana)", "21", 37.26, -6.52, 22),
    ("Ayamonte", "21", 37.21, -7.40, 12),
    ("Moguer", "21", 37.28, -6.84, 13),
    ("Aracena", "21", 37.89, -6.56, 14),
    # 23 Jaén
    ("Jaén", "23", 37.77, -3.79, 16),
    ("Linares", "23", 38.09, -3.64, 14),
    ("Andújar", "23", 38.04, -4.05, 18),
    ("Úbeda", "23", 38.01, -3.37, 15),
    ("Baeza", "23", 37.99, -3.47, 13),
    ("Martos", "23", 37.72, -3.97, 14),
    ("Cazorla", "23", 37.91, -3.00, 16),
    # 29 Málaga
    ("Málaga", "29", 36.72, -4.42, 16),
    ("Marbella", "29", 36.51, -4.88, 13),
    ("Vélez-Málaga", "29", 36.78, -4.10, 13),
    ("Mijas", "29", 36.60, -4.64, 13),
    ("Fuengirola", "29", 36.54, -4.62, 10),
    ("Estepona", "29", 36.43, -5.15, 13),
    ("Antequera", "29", 37.02, -4.56, 18),
    ("Ronda", "29", 36.74, -5.17, 16),
    ("Nerja", "29", 36.75, -3.88, 11),
    # 41 Sevilla
    ("Sevilla", "41", 37.39, -5.98, 16),
    ("Dos Hermanas", "41", 37.28, -5.92, 13),
    ("Alcalá de Guadaíra", "41", 37.34, -5.84, 13),
    ("Utrera", "41", 37.18, -5.78, 17),
    ("Mairena del Aljarafe", "41", 37.34, -6.06, 10),
    ("Écija", "41", 37.54, -5.08, 18),
    ("Carmona", "41", 37.47, -5.64, 17),
    # 22 Huesca
    ("Huesca", "22", 42.14, -0.41, 14),
    ("Monzón", "22", 41.91, 0.19, 13),
    ("Barbastro", "22", 42.04, 0.13, 13),
    ("Jaca", "22", 42.57, -0.55, 16),
    ("Fraga", "22", 41.52, 0.35, 15),
    ("Sabiñánigo", "22", 42.52, -0.36, 15),
    ("Benasque", "22", 42.60, 0.52, 15),
    # 44 Teruel
    ("Teruel", "44", 40.34, -1.11, 15),
    ("Alcañiz", "44", 41.05, -0.13, 15),
    ("Andorra (Teruel)", "44", 40.98, -0.44, 13),
    ("Calamocha", "44", 40.92, -1.30, 14),
    ("Mora de Rubielos", "44", 40.25, -0.75, 14),
    # 50 Zaragoza
    ("Zaragoza", "50", 41.65, -0.89, 20),
    ("Calatayud", "50", 41.35, -1.64, 14),
    ("Utebo", "50", 41.71, -0.99, 10),
    ("Ejea de los Caballeros", "50", 42.13, -1.14, 17),
    ("Tarazona", "50", 41.90, -1.73, 14),
    ("Caspe", "50", 41.24, -0.04, 15),
    # 33 Asturias
    ("Oviedo", "33", 43.36, -5.85, 14),
    ("Gijón", "33", 43.54, -5.66, 14),
    ("Avilés", "33", 43.56, -5.92, 12),
    ("Siero", "33", 43.39, -5.66, 13),
    ("Langreo", "33", 43.30, -5.68, 12),
    ("Mieres", "33", 43.25, -5.77, 13),
    ("Llanes", "33", 43.42, -4.75, 14),
    ("Cangas de Onís", "33", 43.35, -5.13, 14),
    # 07 Illes Balears
    ("Palma", "07", 39.57, 2.65, 15),
    ("Calvià", "07", 39.57, 2.51, 12),
    ("Eivissa / Ibiza", "07", 38.91, 1.43, 12),
    ("Manacor", "07", 39.57, 3.21, 14),
    ("Inca", "07", 39.72, 2.91, 12),
    ("Ciutadella de Menorca", "07", 40.00, 3.84, 13),
    ("Maó / Mahón", "07", 39.89, 4.26, 13),
    ("Formentera", "07", 38.70, 1.46, 11),
    # 35 Las Palmas
    ("Las Palmas de Gran Canaria", "35", 28.12, -15.43, 14),
    ("Telde", "35", 27.99, -15.42, 12),
    ("San Bartolomé de Tirajana (Maspalomas)", "35", 27.76, -15.57, 15),
    ("Arrecife (Lanzarote)", "35", 28.96, -13.55, 13),
    ("Puerto del Rosario (Fuerteventura)", "35", 28.50, -13.86, 15),
    # 38 Santa Cruz de Tenerife
    ("Santa Cruz de Tenerife", "38", 28.46, -16.25, 13),
    ("San Cristóbal de La Laguna", "38", 28.49, -16.32, 13),
    ("Arona", "38", 28.10, -16.68, 12),
    ("Adeje", "38", 28.12, -16.73, 12),
    ("La Orotava (Teide)", "38", 28.39, -16.52, 15),
    ("Santa Cruz de La Palma", "38", 28.68, -17.76, 12),
    ("San Sebastián de La Gomera", "38", 28.09, -17.11, 12),
    ("Valverde (El Hierro)", "38", 27.81, -17.92, 12),
    # 39 Cantabria
    ("Santander", "39", 43.46, -3.80, 12),
    ("Torrelavega", "39", 43.35, -4.05, 12),
    ("Castro-Urdiales", "39", 43.38, -3.22, 12),
    ("Camargo", "39", 43.42, -3.85, 11),
    ("Laredo", "39", 43.41, -3.41, 11),
    ("Reinosa", "39", 43.00, -4.14, 13),
    ("Potes (Liébana)", "39", 43.15, -4.62, 14),
    # 05 Ávila
    ("Ávila", "05", 40.66, -4.70, 15),
    ("Arévalo", "05", 41.06, -4.72, 13),
    ("Arenas de San Pedro", "05", 40.21, -5.09, 14),
    # 09 Burgos
    ("Burgos", "09", 42.34, -3.70, 16),
    ("Miranda de Ebro", "09", 42.68, -2.95, 13),
    ("Aranda de Duero", "09", 41.67, -3.69, 14),
    # 24 León
    ("León", "24", 42.60, -5.57, 15),
    ("Ponferrada", "24", 42.55, -6.59, 15),
    ("San Andrés del Rabanedo", "24", 42.61, -5.62, 11),
    ("Astorga", "24", 42.45, -6.05, 13),
    ("La Bañeza", "24", 42.30, -5.89, 13),
    # 34 Palencia
    ("Palencia", "34", 42.01, -4.53, 14),
    ("Aguilar de Campoo", "34", 42.79, -4.26, 14),
    ("Guardo", "34", 42.79, -4.84, 13),
    # 37 Salamanca
    ("Salamanca", "37", 40.97, -5.66, 14),
    ("Béjar", "37", 40.39, -5.76, 13),
    ("Ciudad Rodrigo", "37", 40.60, -6.53, 14),
    # 40 Segovia
    ("Segovia", "40", 40.95, -4.12, 14),
    ("Cuéllar", "40", 41.40, -4.31, 14),
    ("El Espinar", "40", 40.72, -4.25, 13),
    # 42 Soria
    ("Soria", "42", 41.76, -2.46, 15),
    ("Almazán", "42", 41.49, -2.53, 14),
    ("El Burgo de Osma", "42", 41.59, -3.07, 14),
    # 47 Valladolid
    ("Valladolid", "47", 41.65, -4.72, 16),
    ("Medina del Campo", "47", 41.31, -4.92, 14),
    ("Laguna de Duero", "47", 41.58, -4.72, 11),
    ("Tordesillas", "47", 41.50, -5.00, 13),
    # 49 Zamora
    ("Zamora", "49", 41.50, -5.75, 14),
    ("Benavente", "49", 42.00, -5.67, 13),
    ("Toro", "49", 41.52, -5.39, 14),
    ("Puebla de Sanabria", "49", 42.05, -6.63, 15),
    # 02 Albacete
    ("Albacete", "02", 38.99, -1.86, 18),
    ("Hellín", "02", 38.51, -1.70, 16),
    ("Villarrobledo", "02", 39.27, -2.60, 16),
    ("Almansa", "02", 38.87, -1.10, 15),
    ("La Roda", "02", 39.21, -2.16, 14),
    # 13 Ciudad Real
    ("Ciudad Real", "13", 38.99, -3.93, 15),
    ("Puertollano", "13", 38.69, -4.11, 15),
    ("Tomelloso", "13", 39.16, -3.02, 15),
    ("Alcázar de San Juan", "13", 39.39, -3.21, 16),
    ("Valdepeñas", "13", 38.76, -3.38, 16),
    ("Manzanares", "13", 39.00, -3.37, 15),
    # 16 Cuenca
    ("Cuenca", "16", 40.07, -2.13, 18),
    ("Tarancón", "16", 40.01, -3.01, 14),
    ("San Clemente", "16", 39.40, -2.43, 14),
    ("Motilla del Palancar", "16", 39.56, -1.91, 13),
    # 19 Guadalajara
    ("Guadalajara", "19", 40.63, -3.17, 15),
    ("Azuqueca de Henares", "19", 40.56, -3.27, 11),
    ("Sigüenza", "19", 41.07, -2.64, 15),
    ("Molina de Aragón", "19", 40.84, -1.89, 15),
    # 45 Toledo
    ("Toledo", "45", 39.86, -4.03, 15),
    ("Talavera de la Reina", "45", 39.96, -4.83, 15),
    ("Illescas", "45", 40.12, -3.85, 12),
    ("Seseña", "45", 40.10, -3.69, 11),
    ("Quintanar de la Orden", "45", 39.59, -3.04, 13),
    # 08 Barcelona
    ("Barcelona", "08", 41.39, 2.17, 14),
    ("L'Hospitalet de Llobregat", "08", 41.36, 2.10, 10),
    ("Terrassa", "08", 41.56, 2.01, 12),
    ("Badalona", "08", 41.45, 2.25, 10),
    ("Sabadell", "08", 41.55, 2.11, 12),
    ("Mataró", "08", 41.54, 2.44, 11),
    ("Manresa", "08", 41.73, 1.83, 13),
    ("Vilanova i la Geltrú", "08", 41.22, 1.73, 11),
    ("Granollers", "08", 41.61, 2.29, 11),
    ("Vic", "08", 41.93, 2.25, 13),
    ("Igualada", "08", 41.58, 1.62, 12),
    # 17 Girona
    ("Girona", "17", 41.98, 2.82, 13),
    ("Figueres", "17", 42.27, 2.96, 13),
    ("Blanes", "17", 41.68, 2.79, 11),
    ("Lloret de Mar", "17", 41.70, 2.85, 11),
    ("Olot", "17", 42.18, 2.49, 13),
    ("Puigcerdà", "17", 42.43, 1.93, 13),
    # 25 Lleida
    ("Lleida", "25", 41.62, 0.62, 16),
    ("Tàrrega", "25", 41.65, 1.14, 13),
    ("Balaguer", "25", 41.79, 0.81, 13),
    ("La Seu d'Urgell", "25", 42.36, 1.46, 14),
    ("Vielha e Mijaran", "25", 42.70, 0.79, 15),
    # 43 Tarragona
    ("Tarragona", "43", 41.12, 1.25, 13),
    ("Reus", "43", 41.15, 1.11, 12),
    ("Tortosa (Delta del Ebro)", "43", 40.81, 0.52, 16),
    ("El Vendrell", "43", 41.22, 1.53, 11),
    ("Amposta", "43", 40.71, 0.58, 14),
    ("Salou", "43", 41.08, 1.14, 10),
    # 03 Alicante
    ("Alicante / Alacant", "03", 38.35, -0.48, 15),
    ("Elche / Elx", "03", 38.27, -0.70, 16),
    ("Torrevieja", "03", 37.98, -0.68, 12),
    ("Orihuela", "03", 38.08, -0.95, 16),
    ("Benidorm", "03", 38.54, -0.13, 11),
    ("Alcoy / Alcoi", "03", 38.70, -0.47, 13),
    ("Elda", "03", 38.48, -0.79, 12),
    ("Dénia", "03", 38.84, 0.11, 12),
    # 12 Castellón
    ("Castellón de la Plana / Castelló", "12", 39.99, -0.05, 14),
    ("Vila-real / Villarreal", "12", 39.94, -0.10, 11),
    ("Borriana / Burriana", "12", 39.89, -0.08, 11),
    ("La Vall d'Uixó", "12", 39.82, -0.23, 11),
    ("Vinaròs", "12", 40.47, 0.47, 12),
    ("Morella", "12", 40.62, -0.10, 15),
    # 46 Valencia
    ("Valencia / València", "46", 39.47, -0.38, 15),
    ("Torrent", "46", 39.44, -0.47, 12),
    ("Gandia", "46", 38.97, -0.18, 12),
    ("Paterna", "46", 39.50, -0.44, 11),
    ("Sagunto / Sagunt", "46", 39.68, -0.28, 13),
    ("Alzira", "46", 39.15, -0.44, 12),
    ("Xàtiva", "46", 38.99, -0.52, 13),
    ("Requena", "46", 39.49, -1.10, 17),
    # 06 Badajoz
    ("Badajoz", "06", 38.88, -6.97, 20),
    ("Mérida", "06", 38.92, -6.34, 16),
    ("Don Benito", "06", 38.95, -5.86, 15),
    ("Almendralejo", "06", 38.68, -6.41, 14),
    ("Villanueva de la Serena", "06", 38.97, -5.80, 14),
    ("Zafra", "06", 38.43, -6.42, 13),
    # 10 Cáceres
    ("Cáceres", "10", 39.47, -6.37, 22),
    ("Plasencia", "10", 40.03, -6.09, 15),
    ("Navalmoral de la Mata", "10", 39.89, -5.54, 14),
    ("Coria", "10", 39.98, -6.54, 14),
    ("Trujillo", "10", 39.46, -5.88, 16),
    # 15 A Coruña
    ("A Coruña", "15", 43.37, -8.40, 12),
    ("Santiago de Compostela", "15", 42.88, -8.54, 14),
    ("Ferrol", "15", 43.48, -8.24, 12),
    ("Narón", "15", 43.50, -8.19, 11),
    ("Oleiros", "15", 43.33, -8.32, 10),
    ("Carballo", "15", 43.21, -8.69, 13),
    ("Ribeira", "15", 42.56, -8.99, 12),
    # 27 Lugo
    ("Lugo", "27", 43.01, -7.56, 16),
    ("Monforte de Lemos", "27", 42.52, -7.51, 14),
    ("Viveiro", "27", 43.66, -7.59, 13),
    ("Vilalba", "27", 43.30, -7.68, 14),
    ("Ribadeo", "27", 43.54, -7.04, 13),
    # 32 Ourense
    ("Ourense", "32", 42.34, -7.86, 14),
    ("O Barco de Valdeorras", "32", 42.42, -6.98, 13),
    ("Verín", "32", 41.94, -7.44, 13),
    ("O Carballiño", "32", 42.43, -8.08, 12),
    ("Xinzo de Limia", "32", 42.06, -7.72, 13),
    # 36 Pontevedra
    ("Pontevedra", "36", 42.43, -8.64, 13),
    ("Vigo", "36", 42.24, -8.72, 14),
    ("Vilagarcía de Arousa", "36", 42.60, -8.76, 12),
    ("Redondela", "36", 42.28, -8.61, 11),
    ("Cangas", "36", 42.26, -8.78, 11),
    ("Lalín", "36", 42.66, -8.11, 15),
    ("Tui", "36", 42.05, -8.64, 12),
    # 28 Madrid
    ("Madrid", "28", 40.42, -3.70, 16),
    ("Móstoles", "28", 40.32, -3.86, 11),
    ("Alcalá de Henares", "28", 40.48, -3.36, 12),
    ("Fuenlabrada", "28", 40.28, -3.79, 10),
    ("Leganés", "28", 40.33, -3.76, 10),
    ("Getafe", "28", 40.30, -3.73, 11),
    ("Alcorcón", "28", 40.35, -3.83, 10),
    ("Alcobendas", "28", 40.54, -3.64, 11),
    ("Las Rozas de Madrid", "28", 40.49, -3.87, 11),
    ("Aranjuez", "28", 40.03, -3.60, 14),
    ("San Lorenzo de El Escorial", "28", 40.59, -4.15, 12),
    ("Navacerrada", "28", 40.73, -4.02, 12),
    # 30 Murcia
    ("Murcia", "30", 37.99, -1.13, 18),
    ("Cartagena", "30", 37.60, -0.99, 16),
    ("Lorca", "30", 37.67, -1.70, 22),
    ("Molina de Segura", "30", 38.05, -1.21, 13),
    ("Alcantarilla", "30", 37.97, -1.21, 10),
    ("Yecla", "30", 38.61, -1.12, 16),
    ("Águilas", "30", 37.41, -1.58, 14),
    ("San Javier (Mar Menor)", "30", 37.80, -0.83, 13),
    ("Caravaca de la Cruz", "30", 38.11, -1.86, 16),
    # 31 Navarra
    ("Pamplona / Iruña", "31", 42.81, -1.64, 13),
    ("Tudela", "31", 42.06, -1.60, 15),
    ("Barañáin", "31", 42.80, -1.68, 10),
    ("Valle de Egüés", "31", 42.82, -1.55, 11),
    ("Estella-Lizarra", "31", 42.67, -2.03, 13),
    ("Tafalla", "31", 42.53, -1.67, 13),
    ("Baztan (Elizondo)", "31", 43.15, -1.52, 16),
    # 01 Álava
    ("Vitoria-Gasteiz", "01", 42.85, -2.67, 15),
    ("Laudio / Llodio", "01", 43.14, -2.96, 12),
    ("Amurrio", "01", 43.05, -3.00, 12),
    ("Laguardia (Rioja Alavesa)", "01", 42.55, -2.58, 13),
    # 48 Bizkaia
    ("Bilbao", "48", 43.26, -2.93, 12),
    ("Barakaldo", "48", 43.30, -2.99, 10),
    ("Getxo", "48", 43.35, -3.01, 10),
    ("Portugalete", "48", 43.32, -3.02, 10),
    ("Durango", "48", 43.17, -2.63, 11),
    ("Gernika-Lumo", "48", 43.32, -2.68, 12),
    # 20 Gipuzkoa
    ("Donostia / San Sebastián", "20", 43.32, -1.98, 12),
    ("Irun", "20", 43.34, -1.79, 11),
    ("Errenteria", "20", 43.31, -1.90, 10),
    ("Eibar", "20", 43.18, -2.47, 11),
    ("Zarautz", "20", 43.28, -2.17, 11),
    ("Arrasate / Mondragón", "20", 43.06, -2.49, 11),
    ("Tolosa", "20", 43.14, -2.07, 11),
    # 26 La Rioja
    ("Logroño", "26", 42.47, -2.45, 14),
    ("Calahorra", "26", 42.30, -1.96, 13),
    ("Arnedo", "26", 42.23, -2.10, 12),
    ("Haro", "26", 42.58, -2.85, 13),
    ("Alfaro", "26", 42.18, -1.75, 14),
    # 51 Ceuta & 52 Melilla
    ("Ceuta", "51", 35.89, -5.32, 10),
    ("Melilla", "52", 35.29, -2.94, 10),
]


def main() -> None:
    raw = json.loads(NUTS2_SRC.read_text(encoding="utf-8"))
    ccaa_rings_map: dict[str, list[Ring]] = {}
    for feat in raw["features"]:
        nid = feat["properties"]["NUTS_ID"]
        ccaa_rings_map[nid] = extract_outer_rings(feat["geometry"])

    nuts3_geoms = load_spain_nuts3_geometries()
    spec_ids = {spec[0] for spec in PROVINCES_SPEC}
    if spec_ids != set(PROVINCE_NUTS3):
        raise RuntimeError("PROVINCES_SPEC ids and PROVINCE_NUTS3 keys differ")
    unused_nuts3 = set(nuts3_geoms) - {nid for ids in PROVINCE_NUTS3.values() for nid in ids}
    if unused_nuts3:
        raise RuntimeError(f"Unmapped Spain NUTS-3 units: {sorted(unused_nuts3)}")

    # 1. Build CCAA list
    ccaa_list = []
    for nid, meta in sorted(CCAA_META.items(), key=lambda kv: kv[1]["name"]):
        rings = ccaa_rings_map[nid]
        bbox, center = rings_bbox_and_center(rings)
        ccaa_list.append(
            {
                "id": nid,
                "name": meta["name"],
                "institution": meta["institution"],
                "center": center,
                "bbox": bbox,
                "range": compute_view_range(bbox, min_range=95_000, max_range=850_000),
                "coordinates": [[r] for r in rings],
            }
        )

    # 2. Official NUTS-3 rings grouped to INE provinces
    provinces_list = []
    for spec in PROVINCES_SPEC:
        pid, pname, nid, cap, inst, clat, clon, _, _, _ = spec
        ccaa_name = CCAA_META[nid]["name"]
        p_rings = rings_for_province(nuts3_geoms, PROVINCE_NUTS3[pid])
        bbox, _ = rings_bbox_and_center(p_rings)
        min_range = 120_000 if nid == "ES70" else 85_000
        provinces_list.append(
            {
                "id": pid,
                "name": pname,
                "ccaaId": nid,
                "ccaaName": ccaa_name,
                "capital": cap,
                "institution": inst,
                "center": [round(clat, 4), round(clon, 4)],
                "bbox": bbox,
                "range": compute_view_range(bbox, min_range=min_range, max_range=450_000),
                "coordinates": [[r] for r in p_rings],
            }
        )

    provinces_list.sort(key=lambda p: p["name"])

    payload = {
        "generated_at": "2026-11-14",
        "source": "Eurostat GISCO NUTS 2021 1:1M (level 2 CCAA, level 3 provinces) © EuroGeographics",
        "age": {
            "id": "ES",
            "name": "España (Territorio Nacional)",
            "institution": "Administración General del Estado (AGE) · MITECO / AEMET / D.G. del Agua",
        },
        "ccaa": ccaa_list,
        "provinces": provinces_list,
    }

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8", newline="\n")
    size_kb = OUT_PATH.stat().st_size / 1024
    print(f"Wrote {OUT_PATH.relative_to(ROOT)} ({size_kb:.1f} KiB)")
    print(f"  CCAA: {len(ccaa_list)}, Provinces: {len(provinces_list)}")


if __name__ == "__main__":
    main()

