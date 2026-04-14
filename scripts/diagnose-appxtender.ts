/**
 * Diagnostic script for AppXtender viewer-based page capture.
 * Tests the new approach: navigate to the viewer → capture page images
 * via network interception, DOM extraction, or screenshot.
 *
 * Saves captured images to disk for visual verification.
 *
 * Usage: npx tsx scripts/diagnose-appxtender.ts
 */

import { chromium, type Page, type BrowserContext, type Response } from "playwright";
import * as fs from "fs";
import * as path from "path";

const FACILITY_ID = "AL7201";
const BASE_URL = "https://imaging.ok.gov";
const SEARCH_API = "https://surveys.health.ok.gov/Api/search";
const APP_ID = "346";
const OUTPUT_DIR = path.join(process.cwd(), "diag-output");

// ─── Helpers ───────────────────────────────────────────────────────────────────

function elapsed(start: number): string {
  return `${((Date.now() - start) / 1000).toFixed(1)}s`;
}

function logStep(step: string, detail?: string) {
  const ts = new Date().toISOString().slice(11, 23);
  console.log(`[${ts}] ${step}${detail ? ` — ${detail}` : ""}`);
}

function logError(step: string, error: any) {
  const ts = new Date().toISOString().slice(11, 23);
  console.error(`[${ts}] ❌ ${step}: ${error?.message || error}`);
}

function saveImage(name: string, buffer: Buffer): string {
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const filePath = path.join(OUTPUT_DIR, name);
  fs.writeFileSync(filePath, buffer);
  return filePath;
}

// ─── Step 1: Fetch document list via API ────────────────────────────────────────

async function fetchDocuments(): Promise<any> {
  logStep("STEP 1", `Fetching documents for facility ${FACILITY_ID}`);
  const start = Date.now();

  const response = await fetch(SEARCH_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      FacilityId: FACILITY_ID,
      FacilityName: "",
      County: "",
      City: "",
      Zip: "",
      SurveyDocsOnly: true,
    }),
  });

  logStep("  Response", `HTTP ${response.status} in ${elapsed(start)}`);

  if (!response.ok) {
    throw new Error(`Search API failed: ${response.status}`);
  }

  const data = await response.json();
  const docs = data.documents || [];

  logStep("  Result", `${docs.length} documents found`);
  for (const doc of docs) {
    console.log(
      `    Doc ${doc.documentId}: ${doc.pageCount} pages, type="${doc.documentType}", exit=${doc.exitDate}`
    );
  }

  // Select most recent survey document
  const surveyDocs = docs.filter(
    (d: any) =>
      d.documentType &&
      (d.documentType.toLowerCase().includes("survey") ||
        d.documentType.toLowerCase().includes("inspection"))
  );

  if (surveyDocs.length === 0) {
    throw new Error("No survey documents found");
  }

  surveyDocs.sort((a: any, b: any) => {
    const parseDate = (s: string) => {
      const [m, d, y] = s.split("-");
      return new Date(`${y}-${m}-${d}`).getTime();
    };
    return parseDate(b.exitDate) - parseDate(a.exitDate);
  });

  const selected = surveyDocs[0];
  logStep(
    "  Selected",
    `Doc ${selected.documentId} (${selected.pageCount} pages, exit ${selected.exitDate})`
  );

  return selected;
}

// ─── Step 2: Navigate to the AppXtender viewer ─────────────────────────────────

async function navigateToViewer(
  page: Page,
  context: BrowserContext,
  documentId: number
): Promise<void> {
  logStep("STEP 2", `Navigating to viewer for doc ${documentId}`);

  const testLaunchUrl = `${BASE_URL}/Appxtender/TestLaunch?AppId=${APP_ID}&DocId=${documentId}`;
  logStep("  URL", testLaunchUrl);

  const start = Date.now();

  try {
    await page.goto(testLaunchUrl, { waitUntil: "networkidle", timeout: 60000 });
    logStep("  TestLaunch loaded", `in ${elapsed(start)}`);
  } catch (err: any) {
    logError("  page.goto", err);
  }

  // Wait for AngularJS to resolve credentials
  logStep("  Waiting 5s for AngularJS...");
  await page.waitForTimeout(5000);

  // Check for launch link
  const launchLink = await page.$('a[target="_self"]');
  if (launchLink) {
    const href = await launchLink.getAttribute("href");
    logStep("  Launch link found", `href=${href?.slice(0, 120)}`);

    if (href && !href.includes("{{")) {
      logStep("  Clicking launch link...");
      const clickStart = Date.now();

      try {
        await Promise.all([
          page.waitForNavigation({ waitUntil: "networkidle", timeout: 45000 }),
          launchLink.click(),
        ]);
        logStep("  Viewer loaded", `in ${elapsed(clickStart)}`);
      } catch (err: any) {
        logError("  Navigation after click", err);
      }
    } else {
      logStep("  Waiting 5 more seconds for Angular...");
      await page.waitForTimeout(5000);
      const retryHref = await launchLink.getAttribute("href");
      if (retryHref && !retryHref.includes("{{")) {
        logStep("  Clicking launch link (retry)...");
        try {
          await Promise.all([
            page.waitForNavigation({ waitUntil: "networkidle", timeout: 45000 }),
            launchLink.click(),
          ]);
        } catch (err: any) {
          logError("  Navigation after retry click", err);
        }
      } else {
        logError(
          "  Angular",
          "Credentials never resolved in launch link"
        );
      }
    }
  } else {
    logStep("  No launch link — may have auto-redirected");
  }

  // Report current state
  const currentUrl = page.url();
  logStep("  Current URL", currentUrl);

  const cookies = await context.cookies();
  const xsrf = cookies.find((c) => c.name === "WX-XSRF-TOKEN");
  logStep(
    "  WX-XSRF-TOKEN",
    xsrf ? `FOUND (${xsrf.value.slice(0, 30)}...)` : "NOT FOUND"
  );

  // Take a screenshot of the viewer state
  const viewerScreenshot = await page.screenshot({ type: "png" });
  const viewerPath = saveImage("01-viewer-loaded.png", viewerScreenshot);
  logStep("  Viewer screenshot saved", viewerPath);
}

// ─── Step 3: Inspect the DOM structure ──────────────────────────────────────────

async function inspectDOM(page: Page): Promise<void> {
  logStep("STEP 3", "Inspecting DOM structure for content area selectors");

  const domInfo = await page.evaluate(() => {
    const result: any = {};

    // Find all images
    const imgs = Array.from(document.querySelectorAll("img"));
    result.images = imgs.map((img) => ({
      src: img.src?.slice(0, 100),
      naturalWidth: img.naturalWidth,
      naturalHeight: img.naturalHeight,
      displayWidth: img.offsetWidth,
      displayHeight: img.offsetHeight,
      complete: img.complete,
      parentClass: img.parentElement?.className?.slice(0, 80),
    }));

    // Find all canvases
    const canvases = Array.from(document.querySelectorAll("canvas"));
    result.canvases = canvases.map((c) => ({
      width: c.width,
      height: c.height,
      displayWidth: c.offsetWidth,
      displayHeight: c.offsetHeight,
      parentClass: c.parentElement?.className?.slice(0, 80),
    }));

    // Find potential content area containers
    const contentSelectors = [
      "#viewerContainer",
      "#documentViewer",
      '[class*="viewer-content"]',
      '[class*="page-content"]',
      '[class*="doc-viewer"]',
      '[class*="documentArea"]',
      '[class*="mainViewer"]',
      '[class*="pageContent"]',
      '[role="main"]',
      "main",
    ];

    result.contentContainers = [];
    for (const sel of contentSelectors) {
      const el = document.querySelector(sel);
      if (el) {
        const rect = el.getBoundingClientRect();
        result.contentContainers.push({
          selector: sel,
          tag: el.tagName,
          class: (el as HTMLElement).className?.slice(0, 80),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          childCount: el.children.length,
        });
      }
    }

    // Find sidebar/thumbnails
    const sidebarSelectors = [
      '[class*="sidebar"]',
      '[class*="thumb"]',
      '[class*="pageList"]',
      '[class*="page-list"]',
      '[class*="panel-left"]',
    ];
    result.sidebars = [];
    for (const sel of sidebarSelectors) {
      const el = document.querySelector(sel);
      if (el) {
        const rect = el.getBoundingClientRect();
        result.sidebars.push({
          selector: sel,
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        });
      }
    }

    // Find toolbar
    const toolbarSelectors = [
      '[class*="toolbar"]',
      '[class*="header"]',
      "nav",
      '[role="toolbar"]',
    ];
    result.toolbars = [];
    for (const sel of toolbarSelectors) {
      const el = document.querySelector(sel);
      if (el) {
        const rect = el.getBoundingClientRect();
        result.toolbars.push({
          selector: sel,
          height: Math.round(rect.height),
          width: Math.round(rect.width),
        });
      }
    }

    // Find loading spinners
    const spinners = Array.from(
      document.querySelectorAll(
        '[class*="loading"], [class*="spinner"], [class*="progress"], img[src*="loading"]'
      )
    );
    result.spinners = spinners.map((el) => {
      const style = window.getComputedStyle(el);
      return {
        tag: el.tagName,
        class: (el as HTMLElement).className?.slice(0, 60),
        visible: style.display !== "none" && style.visibility !== "hidden",
      };
    });

    // Find page navigation inputs
    const inputs = Array.from(
      document.querySelectorAll<HTMLInputElement>("input")
    );
    result.inputs = inputs.map((inp) => ({
      type: inp.type,
      value: inp.value,
      class: inp.className?.slice(0, 60),
      width: inp.offsetWidth,
    }));

    // Body inner text sample (first 500 chars)
    result.bodyText = document.body.innerText.slice(0, 500).replace(/\s+/g, " ");

    // All classes on body children (top-level layout)
    const bodyChildren = Array.from(document.body.children);
    result.bodyLayout = bodyChildren.map((el) => ({
      tag: el.tagName,
      class: (el as HTMLElement).className?.slice(0, 80),
      width: (el as HTMLElement).offsetWidth,
      height: (el as HTMLElement).offsetHeight,
    }));

    return result;
  });

  console.log();
  logStep("  Images", `${domInfo.images.length} found`);
  for (const img of domInfo.images) {
    console.log(
      `    ${img.naturalWidth}x${img.naturalHeight} (displayed ${img.displayWidth}x${img.displayHeight}) complete=${img.complete}`
    );
    console.log(`      src: ${img.src}`);
    console.log(`      parent: ${img.parentClass}`);
  }

  logStep("  Canvases", `${domInfo.canvases.length} found`);
  for (const c of domInfo.canvases) {
    console.log(`    ${c.width}x${c.height} (displayed ${c.displayWidth}x${c.displayHeight})`);
    console.log(`      parent: ${c.parentClass}`);
  }

  logStep("  Content containers", `${domInfo.contentContainers.length} found`);
  for (const c of domInfo.contentContainers) {
    console.log(`    ${c.selector}: ${c.width}x${c.height} (${c.childCount} children)`);
  }

  logStep("  Sidebars", `${domInfo.sidebars.length} found`);
  for (const s of domInfo.sidebars) {
    console.log(`    ${s.selector}: ${s.width}x${s.height}`);
  }

  logStep("  Toolbars", `${domInfo.toolbars.length} found`);
  for (const t of domInfo.toolbars) {
    console.log(`    ${t.selector}: ${t.width}x${t.height}`);
  }

  logStep("  Spinners", `${domInfo.spinners.length} found`);
  for (const s of domInfo.spinners) {
    console.log(`    ${s.tag}.${s.class} visible=${s.visible}`);
  }

  logStep("  Inputs", `${domInfo.inputs.length} found`);
  for (const inp of domInfo.inputs) {
    console.log(
      `    type=${inp.type} value="${inp.value}" class="${inp.class}" width=${inp.width}`
    );
  }

  logStep("  Body text", domInfo.bodyText.slice(0, 200));

  logStep("  Body layout", `${domInfo.bodyLayout.length} top-level children`);
  for (const el of domInfo.bodyLayout) {
    console.log(`    <${el.tag}> class="${el.class}" ${el.width}x${el.height}`);
  }
}

// ─── Step 4: Wait for page content and test capture ─────────────────────────────

async function testPageCapture(
  page: Page,
  pageNum: number,
  totalPages: number
): Promise<void> {
  logStep(
    "STEP 4",
    `Testing page ${pageNum}/${totalPages} capture`
  );

  // ── 4a: Wait for content to render ────────────────────────────────────────
  logStep("  4a", "Waiting for page content to render...");
  const waitStart = Date.now();
  let contentFound = false;

  for (let i = 0; i < 60; i++) {
    const status = await page.evaluate(() => {
      const imgs = Array.from(document.querySelectorAll("img"));
      const hasContentImage = imgs.some(
        (img) =>
          img.naturalWidth > 200 &&
          img.naturalHeight > 200 &&
          img.offsetWidth > 100 &&
          img.complete
      );

      const canvases = Array.from(document.querySelectorAll("canvas"));
      const hasCanvas = canvases.some((c) => c.width > 200 && c.height > 200);

      const spinners = Array.from(
        document.querySelectorAll(
          '[class*="loading"], [class*="spinner"]'
        )
      );
      const hasSpinner = spinners.some((el) => {
        const style = window.getComputedStyle(el);
        return style.display !== "none" && style.visibility !== "hidden";
      });

      return { hasContentImage, hasCanvas, hasSpinner };
    });

    if (i % 5 === 0 || status.hasContentImage || status.hasCanvas) {
      logStep(
        `    Check ${i}`,
        `image=${status.hasContentImage} canvas=${status.hasCanvas} spinner=${status.hasSpinner} (${elapsed(waitStart)})`
      );
    }

    if ((status.hasContentImage || status.hasCanvas) && !status.hasSpinner) {
      contentFound = true;
      logStep("  Content detected!", `after ${elapsed(waitStart)}`);
      await page.waitForTimeout(1000); // Extra settle time
      break;
    }

    await page.waitForTimeout(1000);
  }

  if (!contentFound) {
    logStep("  Content wait timed out after 60s — attempting capture anyway");
  }

  // ── 4b: Try DOM image extraction ──────────────────────────────────────────
  logStep("  4b", "Testing DOM image extraction");

  const domResult = await page.evaluate(() => {
    const imgs = Array.from(document.querySelectorAll("img"));
    const candidates = imgs
      .filter(
        (img) =>
          img.naturalWidth > 200 &&
          img.naturalHeight > 200 &&
          img.complete &&
          img.offsetWidth > 100
      )
      .sort(
        (a, b) =>
          b.naturalWidth * b.naturalHeight - a.naturalWidth * a.naturalHeight
      );

    if (candidates.length > 0) {
      const img = candidates[0];
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const dataUrl = canvas.toDataURL("image/png");
          return {
            success: true,
            width: img.naturalWidth,
            height: img.naturalHeight,
            base64: dataUrl.split(",")[1],
            src: img.src.slice(0, 100),
          };
        }
      } catch (e: any) {
        return {
          success: false,
          error: `Canvas export failed (likely CORS): ${e.message}`,
          width: img.naturalWidth,
          height: img.naturalHeight,
          src: img.src.slice(0, 100),
        };
      }
    }

    // Try canvas
    const canvases = Array.from(document.querySelectorAll("canvas"));
    const canvasCandidates = canvases
      .filter((c) => c.width > 200 && c.height > 200)
      .sort((a, b) => b.width * b.height - a.width * a.height);

    if (canvasCandidates.length > 0) {
      try {
        const dataUrl = canvasCandidates[0].toDataURL("image/png");
        return {
          success: true,
          width: canvasCandidates[0].width,
          height: canvasCandidates[0].height,
          base64: dataUrl.split(",")[1],
          src: "canvas",
        };
      } catch (e: any) {
        return {
          success: false,
          error: `Canvas toDataURL failed: ${e.message}`,
        };
      }
    }

    return { success: false, error: "No suitable image or canvas found" };
  });

  if (domResult.success && domResult.base64) {
    const buf = Buffer.from(domResult.base64, "base64");
    const filePath = saveImage(
      `page${pageNum}-dom-${domResult.width}x${domResult.height}.png`,
      buf
    );
    logStep(
      "  DOM extraction SUCCESS",
      `${domResult.width}x${domResult.height}, ${buf.length} bytes → ${filePath}`
    );
  } else {
    logStep("  DOM extraction FAILED", domResult.error || "unknown");
    if (domResult.src) {
      logStep("    Image exists but can't export", `src=${domResult.src}`);
    }
  }

  // ── 4c: Try screenshot of content area ────────────────────────────────────
  logStep("  4c", "Testing screenshot capture");

  // First, try named selectors
  const contentSelectors = [
    "#viewerContainer",
    "#documentViewer",
    '[class*="viewer-content"]',
    '[class*="page-content"]',
    '[class*="documentArea"]',
    '[class*="mainViewer"]',
    '[role="main"]',
    "main",
  ];

  let selectorScreenshot = false;
  for (const sel of contentSelectors) {
    const el = await page.$(sel);
    if (el) {
      const box = await el.boundingBox();
      if (box && box.width > 300 && box.height > 300) {
        const buf = await el.screenshot({ type: "png" });
        const filePath = saveImage(
          `page${pageNum}-selector-${sel.replace(/[^a-z0-9]/gi, "_")}.png`,
          buf
        );
        logStep(
          `  Selector "${sel}" screenshot`,
          `${Math.round(box.width)}x${Math.round(box.height)}, ${buf.length} bytes → ${filePath}`
        );
        selectorScreenshot = true;
        break;
      }
    }
  }

  if (!selectorScreenshot) {
    logStep("  No named selector matched — using viewport clip");
  }

  // Also take a clipped screenshot (excluding sidebar + toolbar)
  const clipInfo = await page.evaluate(() => {
    const sidebar = document.querySelector(
      '[class*="sidebar"], [class*="thumb-panel"], [class*="pageList"], [class*="page-list"]'
    );
    const sidebarWidth = sidebar
      ? sidebar.getBoundingClientRect().width
      : 100;

    const toolbar = document.querySelector(
      '[class*="toolbar"], [class*="header"], nav, [class*="menu-bar"]'
    );
    const toolbarHeight = toolbar
      ? toolbar.getBoundingClientRect().height + toolbar.getBoundingClientRect().top
      : 75;

    return {
      sidebarWidth: Math.ceil(sidebarWidth),
      toolbarHeight: Math.ceil(toolbarHeight),
    };
  });

  const viewport = page.viewportSize()!;
  const clip = {
    x: clipInfo.sidebarWidth + 5,
    y: clipInfo.toolbarHeight + 5,
    width: viewport.width - clipInfo.sidebarWidth - 15,
    height: viewport.height - clipInfo.toolbarHeight - 15,
  };

  logStep(
    "  Clip region",
    `x=${clip.x} y=${clip.y} w=${clip.width} h=${clip.height}`
  );

  const clipBuf = await page.screenshot({ type: "png", clip });
  const clipPath = saveImage(`page${pageNum}-clip.png`, clipBuf);
  logStep(
    "  Clip screenshot",
    `${clipBuf.length} bytes → ${clipPath}`
  );

  // Also save full-page screenshot for reference
  const fullBuf = await page.screenshot({ type: "png", fullPage: false });
  const fullPath = saveImage(`page${pageNum}-fullview.png`, fullBuf);
  logStep(
    "  Full viewport screenshot",
    `${fullBuf.length} bytes → ${fullPath}`
  );
}

// ─── Step 5: Test page navigation ───────────────────────────────────────────────

async function testPageNavigation(
  page: Page,
  targetPage: number
): Promise<void> {
  logStep("STEP 5", `Navigating to page ${targetPage}`);

  // Strategy 1: Page number input
  logStep("  5a", "Trying page number input");
  const inputResult = await page.evaluate((num) => {
    const inputs = Array.from(
      document.querySelectorAll<HTMLInputElement>('input[type="number"], input[type="text"]')
    );
    for (const input of inputs) {
      const val = input.value.trim();
      if (/^\d+$/.test(val) && input.offsetWidth > 20 && input.offsetWidth < 150) {
        return {
          found: true,
          currentValue: val,
          type: input.type,
          class: input.className,
        };
      }
    }
    return { found: false };
  }, targetPage);

  if (inputResult.found) {
    logStep(
      "  Page input found",
      `current="${inputResult.currentValue}" type=${inputResult.type}`
    );

    // Try filling and pressing Enter
    await page.evaluate((num) => {
      const inputs = Array.from(
        document.querySelectorAll<HTMLInputElement>('input[type="number"], input[type="text"]')
      );
      for (const input of inputs) {
        if (/^\d+$/.test(input.value.trim()) && input.offsetWidth > 20 && input.offsetWidth < 150) {
          input.focus();
          input.value = String(num);
          input.dispatchEvent(new Event("input", { bubbles: true }));
          input.dispatchEvent(new Event("change", { bubbles: true }));
          input.dispatchEvent(
            new KeyboardEvent("keydown", { key: "Enter", keyCode: 13, bubbles: true })
          );
          input.dispatchEvent(
            new KeyboardEvent("keyup", { key: "Enter", keyCode: 13, bubbles: true })
          );
          break;
        }
      }
    }, targetPage);

    await page.keyboard.press("Enter");
    logStep("  Filled input and pressed Enter");
    await page.waitForTimeout(3000);
  } else {
    logStep("  No page input found");
  }

  // Strategy 2: Click thumbnail
  logStep("  5b", `Trying thumbnail click for Page ${targetPage}`);
  const thumbClicked = await page.evaluate((num) => {
    const allElements = Array.from(document.querySelectorAll("*"));
    for (const el of allElements) {
      if (
        el.childNodes.length === 1 &&
        el.textContent?.trim() === `Page ${num}`
      ) {
        (el as HTMLElement).click();
        return true;
      }
    }
    return false;
  }, targetPage);

  if (thumbClicked) {
    logStep("  Thumbnail clicked");
    await page.waitForTimeout(3000);
  } else {
    logStep("  Thumbnail not found");
  }

  // Strategy 3: Next arrow
  logStep("  5c", "Trying next page button");
  const nextClicked = await page.evaluate(() => {
    const buttons = Array.from(
      document.querySelectorAll('button, [role="button"], a')
    );
    for (const btn of buttons) {
      const title = (
        btn.getAttribute("title") ||
        btn.getAttribute("aria-label") ||
        ""
      ).toLowerCase();
      const text = btn.textContent?.trim() || "";
      if (
        title.includes("next") ||
        title.includes("forward") ||
        text === "›" ||
        text === "▶" ||
        text === "►" ||
        text === ">"
      ) {
        (btn as HTMLElement).click();
        return `Clicked: "${text}" title="${title}"`;
      }
    }
    return null;
  });

  if (nextClicked) {
    logStep("  Next button clicked", nextClicked);
    await page.waitForTimeout(3000);
  } else {
    logStep("  No next button found");
  }

  // Check current page after navigation
  const afterNav = await page.evaluate(() => {
    const inputs = Array.from(
      document.querySelectorAll<HTMLInputElement>('input[type="number"], input[type="text"]')
    );
    for (const input of inputs) {
      if (/^\d+$/.test(input.value.trim())) {
        return input.value.trim();
      }
    }
    // Also check for page counter text
    const text = document.body.innerText;
    const match = text.match(/(\d+)\s*\/\s*(\d+)/);
    return match ? `${match[1]}/${match[2]}` : "unknown";
  });

  logStep("  Current page after navigation", afterNav);
}

// ─── Step 6: Test network interception ──────────────────────────────────────────

async function testNetworkInterception(
  page: Page,
  context: BrowserContext,
  documentId: number,
  pageCount: number
): Promise<void> {
  logStep("STEP 6", "Testing network interception for page images");

  const intercepted: { url: string; size: number; contentType: string }[] = [];

  // Log ALL responses from the imaging server
  const responseHandler = async (response: Response) => {
    const url = response.url();
    if (!url.includes("imaging.ok.gov")) return;

    const ct = response.headers()["content-type"] || "";
    const status = response.status();

    try {
      const body = await response.body();
      intercepted.push({ url: url.slice(0, 150), size: body.length, contentType: ct });

      if (body.length > 30000) {
        const fileName = `intercepted-${intercepted.length}-${body.length}b.bin`;
        const filePath = saveImage(fileName, body);
        logStep(
          `  Intercepted large response`,
          `${body.length} bytes, ct=${ct}, status=${status} → ${filePath}`
        );
        logStep("    URL", url.slice(0, 150));
      }
    } catch {
      // Response body not available
    }
  };

  page.on("response", responseHandler);

  // Trigger a page navigation to cause the viewer to load a new page image
  logStep("  Navigating to page 2 to trigger image load...");
  await testPageNavigation(page, 2);

  // Wait for any late responses
  await page.waitForTimeout(10000);

  // Report all intercepted responses
  logStep("  Intercepted responses summary", `${intercepted.length} total from imaging.ok.gov`);
  for (const r of intercepted) {
    const sizeKB = (r.size / 1024).toFixed(1);
    console.log(`    ${sizeKB}KB  ct=${r.contentType}  ${r.url}`);
  }

  const largeImages = intercepted.filter((r) => r.size > 30000);
  logStep(
    "  Large image responses (>30KB)",
    `${largeImages.length} found`
  );

  page.off("response", responseHandler);
}

// ─── Main ───────────────────────────────────────────────────────────────────────

async function main() {
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║   AppXtender Viewer Capture Diagnostic — Oklahoma (AL7201) ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");
  console.log();
  console.log(`Output directory: ${OUTPUT_DIR}`);
  console.log();

  // Clean output directory
  if (fs.existsSync(OUTPUT_DIR)) {
    fs.rmSync(OUTPUT_DIR, { recursive: true });
  }
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  // Step 1: Get documents
  const doc = await fetchDocuments();
  console.log();

  // Launch browser
  logStep("LAUNCHING BROWSER", "Visible mode (not headless)");

  const browser = await chromium.launch({
    headless: false,
    slowMo: 50,
  });

  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    viewport: { width: 1920, height: 1200 },
  });

  const page = await context.newPage();

  try {
    // Step 2: Navigate to viewer
    await navigateToViewer(page, context, doc.documentId);
    console.log();

    // Step 3: Inspect DOM
    await inspectDOM(page);
    console.log();

    // Step 4: Test page 1 capture (wait for content, DOM extraction, screenshot)
    await testPageCapture(page, 1, doc.pageCount);
    console.log();

    // Step 5: Test page navigation
    await testPageNavigation(page, 2);
    console.log();

    // Step 4 again: Capture page 2
    await testPageCapture(page, 2, doc.pageCount);
    console.log();

    // Step 6: Test network interception (navigate to page 3)
    await testNetworkInterception(page, context, doc.documentId, doc.pageCount);
    console.log();

  } catch (err: any) {
    logError("FATAL", err.message);
    console.error(err.stack);
  }

  console.log();
  console.log("═══════════════════════════════════════════════════════════");
  logStep("SUMMARY", `Check ${OUTPUT_DIR} for captured images`);
  const files = fs.readdirSync(OUTPUT_DIR);
  for (const f of files) {
    const stat = fs.statSync(path.join(OUTPUT_DIR, f));
    console.log(`  ${f} (${(stat.size / 1024).toFixed(1)} KB)`);
  }
  console.log();
  logStep("DONE", "Press Ctrl+C to close browser");

  // Keep browser open for manual inspection
  await new Promise(() => {});
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
