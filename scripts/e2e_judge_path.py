#!/usr/bin/env python3
"""Browser end-to-end check of the judge demo path (docs/JUDGE_EXPERIENCE.md), scenarios A–G.

Not a scientific script. Drives a real Chromium against a running judge build and records what it
actually saw. Exit code 1 if any check fails.

  cd apps/web && npm run build && npx next start -p 3518 &
  .venv/bin/python scripts/e2e_judge_path.py --base http://localhost:3518 --out /tmp/e2e --runs 3
Requires: pip install playwright (uses the system Chrome via --chrome).
"""
from __future__ import annotations

import argparse
import json
import sys
import time
from collections.abc import Callable
from pathlib import Path

from playwright.sync_api import Page, sync_playwright
from playwright.sync_api import TimeoutError as PlaywrightTimeout

ARGS = ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"]


class Recorder:
    def __init__(self, out: Path) -> None:
        self.out = out
        self.rows: list[dict] = []

    def check(self, scenario: str, name: str, ok: bool, detail: str = "") -> None:
        self.rows.append({"scenario": scenario, "check": name, "ok": bool(ok), "detail": detail})
        print(("PASS " if ok else "FAIL ") + f"[{scenario}] {name}" + (f" — {detail}" if detail and not ok else ""))

    def shot(self, page: Page, name: str) -> None:
        page.screenshot(path=str(self.out / f"{name}.png"))


def visible_text(page: Page) -> str:
    return page.inner_text("body")


def open_explore(page: Page, url: str) -> float:
    """Load a page and wait for the globe; returns seconds, or -1 if 'Preparing Spain' never cleared."""
    t0 = time.monotonic()
    page.goto(url, wait_until="networkidle", timeout=120_000)
    try:
        page.wait_for_function("() => !document.body.innerText.includes('Preparing Spain')", timeout=90_000)
    except PlaywrightTimeout:
        return -1.0
    page.wait_for_timeout(4000)
    return time.monotonic() - t0


def judge_path(page: Page, base: str, rec: Recorder, run: int) -> None:
    s = f"run{run}"
    errors: list[str] = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    load_s = open_explore(page, f"{base}/explore")
    body = visible_text(page)
    rec.check(f"A/{s}", "page loads; globe ready", load_s >= 0, "globe still 'Preparing Spain' after 90 s")
    rec.rows[-1]["detail"] = f"{load_s:.1f}s"
    rec.check(f"A/{s}", "Cesium canvas rendered", page.locator("canvas").count() > 0)
    rec.check(f"A/{s}", "research question visible", "Are days when solar and wind resources are both low becoming more frequent" in body)
    rec.check(f"A/{s}", "no Energy Lab tab in judge build", "Energy Lab" not in body)
    rec.check(f"A/{s}", "map-vs-study note visible", "Joint solar + wind lows are results for five regions, not a map layer" in body)
    rec.shot(page, f"{s}-A-first-view")

    # B — Castilla y León research case
    page.get_by_text("Castilla y León", exact=True).first.click()
    page.wait_for_timeout(4500)
    body = visible_text(page)
    rec.check(f"B/{s}", "case sheet shows insufficient evidence", "Insufficient evidence" in body)
    rec.check(f"B/{s}", "no 2040 / 2032 on the judge case chart", "2040" not in body and "2032" not in body)
    rec.check(f"B/{s}", "history-only caption", "the chart ends at the last observed year" in body)
    rec.shot(page, f"{s}-B-castilla-y-leon")

    # C — EvidenceCard
    page.get_by_role("button", name="Open EvidenceCard").first.click()
    page.wait_for_timeout(2500)
    body = visible_text(page)
    rec.check(f"C/{s}", "card is for Castilla y León", "Castilla y León" in body)
    rec.check(f"C/{s}", "slope and CI match the artifact", "0.00 days per decade" in body and "−1.55" in body.replace("-1.55", "−1.55") and "1.67" in body)
    rec.check(f"C/{s}", "n = 25 shown", "n = 25" in body or "n=25" in body)
    prov = page.get_by_text("Sources & provenance").first
    if prov.count():
        prov.click()
        page.wait_for_timeout(800)
    body = visible_text(page)
    rec.check(f"C/{s}", "NASA POWER source listed", "NASA POWER" in body)
    rec.shot(page, f"{s}-C-evidence-card")

    # D — supported temperature contrast
    page.keyboard.press("Escape")
    page.wait_for_timeout(800)
    ret = page.get_by_role("button", name="Return to Spain")
    if ret.count():
        ret.first.click()
        page.wait_for_timeout(2500)
    trend = page.get_by_role("button", name="Trend")
    if trend.count() and "Study findings" not in visible_text(page):
        trend.last.click()
        page.wait_for_timeout(1200)
    tab = page.get_by_text("Study findings", exact=True)
    if tab.count():
        tab.first.click()
        page.wait_for_timeout(1500)
    body = visible_text(page)
    rec.check(f"D/{s}", "temperature contrast +0.60 °C/decade, CI +0.31 to +0.87", "+0.60" in body and "+0.31" in body and "+0.87" in body)
    rec.check(f"D/{s}", "do-not-conclude line present", "Not a cause of warming" in body or "not a forecast" in body.lower())
    rec.shot(page, f"{s}-D-contrast")
    rec.check(f"A-D/{s}", "no uncaught page errors on the judge path", not errors, "; ".join(errors[:3]))


def url_attacks(page: Page, base: str, rec: Recorder) -> None:
    cases: list[tuple[str, Callable[[str], bool]]] = [
        ("/explore?lab=energy", lambda b: "Energy Lab" not in b and "Suitability" not in b),
        ("/explore?concept=solar_pv", lambda b: "Energy Lab" not in b),
        ("/explore?scope=provincia&id=09", lambda b: "Burgos" in b),  # rebuilt D64 province scope
        ("/explore?scope=provincia&id=ZZ", lambda b: "Are days when solar and wind" in b or "All of Spain" in b),
        ("/explore?scope=bogus&id=1", lambda b: "All of Spain" in b),
        ("/explore#cam=nan,nan,nan", lambda b: "Preparing Spain" not in b),
    ]
    for path, ok in cases:
        errs: list[str] = []
        page.on("pageerror", lambda e, errs=errs: errs.append(str(e)))
        open_explore(page, base + path)
        body = visible_text(page)
        rec.check("E", f"{path} is safe", ok(body) and not errs, "; ".join(errs[:2]) or body[:120])
        rec.shot(page, "E-" + "".join(ch if ch.isalnum() else "_" for ch in path)[:40])


def responsive(browser, base: str, rec: Recorder) -> None:
    for w, h, name in [(1920, 1080, "desktop"), (1280, 800, "laptop"), (390, 844, "mobile")]:
        page = browser.new_page(viewport={"width": w, "height": h})
        errs: list[str] = []
        page.on("pageerror", lambda e, errs=errs: errs.append(str(e)))
        load_s = open_explore(page, f"{base}/explore")
        rec.check("F", f"{name}: globe ready", load_s >= 0, "globe still 'Preparing Spain' after 90 s")
        body = visible_text(page)
        if "Are days when solar and wind" not in body:  # < 1200 px: documented fallback (Trend → Study findings)
            trend = page.get_by_role("button", name="Trend")
            if trend.count():
                trend.last.click()
                page.wait_for_timeout(1200)
            tab = page.get_by_text("Study findings", exact=True)
            if tab.count():
                tab.first.click()
                page.wait_for_timeout(1200)
            body = visible_text(page)
        rec.check("F", f"{name} {w}×{h}: research question reachable", "Are days when solar and wind" in body)
        scroll_w = page.evaluate("document.documentElement.scrollWidth")
        rec.check("F", f"{name}: no horizontal page scroll", scroll_w <= w + 1, f"scrollWidth {scroll_w}")
        rec.check("F", f"{name}: no page errors", not errs, "; ".join(errs[:2]))
        rec.shot(page, f"F-{name}")
        page.close()


def failure_handling(browser, base: str, rec: Recorder) -> None:
    page = browser.new_page(viewport={"width": 1440, "height": 900})
    page.route("**/data/evidence-cards.json", lambda route: route.fulfill(status=503, body="down"))
    page.route("**/data/climate-bundle.json", lambda route: route.fulfill(status=503, body="down"))
    open_explore(page, f"{base}/explore")
    body = visible_text(page)
    rec.check("G", "cards/bundle down: no temperature value fabricated", "+0.60" not in body)
    rec.check("G", "cards/bundle down: an error or loading state is shown", any(k in body for k in ("HTTP 503", "Could not", "Loading", "unavailable", "failed")))
    rec.shot(page, "G-data-down")
    page.close()


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--base", default="http://localhost:3518")
    ap.add_argument("--out", type=Path, required=True)
    ap.add_argument("--runs", type=int, default=3)
    ap.add_argument("--chrome", default="/usr/bin/google-chrome")
    a = ap.parse_args()
    a.out.mkdir(parents=True, exist_ok=True)
    rec = Recorder(a.out)
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=a.chrome, args=ARGS)
        for run in range(1, a.runs + 1):  # fresh context per run = fresh browser session
            ctx = browser.new_context(viewport={"width": 1440, "height": 900}, record_video_dir=str(a.out / f"video-run{run}") if run == 1 else None)
            judge_path(ctx.new_page(), a.base, rec, run)
            ctx.close()
        ctx = browser.new_context(viewport={"width": 1440, "height": 900})
        url_attacks(ctx.new_page(), a.base, rec)
        ctx.close()
        responsive(browser, a.base, rec)
        failure_handling(browser, a.base, rec)
        browser.close()
    (a.out / "results.json").write_text(json.dumps(rec.rows, indent=1, ensure_ascii=False), encoding="utf-8", newline="\n")
    fails = [r for r in rec.rows if not r["ok"]]
    print(f"\n{len(rec.rows) - len(fails)}/{len(rec.rows)} checks passed")
    sys.exit(1 if fails else 0)


if __name__ == "__main__":
    main()
