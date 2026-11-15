import { expect, test } from "@playwright/test";
import { messages } from "../lib/i18n/messages";
import { card, openReady, signed } from "./helpers";

const en = messages.en;
const temperature = card("gate-a-temperature-R0");

test("Planet to Proof leads from question and real extent to the existing EvidenceCard", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openReady(page);

  await page.getByRole("button", { name: en.proof.start }).click();
  const guide = page.getByRole("complementary", { name: en.proof.title });
  await expect(guide.getByText(temperature.question)).toBeVisible();
  await expect(guide.getByText(temperature.status)).toBeVisible();

  await guide.getByRole("button", { name: en.proof.goToRegion }).click();
  await expect(guide.getByText(en.proof.extentNote)).toBeVisible();
  await guide.getByRole("button", { name: en.proof.showTrend }).click();
  await expect(guide.getByText(en.proof.trendMapNote)).toBeVisible();

  await guide.getByRole("button", { name: en.proof.reveal }).click();
  const receipt = page.getByRole("article", { name: en.cards.receipt });
  await expect(receipt).toBeVisible();
  await expect(receipt.locator("p").filter({ hasText: temperature.status }).first()).toBeVisible();
  await expect(receipt.getByText(`${signed(temperature.how_much.slope_per_decade)} ${temperature.how_much.units}`)).toBeVisible();
  await expect(receipt.getByText(en.cards.ci(
    signed(temperature.how_much.ci95_per_decade[0]),
    signed(temperature.how_much.ci95_per_decade[1]),
  ), { exact: false })).toBeVisible();
});

test("Guide can be exited or skipped without blocking exploration", async ({ page }) => {
  await openReady(page);
  const start = page.getByRole("button", { name: en.proof.start });
  await start.click();
  const guide = page.getByRole("complementary", { name: en.proof.title });
  await guide.getByRole("button", { name: en.proof.exit }).click();
  await expect(guide).toHaveCount(0);
  await expect(page.locator('button[aria-controls="evidence-panel"]')).toBeVisible();

  await page.locator('button[aria-controls="evidence-panel"]').click();
  await page.getByRole("tab", { name: en.explore.studyFindings }).click();
  await start.click();
  await guide.getByRole("button", { name: en.proof.skip }).click();
  await expect(page.getByRole("article", { name: en.cards.receipt })).toBeVisible();
});
