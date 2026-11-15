import { expect, test, type Locator, type Page } from "@playwright/test";
import { bodyText } from "./helpers";

/**
 * Deaf / hard-of-hearing mode (docs/ACCESSIBILITY.md).
 *  1. With deaf mode on, every screen-reader announcement is also shown as a visible toast that is
 *     readable (contrast ≥ 4.5:1), stays ≥ 5 s and is not animated (no flashing).
 *  2. Everything speak() says is shown as on-screen captions (speechSynthesis is stubbed so the test
 *     is deterministic and silent).
 * The provider exposes window.__aethraA11y only when navigator.webdriver is true (automation).
 */

type Hook = { announce: (t: string) => void; notify: (t: string) => void; speak: (t: string, o?: { lang?: "en" | "es" }) => void };
declare global {
  interface Window {
    __aethraA11y?: Hook;
    __spoken?: string[];
  }
}

async function setDeaf(page: Page, deaf: boolean): Promise<void> {
  await page.addInitScript((on) => {
    try {
      localStorage.setItem("aethra-a11y", JSON.stringify({ deaf: on }));
    } catch {
      /* ignore */
    }
  }, deaf);
}

async function waitHook(page: Page): Promise<void> {
  await page.waitForFunction(() => typeof window.__aethraA11y?.announce === "function", null, { timeout: 60_000 });
}

/**
 * Ready for these checks = /explore rendered and AccessibilityProvider mounted. Unlike helpers.openReady
 * we do not wait for the Cesium canvas: captions/toasts do not depend on WebGL, and waiting for the
 * globe made the suite flaky on a shared dev server with SwiftShader.
 */
async function openApp(page: Page): Promise<void> {
  await page.goto("/explore", { waitUntil: "domcontentloaded" });
  await waitHook(page);
  expect((await bodyText(page)).length).toBeGreaterThan(0);
}

/** WCAG contrast of an element's text vs its background, resolving any CSS colour (oklch…) via canvas. */
async function contrastOf(el: Locator): Promise<number> {
  return el.evaluate((node) => {
    const cs = getComputedStyle(node as Element);
    const ctx = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
    if (!ctx) return 0;
    const rgb = (css: string): [number, number, number] => {
      ctx.clearRect(0, 0, 1, 1);
      ctx.fillStyle = "#000";
      ctx.fillStyle = css;
      ctx.fillRect(0, 0, 1, 1);
      const d = ctx.getImageData(0, 0, 1, 1).data;
      return [d[0], d[1], d[2]];
    };
    const lum = ([r, g, b]: [number, number, number]) => {
      const f = (c: number) => {
        const s = c / 255;
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
      };
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    };
    const a = lum(rgb(cs.color));
    const b = lum(rgb(cs.backgroundColor));
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  });
}

test.describe("Inclusive mode — deaf / hard of hearing", () => {
  test("deaf mode: announcements become readable, steady, ≥5 s visual toasts", async ({ page }) => {
    await setDeaf(page, true);
    await openApp(page);
    await expect(page.locator("html")).toHaveAttribute("data-a11y-deaf", "on");

    // Record, in the page clock, when each toast appears and disappears (robust to a slow test runner).
    await page.evaluate(() => {
      const w = window as unknown as { __toastLife: Record<string, { added: number; removed?: number }> };
      w.__toastLife = {};
      new MutationObserver((records) => {
        for (const r of records) {
          r.addedNodes.forEach((n) => {
            if (!(n instanceof HTMLElement)) return;
            [n, ...Array.from(n.querySelectorAll<HTMLElement>('[data-testid="a11y-toast"]'))].forEach((t) => {
              if (t.dataset.testid === "a11y-toast") w.__toastLife[(t.textContent ?? "").trim()] = { added: performance.now() };
            });
          });
          r.removedNodes.forEach((n) => {
            const list = n instanceof HTMLElement ? [n, ...Array.from(n.querySelectorAll<HTMLElement>('[data-testid="a11y-toast"]'))] : [];
            list.forEach((t) => {
              const rec = w.__toastLife[(t.textContent ?? "").trim()];
              if (t.dataset.testid === "a11y-toast" && rec && rec.removed === undefined) rec.removed = performance.now();
            });
          });
        }
      }).observe(document.body, { childList: true, subtree: true });
    });

    const toasts = page.getByTestId("a11y-toast");
    const menuButton = page.getByTestId("a11y-menu-button");
    let expected: RegExp | string;
    if ((await menuButton.count()) > 0) {
      // Real UI path: switching another option announces the change → deaf mode must show it.
      await menuButton.click();
      await page.getByTestId("a11y-switch-colorblind").click();
      expected = /colou?r|daltoni/i;
    } else {
      expected = "Map now shows solar zones";
      await page.evaluate((t) => window.__aethraA11y?.announce(t), expected);
    }
    const toast = toasts.filter({ hasText: expected }).first();
    await expect(toast).toBeVisible({ timeout: 20_000 });
    await expect(toast).toHaveAttribute("data-echo", "true"); // aria-hidden echo → not read twice
    await expect(toast).toHaveAttribute("aria-hidden", "true");
    await expect(page.getByTestId("a11y-live")).toContainText(expected);
    const text = ((await toast.textContent()) ?? "").trim();

    expect(await contrastOf(toast)).toBeGreaterThanOrEqual(4.5);
    // No flashing: the toast is not animated at all.
    const anim = await toast.evaluate((n) => getComputedStyle(n).animationName);
    expect(anim).toBe("none");

    // Auto-dismiss happens, but only after ≥ 5 s on screen (page clock).
    await expect(toast).toBeHidden({ timeout: 20_000 });
    const life = await page.evaluate((t) => {
      const rec = (window as unknown as { __toastLife: Record<string, { added: number; removed?: number }> }).__toastLife[t];
      return rec && rec.removed !== undefined ? rec.removed - rec.added : -1;
    }, text);
    expect(life).toBeGreaterThanOrEqual(5_000);

    // Dismissible by the user.
    await page.evaluate(() => window.__aethraA11y?.notify("Dismiss me"));
    const manual = toasts.filter({ hasText: "Dismiss me" });
    await expect(manual).toBeVisible({ timeout: 10_000 });
    await manual.getByTestId("a11y-toast-dismiss").click();
    await expect(manual).toHaveCount(0);
  });

  test("deaf mode off: announcements stay screen-reader only (control)", async ({ page }) => {
    await setDeaf(page, false);
    await openApp(page);
    await page.evaluate(() => window.__aethraA11y?.announce("Control announcement"));
    await expect(page.getByTestId("a11y-live")).toHaveText("Control announcement");
    await expect(page.getByTestId("a11y-toast").filter({ hasText: "Control announcement" })).toHaveCount(0);
  });

  test("speak() is always captioned on screen (speechSynthesis stubbed)", async ({ page }) => {
    await page.addInitScript(() => {
      window.__spoken = [];
      const fake = {
        speaking: false,
        pending: false,
        paused: false,
        speak(u: SpeechSynthesisUtterance) {
          window.__spoken?.push(u.text);
          window.setTimeout(() => u.onend?.call(u, new Event("end") as SpeechSynthesisEvent), 400);
        },
        cancel() {},
        pause() {},
        resume() {},
        getVoices: () => [],
        addEventListener() {},
        removeEventListener() {},
        dispatchEvent: () => true,
        onvoiceschanged: null,
      };
      Object.defineProperty(window, "speechSynthesis", { value: fake, configurable: true });
    });
    await setDeaf(page, true);
    await openApp(page);

    const text = "Castilla y León: insufficient evidence for a trend in joint solar and wind lows.";
    await page.evaluate((t) => window.__aethraA11y?.speak(t, { lang: "en" }), text);

    const bar = page.getByTestId("a11y-captions");
    await expect(bar).toBeVisible();
    await expect(page.getByTestId("a11y-caption-text")).toHaveText(text);
    await expect(bar).toHaveAttribute("aria-live", "off");
    expect(await contrastOf(page.getByTestId("a11y-caption-text"))).toBeGreaterThanOrEqual(4.5);
    expect(await page.evaluate(() => window.__spoken)).toEqual([text]);

    // Speech ended (stub fires onend after 0.4 s) but the caption lingers for reading time.
    await expect(bar).toHaveAttribute("data-speaking", "false");
    await page.waitForTimeout(2_000);
    await expect(bar).toBeVisible();

    await bar.getByRole("button", { name: /close captions|cerrar subtítulos/i }).click();
    await expect(bar).toBeHidden();
  });
});
