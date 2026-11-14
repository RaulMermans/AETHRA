#!/usr/bin/env python3
"""Download NASA GPM IMERG, MODIS MOD13Q1 and MERRA-2 data for Spain (2000 -> latest).

Modes
  (default)                 Dry run: verify NASA endpoints, list granules, report coverage gaps,
                            estimate storage. Downloads nothing.
  --execute                 Pilot only: download one small sample per dataset and validate it.
  --execute --historical    Pilot (if not yet validated) + yearly batches. Resumable.

Spain = Eurostat GISCO NUTS 2021 (1:1M) country ES: mainland, Balearic and Canary Islands, Ceuta,
Melilla. Server-side subsetting: NASA Harmony (GPM, MERRA-2) and NASA AppEEARS (MODIS).
Provenance is written to data/metadata/download_manifest.json. See docs/DATASETS.md.
"""
from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import math
import netrc
import os
import shutil
import sys
import time
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "data" / "raw"
PROC = ROOT / "data" / "processed" / "spain"
META = ROOT / "data" / "metadata"
MANIFEST = META / "download_manifest.json"
DATASETS_JSON = META / "datasets.json"

CMR = "https://cmr.earthdata.nasa.gov/search"
HARMONY = "https://harmony.earthdata.nasa.gov"
APPEEARS = "https://appeears.earthdatacloud.nasa.gov/api"
FIRST_YEAR = 2000

# Request extents (lon/lat). Checked at runtime to contain the boundary.
SPAIN_BBOX = (-18.5, 27.4, 4.6, 44.0)
MODIS_REGIONS = {  # two AppEEARS areas: avoids one huge mostly-ocean raster
    "peninsula_baleares_ceuta_melilla": (-9.6, 35.1, 4.6, 44.0),
    "canarias": (-18.5, 27.4, -13.2, 29.6),
}
CANARIAS_NUTS2 = "ES70"

BOUNDARY = {
    "name": "Eurostat GISCO NUTS 2021, level 2, scale 1:1 million, EPSG:4326 (country code ES)",
    "url": "https://gisco-services.ec.europa.eu/distribution/v2/nuts/geojson/"
           "NUTS_RG_01M_2021_4326_LEVL_2.geojson",
    "attribution": "(c) EuroGeographics for the administrative boundaries",
    "terms": "https://ec.europa.eu/eurostat/web/gisco/geodata/administrative-units",
    "includes": "Mainland, Illes Balears (ES53), Canarias (ES70), Ceuta (ES63), Melilla (ES64)",
}

DATASETS = {
    "gpm": {
        "short_name": "GPM_3IMERGM", "version": "07", "concept_id": "C2723754851-GES_DISC",
        "doi": "10.5067/GPM/IMERG/3B-MONTH/07",
        "source_url": "https://disc.gsfc.nasa.gov/datasets/GPM_3IMERGM_07/summary",
        "data_type": "Satellite-gauge merged precipitation estimate (IMERG Final Run)",
        "frequency": "monthly", "resolution": "0.1 deg x 0.1 deg", "service": "harmony",
        "variables": ["Grid/precipitation", "Grid/randomError", "Grid/gaugeRelativeWeighting",
                      "Grid/probabilityLiquidPrecipitation", "Grid/precipitationQualityIndex"],
        "expected_units": {"precipitation": "mm/hr", "precipitation_monthly_accumulation": "mm"},
        "grid_deg": (0.1, 0.1),
    },
    "merra2": {
        "short_name": "M2TMNXSLV", "version": "5.12.4", "concept_id": "C1276812859-GES_DISC",
        "doi": "10.5067/AP1B0BA5PD2K",
        "source_url": "https://disc.gsfc.nasa.gov/datasets/M2TMNXSLV_5.12.4/summary",
        "data_type": "Reanalysis (model with data assimilation), NOT a direct satellite observation",
        "frequency": "monthly", "resolution": "0.5 deg lat x 0.625 deg lon", "service": "harmony",
        "variables": ["T2M"], "expected_units": {"T2M": "K", "T2M_celsius": "degC"}, "grid_deg": (0.5, 0.625),
    },
    "modis": {
        "short_name": "MOD13Q1", "version": "061", "concept_id": "C1748066515-LPCLOUD",
        "doi": "10.5067/MODIS/MOD13Q1.061", "source_url": "https://doi.org/10.5067/MODIS/MOD13Q1.061",
        "data_type": "Satellite observation (Terra MODIS 16-day vegetation index composite)",
        "frequency": "16-day composite", "resolution": "250 m (231.656 m), MODIS sinusoidal",
        "service": "appeears", "appeears_product": "MOD13Q1.061",
        "variables": ["_250m_16_days_NDVI", "_250m_16_days_EVI", "_250m_16_days_VI_Quality",
                      "_250m_16_days_pixel_reliability",
                      "_250m_16_days_composite_day_of_the_year"],
        "bytes_per_pixel": 16,  # AppEEARS layer dtypes: 2x float32 + int32 + 2x int16 (upper bound)
    },
}


# ----------------------------------------------------------------------------- helpers
def log(msg: str) -> None:
    print(msg, flush=True)


def now() -> str:
    return dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds")


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def retry(fn, what: str, tries: int = 5, wait: int = 20):
    """Exponential-ish backoff; also the throttle used on HTTP 429/5xx."""
    for i in range(1, tries + 1):
        try:
            return fn()
        except Exception as e:  # noqa: BLE001 - report and retry any transport/service error
            if i == tries:
                raise
            log(f"    ! {what} failed ({type(e).__name__}: {e}); retry {i}/{tries - 1} in {wait * i}s")
            time.sleep(wait * i)


def http(method: str, url: str, **kw) -> requests.Response:
    kw.setdefault("timeout", 120)
    r = requests.request(method, url, **kw)
    r.raise_for_status()
    return r


def load_json(path: Path, default):
    return json.loads(path.read_text()) if path.exists() else default


def save_json(path: Path, obj) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(".tmp")
    tmp.write_text(json.dumps(obj, indent=2, default=str) + "\n")
    os.replace(tmp, path)  # atomic: an interrupted run never leaves a half-written manifest


def rel(p: Path) -> str:
    return str(p.relative_to(ROOT))


def file_record(p: Path) -> dict:
    return {"path": rel(p), "bytes": p.stat().st_size, "sha256": sha256(p)}


def processed_records(entry: dict) -> list[dict]:
    """Processed outputs of a batch: one record (GPM/MERRA-2) or one per composite (MODIS)."""
    return entry.get("processed_files") or ([entry["processed"]] if entry.get("processed") else [])


def files_ok(records: list[dict]) -> bool:
    return all((ROOT / r["path"]).exists() and sha256(ROOT / r["path"]) == r["sha256"]
               for r in records)


# ----------------------------------------------------------------------------- discovery
def cmr_collection(cfg: dict) -> dict:
    r = retry(lambda: http("GET", f"{CMR}/collections.umm_json",
                           params={"short_name": cfg["short_name"], "version": cfg["version"]}),
              "CMR collection")
    items = r.json()["items"]
    if not items:
        raise RuntimeError(f"{cfg['short_name']} v{cfg['version']} not found in CMR")
    return items[0]


def cmr_variable_units(coll: dict, names: list[str]) -> dict:
    ids = coll["meta"].get("associations", {}).get("variables", [])
    if not ids:
        return {}
    r = retry(lambda: http("POST", f"{CMR}/variables.umm_json",
                           data={"concept_id[]": ids, "page_size": 2000}), "CMR variables")
    return {i["umm"]["Name"]: i["umm"].get("Units") for i in r.json()["items"]
            if i["umm"]["Name"] in names}


def search_granules(cfg: dict, start: dt.date, end: dt.date, bbox) -> list:
    import earthaccess
    gs = retry(lambda: earthaccess.search_data(
        concept_id=cfg["concept_id"], temporal=(start.isoformat(), f"{end.isoformat()}T23:59:59Z"),
        bounding_box=bbox, count=-1), "CMR granule search")
    return gs


def g_start(g) -> dt.date:
    return dt.date.fromisoformat(g["umm"]["TemporalExtent"]["RangeDateTime"]["BeginningDateTime"][:10])


def g_record(g) -> dict:
    return {"granule_ur": g["umm"]["GranuleUR"], "concept_id": g["meta"]["concept-id"],
            "start": g_start(g).isoformat(), "size_mb": round(g["size"], 3),
            "url": next(iter(g.data_links(access="external")), None)}


def expected_months(first: dt.date, last: dt.date) -> list[str]:
    out, y, m = [], first.year, first.month
    while (y, m) <= (last.year, last.month):
        out.append(f"{y:04d}-{m:02d}")
        y, m = (y + 1, 1) if m == 12 else (y, m + 1)
    return out


def expected_modis_dates(first_year: int, last: dt.date) -> list[dt.date]:
    out = []
    for y in range(first_year, last.year + 1):
        for doy in range(1, 366, 16):
            d = dt.date(y, 1, 1) + dt.timedelta(days=doy - 1)
            if d >= dt.date(2000, 2, 18) and d <= last:
                out.append(d)
    return out


def modis_pixels(bbox) -> float:
    """Pixels of a MODIS sinusoidal 231.656 m raster covering bbox (widest at the low-lat edge)."""
    w, s, e, n = bbox
    r, px = 6371007.181, 231.656358
    width = math.radians(e - w) * r * math.cos(math.radians(min(abs(s), abs(n))))
    return (width / px) * (math.radians(n - s) * r / px)


def grid_cells(bbox, res) -> float:
    w, s, e, n = bbox
    return ((n - s) / res[0]) * ((e - w) / res[1])


# ----------------------------------------------------------------------------- dry run
def dry_run(keys: list[str], years: list[int], manifest: dict) -> dict:
    today = dt.date.today()
    first, last_req = dt.date(min(years), 1, 1), min(dt.date(max(years), 12, 31), today)
    report = {"run_at": now(), "mode": "dry-run", "requested_period": [first.isoformat(),
              last_req.isoformat()], "endpoints": {}, "datasets": {}}
    for name, url in [("CMR", f"{CMR}/collections.json?page_size=0"), ("Harmony", f"{HARMONY}/versions"),
                      ("AppEEARS", f"{APPEEARS}/product")]:
        try:
            report["endpoints"][name] = http("GET", url, timeout=30).status_code
        except Exception as e:  # noqa: BLE001
            report["endpoints"][name] = f"unreachable: {e}"
    report["endpoints"]["Earthdata Login"] = auth_status()
    catalog = load_json(DATASETS_JSON, {"datasets": {}})
    catalog["boundary"] = BOUNDARY

    total_est = 0.0
    for k in keys:
        cfg = DATASETS[k]
        log(f"\n== {k}: {cfg['short_name']} v{cfg['version']}")
        coll = cmr_collection(cfg)
        cid = coll["meta"]["concept-id"]
        if cid != cfg["concept_id"]:
            log(f"  ! concept ID in CMR is {cid}, script expects {cfg['concept_id']}")
        temporal = coll["umm"].get("TemporalExtents", [])
        rd = {"concept_id": cid, "doi": coll["umm"].get("DOI", {}).get("DOI"),
              "collection_temporal_extent": temporal, "services": [], "missing_periods": []}
        if cfg["service"] == "harmony":
            caps = http("GET", f"{HARMONY}/capabilities", params={"collectionId": cid}).json()
            rd["services"] = [s["name"] for s in caps.get("services", [])]
            gs = search_granules(cfg, first, last_req, SPAIN_BBOX)
            months = sorted({g_start(g).strftime("%Y-%m") for g in gs})
            latest = max(g_start(g) for g in gs) if gs else None
            rd["missing_periods"] = sorted(set(expected_months(first, latest)) - set(months)) if gs else []
            rd["not_yet_available"] = expected_months(latest, last_req)[1:] if gs else []
            cells = grid_cells(SPAIN_BBOX, cfg["grid_deg"])
            est_mb = len(gs) * cells * len(cfg["variables"]) * 4 / 1e6 * 2  # raw subset + processed
            rd["variables_cmr_units"] = cmr_variable_units(coll, cfg["variables"])
        else:
            rd["services"] = ["AppEEARS area request (no Harmony service associated in CMR)"]
            gs, est_mb, dates_by_region = [], 0.0, {}
            for region, bbox in MODIS_REGIONS.items():
                rg = search_granules(cfg, max(first, dt.date(2000, 2, 18)), last_req, bbox)
                gs += rg
                tiles = sorted({g["umm"]["GranuleUR"].split(".")[2] for g in rg})
                by_date: dict[dt.date, set] = {}
                for g in rg:
                    by_date.setdefault(g_start(g), set()).add(g["umm"]["GranuleUR"].split(".")[2])
                dates_by_region[region] = {"tiles": tiles, "composites": len(by_date)}
                latest = max(by_date) if by_date else None
                gaps = [f"{d.isoformat()} ({region}: missing {sorted(set(tiles) - by_date.get(d, set()))})"
                        for d in expected_modis_dates(first.year, latest or first)
                        if set(tiles) - by_date.get(d, set())]
                rd["missing_periods"] += gaps
                est_mb += len(by_date) * modis_pixels(bbox) * cfg["bytes_per_pixel"] / 1e6 * 2
            rd["regions"] = dates_by_region
            latest = max(g_start(g) for g in gs) if gs else None
            prod = http("GET", f"{APPEEARS}/product/{cfg['appeears_product']}").json()
            rd["variables_appeears"] = {v: {kk: prod[v].get(kk) for kk in
                                            ("Units", "ScaleFactor", "FillValue", "ValidMin", "ValidMax", "DataType")}
                                        for v in cfg["variables"] if v in prod}
            missing = [v for v in cfg["variables"] if v not in prod]
            if missing:
                log(f"  ! layers not offered by AppEEARS: {missing}")
        uniq = {g["umm"]["GranuleUR"]: g for g in gs}
        rd.update({
            "granules": len(uniq),
            "first_granule": min(g_start(g) for g in gs).isoformat() if gs else None,
            "latest_granule": latest.isoformat() if latest else None,
            "full_granules_mb": round(sum(g["size"] for g in uniq.values()), 1),
            "estimated_spain_storage_mb": round(est_mb, 1),
        })
        total_est += est_mb
        log(f"  granules {rd['granules']}  {rd['first_granule']} -> {rd['latest_granule']}")
        log(f"  full-granule volume {rd['full_granules_mb'] / 1024:.1f} GB; Spain subset estimate "
            f"{est_mb / 1024:.1f} GB (raw+processed, uncompressed upper bound; pilot measures real size)")
        log(f"  missing periods: {len(rd['missing_periods'])} {rd['missing_periods'][:10]}")
        if rd.get("not_yet_available"):
            log(f"  not yet published: {rd['not_yet_available'][0]} -> {rd['not_yet_available'][-1]}")
        report["datasets"][k] = rd
        catalog["datasets"][k] = {**{kk: cfg[kk] for kk in ("short_name", "version", "doi", "source_url",
                                                               "data_type", "frequency", "resolution",
                                                               "variables", "service")},
                                  "concept_id": cid, "collection_temporal_extent": temporal,
                                  "latest_granule": rd["latest_granule"],
                                  "variable_units": rd.get("variables_cmr_units") or rd.get("variables_appeears"),
                                  "license": "NASA Earth science data: open, no use restrictions; cite the DOI",
                                  "verified_at": report["run_at"]}

    free = shutil.disk_usage(ROOT).free / 1e6
    report["storage"] = {"estimated_total_mb": round(total_est, 1), "free_disk_mb": round(free, 1),
                         "sufficient": total_est < free - 5000}
    log(f"\nStorage: need ~{total_est / 1024:.1f} GB (upper bound), free {free / 1024:.1f} GB -> "
        f"{'OK' if report['storage']['sufficient'] else 'INSUFFICIENT for full history'}")
    for name, st in report["endpoints"].items():
        log(f"  {name}: {st}")
    save_json(DATASETS_JSON, catalog)
    manifest["last_dry_run"] = report
    return report


# ----------------------------------------------------------------------------- auth + boundary
def credentials() -> tuple[str | None, str | None, str | None]:
    """(username, password, token) from .env/environment or ~/.netrc. Never stored or logged."""
    user, pw, tok = (os.getenv("EARTHDATA_USERNAME"), os.getenv("EARTHDATA_PASSWORD"),
                     os.getenv("EARTHDATA_TOKEN"))
    if not (user and pw):
        try:
            a = netrc.netrc().authenticators("urs.earthdata.nasa.gov")
            if a:
                user, pw = a[0], a[2]
        except (FileNotFoundError, netrc.NetrcParseError):
            pass
    return user, pw, tok


def auth_status() -> str:
    user, pw, tok = credentials()
    if not ((user and pw) or tok):
        return "no credentials (set EARTHDATA_USERNAME/PASSWORD in .env or ~/.netrc)"
    try:
        login()
        return "authenticated" + ("" if user and pw else " (token only: AppEEARS/MODIS needs username+password)")
    except Exception as e:  # noqa: BLE001
        return f"login failed: {e}"


def login() -> str:
    """Log in with earthaccess; return an Earthdata bearer token for Harmony."""
    import earthaccess
    user, pw, tok = credentials()
    if not ((user and pw) or tok):
        sys.exit("No Earthdata credentials: set EARTHDATA_USERNAME/PASSWORD in .env or ~/.netrc "
                 "(see scripts/README.md). Nothing was downloaded.")
    auth = earthaccess.login(strategy="environment" if os.getenv("EARTHDATA_USERNAME") or tok else "netrc")
    if not auth or not auth.authenticated:
        raise RuntimeError("Earthdata Login failed. See docs/DATASETS.md > Download setup.")
    return tok or auth.token["access_token"]


def ensure_boundary(manifest: dict):
    import geopandas as gpd
    out = PROC / "spain_boundary_nuts2021_01m.geojson"
    rec = manifest.get("boundary")
    if not (out.exists() and rec and files_ok([rec["file"]])):
        src = RAW / "boundary" / Path(BOUNDARY["url"]).name
        src.parent.mkdir(parents=True, exist_ok=True)
        log("Downloading Spain boundary (Eurostat GISCO NUTS 2021)...")
        r = retry(lambda: http("GET", BOUNDARY["url"], timeout=300), "boundary download")
        src.write_bytes(r.content)
        es = gpd.read_file(src)
        es = es[es["CNTR_CODE"] == "ES"][["NUTS_ID", "NAME_LATN", "geometry"]]
        if not {"ES53", "ES63", "ES64", "ES70"} <= set(es["NUTS_ID"]):
            raise RuntimeError("Boundary lacks Balearics/Ceuta/Melilla/Canarias")
        out.parent.mkdir(parents=True, exist_ok=True)
        es.to_file(out, driver="GeoJSON")
        manifest["boundary"] = {**BOUNDARY, "retrieved_at": now(), "source_file": file_record(src),
                                "file": file_record(out), "nuts2_regions": sorted(es["NUTS_ID"])}
    gdf = gpd.read_file(out).to_crs("EPSG:4326")
    for region, bbox in {"spain": SPAIN_BBOX, **MODIS_REGIONS}.items():
        part = gdf if region == "spain" else (gdf[gdf.NUTS_ID == CANARIAS_NUTS2] if region == "canarias"
                                              else gdf[gdf.NUTS_ID != CANARIAS_NUTS2])
        w, s, e, n = part.total_bounds
        if not (bbox[0] <= w and bbox[1] <= s and bbox[2] >= e and bbox[3] >= n):
            raise RuntimeError(f"Request bbox {region} {bbox} does not contain boundary {part.total_bounds}")
    return gdf


# ----------------------------------------------------------------------------- processing
KEEP_ENC = ("dtype", "scale_factor", "add_offset", "_FillValue", "units", "calendar")


def write_nc(ds, out: Path) -> None:
    for v in ds.variables:
        enc = {k: x for k, x in ds[v].encoding.items() if k in KEEP_ENC}
        if v in ds.data_vars and ds[v].ndim >= 2:
            enc.update(zlib=True, complevel=4)
        ds[v].encoding = enc
    out.parent.mkdir(parents=True, exist_ok=True)
    tmp = out.with_suffix(".partial.nc")
    ds.to_netcdf(tmp)
    os.replace(tmp, out)


def open_raw(k: str, path: Path):
    import xarray as xr
    if k == "gpm":
        try:
            ds = xr.open_dataset(path, group="Grid", decode_times=False)
        except OSError:
            ds = xr.open_dataset(path, decode_times=False)
        # IMERG labels time calendar="julian"; for "seconds since 1980-01-06" the Julian and Gregorian
        # leap rules agree for 1980-2099, so decoding as "standard" yields identical dates.
        for v in ("time", "time_bnds"):
            if v in ds.variables and ds[v].attrs.get("calendar") == "julian":
                ds[v].attrs["calendar"] = "standard"
        return xr.decode_cf(ds)
    return xr.open_dataset(path)


def process_gridded(k: str, cfg: dict, raw_files: list[Path], boundary, out: Path, prov: dict) -> Path:
    """Concat monthly subsets, clip to Spain polygon (all_touched), keep native units/grid."""
    import xarray as xr
    ds = xr.concat([open_raw(k, p) for p in sorted(raw_files)], dim="time").sortby("time")
    ds = ds.drop_vars([v for v in ds.variables if str(v).endswith("_bnds")])
    ds = ds.transpose("time", "lat", "lon", ...)
    ds = ds.rio.set_spatial_dims(x_dim="lon", y_dim="lat").rio.write_crs("EPSG:4326")
    ds = ds.rio.clip(boundary.geometry, boundary.crs, all_touched=True, drop=True)
    steps = ["Harmony HOSS server-side bbox + variable subset", "concatenated along time",
             "dropped *_bnds bounds variables", "dims transposed to (time, lat, lon); values unchanged",
             "clipped to Spain NUTS polygon with all_touched=True (cells outside -> NaN)"]
    if k == "gpm":
        steps.append("time calendar attribute 'julian' decoded as 'standard' (identical dates 1980-2099)")
        hours = (ds["time"].dt.days_in_month * 24).astype("float32")
        acc = (ds["precipitation"] * hours).astype("float32")
        acc.attrs = {"units": "mm", "long_name": "Monthly accumulated precipitation (DERIVED, display variable)",
                     "derivation": "precipitation [mm/hr, monthly mean RATE] x 24 x days in calendar month",
                     "source_variable": "precipitation", "source_units": "mm/hr"}
        ds["precipitation_monthly_accumulation"] = acc
        ds["precipitation"].attrs["note"] = "Monthly mean precipitation RATE (mm/hr), not an accumulation"
        ds.attrs["display_variables"] = "precipitation_monthly_accumulation (mm)"
        steps.append("added precipitation_monthly_accumulation = precipitation x 24 x days in month (mm); "
                     "native mm/hr rate kept unchanged")
    if k == "merra2":
        t = (ds["T2M"] - 273.15).astype("float32")
        t.attrs = {"units": "degC", "long_name": "2-metre air temperature, monthly mean (DERIVED, display variable)",
                   "derivation": "T2M [K] - 273.15", "source_variable": "T2M", "source_units": "K"}
        ds["T2M_celsius"] = t
        ds.attrs["display_variables"] = "T2M_celsius (degC)"
        steps.append("added T2M_celsius = T2M - 273.15 (degC); native T2M in K kept unchanged")
    ds.attrs.update(provenance_attrs(cfg, prov, steps))
    write_nc(ds, out)
    return out


MODIS_KEEP = {  # compact, lossless re-encoding (MOD13Q1 native int types and scale factor)
    "NDVI": dict(dtype="int16", scale_factor=1e-4, _FillValue=-3000),
    "pixel_reliability": dict(dtype="int8", _FillValue=-1),
    "composite_day_of_the_year": dict(dtype="int16", _FillValue=-1),
}


def process_modis(cfg: dict, raw_ncs: list[Path], out_dir: Path, region: str, prov: dict) -> list[Path]:
    """One compact NetCDF per 16-day composite: NDVI + pixel_reliability + composite DOY.

    AppEEARS already masked to the polygon in the native sinusoidal 250 m grid; values are only
    re-encoded in MOD13Q1's own int16/scale 1e-4 form (lossless). EVI and VI_Quality stay in data/raw.
    """
    import xarray as xr
    outs = []
    for raw_nc in raw_ncs:
        ds = xr.open_dataset(raw_nc, decode_coords="all")
        crs = ds.rio.crs
        if crs is None:
            raise RuntimeError(f"{raw_nc.name}: AppEEARS file has no CRS")
        names = {k: next(v for v in ds.data_vars if str(v).endswith(k)) for k in MODIS_KEEP}
        ds = ds[list(names.values())].rename({v: k for k, v in names.items()})
        ds = ds.drop_vars([c for c in ds.coords if c in ("crs", "spatial_ref")])
        ds = ds.rio.write_crs(crs, grid_mapping_name="crs")
        ds["NDVI"].attrs.update({"units": "1", "source_units": "NDVI", "source_layer": names["NDVI"],
                                 "note": "Dimensionless; scale_factor 0.0001 applied on read"})
        ds["pixel_reliability"].attrs.update({
            "flag_values": "0 1 2 3", "flag_meanings": "good marginal snow_ice cloudy",
            "usable_rule": "pixel_reliability in (0, 1); nothing is masked in this file"})
        ds["composite_day_of_the_year"].attrs["note"] = "Actual day of year of the selected observation"
        ds.attrs["display_variables"] = "NDVI (dimensionless); filter with pixel_reliability in (0, 1)"
        steps = ["AppEEARS server-side subset + polygon mask to Spain region, native sinusoidal 250 m grid",
                 "split into one file per 16-day composite (no temporal aggregation)",
                 "kept NDVI, pixel_reliability, composite_day_of_the_year; lossless int16/int8 re-encoding",
                 "EVI and VI_Quality bit field kept only in the raw AppEEARS file"]
        for i in range(ds.sizes["time"]):
            one = ds.isel(time=[i])
            date = str(one.time.values[0])[:10]
            one.attrs.update(provenance_attrs(cfg, prov, steps))
            one.attrs.update({"composite_start_date": date, "region": region})
            for v in one.variables:
                one[v].encoding = {k: x for k, x in one[v].encoding.items()
                                   if k in ("units", "calendar", "grid_mapping")}
            out = out_dir / f"MOD13Q1_061_NDVI_spain_{region}_{date}.nc"
            out.parent.mkdir(parents=True, exist_ok=True)
            tmp = out.with_suffix(".partial.nc")
            for k in MODIS_KEEP:  # link each layer to the sinusoidal CRS variable
                one[k].attrs.pop("grid_mapping", None)
            one.to_netcdf(tmp, encoding={k: {**e, "zlib": True, "complevel": 6, "shuffle": True,
                                             "grid_mapping": "crs"} for k, e in MODIS_KEEP.items()})
            os.replace(tmp, out)
            outs.append(out)
    return outs


def provenance_attrs(cfg: dict, prov: dict, steps: list[str]) -> dict:
    return {"source_product": f"{cfg['short_name']} v{cfg['version']}", "source_doi": cfg["doi"],
            "source_concept_id": cfg["concept_id"], "source_url": cfg["source_url"],
            "data_type": cfg["data_type"], "spatial_subset": "Spain (Eurostat GISCO NUTS 2021, 1:1M)",
            "processing_steps": " | ".join(steps), "processed_at": now(),
            "source_granules": ", ".join(g["granule_ur"] for g in prov.get("granules", []))[:60000],
            "created_by": "scripts/download_nasa_data.py"}


# ----------------------------------------------------------------------------- validation
def validate(k: str, cfg: dict, path: Path, boundary, n_expected: int | None) -> dict:
    import numpy as np
    import xarray as xr
    ds = xr.open_dataset(path)
    issues = []
    if k == "modis":
        names = [v for v in cfg["variables"] if not any(str(d).endswith(v) for d in ds.data_vars)]
        if names:
            issues.append(f"missing layers {names}")
        ndvi = ds[next(v for v in ds.data_vars if str(v).endswith("NDVI"))]
        valid = float(ndvi.notnull().mean())
        lo, hi = float(ndvi.min()), float(ndvi.max())
        if lo < -0.2001 or hi > 1.0001:
            issues.append(f"NDVI outside [-0.2, 1]: {lo}..{hi} (check scale factor)")
        if not ds.rio.crs and "crs" not in ds.variables:
            issues.append("no CRS found")
        cov = {"time_steps": int(ds.sizes.get("time", 0)), "ndvi_valid_fraction": round(valid, 3),
               "ndvi_range": [lo, hi]}
    else:
        for v, u in cfg["expected_units"].items():
            if v not in ds or ds[v].attrs.get("units") != u:
                issues.append(f"{v}: units {ds[v].attrs.get('units') if v in ds else 'MISSING'} != {u}")
        main = ds[list(cfg["expected_units"])[0]]
        w, s, e, n = boundary.total_bounds
        res = cfg["grid_deg"]
        if not (ds.lon.min() <= w + res[1] and ds.lon.max() >= e - res[1]
                and ds.lat.min() <= s + res[0] and ds.lat.max() >= n - res[0]):
            issues.append("grid does not cover Spain extent")
        valid = float(main.notnull().mean())
        cov = {"time_steps": int(ds.sizes["time"]), "valid_fraction_in_bbox": round(valid, 3),
               "lon": [float(ds.lon.min()), float(ds.lon.max())], "lat": [float(ds.lat.min()), float(ds.lat.max())],
               "first": str(np.datetime_as_string(ds.time.values.min(), "D")),
               "last": str(np.datetime_as_string(ds.time.values.max(), "D"))}
        if n_expected is not None and cov["time_steps"] != n_expected:
            issues.append(f"{cov['time_steps']} time steps, expected {n_expected}")
    if valid == 0:
        issues.append("no valid data inside Spain")
    return {"ok": not issues, "issues": issues, "coverage": cov}


def validate_modis(paths: list[Path]) -> dict:
    import xarray as xr
    issues, valid, lo, hi, dates = [], [], 1.0, -1.0, []
    for p in paths:
        ds = xr.open_dataset(p, decode_coords="all")
        missing = [k for k in MODIS_KEEP if k not in ds]
        if missing:
            issues.append(f"{p.name}: missing {missing}")
            continue
        if ds.rio.crs is None:
            issues.append(f"{p.name}: no CRS")
        n = ds["NDVI"]
        valid.append(float(n.notnull().mean()))
        lo, hi = min(lo, float(n.min())), max(hi, float(n.max()))
        dates.append(str(ds.time.values[0])[:10])
        if valid[-1] == 0:
            issues.append(f"{p.name}: no valid NDVI")
    if lo < -0.2001 or hi > 1.0001:
        issues.append(f"NDVI outside [-0.2, 1]: {lo}..{hi}")
    if not paths:
        issues.append("no composites produced")
    cov = {"time_steps": len(paths), "first": min(dates) if dates else None, "last": max(dates) if dates else None,
           "ndvi_valid_fraction_mean": round(sum(valid) / len(valid), 3) if valid else 0, "ndvi_range": [lo, hi]}
    return {"ok": not issues, "issues": issues, "coverage": cov}


# ----------------------------------------------------------------------------- batches
def harmony_batch(k, cfg, label, start, stop, token, boundary, store, pilot=False) -> dict:
    from harmony import BBox, Client, Collection, Request
    entry = store.get(label)
    if entry and entry.get("status") == "ok" and files_ok(entry["raw_files"] + processed_records(entry)):
        log(f"  {label}: already downloaded and verified, skipping")
        return entry
    granules = search_granules(cfg, start, stop, SPAIN_BBOX)
    granules = [g for g in granules if start <= g_start(g) <= stop]
    if not granules:
        store[label] = {"status": "no_granules", "period": [str(start), str(stop)], "checked_at": now()}
        log(f"  {label}: no granules published for this period")
        return store[label]
    sub = "pilot" if pilot else str(start.year)
    final, tmp = RAW / k / sub, RAW / k / f"{sub}.partial"
    shutil.rmtree(tmp, ignore_errors=True)  # only this script's own incomplete batch directory
    client = Client(token=token)
    req = Request(collection=Collection(id=cfg["concept_id"]), spatial=BBox(*SPAIN_BBOX),
                  temporal={"start": dt.datetime.combine(start, dt.time.min),
                            "stop": dt.datetime.combine(stop, dt.time(23, 59, 59))},
                  variables=cfg["variables"], skip_preview=True)

    def run():
        job = client.submit(req)
        client.wait_for_processing(job, show_progress=False)
        tmp.mkdir(parents=True, exist_ok=True)  # harmony-py does not create the directory
        return job, [Path(f.result()) for f in client.download_all(job, directory=str(tmp), overwrite=True)]

    log(f"  {label}: Harmony subset of {len(granules)} granules...")
    job, files = retry(run, f"Harmony job {label}")
    files = [f for f in files if f.suffix in (".nc", ".nc4", ".h5", ".HDF5")]
    if len(files) != len(granules):
        log(f"    ! {len(files)} files returned for {len(granules)} granules")
    shutil.rmtree(final, ignore_errors=True)
    tmp.rename(final)
    files = sorted(final / f.name for f in files)
    prov = {"granules": [g_record(g) for g in granules]}
    out = PROC / k / f"{cfg['short_name']}_{cfg['version']}_spain_{sub}.nc"
    process_gridded(k, cfg, files, boundary, out, prov)
    check = validate(k, cfg, out, boundary, len(granules))
    entry = {"status": "ok" if check["ok"] else "invalid", "period": [str(start), str(stop)],
             "harmony_job_id": job, "harmony_request": client.request_as_url(req),
             "source_granules": prov["granules"], "raw_files": [file_record(f) for f in files],
             "processed": file_record(out), "validation": check, "completed_at": now()}
    store[label] = entry
    log(f"  {label}: {entry['status']} {check['coverage']} {check['issues'] or ''}")
    return entry


def appeears_token(user: str, pw: str) -> str:
    return retry(lambda: http("POST", f"{APPEEARS}/login", auth=(user, pw)).json()["token"], "AppEEARS login")


def appeears_batch(cfg, label, start, stop, region, geo, creds, store, pilot=False, submit_only=False) -> dict:
    key = f"{label}/{region}"
    entry = store.get(key, {})
    if entry.get("status") == "ok" and files_ok(entry["raw_files"] + processed_records(entry)):
        log(f"  {key}: already downloaded and verified, skipping")
        return entry
    if submit_only and entry.get("appeears_task_id"):
        return entry
    user, pw, _ = creds
    if not (user and pw):
        raise RuntimeError("AppEEARS needs EARTHDATA_USERNAME/PASSWORD (or ~/.netrc), not only a token")
    hdr = {"Authorization": f"Bearer {appeears_token(user, pw)}"}
    task_id = entry.get("appeears_task_id")
    if not task_id:  # resume: never resubmit a task that is already queued at AppEEARS
        task = {"task_type": "area", "task_name": f"spain_{region}_{label}".replace("/", "_"),
                "params": {"dates": [{"startDate": start.strftime("%m-%d-%Y"), "endDate": stop.strftime("%m-%d-%Y")}],
                           "layers": [{"product": cfg["appeears_product"], "layer": v} for v in cfg["variables"]],
                           "output": {"format": {"type": "netcdf4"}, "projection": "native"}, "geo": geo}}
        task_id = retry(lambda: http("POST", f"{APPEEARS}/task", json=task, headers=hdr).json()["task_id"],
                        "AppEEARS submit")
        store[key] = entry = {"status": "submitted", "appeears_task_id": task_id, "period": [str(start), str(stop)],
                              "region": region, "submitted_at": now()}
        save_json(MANIFEST, _MANIFEST)
        log(f"  {key}: submitted AppEEARS task {task_id}")
    if submit_only:
        return entry
    log(f"  {key}: AppEEARS task {task_id}, waiting (polls every 60 s)...")
    while True:
        st = retry(lambda: http("GET", f"{APPEEARS}/task/{task_id}", headers=hdr).json(), "AppEEARS status")
        if st["status"] == "done":
            break
        if st["status"] == "error":
            store.pop(key, None)  # allow a clean resubmit next run
            raise RuntimeError(f"AppEEARS task {task_id} failed: {st.get('error')}")
        time.sleep(60)
    sub = "pilot" if pilot else str(start.year)
    final, tmp = RAW / "modis" / sub / region, RAW / "modis" / sub / f"{region}.partial"
    shutil.rmtree(tmp, ignore_errors=True)
    tmp.mkdir(parents=True)
    bundle = retry(lambda: http("GET", f"{APPEEARS}/bundle/{task_id}", headers=hdr).json(), "AppEEARS bundle")
    for f in bundle["files"]:
        dest = tmp / f["file_name"].replace("/", "_")

        def dl(f=f, dest=dest):
            with http("GET", f"{APPEEARS}/bundle/{task_id}/{f['file_id']}", headers=hdr, stream=True,
                      timeout=600, allow_redirects=True) as r, open(dest, "wb") as o:
                for chunk in r.iter_content(1 << 20):
                    o.write(chunk)
            if f.get("sha256") and sha256(dest) != f["sha256"]:
                raise IOError(f"checksum mismatch {dest.name}")
        retry(dl, f"download {f['file_name']}")
    shutil.rmtree(final, ignore_errors=True)
    tmp.rename(final)
    ncs = sorted(final.glob("*.nc"))
    if not ncs:
        raise RuntimeError(f"no NetCDF in AppEEARS bundle {task_id}")
    granules = search_granules(cfg, start, stop, MODIS_REGIONS[region])
    prov = {"granules": [g_record(g) for g in granules]}
    out_dir = PROC / "modis" / ("pilot" if pilot else region)
    outs = process_modis(cfg, ncs, out_dir, region, prov)
    check = validate_modis(outs)
    entry.pop("processed", None)
    entry.update({"status": "ok" if check["ok"] else "invalid", "source_granules": prov["granules"],
                  "checksums": "AppEEARS bundle sha256 verified",
                  "raw_files": [file_record(p) for p in sorted(final.iterdir())],
                  "processed_files": [file_record(p) for p in outs], "validation": check,
                  "completed_at": now()})
    store[key] = entry
    log(f"  {key}: {entry['status']} {check['coverage']} {check['issues'] or ''}")
    return entry


def modis_geo(boundary, region: str) -> dict:
    part = boundary[boundary.NUTS_ID == CANARIAS_NUTS2] if region == "canarias" else \
        boundary[boundary.NUTS_ID != CANARIAS_NUTS2]
    # 0.0005 deg (~50 m) simplification keeps the AppEEARS request small; << 250 m pixel size.
    geom = part.dissolve().geometry.simplify(0.0005, preserve_topology=True)
    return json.loads(geom.to_json())


def bytes_per_period(store: dict) -> float | None:
    sizes = [sum(f["bytes"] for f in e["raw_files"] + processed_records(e))
             for e in store.values() if e.get("status") == "ok"]
    steps = [e["validation"]["coverage"]["time_steps"] for e in store.values() if e.get("status") == "ok"]
    return sum(sizes) / max(sum(steps), 1) if sizes else None


def disk_ok(k: str, store: dict, periods: int, min_free_gb: float) -> bool:
    per = bytes_per_period(store)
    if per is None:
        return True
    need = per * periods * 1.2
    free = shutil.disk_usage(ROOT).free
    if free - need < min_free_gb * 1e9:
        log(f"  ! {k}: batch needs ~{need / 1e9:.1f} GB, free {free / 1e9:.1f} GB (min free {min_free_gb} GB). Stop.")
        return False
    return True


# ----------------------------------------------------------------------------- execute
_MANIFEST: dict = {}


def execute(keys, years: list[int], historical: bool, min_free_gb: float, manifest: dict) -> None:
    if not manifest.get("last_dry_run"):
        sys.exit("Run a dry run first (no --execute) and review it.")
    token = login()
    creds = credentials()
    boundary = ensure_boundary(manifest)
    save_json(MANIFEST, manifest)
    today = dt.date.today()
    for k in keys:
        cfg = DATASETS[k]
        ds_m = manifest.setdefault("datasets", {}).setdefault(k, {"product": cfg["short_name"],
                                                                  "version": cfg["version"],
                                                                  "doi": cfg["doi"], "batches": {}, "failures": []})
        store = ds_m["batches"]
        log(f"\n== {k}: {cfg['short_name']} v{cfg['version']}")
        y0 = min(years)
        try:
            if k == "modis":
                p0 = dt.date(y0, 2, 18) if y0 == 2000 else dt.date(y0, 1, 1)
                pilot = [appeears_batch(cfg, "pilot", p0, p0 + dt.timedelta(days=1), r, modis_geo(boundary, r),
                                        creds, store, pilot=True) for r in MODIS_REGIONS]
            else:
                p_end = dt.date(y0, 2, 1) - dt.timedelta(days=1)
                pilot = [harmony_batch(k, cfg, "pilot", dt.date(y0, 1, 1), p_end, token, boundary, store, True)]
        except Exception as e:  # noqa: BLE001
            ds_m["failures"].append({"batch": "pilot", "error": str(e), "at": now()})
            log(f"  ! pilot failed: {e}")
            save_json(MANIFEST, manifest)
            continue
        save_json(MANIFEST, manifest)
        if not all(p.get("status") == "ok" for p in pilot):
            log("  ! pilot did not validate; not starting historical download for this dataset")
            continue
        if not historical:
            continue
        if k == "modis":  # queue every AppEEARS task first so they process in parallel
            for y in years:
                for r in MODIS_REGIONS:
                    try:
                        appeears_batch(cfg, str(y), dt.date(y, 1, 1), min(dt.date(y, 12, 31), today), r,
                                       modis_geo(boundary, r), creds, store, submit_only=True)
                    except Exception as e:  # noqa: BLE001
                        log(f"  ! submit {y}/{r} failed: {e}")
            save_json(MANIFEST, manifest)
        for y in years:
            start, stop = dt.date(y, 1, 1), min(dt.date(y, 12, 31), today)
            periods = 23 if k == "modis" else 12
            if not disk_ok(k, store, periods * (len(MODIS_REGIONS) if k == "modis" else 1), min_free_gb):
                break
            try:
                if k == "modis":
                    for r in MODIS_REGIONS:
                        appeears_batch(cfg, str(y), start, stop, r, modis_geo(boundary, r), creds, store)
                        save_json(MANIFEST, manifest)
                else:
                    harmony_batch(k, cfg, str(y), start, stop, token, boundary, store)
            except Exception as e:  # noqa: BLE001
                ds_m["failures"].append({"batch": str(y), "error": str(e), "at": now()})
                log(f"  ! {y} failed: {e} (recorded; rerun to resume)")
            save_json(MANIFEST, manifest)
            time.sleep(2)  # be gentle with NASA services between batches


def summary(manifest: dict) -> None:
    log("\n== Summary")
    total = 0
    for k, d in manifest.get("datasets", {}).items():
        ok = {b: e for b, e in d["batches"].items() if e.get("status") == "ok"}
        size = sum(sum(f["bytes"] for f in e["raw_files"] + processed_records(e)) for e in ok.values())
        total += size
        cov = [e["validation"]["coverage"] for e in ok.values()]
        firsts = [c.get("first") for c in cov if c.get("first")]
        lasts = [c.get("last") for c in cov if c.get("last")]
        log(f"  {k}: {len(ok)} batches ok, {size / 1e6:.1f} MB"
            + (f", {min(firsts)} -> {max(lasts)}" if firsts else "")
            + (f", failures: {len(d['failures'])}" if d["failures"] else ""))
        other = {b: e["status"] for b, e in d["batches"].items() if e.get("status") != "ok"}
        if other:
            log(f"    not ok: {other}")
    log(f"  total stored: {total / 1e6:.1f} MB")
    manifest["summary"] = {"updated_at": now(), "total_bytes": total}


def main() -> None:
    global _MANIFEST
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--execute", action="store_true", help="download (pilot only unless --historical)")
    ap.add_argument("--historical", action="store_true", help="with --execute: all yearly batches")
    ap.add_argument("--datasets", default="gpm,merra2,modis", help="comma list of gpm,merra2,modis")
    ap.add_argument("--years", default=f"{FIRST_YEAR}-{dt.date.today().year}",
                    help="range and/or list, e.g. 2000-2026 or 2000,2012,2024")
    ap.add_argument("--min-free-gb", type=float, default=5.0, help="disk space to always leave free")
    a = ap.parse_args()
    keys = [k.strip() for k in a.datasets.split(",")]
    if bad := set(keys) - set(DATASETS):
        sys.exit(f"unknown datasets: {bad}")
    years = sorted({y for part in a.years.split(",") for y in (
        range(int(part.split("-")[0]), int(part.split("-")[1]) + 1) if "-" in part else [int(part)])
        if y >= FIRST_YEAR})
    if not years:
        sys.exit("no years >= 2000 selected")
    try:
        from dotenv import load_dotenv
        load_dotenv(ROOT / ".env")
    except ImportError:
        pass
    manifest = _MANIFEST = load_json(MANIFEST, {"schema": 1, "generated_by": "scripts/download_nasa_data.py"})
    try:
        if a.execute:
            execute(keys, years, a.historical, a.min_free_gb, manifest)
        else:
            dry_run(keys, years, manifest)
            log("\nDry run only: nothing downloaded. Review, then run with --execute.")
    finally:
        if a.execute:
            summary(manifest)
        save_json(MANIFEST, manifest)


if __name__ == "__main__":
    main()
