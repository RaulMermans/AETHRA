/**
 * @capture — presentation screenshots of the judge path (not a validation test).
 * Excluded from `npm run e2e`; run with `npm run e2e:capture`. Writes PNGs to
 * ../../docs/release/2026-11-15/slides/. Waits for network idle plus a short visual settle so globe
 * imagery is drawn in still images (validation tests use readiness signals only).
 */
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { test, type Page } from "@playwright/test";
import { messages } from "../lib/i18n/messages";
import { openReady } from "./helpers";

const OUT = join(__dirname, "../../../docs/release/2026-11-15/slides");
const en = messages.en;

async function settle(page: Page): Promise<void> {
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2500); // visual settle for imagery tiles in still images only
}

test("@capture judge path stills", async ({ page }) => {
  mkdirSync(OUT, { recursive: true });
  const findings = page.locator(`section[aria-label="${en.findings.aria}"]`);
  await openReady(page);
  await settle(page);
  await page.screenshot({ path: join(OUT, "01-question-and-answer.png") });

  await findings.getByRole("article", { name: en.findings.boundary }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: join(OUT, "05-boundary-claim.png") });

  await findings.getByRole("button", { name: /^Castilla y León/ }).click();
  await page.getByText("Case study").waitFor();
  await settle(page);
  await page.screenshot({ path: join(OUT, "02-castilla-y-leon-case.png") });

  await page.getByRole("button", { name: "Open EvidenceCard" }).click();
  await page.getByRole("article", { name: en.cards.receipt }).waitFor();
  await settle(page);
  await page.screenshot({ path: join(OUT, "03-evidence-receipt-cyl.png") });

  await page.goto("/explore");
  await openReady(page);
  await findings.getByRole("button", { name: en.findings.openCards }).click();
  await page.getByRole("article", { name: en.cards.receipt }).waitFor();
  await settle(page);
  await page.screenshot({ path: join(OUT, "04-evidence-receipt-temperature.png") });
});

test("@capture mobile first screen", async ({ browser }) => {
  mkdirSync(OUT, { recursive: true });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await openReady(page);
  await page.getByRole("button", { name: en.explore.trend }).last().click();
  const question = page.getByText(en.findings.question);
  if (!(await question.isVisible())) await page.getByText(en.explore.studyFindings, { exact: true }).first().click();
  await question.waitFor();
  await settle(page);
  await page.screenshot({ path: join(OUT, "06-mobile-study-findings.png") });
  await ctx.close();
});
