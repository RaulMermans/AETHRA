#!/usr/bin/env python3
"""Build the 7-slide pitch deck (HTML + PDF) from the published artifacts and real screenshots.

Not a scientific script: every number on a slide is read from apps/web/public/data/evidence-cards.json
(Python export) so the deck cannot drift from the app. Screenshots come from `npm run e2e:capture`.

  .venv/bin/python scripts/build_deck.py            # → docs/release/2026-11-15/deck/aethra-deck.{html,pdf}
Requires playwright (Python) and a Chrome binary for the PDF (--chrome, default /usr/bin/google-chrome).
"""
from __future__ import annotations

import argparse
import html
import json
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
CARDS = ROOT / "apps/web/public/data/evidence-cards.json"
OUT = ROOT / "docs/release/2026-11-15/deck"
SHOTS = "../slides"  # relative to OUT


def signed(v: float, d: int = 2) -> str:
    return ("+" if v > 0 else "−" if v < 0 else "") + f"{abs(v):.{d}f}"


def load() -> dict:
    cards = {c["id"]: c for c in json.loads(CARDS.read_text())["cards"]}
    cyl, temp = cards["energy-gap-ES41"], cards["gate-a-temperature-R0"]
    regions = [cards[k] for k in ("energy-gap-R0", "energy-gap-ES11", "energy-gap-ES41", "energy-gap-ES24", "energy-gap-ES61")]
    return {"cyl": cyl, "temp": temp, "regions": regions, "ext": temp["external_check"]}


def slides(d: dict) -> list[str]:
    cyl, temp, ext = d["cyl"], d["temp"], d["ext"]
    e = html.escape
    insufficient = sum(r["outcome"] == "insufficient_evidence" for r in d["regions"])
    ci = lambda c: f"{signed(c['how_much']['ci95_per_decade'][0])} to {signed(c['how_much']['ci95_per_decade'][1])}"
    rows = "".join(
        f"<tr><td>{e(r['region']['name'])}</td><td class='num'>{signed(r['how_much']['slope_per_decade'])}</td>"
        f"<td class='num'>{ci(r)}</td></tr>"
        for r in d["regions"]
    )
    mdt = cyl["evidence"].get("min_detectable_trend_per_decade")
    return [
        # 1 Problem
        """<section class="s cover"><p class="kicker">NASA Space Apps 2026 · Be An Earth System Trend Detective!</p>
        <h1>Earth data are abundant.<br/><em>Defensible conclusions are harder.</em></h1>
        <p class="lead">AETHRA turns NASA Earth data into defensible discoveries.</p>
        <p class="foot">Independent Space Apps project · not an official NASA product</p></section>""",
        # 2 User + question
        """<section class="s"><p class="kicker">The question</p>
        <h2>Are days with both low sun and low wind becoming more frequent?</h2>
        <div class="cols"><div><h3>Who asks (hypothetical persona)</h3><p>A regional renewable-energy resource analyst in Spain, before an assumption enters a long-term study.</p></div>
        <div><h3>Why joint lows</h3><p>Averages hide timing. A day when <b>both</b> resources are low is the hard case. It is a resource indicator, not grid reliability.</p></div>
        <div><h3>The decision</h3><p>Treat “joint lows are increasing” as a supported finding, or keep it as an unconfirmed hypothesis.</p></div></div></section>""",
        # 3 Investigation
        f"""<section class="s"><p class="kicker">The NASA investigation</p><h2>Fixed before we looked at the data</h2>
        <ol class="chain"><li><b>What</b>NASA POWER daily solar insolation (CERES SYN1deg) + 50 m wind (MERRA-2)</li>
        <li><b>Event</b>both below their own monthly 20th percentile (reference 2001–2020)</li>
        <li><b>Where</b>5 pre-registered regions, area-weighted</li><li><b>When</b>{e(cyl['when'])}</li>
        <li><b>How</b>Theil–Sen slope + 95% CI · Mann–Kendall · autocorrelation check · Benjamini–Hochberg across 5 regions</li>
        <li><b>Output</b>an EvidenceCard with a verdict and a “do not conclude” line</li></ol></section>""",
        # 4 Inconclusive result
        f"""<section class="s split"><div><p class="kicker">Claim A · the result</p>
        <h2 class="verdict">? {e(cyl['outcome_label'])}</h2>
        <p class="big">{signed(cyl['how_much']['slope_per_decade'])} <span>days per decade · Castilla y León</span></p>
        <p>95% CI {ci(cyl)} · n = {cyl['evidence']['n_years']} years · {insufficient}/5 regions insufficient evidence</p>
        <table><tr><th>Region (all: {e(cyl['outcome_label'])})</th><th>days/decade</th><th>95% CI</th></tr>{rows}</table>
        <p class="note">Not detecting a change is not proof of stability{f': the test could only detect about {mdt:g} days per decade' if mdt else ''}.</p></div>
        <img src="{SHOTS}/03-evidence-receipt-cyl.png" alt="Castilla y León evidence receipt in the AETHRA judge build"/></section>""",
        # 5 Contrast
        f"""<section class="s split"><div><p class="kicker">Claim B · the contrast</p>
        <h2 class="verdict up">▲ {e(temp['outcome_label'])}</h2>
        <p class="big">{signed(temp['how_much']['slope_per_decade'])} <span>°C per decade · Peninsula + Balearics</span></p>
        <p>95% CI {ci(temp)} · {e(temp['when'])} · NASA MERRA-2 T2M</p>
        <p>External station comparison: {ext['stations_warming']} of {ext['n_stations']} NOAA stations also warmed (not claimed independent of MERRA-2).</p>
        <p class="note">{e(temp['do_not_conclude'])} EXPLORATORY until independent human review.</p></div>
        <img src="{SHOTS}/04-evidence-receipt-temperature.png" alt="Temperature evidence receipt"/></section>""",
        # 6 Product
        f"""<section class="s"><p class="kicker">The product</p><h2>One investigation, end to end</h2>
        <div class="strip"><figure><img src="{SHOTS}/01-question-and-answer.png" alt="First screen"/><figcaption>1 · First screen: the question, the answer for five regions and the contrast. Click a region → its case (history only)</figcaption></figure>
        <figure><img src="{SHOTS}/03-evidence-receipt-cyl.png" alt="Evidence receipt"/><figcaption>2 · Evidence receipt: claim · verdict · how much, how sure · what it does not show · method · NASA data &amp; provenance</figcaption></figure></div>
        <p class="note">Statistics run in tested Python; the browser only displays them.</p></section>""",
        # 7 Decision + philosophy
        """<section class="s"><p class="kicker">What this means for research decisions</p>
        <table class="claims"><tr><td>A</td><td>“Joint lows are becoming more frequent in Castilla y León.”</td><td>? Insufficient evidence: keep it a hypothesis</td></tr>
        <tr><td>B</td><td>“Air temperature is increasing over the Peninsula and Balearics.”</td><td>▲ Supported increase</td></tr>
        <tr><td>C</td><td>“So this hybrid plant will be less profitable in 2040.”</td><td>⊘ Outside the evidence: no estimate given</td></tr></table>
        <p>Next study: observed generation or station wind, longer record. Not a construction or investment decision.</p>
        <blockquote>We don't tell you what you want to hear.<br/>We show you what NASA's evidence supports.</blockquote>
        <p class="foot">Data: NASA POWER (CERES SYN1deg, MERRA-2), NASA MERRA-2 (doi:10.5067/AP1B0BA5PD2K), NOAA GHCN-Daily, Eurostat GISCO. Globe: Cesium, NASA GIBS, Esri, EOX. AI use: Claude (Claude Code) assisted code and docs; statistics come from tested Python. Results EXPLORATORY until independent review.</p></section>""",
    ]


CSS = """
@page { size: 1280px 720px; margin: 0 }
* { box-sizing: border-box }
body { margin: 0; background: #03050a; color: #f5f1e9; font-family: Inter, "Helvetica Neue", Arial, sans-serif }
.s { width: 1280px; height: 720px; padding: 64px 72px; page-break-after: always; position: relative; overflow: hidden;
     background: radial-gradient(1200px 600px at 85% 110%, #101c2b 0%, #03050a 70%) }
.kicker { font: 600 15px/1 ui-monospace, Menlo, monospace; letter-spacing: .16em; text-transform: uppercase; color: #d6b47e; margin: 0 0 18px }
h1 { font-size: 64px; line-height: 1.08; margin: 120px 0 28px; font-weight: 650 } h1 em { color: #a9bdcf; font-style: normal }
h2 { font-size: 40px; line-height: 1.15; margin: 0 0 28px; font-weight: 650 } h3 { font-size: 20px; color: #d6b47e; margin: 0 0 8px }
p, li, td, th { font-size: 20px; line-height: 1.45; color: #dbe3ea } .lead { font-size: 30px; color: #f5f1e9 }
.foot { position: absolute; bottom: 36px; left: 72px; right: 72px; font-size: 14px; color: #a9bdcf }
.cols { display: grid; grid-template-columns: repeat(3, 1fr); gap: 36px }
.chain { list-style: none; padding: 0; margin: 0; display: grid; gap: 14px } .chain li { border-left: 3px solid #d6b47e; padding-left: 18px }
.chain b { display: inline-block; width: 92px; color: #d6b47e }
.split { display: grid; grid-template-columns: 1.05fr 1fr; gap: 40px; align-items: center }
.split img { width: 100%; border-radius: 10px; border: 1px solid rgba(129,157,181,.35) }
.verdict { font-size: 44px; margin-bottom: 10px } .verdict.up { color: #fcd38d }
.big { font: 700 64px/1 ui-monospace, Menlo, monospace; margin: 8px 0 12px; color: #f5f1e9 } .big span { display: block; margin-top: 10px; font: 400 20px Inter, Arial; color: #a9bdcf }
table { border-collapse: collapse; margin-top: 12px; width: 100% } th { text-align: left; color: #a9bdcf; font-size: 15px; border-bottom: 1px solid #334; padding: 4px 8px }
td { font-size: 16px; padding: 4px 8px; border-bottom: 1px solid #1c2633 } td.num { font-family: ui-monospace, Menlo, monospace; white-space: nowrap }
.note { font-size: 16px; color: #a9bdcf }
.strip { display: grid; grid-template-columns: repeat(2, 1fr); gap: 28px } .strip img { width: 100%; border-radius: 8px; border: 1px solid rgba(129,157,181,.35) }
figcaption { font-size: 15px; color: #a9bdcf; margin-top: 8px }
.claims td { font-size: 20px; padding: 12px 10px } .claims td:first-child { font: 700 26px ui-monospace, Menlo, monospace; color: #d6b47e; width: 50px }
blockquote { font-size: 32px; line-height: 1.3; margin: 34px 0 0; padding-left: 22px; border-left: 4px solid #d6b47e; color: #f5f1e9 }
"""


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--chrome", default="/usr/bin/google-chrome")
    a = ap.parse_args()
    OUT.mkdir(parents=True, exist_ok=True)
    doc = f"<!doctype html><html lang='en'><head><meta charset='utf-8'><title>AETHRA pitch deck</title><style>{CSS}</style></head><body>{''.join(slides(load()))}</body></html>"
    page_html = OUT / "aethra-deck.html"
    page_html.write_text(doc)
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=a.chrome)
        page = b.new_page(viewport={"width": 1280, "height": 720})
        page.goto(page_html.as_uri(), wait_until="load")
        page.pdf(path=str(OUT / "aethra-deck.pdf"), width="1280px", height="720px", print_background=True)
        for i, sec in enumerate(page.locator("section.s").all(), start=1):
            sec.screenshot(path=str(OUT / f"slide-{i}.png"))
        b.close()
    print(f"Wrote {page_html.relative_to(ROOT)}, aethra-deck.pdf and slide-1..7.png")


if __name__ == "__main__":
    main()
