#!/usr/bin/env python3
"""Official installed solar PV capacity in Spain (Eurostat nrg_inf_epcrw) and its trend.

Downloads Eurostat's JSON-stat for siec=RA420 (solar photovoltaic), unit=MW,
plant_tec=CAP_NET_ELC (net maximum electrical capacity, the total series), for Spain
(all years) and the EU27 countries (latest common year). Writes:

  apps/web/public/data/solar-capacity-trend.json   (contract solar-capacity-trend/v1)
  data/eurostat_solar_capacity_spain/eurostat_solar_pv_capacity_spain.csv
  data/raw/eurostat/*.json                          (raw API responses, gitignored)

Cumulative capacity is a running total, so its upward trend is close to mechanical;
the informative trend is the one of annual additions. Capacity is not generation.

Run: python scripts/build_solar_capacity_trend.py [--offline]
"""
from __future__ import annotations

import argparse
import csv
import json
import math
import re
import sys
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "packages/science"))
import trends as T  # noqa: E402

API = "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/nrg_inf_epcrw"
BROWSER_URL = "https://ec.europa.eu/eurostat/databrowser/view/nrg_inf_epcrw/default/table"
RAW_DIR = ROOT / "data/raw/eurostat"
OUT_JSON = ROOT / "apps/web/public/data/solar-capacity-trend.json"
OUT_CSV = ROOT / "data/eurostat_solar_capacity_spain/eurostat_solar_pv_capacity_spain.csv"
PLANT_TEC = "CAP_NET_ELC"
FIRST_YEAR = 2000
RECENT_START = 2015
CAGR_START = 2019
ES_NAMES = {"DE": "Alemania", "IT": "Italia", "FR": "Francia", "NL": "Países Bajos", "PL": "Polonia"}
EU27 = ["AT", "BE", "BG", "CY", "CZ", "DE", "DK", "EE", "EL", "ES", "FI", "FR", "HR", "HU",
        "IE", "IT", "LT", "LU", "LV", "MT", "NL", "PL", "PT", "RO", "SE", "SI", "SK"]


def fetch(url: str, path: Path, offline: bool) -> dict:
    if not offline:
        req = urllib.request.Request(url, headers={"User-Agent": "aethra-data-script/1.0"})
        with urllib.request.urlopen(req, timeout=60) as r:
            body = r.read()
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(body)
    return json.loads(path.read_text(encoding="utf-8"))


def decode(ds: dict) -> dict[tuple, float]:
    """JSON-stat flat index -> {(category id per dimension...): value} (row-major over ds['id'])."""
    ids, sizes = ds["id"], ds["size"]
    cats = []
    for dim in ids:
        index = ds["dimension"][dim]["category"]["index"]
        order = sorted(index, key=index.get) if isinstance(index, dict) else list(index)
        cats.append(order)
    out = {}
    for flat, value in ds["value"].items():
        k, key = int(flat), []
        for size in reversed(sizes):
            key.append(k % size)
            k //= size
        key.reverse()
        out[tuple(cats[d][i] for d, i in enumerate(key))] = float(value)
    return out


def series(ds: dict, geo: str, siec: str = "RA420") -> dict[int, float]:
    ids = ds["id"]
    res = {}
    for key, v in decode(ds).items():
        k = dict(zip(ids, key))
        if k["geo"] == geo and k["plant_tec"] == PLANT_TEC and k["siec"] == siec and k["unit"] == "MW":
            res[int(k["time"])] = v
    return res


def trend_block(years, y, period, per_year_key: str) -> dict:
    sel = [(t, v) for t, v in zip(years, y) if period[0] <= t <= period[1]]
    r = T.trend([t for t, _ in sel], [v for _, v in sel])
    return {
        "period": list(period),
        per_year_key: round(r.slope_per_decade / 10, 1),
        "ci95": [round(r.ci_low_per_decade / 10, 1), round(r.ci_high_per_decade / 10, 1)],
        "p": float(f"{r.p:.3g}"),
        "significant": bool(r.p < 0.05),
        "n": r.n,
        "hamed_rao_applied": r.hamed_rao_applied,
        "method": r.method,
    }


def gw(mw: float) -> str:
    return f"{mw / 1000:.0f}" if mw >= 10000 else f"{mw / 1000:.1f}"


def ordinal_en(n: int) -> str:
    return {1: "1st", 2: "2nd", 3: "3rd"}.get(n, f"{n}th")


def build(offline: bool = False) -> dict:
    retrieved = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    es_ds = fetch(f"{API}?format=JSON&lang=EN&geo=ES&siec=RA420&unit=MW", RAW_DIR / "nrg_inf_epcrw_ES_RA420.json", offline)
    es = {t: v for t, v in series(es_ds, "ES").items() if t >= FIRST_YEAR}
    years = sorted(es)
    assert years == list(range(years[0], years[-1] + 1)), "gap in Spain series"
    mw = [round(es[t], 1) for t in years]
    added = [None] + [round(mw[i] - mw[i - 1], 1) for i in range(1, len(mw))]
    latest = years[-1]

    full = trend_block(years, mw, (years[0], latest), "sen_mw_per_year")
    recent = trend_block(years, mw, (RECENT_START, latest), "sen_mw_per_year")
    add_trend = trend_block(years[1:], added[1:], (RECENT_START, latest), "sen_mw_per_year2")
    n_cagr = latest - CAGR_START
    cagr = (es[latest] / es[CAGR_START]) ** (1 / n_cagr) - 1
    doubling = math.log(2) / math.log(1 + cagr)

    # Solar thermal (CSP, RA410) as a small side series, same dataset.
    th_ds = fetch(f"{API}?format=JSON&lang=EN&geo=ES&siec=RA410&unit=MW&plant_tec={PLANT_TEC}",
                  RAW_DIR / "nrg_inf_epcrw_ES_RA410.json", offline)
    thermal = {t: v for t, v in series(th_ds, "ES", "RA410").items() if t >= FIRST_YEAR}

    geo_q = "".join(f"&geo={g}" for g in EU27)
    eu_ds = fetch(f"{API}?format=JSON&lang=EN&siec=RA420&unit=MW&plant_tec={PLANT_TEC}&sinceTimePeriod={latest - 2}{geo_q}",
                  RAW_DIR / "nrg_inf_epcrw_EU27_RA420.json", offline)
    labels = eu_ds["dimension"]["geo"]["category"]["label"]
    eu_year = latest
    for y in range(latest, latest - 3, -1):  # latest year reported by all 27 countries
        vals = {g: series(eu_ds, g).get(y) for g in EU27}
        if all(v is not None for v in vals.values()):
            eu_year = y
            break
    else:
        raise RuntimeError("no year with all EU27 countries")
    ranking = sorted(((g, vals[g]) for g in EU27), key=lambda gv: -gv[1])
    total = sum(v for _, v in ranking)
    rank = next(i for i, (g, _) in enumerate(ranking, 1) if g == "ES")
    share = 100 * vals["ES"] / total
    top = [{"geo": g, "label": labels.get(g, g), "mw": round(v, 1)} for g, v in ranking]

    y0 = RECENT_START
    third = ranking[rank] if rank < len(ranking) else None
    second_gap = (f"ES {vals['ES'] / 1000:.1f} GW vs {third[0]} {third[1] / 1000:.1f} GW" if third else "n/a")
    ratio = es[latest] / es[y0]
    first_label = labels.get(ranking[0][0], ranking[0][0]) if rank != 1 else None
    added_latest = added[-1]
    plain = {
        "en": {
            "headline": f"Spain had about {gw(es[latest])} GW of solar panels (photovoltaic) installed at the end of {latest}, "
                        f"{ratio:.0f} times more than in {y0}.",
            "growth": f"Since {CAGR_START} the installed amount has grown about {cagr * 100:.0f}% per year, so it doubles roughly every "
                      f"{doubling:.1f} years. In {latest} alone about {gw(added_latest)} GW of new panels were added. "
                      + ("New additions per year are also clearly increasing since " if add_trend["significant"] else
                         "New additions per year have been large but have not grown steadily since ")
                      + f"{RECENT_START}.",
            "rank": f"In {eu_year} Spain was {ordinal_en(rank)} of the 27 EU countries in installed solar panels"
                    + (f", after {first_label}" if rank == 2 else "")
                    + f", with about {share:.0f}% of the EU total.",
        },
        "es": {
            "headline": f"España tenía unos {gw(es[latest])} GW de paneles solares (fotovoltaicos) instalados a finales de {latest}, "
                        f"{ratio:.0f} veces más que en {y0}.",
            "growth": f"Desde {CAGR_START} la potencia instalada ha crecido alrededor de un {cagr * 100:.0f}% al año, así que se duplica "
                      f"cada {doubling:.1f} años aproximadamente. Solo en {latest} se añadieron unos {gw(added_latest)} GW nuevos. "
                      + ("Lo que se instala cada año también aumenta claramente desde " if add_trend["significant"] else
                         "Lo que se instala cada año ha sido mucho, pero no ha crecido de forma constante desde ")
                      + f"{RECENT_START}.",
            "rank": f"En {eu_year} España era el país número {rank} de los 27 de la UE en paneles solares instalados"
                    + (f", detrás de {ES_NAMES.get(ranking[0][0], first_label)}" if rank == 2 else "")
                    + f", con cerca del {share:.0f}% del total de la UE.",
        },
    }
    plain["es"] = {k: re.sub(r"(\d)\.(\d)", r"\1,\2", v) for k, v in plain["es"].items()}  # Spanish decimal comma
    notes = [
        "Capacity is not generation: MW is the maximum power the installed panels can deliver, not the electricity (MWh) they actually produced.",
        "Cumulative capacity is a running total that almost never goes down, so a significant upward trend on it is close to mechanical; the more informative test is the trend of annual additions (added_mw_trend).",
        "added_mw is the year-on-year difference of net capacity; it can understate gross new builds when old plants are retired or re-rated.",
        "Net maximum electrical capacity (Eurostat CAP_NET_ELC, total). Eurostat also publishes AC and DC sub-series; they are not mixed here.",
        f"Trends: Theil-Sen slope with Gilbert 95% CI and Mann-Kendall test (packages/science/trends.py), Hamed-Rao autocorrelation correction when lag-1 autocorrelation is significant. Smooth growth curves are strongly autocorrelated, so p-values are indicative.",
        f"EU ranking uses the latest year ({eu_year}) for which all 27 EU countries report a value.",
        "This is national context for the screening: the featured Jaén–Granada cell is about where new plants fit; this series shows how fast Spain is building them. The GEM plant registry cannot give a yearly trend (docs/PV_HISTORY.md), so official statistics are used here.",
        "Annual additions are lumpy (e.g. the 2008 tariff rush, 2015-2018 near zero, a 2022 peak), so their positive trend since 2015 mainly says the market restarted after 2018; it is not a forecast.",
        f"Spain and the 3rd country are close in {eu_year} ({second_gap}); the 2nd place is not a large margin.",
        "Eurostat data are official statistics; the trend analysis is ours.",
    ]
    out = {
        "schema": "solar-capacity-trend/v1",
        "status": "OFFICIAL_STATISTICS",
        "generated_utc": retrieved,
        "source": {
            "name": "Eurostat nrg_inf_epcrw (Solar photovoltaic, net maximum electrical capacity)",
            "url": BROWSER_URL,
            "api": f"{API}?format=JSON&lang=EN&geo=ES&siec=RA420&unit=MW",
            "retrieved_utc": retrieved,
            "dataset_updated": es_ds.get("updated"),
            "unit": "MW",
            "siec": "RA420",
            "plant_tec": PLANT_TEC,
        },
        "spain": {
            "years": years,
            "mw": mw,
            "added_mw": added,
            "latest": {"year": latest, "mw": round(es[latest], 1)},
            "trend_full": full,
            "trend_recent": recent,
            "added_mw_trend": add_trend,
            "cagr_pct": {"period": [CAGR_START, latest], "value": round(cagr * 100, 1)},
            "doubling_years": round(doubling, 1),
            "solar_thermal_mw": {"siec": "RA410", "years": sorted(thermal), "mw": [round(thermal[t], 1) for t in sorted(thermal)]},
        },
        "eu": {
            "year": eu_year,
            "spain_rank": rank,
            "n_countries": len(EU27),
            "spain_share_pct": round(share, 1),
            "eu_total_mw": round(total, 1),
            "top": top,
            "spain_mw_per_capita_rank": None,
        },
        "plain": plain,
        "notes": notes,
    }
    OUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUT_JSON.write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    OUT_CSV.parent.mkdir(parents=True, exist_ok=True)
    with OUT_CSV.open("w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["year", "mw", "added_mw"])
        for t, m, a in zip(years, mw, added):
            w.writerow([t, m, "" if a is None else a])
    return out


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--offline", action="store_true", help="reuse data/raw/eurostat/*.json")
    o = build(ap.parse_args().offline)
    s, e = o["spain"], o["eu"]
    print(f"Spain {s['latest']}  CAGR {s['cagr_pct']}  doubling {s['doubling_years']} y")
    print("full", s["trend_full"]["sen_mw_per_year"], s["trend_full"]["p"], "| recent", s["trend_recent"]["sen_mw_per_year"],
          s["trend_recent"]["p"], "| added", s["added_mw_trend"]["sen_mw_per_year2"], s["added_mw_trend"]["p"])
    print(f"EU {e['year']}: rank {e['spain_rank']}/{e['n_countries']} share {e['spain_share_pct']}%  top3 {[t['geo'] for t in e['top'][:3]]}")
    for lang in ("en", "es"):
        for v in o["plain"][lang].values():
            print(" ", v)
