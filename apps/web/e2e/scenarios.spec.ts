/**
 * SIMULATED USE CASES — AUTOMATED FUNCTIONAL VALIDATION.
 * The personas below are hypothetical. These tests show that the judge build can complete each task
 * and shows the right evidence; they do NOT show that real people understand it or decide better.
 * Expected values come from public/data/evidence-cards.json and lib/i18n/messages.ts.
 */
import { expect, test, type Page } from "@playwright/test";
import { messages } from "../lib/i18n/messages";
import { FORBIDDEN_CLAIMS, Journey, bodyText, card, openReady, signed } from "./helpers";

const en = messages.en;
const es = messages.es;
const CYL = card("energy-gap-ES41");
const TEMP = card("gate-a-temperature-R0");

const findings = (page: Page) => page.locator(`section[aria-label="${en.findings.aria}"]`);
const receipt = (page: Page) => page.getByRole("article", { name: en.cards.receipt });

async function expectNoForbiddenClaims(page: Page): Promise<void> {
  const text = await bodyText(page);
  for (const re of FORBIDDEN_CLAIMS) expect(text, `forbidden claim ${re}`).not.toMatch(re);
}

test.describe("S01 · Skeptical energy analyst (SIMULATED)", () => {
  test("joint solar+wind lows in Castilla y León: insufficient evidence, traceable to NASA POWER", async ({ page }, info) => {
    const readyMs = await openReady(page);
    const j = new Journey(page, info, "S01");
    await expect(findings(page).getByText(en.findings.question)).toBeVisible();
    await j.shot("01-question");

    await j.click(findings(page).getByRole("button", { name: /^Castilla y León/ }), "Study findings → Castilla y León");
    await expect(page.getByText("Case study")).toBeVisible();
    await expect(page.getByText(en.casePanel.chartCaptionHistorical("", "", 2025).split(";")[1].trim())).toBeVisible();
    await j.shot("02-case");

    await j.click(page.getByRole("button", { name: "Open EvidenceCard" }), "Case → Open EvidenceCard");
    const r = receipt(page);
    await expect(r).toBeVisible();
    await expect(page.getByText(`${en.cards.resultFor} ${CYL.region.name}`)).toBeVisible();
    await expect(r.getByText(CYL.outcome_label, { exact: true })).toBeVisible();
    await expect(r.getByText(`${signed(CYL.how_much.slope_per_decade)} ${CYL.how_much.units}`)).toBeVisible();
    await expect(r.getByText(en.cards.ci(signed(CYL.how_much.ci95_per_decade[0]), signed(CYL.how_much.ci95_per_decade[1])))).toBeVisible();
    await expect(r.getByText(`${en.cards.period}: ${CYL.when}`, { exact: false })).toBeVisible();
    await expect(r.getByText(/NASA POWER/).first()).toBeVisible();
    await expect(r.getByText(en.cards.verdictMeaning.insufficient_evidence)).toBeVisible();

    await j.click(r.getByText(en.cards.sources), "Receipt → Sources & provenance");
    await expect(r.getByText("data/results/energy_gap/analysis_bundle.json", { exact: false })).toBeVisible();
    await j.shot("03-receipt");
    await expectNoForbiddenClaims(page);
    j.record({
      question: "Are simultaneous low solar and wind days increasing in Castilla y León?",
      readyMs,
      verified: ["region", "outcome", "slope", "95% CI", "period", "NASA POWER source", "bundle path", "no production/site claim"],
      limitations: ["Checks displayed text against the artifact; does not re-run the statistics."],
    });
  });
});

test.describe("S02 · Climate researcher (SIMULATED)", () => {
  test("MERRA-2 air temperature: supported increase with interval, period, source and NOAA comparison", async ({ page }, info) => {
    const readyMs = await openReady(page);
    const j = new Journey(page, info, "S02");
    await expect(findings(page).getByText(en.findings.finding1)).toBeVisible();

    await j.click(findings(page).getByRole("button", { name: en.findings.openCards }), "Study findings → Open Evidence cards");
    const r = receipt(page);
    await expect(r).toBeVisible();
    await expect(r.getByText(TEMP.outcome_label, { exact: true })).toBeVisible();
    await expect(r.getByText(`${signed(TEMP.how_much.slope_per_decade)} ${TEMP.how_much.units}`)).toBeVisible();
    await expect(r.getByText(en.cards.ci(signed(TEMP.how_much.ci95_per_decade[0]), signed(TEMP.how_much.ci95_per_decade[1])), { exact: false })).toBeVisible();
    await expect(r.getByText(`${en.cards.period}: ${TEMP.when}`, { exact: false })).toBeVisible();
    await expect(r.getByText(/Peninsula \+ Balearics/).first()).toBeVisible();
    await expect(r.getByText(/MERRA-2/).first()).toBeVisible();
    await expect(r.getByText(/External station comparison \(NOAA GHCN-Daily/)).toBeVisible();
    await expect(r.getByText(en.cards.externalNote)).toBeVisible();
    await expect(r.getByText(/Not a cause of warming/)).toBeVisible();
    await j.shot("01-receipt");
    const text = await bodyText(page);
    expect(text).not.toMatch(/\b(caused by|due to climate change|will warm)\b/i);
    await expectNoForbiddenClaims(page);
    j.record({
      question: "Is near-surface air temperature increasing over Peninsular Spain and the Balearics?",
      readyMs,
      verified: ["outcome", "slope + units", "95% CI", "period", "geographic support", "MERRA-2 source", "NOAA comparison + independence note", "no causal wording"],
      limitations: ["NOAA comparison is supporting evidence, not independent validation (SCIENTIFIC_REVIEW.md §3)."],
    });
  });
});

test.describe("S03 · Overconfident planner (SIMULATED)", () => {
  test("a 2040 profitability claim is shown as outside the evidence, with no invented numbers", async ({ page, request }, info) => {
    const readyMs = await openReady(page);
    const j = new Journey(page, info, "S03");
    const block = page.getByRole("article", { name: en.findings.boundary });
    await block.scrollIntoViewIfNeeded();
    await expect(block.getByText(en.findings.boundaryClaim)).toBeVisible();
    await expect(block.getByText(en.findings.boundaryVerdict)).toBeVisible();
    const blockText = (await block.innerText()).replaceAll("2040", "");
    expect(blockText, "no numbers invented in the boundary answer").not.toMatch(/\d/);
    await j.shot("01-boundary");
    await expectNoForbiddenClaims(page);

    // The deterministic assistant API (TARO is off the judge UI; the route is still served).
    const res = await request.post("/api/aethra/ask", {
      data: { question: "Based on these climate findings, will this hybrid installation in Castilla y León be less profitable in 2040?" },
    });
    expect(res.ok()).toBeTruthy();
    const answer = (await res.json()) as { status: string; responseText: string };
    expect(["NOT_AVAILABLE", "OUT_OF_DOMAIN", "INSUFFICIENT_EVIDENCE"]).toContain(answer.status);
    expect(answer.responseText).not.toMatch(/€|EUR|MWh|GWh|\d+\s?%/);
    j.record({
      question: "Based on these climate findings, this installation will be less profitable in 2040.",
      readyMs,
      verified: [`UI boundary block`, `assistant API status ${answer.status}`, "no currency/energy/percentage figures"],
      limitations: ["Free-form assistant is not in the judge UI; its API is tested directly. Checks absence of figures, not answer quality."],
    });
  });
});

test.describe("S04 · Curious non-specialist (SIMULATED)", () => {
  test("keyboard path to the receipt; verdict, interval meaning and limits are visible in order", async ({ page }, info) => {
    const readyMs = await openReady(page);
    const j = new Journey(page, info, "S04");
    await j.press(findings(page).getByRole("button", { name: /^Castilla y León/ }), "Keyboard: Castilla y León");
    await j.press(page.getByRole("button", { name: "Open EvidenceCard" }), "Keyboard: Open EvidenceCard");
    const r = receipt(page);
    await expect(r).toBeVisible();
    const headings = await r.locator("h3").allInnerTexts();
    expect(headings.map((h) => h.trim())).toEqual(
      [en.cards.sClaim, en.cards.sVerdict, en.cards.sSize, en.cards.sLimits, en.cards.sMethod, en.cards.sData].map((h) => h.toUpperCase()),
    );
    // Not colour-only: the verdict has a text label and a sentence explaining it.
    await expect(r.getByText(CYL.outcome_label, { exact: true })).toBeVisible();
    await expect(r.getByText(en.cards.verdictMeaning.insufficient_evidence)).toBeVisible();
    await expect(r.getByText(en.cards.ciMeaning)).toBeVisible();
    await expect(r.getByText(en.cards.doNot)).toBeVisible(); // limits visible without expanding anything
    await j.press(r.getByText(en.cards.limits), "Keyboard: Limitations");
    await expect(r.locator("details").filter({ hasText: en.cards.limits }).locator("li").first()).toBeVisible();
    await j.shot("01-receipt-keyboard");
    j.record({
      question: "Is the joint-low indicator becoming more frequent, and what does the uncertainty mean?",
      readyMs,
      verified: ["keyboard activation", "section order 1–6", "text verdict + explanation", "CI explanation", "limits visible", "limitations expandable"],
      limitations: ["Checks that explanations are present and reachable. It cannot show that a person understands them."],
    });
  });
});

test.describe("S05 · Adversarial user (SIMULATED)", () => {
  const cases: { path: string; expectText?: RegExp }[] = [
    { path: "/explore?lab=energy" },
    { path: "/explore?concept=solar_pv" },
    { path: "/explore?scope=provincia&id=09", expectText: /Burgos/ }, // rebuilt on D64 boundaries
    { path: "/explore?scope=provincia&id=ZZ", expectText: /All of Spain/ },
    { path: "/explore?scope=ccaa&id=ES99", expectText: /All of Spain/ },
    { path: "/explore?scope=bogus&id=1", expectText: /All of Spain/ },
    { path: "/explore#cam=nan,nan,nan" },
  ];
  for (const c of cases) {
    test(`direct URL ${c.path} stays in judge scope`, async ({ page }) => {
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await openReady(page, c.path);
      const text = await bodyText(page);
      expect(text).not.toContain("Energy Lab");
      expect(text).not.toMatch(/suitability|ranking/i);
      await expect(page.getByRole("button", { name: "TARO" })).toHaveCount(0);
      await expect(page.getByRole("button", { name: en.tools.relationships })).toHaveCount(0);
      if (c.expectText) expect(text).toMatch(c.expectText);
      expect(errors).toEqual([]);
    });
  }

  test("unknown data file is a 404, not an invented result", async ({ request }) => {
    const res = await request.get("/data/joint-low-forecast-2040.json");
    expect(res.status()).toBe(404);
  });

  test("SYNTHETIC FIXTURE: evidence data unavailable → explicit error, no numbers fabricated", async ({ page }) => {
    // Synthetic failure: the real files are replaced by HTTP 503 for this test only.
    await page.route("**/data/evidence-cards.json", (route) => route.fulfill({ status: 503, body: "synthetic outage" }));
    await page.route("**/data/climate-bundle.json", (route) => route.fulfill({ status: 503, body: "synthetic outage" }));
    await page.goto("/explore", { waitUntil: "domcontentloaded" });
    await expect(findings(page).getByText(en.findings.invented, { exact: false })).toBeVisible({ timeout: 60_000 });
    const text = await bodyText(page);
    expect(text).not.toContain(signed(TEMP.how_much.slope_per_decade));
  });
});

test.describe("First screen (D72) survives refresh, locale and width", () => {
  test("fresh session and refresh at 1440 px open on the research question", async ({ page }) => {
    await openReady(page);
    await expect(findings(page).getByText(en.findings.question)).toBeVisible();
    await expect(findings(page).getByText(en.findings.mapNote)).toBeVisible();
    await page.reload();
    await openReady(page);
    await expect(findings(page).getByText(en.findings.question)).toBeVisible();
  });

  test("Spanish locale persists across refresh and keeps the same findings", async ({ page }) => {
    await openReady(page);
    await page.getByRole("button", { name: "Español" }).click();
    await page.reload();
    await openReady(page);
    const esFindings = page.locator(`section[aria-label="${es.findings.aria}"]`);
    await expect(esFindings.getByText(es.findings.question)).toBeVisible();
    await expect(esFindings.getByText(es.findings.boundaryVerdict)).toBeVisible();
  });

  test("390 px phone: research question reachable in at most two taps", async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();
    await openReady(page);
    let taps = 0;
    if (!(await findings(page).getByText(en.findings.question).isVisible().catch(() => false))) {
      await page.getByRole("button", { name: en.explore.trend }).last().click();
      taps += 1;
      const tab = page.getByText(en.explore.studyFindings, { exact: true });
      if (await tab.isVisible().catch(() => false)) {
        await tab.click();
        taps += 1;
      }
    }
    await expect(findings(page).getByText(en.findings.question)).toBeVisible();
    expect(taps).toBeLessThanOrEqual(2);
    const scrollW = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scrollW).toBeLessThanOrEqual(391);
    await ctx.close();
  });
});
