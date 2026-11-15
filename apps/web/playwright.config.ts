import { defineConfig } from "@playwright/test";

/**
 * Simulated Use Cases — Automated Functional Validation (docs/SCENARIO_VALIDATION.md).
 * Runs against the production JUDGE build (no NEXT_PUBLIC_ENABLE_EXPLORATORY).
 *
 *   npm run build && npm run e2e               # starts `next start -p 3519` itself
 *   E2E_BASE_URL=https://… npm run e2e         # or test an already running / deployed build
 *
 * Browser: the system Chrome by default (CHROME_PATH), so no browser download is needed.
 * Cesium needs WebGL; SwiftShader provides it on machines without a GPU.
 */
const PORT = 3519;
const baseURL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`;
const executablePath = process.env.CHROME_PATH ?? "/usr/bin/google-chrome";

export default defineConfig({
  testDir: "./e2e",
  // Presentation stills (e2e/capture.spec.ts) run only with `npm run e2e:capture`.
  grepInvert: process.env.E2E_CAPTURE === "1" ? undefined : /@capture/,
  outputDir: "./e2e-results/artifacts",
  timeout: 180_000,
  expect: { timeout: 30_000 },
  fullyParallel: false,
  workers: 1, // one WebGL globe at a time keeps timings comparable
  retries: 0,
  reporter: [["list"], ["json", { outputFile: "e2e-results/report.json" }]],
  use: {
    baseURL,
    viewport: { width: 1440, height: 900 },
    locale: "en-GB",
    trace: "retain-on-failure",
    video: process.env.E2E_VIDEO === "0" ? "off" : "on", // E2E_VIDEO=0 where Playwright has no ffmpeg build
    screenshot: "only-on-failure",
    launchOptions: {
      executablePath,
      args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
    },
  },
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: `npx next start -p ${PORT}`,
        url: `${baseURL}/explore`,
        reuseExistingServer: true,
        timeout: 120_000,
      },
});
