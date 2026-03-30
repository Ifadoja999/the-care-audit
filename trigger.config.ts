import { defineConfig } from "@trigger.dev/sdk";
import { syncEnvVars, aptGet } from "@trigger.dev/build/extensions/core";

// Custom extension to install Playwright Chromium browser.
// The built-in playwright() extension is incompatible with Playwright 1.58.2's
// dry-run output format (grep pattern mismatch, see triggerdotdev/trigger.dev#2440).
// We install Chromium directly with explicit PLAYWRIGHT_BROWSERS_PATH so the
// build-time install path matches the runtime env var set in the Trigger.dev dashboard.
const playwrightChromium = {
  name: "PlaywrightChromiumInstall",
  externalsForTarget() {
    return ["playwright", "playwright-core"];
  },
  onBuildComplete(context: any) {
    context.addLayer({
      id: "playwright-chromium",
      commands: [
        // Install browser binary to /app/.playwright-browsers (writable by node user).
        // PLAYWRIGHT_BROWSERS_PATH must match the runtime env var in Trigger.dev dashboard.
        "PLAYWRIGHT_BROWSERS_PATH=/app/.playwright-browsers npx playwright install chromium",
      ],
    });
  },
};

export default defineConfig({
  project: "proj_xoqvbnyzjssttovvnypn",
  dirs: ["./src/trigger"],
  runtime: "node",
  maxDuration: 28800, // 8 hours max (enrichment tasks can take 6-7 hours)
  retries: {
    enabledInDev: false,
    default: {
      maxAttempts: 3,
      minTimeoutInMs: 1000,
      maxTimeoutInMs: 30000,
      factor: 2,
      randomize: true,
    },
  },
  build: {
    extensions: [
      syncEnvVars(async () => {
        return [];
      }),
      // System dependencies: Chromium libs + poppler-utils (pdftotext, pdftoppm, pdfinfo)
      aptGet({
        packages: [
          "poppler-utils",
          "fonts-noto-color-emoji",
          "fonts-unifont",
          "libfontconfig1",
          "libfreetype6",
          "libasound2",
          "libatk1.0-0",
          "libatk-bridge2.0-0",
          "libatspi2.0-0",
          "libcairo2",
          "libcups2",
          "libdbus-1-3",
          "libdrm2",
          "libgbm1",
          "libglib2.0-0",
          "libnspr4",
          "libnss3",
          "libpango-1.0-0",
          "libx11-6",
          "libxcb1",
          "libxcomposite1",
          "libxdamage1",
          "libxext6",
          "libxfixes3",
          "libxkbcommon0",
          "libxrandr2",
        ],
      }),
      // Install Chromium browser binary to /app/.playwright-browsers
      playwrightChromium,
    ],
  },
});
