import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page, type TestInfo } from "@playwright/test";
import { openReady } from "./helpers";

/**
 * Inclusive mode — blind / low vision (agent B).
 *  1. axe-core: zero "serious" / "critical" violations on /explore in four states
 *     (initial, solar zone card open, study findings open, accessibility menu open).
 *  2. Keyboard only (Tab / Enter / Escape): skip link → solar panel → Map in words → select a zone →
 *     focus lands on its card → read it aloud (speech is captured, not played).
 *
 * Exclusions (justified):
 *  - `nextjs-portal`: the Next.js dev overlay, present only with `next dev`; never shipped.
 *  - `.cesium-widget` internals: third-party WebGL canvas inside the globe container. The container
 *    itself (role="img" + descriptive label) IS checked; its pixels have a text alternative in
 *    "Map in words".
 */

const BLOCKING = new Set(["serious", "critical"]);

async function axeScan(page: Page, info: TestInfo, state: string) {
  const results = await new AxeBuilder({ page }).exclude("nextjs-portal").exclude(".cesium-widget").analyze();
  const blocking = results.violations.filter((v) => BLOCKING.has(v.impact ?? ""));
  const summary = {
    state,
    violations: results.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length, help: v.help })),
    blocking: blocking.length,
    passes: results.passes.length,
  };
  await info.attach(`axe-${state}.json`, { body: JSON.stringify(summary, null, 1), contentType: "application/json" });
  console.log(`[axe] ${state}: ${results.violations.length} violations (${blocking.length} serious/critical), ${results.passes.length} rules passed`);
  for (const v of blocking) {
    console.log(`  ✕ ${v.impact} ${v.id}: ${v.help}`);
    v.nodes.slice(0, 5).forEach((n) => console.log(`      ${n.target.join(" ")} — ${n.failureSummary?.split("\n").slice(1, 2).join("")}`));
  }
  expect.soft(blocking.map((v) => `${v.impact} ${v.id} (${v.nodes.length})`), `axe ${state}`).toEqual([]);
}

/** Presses Tab until `target` has focus (keyboard-only navigation, no clicks). */
async function tabTo(page: Page, target: Locator, max = 250, key: "Tab" | "Shift+Tab" = "Tab") {
  const handle = await target.elementHandle();
  if (!handle) throw new Error("tabTo: target not in DOM");
  for (let i = 0; i < max; i++) {
    if (await handle.evaluate((el) => el === document.activeElement)) return;
    await page.keyboard.press(key);
  }
  throw new Error(`tabTo: target not reached after ${max} presses`);
}

const live = (page: Page) => page.getByTestId("a11y-live");
const solarButton = (page: Page) => page.getByRole("button", { name: "Where to build solar?" });
const solarPanel = (page: Page) => page.getByTestId("solar-panel");

test.describe("a11y: blind / low vision", () => {
  test.beforeEach(async ({ page }) => {
    // Capture speech instead of playing it: window.__spoken collects every utterance text.
    await page.addInitScript(() => {
      const w = window as unknown as { __spoken: string[] };
      w.__spoken = [];
      if ("speechSynthesis" in window) {
        const synth = window.speechSynthesis;
        synth.speak = (u: SpeechSynthesisUtterance) => {
          w.__spoken.push(u.text);
          window.setTimeout(() => u.onend?.(new Event("end") as SpeechSynthesisEvent), 1500);
        };
        synth.cancel = () => undefined;
      }
    });
  });

  test("axe: no serious/critical violations in four /explore states", async ({ page }, info) => {
    await openReady(page);
    await expect(solarPanel(page)).toBeVisible(); // 1440 px opens on the solar decision map
    await expect(page.getByRole("img", { name: /3D globe of Spain/ })).toBeVisible();
    await axeScan(page, info, "initial");

    // Solar panel with a zone card (selected from Map in words, the keyboard alternative to the globe).
    await page.getByTestId("map-in-words-toggle").click();
    await page.getByTestId("map-in-words").getByRole("button", { name: /^Select zone/ }).first().click();
    await expect(page.locator("#solar-zone-card-heading")).toBeVisible();
    await axeScan(page, info, "solar-zone-card");

    // Study findings (Trend panel opens on the findings tab).
    await page.getByRole("button", { name: "Trend", exact: true }).click();
    await expect(page.getByTestId("findings-panel")).toBeVisible();
    await expect(page.getByTestId("findings-panel").getByRole("button", { name: /^Read aloud/ }).first()).toBeVisible();
    await axeScan(page, info, "findings");

    // Accessibility menu (TopNav, agent A).
    await page.getByRole("button", { name: /^Accessibility/ }).first().click();
    await page.waitForTimeout(300);
    await axeScan(page, info, "a11y-menu");
  });

  test("keyboard only: open solar panel, select a zone in Map in words, read its card", async ({ page }) => {
    await openReady(page);

    // 1. First Tab stop is the skip link; Enter moves focus to <main>.
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Skip to main content" })).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.locator("#main-content")).toBeFocused();

    // 2. Reach the solar button by Tab. At 1440 px the panel is already open: Enter closes, Enter reopens.
    await tabTo(page, solarButton(page));
    if (await solarPanel(page).isVisible()) {
      await page.keyboard.press("Enter");
      await expect(solarPanel(page)).toHaveCount(0);
      await expect(live(page)).toContainText("closed");
    }
    await page.keyboard.press("Enter");
    await expect(solarPanel(page)).toBeVisible();
    // Focus moved into the panel (its heading) and the change was announced.
    await expect(solarPanel(page).getByRole("heading", { level: 2 })).toBeFocused();
    await expect(live(page)).toContainText(/opened|loaded/);

    // 3. Escape closes the panel and focus returns to its trigger; Enter opens it again.
    await page.keyboard.press("Escape");
    await expect(solarPanel(page)).toHaveCount(0);
    await expect(solarButton(page)).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(solarPanel(page)).toBeVisible();

    // 4. Map in words: reachable from the bottom menu; focus lands on its heading.
    await tabTo(page, page.getByTestId("map-in-words-toggle"));
    await page.keyboard.press("Enter");
    const words = page.getByTestId("map-in-words");
    await expect(words).toBeVisible();
    await expect(words.getByRole("heading", { level: 2 })).toBeFocused();
    await expect(words.getByText(/Green · promising \(\d+ zones\)/)).toBeVisible();

    // 5. Select the first green zone from the list (same action as clicking it on the globe).
    const select = words.locator('details[data-group="good"]').getByRole("button", { name: /^Select zone/ }).first();
    const label = (await select.getAttribute("aria-label")) ?? "";
    await tabTo(page, select);
    await page.keyboard.press("Enter");
    const cardHeading = page.locator("#solar-zone-card-heading");
    await expect(cardHeading).toBeFocused();
    await expect(cardHeading).toHaveText("Promising place to look first.");
    await expect(live(page)).toContainText("Zone selected");
    const region = label.replace(/^Select zone \S+, /, "").replace(/, on the map$/, "");
    await expect(solarPanel(page)).toContainText(region);
    await expect(words.locator('li[aria-current="true"]')).toHaveCount(1);

    // 6. Read the card aloud with the keyboard; the spoken text is the card's plain-language text.
    const read = solarPanel(page).getByRole("button", { name: "Read aloud: this zone card" });
    await tabTo(page, read, 10);
    await page.keyboard.press("Enter");
    await expect(live(page)).toContainText("Reading aloud.");
    const spoken = await page.evaluate(() => (window as unknown as { __spoken: string[] }).__spoken);
    expect(spoken.length).toBeGreaterThan(0);
    expect(spoken[spoken.length - 1]).toContain("Promising place to look first.");
    expect(spoken[spoken.length - 1]).toContain(region);
    await expect(solarPanel(page).getByRole("button", { name: "Stop reading" })).toBeVisible();
    await page.keyboard.press("Enter");
    await expect(live(page)).toContainText("Stopped reading.");

    // 7. Escape inside Map in words closes it and returns focus to its toggle.
    await words.getByRole("heading", { level: 2 }).focus();
    await page.keyboard.press("Escape");
    await expect(words).toHaveCount(0);
    await expect(page.getByTestId("map-in-words-toggle")).toBeFocused();
  });

  test("screen-reader mode shows Map in words automatically; climate view described in words", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("aethra-a11y", JSON.stringify({ screenReader: true })));
    await page.setViewportSize({ width: 1100, height: 850 }); // below 1200 px: opens on the climate map
    await openReady(page);
    const words = page.getByTestId("map-in-words");
    await expect(words).toBeVisible();
    await expect(words).toContainText("Climate map");
    await expect(words).toContainText(/Variable: .+\./);
    await expect(words).toContainText(/Spain-wide \(Peninsula and Balearics\)/);
    await expect(page.getByRole("img", { name: /3D globe of Spain showing the climate map/ })).toBeVisible();
    // Landmarks
    await expect(page.getByRole("banner")).toHaveCount(1);
    await expect(page.getByRole("main")).toHaveCount(1);
    await expect(page.getByRole("navigation", { name: "Main actions" })).toBeVisible();
  });
});
