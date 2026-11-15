import { expect, test } from "@playwright/test";
import { EXPLORATORY_FEATURES_ENABLED } from "../lib/demo-mode";
import { Journey, openReady } from "./helpers";

test.describe("TARO Agentic Brain E2E", () => {
  test("TARO API and UI think, query Markdown & regional bundle, and record research notes", async ({
    page,
    request,
  }, info) => {
    const readyMs = await openReady(page);
    const j = new Journey(page, info, "TARO-E2E");

    // 1. Verify status endpoint exposes the new Markdown & regional tools
    const statusRes = await request.get("/api/aethra/status");
    expect(statusRes.ok()).toBeTruthy();
    const statusBody = (await statusRes.json()) as {
      name: string;
      tools: string[];
    };
    expect(statusBody.name).toBe("TARO");
    expect(statusBody.tools).toContain("read_markdown_brain");
    expect(statusBody.tools).toContain("query_regional_climate");
    expect(statusBody.tools).toContain("append_research_note");

    // 2. If exploratory UI is enabled, open TARO panel on /explore and interact live
    const taroBtn = page.getByRole("button", { name: "TARO" });
    if (EXPLORATORY_FEATURES_ENABLED || (await taroBtn.count()) > 0) {
      await j.click(taroBtn, "Open TARO Panel");
      const panel = page.locator("#taro");
      await expect(panel).toBeVisible();
      await j.shot("01-taro-open");

      const input = panel.locator("input");
      await input.fill("¿Qué tendencia de temperatura hay en Málaga según los datos de NASA?");
      await panel.locator('button[type="submit"]').click();

      await expect(panel.getByText(/0\.56/)).toBeVisible({ timeout: 30_000 });
      const traceSummary = panel.getByText(/TARO Brain/);
      await expect(traceSummary).toBeVisible();
      await traceSummary.click();
      await j.shot("02-taro-answered-malaga");
    } else {
      // In strict judge build, test the live API directly
      const askRes = await request.post("/api/aethra/ask", {
        data: {
          question: "¿Qué tendencia de temperatura hay en Málaga según los datos de NASA?",
          session: { sessionId: "e2e-malaga" },
        },
      });
      expect(askRes.ok()).toBeTruthy();
      const ans = (await askRes.json()) as {
        responseText: string;
        toolsInvoked: string[];
        trace: { kind: string; title: string }[];
      };
      expect(ans.responseText).toMatch(/0\.56/);
      expect(ans.toolsInvoked).toContain("query_regional_climate");
      expect(ans.trace.length).toBeGreaterThan(0);
    }

    j.record({
      question: "Live E2E check of TARO Markdown Brain & regional climate lookup",
      readyMs,
      verified: ["status tools", "Málaga provincial lookup (+0.56 °C/decade)", "TARO Brain trace"],
      limitations: ["Tested in headless Chromium via Playwright."],
    });
  });
});
