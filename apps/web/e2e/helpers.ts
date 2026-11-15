import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, type Locator, type Page, type TestInfo } from "@playwright/test";

/**
 * Shared helpers for the simulated-use-case suite. Expected scientific values are READ from the
 * published artifacts (evidence-cards.json); nothing here computes a statistic. Formatting mirrors
 * EvidenceCardPanel (sign glyph + 2 decimals) so assertions compare displayed text.
 */

const ROOT = join(__dirname, "..");
export const METRICS_DIR = join(ROOT, "e2e-results", "metrics");
export const SHOTS_DIR = join(ROOT, "e2e-results", "screenshots");

interface CardJson {
  id: string;
  question: string;
  status: string;
  topic: "temperature" | "joint_low";
  region: { scope: string; name: string };
  outcome: string;
  outcome_label: string;
  how_much: { slope_per_decade: number; ci95_per_decade: [number, number]; units: string };
  evidence: { n_years: number; p: number; p_adjusted_bh?: number };
  sources: { name: string }[];
  when: string;
}

export function card(id: string): CardJson {
  const raw: unknown = JSON.parse(readFileSync(join(ROOT, "public/data/evidence-cards.json"), "utf8"));
  if (typeof raw !== "object" || raw === null || !("cards" in raw) || !Array.isArray(raw.cards)) {
    throw new Error("evidence-cards.json: unexpected schema");
  }
  const found = (raw.cards as CardJson[]).find((c) => c.id === id);
  if (!found) throw new Error(`card ${id} missing`);
  return found;
}

/** Same display rule as EvidenceCardPanel.signed(). */
export function signed(v: number, digits = 2): string {
  return `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v).toFixed(digits)}`; // zero has no sign ("±" read as uncertainty)
}

/** Ready = page loaded and the globe finished "Preparing Spain" (a readiness signal, not a fixed delay). */
export async function openReady(page: Page, path = "/explore"): Promise<number> {
  const t0 = Date.now();
  await page.goto(path, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.body.innerText.length > 0 && !document.body.innerText.includes("Preparing Spain"), null, {
    timeout: 120_000,
  });
  await expect(page.locator("canvas").first()).toBeVisible();
  return Date.now() - t0;
}

/** Counts user interactions so each scenario can report "interactions to evidence". */
export class Journey {
  private clicks = 0;
  private readonly started = Date.now();
  private readonly route: string[] = [];
  private readonly shots: string[] = [];

  constructor(
    private readonly page: Page,
    private readonly info: TestInfo,
    readonly scenario: string,
  ) {}

  async click(target: Locator, label: string): Promise<void> {
    await target.click();
    this.clicks += 1;
    this.route.push(label);
  }

  /** Keyboard activation (focus + Enter), counted as one interaction. */
  async press(target: Locator, label: string): Promise<void> {
    await target.focus();
    await this.page.keyboard.press("Enter");
    this.clicks += 1;
    this.route.push(label);
  }

  async shot(name: string): Promise<void> {
    mkdirSync(SHOTS_DIR, { recursive: true });
    const file = join(SHOTS_DIR, `${this.scenario}-${name}-r${this.info.repeatEachIndex}.png`);
    await this.page.screenshot({ path: file });
    this.shots.push(file.replace(`${ROOT}/`, "apps/web/"));
    await this.info.attach(name, { path: file, contentType: "image/png" });
  }

  /** Writes the scenario metrics; `evidenceMs` is the time-to-evidence proxy (see SCENARIO_VALIDATION.md). */
  record(fields: { question: string; verified: string[]; readyMs: number; limitations: string[] }): void {
    mkdirSync(METRICS_DIR, { recursive: true });
    const row = {
      scenario: this.scenario,
      persona: "SIMULATED",
      run: this.info.repeatEachIndex,
      question: fields.question,
      route: this.route,
      interactions: this.clicks,
      appReadyMs: fields.readyMs,
      timeToEvidenceMs: Date.now() - this.started,
      verified: fields.verified,
      screenshots: this.shots,
      limitations: fields.limitations,
      browser: `${this.info.project.use.launchOptions?.executablePath ?? "chromium"} (SwiftShader WebGL)`,
      viewport: this.page.viewportSize(),
    };
    writeFileSync(join(METRICS_DIR, `${this.scenario}-r${this.info.repeatEachIndex}.json`), JSON.stringify(row, null, 1));
  }
}

/** Visible text of the page, normalised for robust substring checks. */
export async function bodyText(page: Page): Promise<string> {
  return (await page.locator("body").innerText()).replace(/\s+/g, " ");
}

/** Phrases that would mean an unsupported production / investment / forecast claim is being made. */
export const FORBIDDEN_CLAIMS = [
  /\b\d+(\.\d+)?\s?(MWh|GWh|€|EUR)\b/,
  /\bwill (produce|generate|earn)\b/i,
  /\brecommend(ed)? (site|location|investment)\b/i,
  /\bbest (site|location)s?\b/i,
  /\bsuitability score\b/i,
];
