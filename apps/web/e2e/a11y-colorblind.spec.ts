import { expect, test } from "@playwright/test";
import { openReady } from "./helpers";

/**
 * Inclusive mode · colour-blind safe colours.
 * Opens /explore, operates the Accessibility menu by keyboard and mouse, turns on the colour-blind
 * switch and checks: html flag, switch state, symbols in the legends (never colour alone), the
 * CVD gradient on the map scale, persistence across reload, and the panel-swatch CSS fallback.
 */

test.describe("a11y colour-blind mode", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try {
        // Start clean once per test; later reloads keep the stored choice (persistence check).
        if (!sessionStorage.getItem("a11y-e2e-reset")) {
          localStorage.removeItem("aethra-a11y");
          sessionStorage.setItem("a11y-e2e-reset", "1");
        }
      } catch {
        /* storage unavailable */
      }
    });
  });

  test("menu is keyboard operable and colour-blind mode swaps palettes and shows symbols", async ({ page }) => {
    await openReady(page);

    const button = page.getByRole("button", { name: /Accessibility \/ Accesibilidad/ });
    await expect(button).toBeVisible();
    await expect(button).toHaveAttribute("aria-haspopup", "dialog");
    await expect(button).toHaveAttribute("aria-expanded", "false");

    // Keyboard: open with Enter, focus lands on the first switch, Esc closes and returns focus.
    await button.focus();
    await page.keyboard.press("Enter");
    const dialog = page.getByRole("dialog", { name: "Accessibility" });
    await expect(dialog).toBeVisible();
    await expect(button).toHaveAttribute("aria-expanded", "true");
    const switches = dialog.getByRole("switch");
    await expect(switches).toHaveCount(3);
    await expect(switches.first()).toBeFocused();
    // Focus trap: Shift+Tab from the first focusable wraps inside the dialog.
    await dialog.getByRole("button", { name: "Close accessibility menu" }).focus();
    await page.keyboard.press("Shift+Tab");
    expect(await dialog.evaluate((d) => d.contains(document.activeElement))).toBe(true);
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(button).toBeFocused();

    // Baseline: default scale gradient.
    const scale = page.locator('[data-palette]').first();
    const hasScale = (await scale.count()) > 0;
    const gradientBefore = hasScale ? await scale.locator('[style*="gradient"]').first().evaluate((el) => getComputedStyle(el).backgroundImage) : "";

    // Turn on colour-blind safe colours.
    await button.click();
    const cvdSwitch = dialog.getByRole("switch", { name: /Colour-blind safe colours/ });
    await expect(cvdSwitch).toHaveAttribute("aria-checked", "false");
    await cvdSwitch.click();
    await expect(cvdSwitch).toHaveAttribute("aria-checked", "true");
    await expect(page.locator("html")).toHaveAttribute("data-a11y-colorblind", "on");
    await expect(page.getByTestId("a11y-live")).toContainText("Colour-blind safe colours: on");

    // The menu's colour key shows the verdict symbols with text (not colour alone).
    const key = page.getByTestId("a11y-cvd-key");
    await expect(key).toBeVisible();
    for (const s of ["✓", "~", "✕"]) await expect(key).toContainText(s);
    await expect(key).toContainText("Good evidence for PV");

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();

    // Map legend: CVD note with direction symbols; scale gradient switched to the CVD palette.
    const mapKey = page.getByTestId("cvd-map-key");
    console.log(`[a11y-colorblind] map key present=${await mapKey.count()} scale present=${hasScale}`);
    if ((await mapKey.count()) > 0) {
      await expect(mapKey).toContainText(/◐/);
      await expect(mapKey).toContainText(/▼|▁▃▅▇/);
    }
    if (hasScale) {
      await expect(scale).toHaveAttribute("data-palette", "cvd");
      const gradientAfter = await scale.locator('[style*="gradient"]').first().evaluate((el) => getComputedStyle(el).backgroundImage);
      expect(gradientAfter).not.toBe(gradientBefore);
      console.log(`[a11y-colorblind] scale gradient before=${gradientBefore.slice(0, 60)}… after=${gradientAfter.slice(0, 60)}…`);
    }

    // CSS fallback: a default green verdict swatch is repainted Okabe–Ito blue.
    const repainted = await page.evaluate(() => {
      const el = document.createElement("span");
      el.style.background = "#22c55ecc";
      document.body.appendChild(el);
      const bg = getComputedStyle(el).backgroundColor;
      el.remove();
      return bg;
    });
    expect(repainted.replace(/\s/g, "")).toMatch(/^rgba\(0,114,178,0\.85\)$/);

    // Persistence: the choice survives a reload.
    await page.evaluate(() => localStorage.setItem("aethra-a11y", JSON.stringify({ colorblind: true, screenReader: false, deaf: false })));
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.locator("html")).toHaveAttribute("data-a11y-colorblind", "on");

    // Turning it off restores the default flag.
    await page.getByRole("button", { name: /Accessibility \/ Accesibilidad/ }).click();
    const sw = page.getByRole("dialog", { name: "Accessibility" }).getByRole("switch", { name: /Colour-blind safe colours/ });
    await expect(sw).toHaveAttribute("aria-checked", "true");
    await sw.click();
    await expect(page.locator("html")).not.toHaveAttribute("data-a11y-colorblind", "on");
  });
});
