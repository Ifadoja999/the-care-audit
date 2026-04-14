/**
 * Quick test: verify network interception captures page images
 * using the "next page" button for navigation (not page input).
 *
 * Usage: npx tsx scripts/test-capture.ts
 */

import { chromium } from "playwright";
import * as fs from "fs";
import * as path from "path";

const BASE_URL = "https://imaging.ok.gov";
const APP_ID = "346";
const DOC_ID = 113988; // AL7201's latest survey
const PAGES_TO_TEST = 3;
const OUTPUT_DIR = path.join(process.cwd(), "diag-output");

function ts(): string {
  return new Date().toISOString().slice(11, 23);
}

async function main() {
  console.log(`[${ts()}] === Quick Capture Test (Doc ${DOC_ID}, ${PAGES_TO_TEST} pages) ===\n`);

  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  // Clean old test files
  const oldFiles = fs.readdirSync(OUTPUT_DIR).filter((f) => f.startsWith("test-"));
  for (const f of oldFiles) fs.unlinkSync(path.join(OUTPUT_DIR, f));

  const browser = await chromium.launch({ headless: false, slowMo: 50 });
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    viewport: { width: 1920, height: 1200 },
  });
  const page = await context.newPage();

  // ─── Set up interception BEFORE navigation ────────────────────────────────
  const imageQueue: Buffer[] = [];

  page.on("response", async (response) => {
    try {
      const url = response.url();
      if (url.includes("GetRenderImage") && response.status() === 200) {
        const body = await response.body();
        if (body.length > 30_000) {
          console.log(`[${ts()}] INTERCEPTED: ${body.length} bytes from ${url.slice(0, 80)}...`);
          imageQueue.push(body);
        }
      }
    } catch {}
  });

  // ─── Navigate to viewer ───────────────────────────────────────────────────
  const testLaunchUrl = `${BASE_URL}/Appxtender/TestLaunch?AppId=${APP_ID}&DocId=${DOC_ID}`;
  console.log(`[${ts()}] Navigating to TestLaunch...`);

  await page.goto(testLaunchUrl, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(5000);

  // Check if auto-redirected
  const url = page.url();
  console.log(`[${ts()}] Current URL: ${url.slice(0, 120)}`);

  if (!url.includes("IDocument")) {
    const link = await page.$('a[target="_self"]');
    if (link) {
      const href = await link.getAttribute("href");
      if (href && !href.includes("{{")) {
        console.log(`[${ts()}] Clicking launch link...`);
        await Promise.all([
          page.waitForNavigation({ waitUntil: "networkidle", timeout: 45000 }),
          link.click(),
        ]);
      }
    }
  }

  console.log(`[${ts()}] Viewer loaded. Waiting for page 1 image...`);

  // ─── Wait for page 1 (auto-loaded by viewer) ─────────────────────────────
  const page1Start = Date.now();
  while (imageQueue.length === 0 && Date.now() - page1Start < 60_000) {
    await page.waitForTimeout(500);
  }

  if (imageQueue.length > 0) {
    const buf = imageQueue.shift()!;
    const filePath = path.join(OUTPUT_DIR, "test-page1.jpg");
    fs.writeFileSync(filePath, buf);
    console.log(
      `[${ts()}] Page 1: ${buf.length} bytes (${((Date.now() - page1Start) / 1000).toFixed(1)}s) → ${filePath}`
    );
  } else {
    console.log(`[${ts()}] Page 1: NO IMAGE intercepted after 60s`);
    const screenshot = await page.screenshot({ type: "png" });
    const filePath = path.join(OUTPUT_DIR, "test-page1-screenshot.png");
    fs.writeFileSync(filePath, screenshot);
    console.log(`[${ts()}] Page 1 screenshot: ${screenshot.length} bytes → ${filePath}`);
  }

  // ─── Capture pages 2-N using "next page" button ─────────────────────────
  for (let pageNum = 2; pageNum <= PAGES_TO_TEST; pageNum++) {
    imageQueue.length = 0; // Drain stale images

    console.log(`[${ts()}] Clicking "next page" button for page ${pageNum}...`);

    // Click the "next page" button
    const nextButton = await page.$('button[title="next page"]');
    if (nextButton) {
      await nextButton.click();
      console.log(`[${ts()}] Clicked "next page" button`);
    } else {
      console.log(`[${ts()}] No "next page" button found — trying thumbnail click`);
      const thumbClicked = await page.evaluate((num) => {
        const elements = Array.from(document.querySelectorAll("*"));
        for (const el of elements) {
          if (el.childNodes.length <= 2 && el.textContent?.trim() === `Page ${num}`) {
            (el as HTMLElement).click();
            return true;
          }
        }
        return false;
      }, pageNum);
      if (thumbClicked) {
        console.log(`[${ts()}] Clicked thumbnail for Page ${pageNum}`);
      } else {
        console.log(`[${ts()}] Could not navigate to page ${pageNum}`);
      }
    }

    await page.waitForTimeout(1500);

    // Wait for image
    const pageStart = Date.now();
    while (imageQueue.length === 0 && Date.now() - pageStart < 45_000) {
      await page.waitForTimeout(500);
    }

    if (imageQueue.length > 0) {
      const buf = imageQueue.shift()!;
      const filePath = path.join(OUTPUT_DIR, `test-page${pageNum}.jpg`);
      fs.writeFileSync(filePath, buf);
      console.log(
        `[${ts()}] Page ${pageNum}: ${buf.length} bytes (${((Date.now() - pageStart) / 1000).toFixed(1)}s) → ${filePath}`
      );
    } else {
      console.log(`[${ts()}] Page ${pageNum}: NO IMAGE after 45s`);
      const container = await page.$("#viewerContainer");
      if (container) {
        const buf = await container.screenshot({ type: "png" });
        const filePath = path.join(OUTPUT_DIR, `test-page${pageNum}-screenshot.png`);
        fs.writeFileSync(filePath, buf);
        console.log(`[${ts()}] Page ${pageNum} screenshot: ${buf.length} bytes → ${filePath}`);
      }
    }
  }

  // ─── Summary ──────────────────────────────────────────────────────────────
  console.log(`\n[${ts()}] === SUMMARY ===`);
  const files = fs.readdirSync(OUTPUT_DIR).filter((f) => f.startsWith("test-"));
  for (const f of files) {
    const stat = fs.statSync(path.join(OUTPUT_DIR, f));
    console.log(`  ${f} (${(stat.size / 1024).toFixed(1)} KB)`);
  }

  const interceptedCount = files.filter((f) => f.endsWith(".jpg")).length;
  const screenshotCount = files.filter((f) => f.includes("-screenshot")).length;
  console.log(`\n[${ts()}] Result: ${interceptedCount} intercepted, ${screenshotCount} screenshot fallbacks`);

  if (interceptedCount === PAGES_TO_TEST) {
    console.log(`[${ts()}] ✓ ALL ${PAGES_TO_TEST} pages captured via interception!`);
  } else {
    console.log(`[${ts()}] ✗ Only ${interceptedCount}/${PAGES_TO_TEST} pages intercepted`);
  }

  console.log(`\n[${ts()}] Done. Press Ctrl+C to close.`);
  await new Promise(() => {});
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
