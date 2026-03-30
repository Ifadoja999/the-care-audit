import { logger } from "@trigger.dev/sdk";
import type { Page, Response as PlaywrightResponse } from "playwright";

const APP_ID = "346"; // Oklahoma OSDH application ID in AppXtender

/**
 * Render selected pages of a document as JPEG image buffers.
 *
 * Page selection strategy: "first 3 + last 2"
 * - Documents with ≤5 pages: capture all pages
 * - Documents with >5 pages: capture pages 1, 2, 3, N-1, N
 *
 * Oklahoma inspection documents have a predictable structure:
 *   Page 1: OSDH cover letter (inspection date, deficiency status, facility info)
 *   Pages 2 through N-1: Investigation narratives (NOT needed for AI summary)
 *   Last page(s): Statement of Deficiencies (actual violation list)
 *
 * This gives the AI analyzer everything it needs: the cover letter summary,
 * the deficiency list, and enough context for an accurate violation count
 * and plain-English summary — while avoiding OOM crashes from processing
 * all pages of large documents.
 *
 * Approach: Navigate to the AppXtender Web Access viewer, which internally
 * renders pages via server-side rendering. We intercept the GetRenderImage
 * HTTP responses to capture the full-resolution JPEG images (1700x2200 @ 200 DPI).
 *
 * The viewer's internal flow per page:
 *   1. GET DocumentPage/{docId}/{pageNum} — page metadata
 *   2. GET DocumentPageVersion/{docId}/{pageNum}/1 — version info
 *   3. GET GetRenderingResult/{jobToken} — render status (single check)
 *   4. GET GetRenderImage/{jobToken} — full JPEG image
 *
 * We intercept step 4 to capture the image without needing to replicate
 * the render API flow ourselves.
 */
export async function renderDocumentPages(
  page: Page,
  baseUrl: string,
  documentId: string | number,
  pageCount: number,
  maxPages: number
): Promise<Buffer[]> {
  const targetPages = computeTargetPages(pageCount, maxPages);

  await page.setViewportSize({ width: 1920, height: 1200 });

  // ─── Set up response interception BEFORE navigation ───────────────────────
  // Queue of captured GetRenderImage JPEG buffers.
  // The response handler pushes images here; capturePage() polls it.
  const imageQueue: Buffer[] = [];

  const responseHandler = async (response: PlaywrightResponse) => {
    try {
      const url = response.url();
      if (
        url.includes("GetRenderImage") &&
        response.status() === 200
      ) {
        const body = await response.body();
        // Page images are large (>30KB). Skip any small responses.
        if (body.length > 30_000) {
          logger.debug(
            `Intercepted page image: ${body.length} bytes`
          );
          imageQueue.push(body);
        }
      }
    } catch {
      // Response body may not be available (e.g., context closed)
    }
  };

  page.on("response", responseHandler);

  try {
    // ─── Navigate to the document viewer ──────────────────────────────────────
    await navigateToViewer(page, baseUrl, documentId);

    // Wait for viewer to fully initialize (page counter visible)
    await waitForViewerReady(page);

    logger.info(
      `Capturing ${targetPages.length} of ${pageCount} pages for document ${documentId} (pages: ${targetPages.join(", ")})`
    );

    // ─── Capture each page ────────────────────────────────────────────────────
    const buffers: Buffer[] = [];

    for (let i = 0; i < targetPages.length; i++) {
      const pageNum = targetPages[i];
      let lastError: Error | null = null;

      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const buffer = await capturePage(page, pageNum, imageQueue);

          if (buffer && buffer.length > 10_000) {
            buffers.push(buffer);
            logger.debug(
              `Captured page ${pageNum} [${i + 1}/${targetPages.length}] (${buffer.length} bytes, attempt ${attempt})`
            );
            lastError = null;
            break;
          } else {
            throw new Error(
              `Page ${pageNum} image too small: ${buffer?.length ?? 0} bytes`
            );
          }
        } catch (err: any) {
          lastError = err;
          logger.warn(
            `Page ${pageNum} attempt ${attempt}/3 failed: ${err.message}`
          );
          if (attempt < 3) {
            await page.waitForTimeout(3000 * attempt);
          }
        }
      }

      if (lastError) {
        logger.error(
          `Skipping page ${pageNum} after 3 failed attempts: ${lastError.message}`
        );
      }
    }

    if (buffers.length === 0) {
      throw new Error(
        `All page captures failed for document ${documentId}`
      );
    }

    logger.info(
      `Successfully captured ${buffers.length}/${targetPages.length} pages for document ${documentId}`
    );

    return buffers;
  } finally {
    page.off("response", responseHandler);
  }
}

// ─── Compute which page numbers to capture ────────────────────────────────────

/**
 * Smart page selection: "first 3 + last 2" strategy.
 *
 * Oklahoma inspection documents have a predictable structure:
 *   Page 1: OSDH cover letter (inspection date, deficiency status, facility info)
 *   Pages 2–(N-1): Investigation narratives (not needed for AI summary)
 *   Last page(s): Statement of Deficiencies (actual violation list)
 *
 * For documents with ≤5 pages, capture all pages.
 * For documents with >5 pages, capture [1, 2, 3, N-1, N].
 * Maximum 5 pages per facility regardless of document length.
 */
function computeTargetPages(pageCount: number, maxPages: number): number[] {
  const effectiveCount = Math.min(pageCount, maxPages > 0 ? maxPages : pageCount);

  if (effectiveCount <= 5) {
    return Array.from({ length: effectiveCount }, (_, i) => i + 1);
  }

  // First 3 + last 2 — deduplicated and sorted
  const pages = new Set([1, 2, 3, pageCount - 1, pageCount]);
  return Array.from(pages).sort((a, b) => a - b);
}

// ─── Navigate to the AppXtender viewer ────────────────────────────────────────

async function navigateToViewer(
  page: Page,
  baseUrl: string,
  documentId: number
): Promise<void> {
  const testLaunchUrl = `${baseUrl}/Appxtender/TestLaunch?AppId=${APP_ID}&DocId=${documentId}`;
  logger.debug("Navigating to TestLaunch", { testLaunchUrl });

  await page.goto(testLaunchUrl, {
    waitUntil: "networkidle",
    timeout: 60_000,
  });

  // Wait for AngularJS to resolve credentials and auto-redirect.
  // TestLaunch may auto-redirect to the IDocument viewer URL, or it may
  // present a launch link that needs clicking.
  await page.waitForTimeout(5000);

  // Check if we're already in the viewer (auto-redirect happened)
  const currentUrl = page.url();
  if (currentUrl.includes("IDocument")) {
    logger.debug("Auto-redirected to viewer");
    return;
  }

  // If not auto-redirected, look for the launch link
  const launchLink = await page.$('a[target="_self"]');
  if (launchLink) {
    const href = await launchLink.getAttribute("href");
    if (href && !href.includes("{{")) {
      logger.debug("Clicking launch link to enter viewer");
      await Promise.all([
        page.waitForNavigation({
          waitUntil: "networkidle",
          timeout: 45_000,
        }),
        launchLink.click(),
      ]);
      return;
    }

    // Wait longer for AngularJS
    await page.waitForTimeout(5000);
    const retryHref = await launchLink.getAttribute("href");
    if (retryHref && !retryHref.includes("{{")) {
      logger.debug("Clicking launch link (retry)");
      await Promise.all([
        page.waitForNavigation({
          waitUntil: "networkidle",
          timeout: 45_000,
        }),
        launchLink.click(),
      ]);
      return;
    }

    throw new Error(
      "AngularJS failed to resolve credentials in TestLaunch link"
    );
  }

  // Might already be in the viewer with a different URL structure
  logger.debug("No launch link found — assuming viewer is loaded");
}

// ─── Wait for the viewer UI to be ready ───────────────────────────────────────

async function waitForViewerReady(page: Page): Promise<void> {
  const timeoutMs = 30_000;
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    // The viewer toolbar has a text input showing the current page number
    // and the body text contains "Page 1 Page 2 ..." from thumbnails
    const ready = await page.evaluate(() => {
      const inputs = Array.from(
        document.querySelectorAll<HTMLInputElement>("input[type='text']")
      );
      const pageInput = inputs.find(
        (inp) =>
          /^\d+$/.test(inp.value.trim()) &&
          inp.offsetWidth > 20 &&
          inp.offsetWidth < 150
      );
      return !!pageInput;
    });

    if (ready) {
      logger.debug("Viewer is ready (page input detected)");
      return;
    }

    await page.waitForTimeout(1000);
  }

  logger.warn(
    "Viewer ready check timed out — continuing anyway"
  );
}

// ─── Capture a single page via interception + screenshot fallback ─────────────

async function capturePage(
  page: Page,
  pageNum: number,
  imageQueue: Buffer[]
): Promise<Buffer> {
  // For page 1: the image may already be in the queue from initial viewer load.
  // For pages 2+: drain stale images, then navigate to trigger a new render.
  if (pageNum > 1) {
    imageQueue.length = 0;
  }

  // Set up a promise that resolves when a GetRenderImage response arrives
  // in the shared imageQueue (populated by the response handler).
  // Check immediately in case the image is already queued (page 1).
  const imagePromise = new Promise<Buffer | null>((resolve) => {
    // Check if image is already available
    if (imageQueue.length > 0) {
      resolve(imageQueue.shift()!);
      return;
    }

    const timeoutId = setTimeout(() => resolve(null), 45_000);

    const checkInterval = setInterval(() => {
      if (imageQueue.length > 0) {
        clearTimeout(timeoutId);
        clearInterval(checkInterval);
        resolve(imageQueue.shift()!);
      }
    }, 200);

    // Clear interval on timeout
    setTimeout(() => clearInterval(checkInterval), 45_500);
  });

  // Navigate to the requested page (no-op for page 1)
  await navigateToPage(page, pageNum);

  // Wait for the image to be intercepted
  const interceptedImage = await imagePromise;

  if (interceptedImage && interceptedImage.length > 10_000) {
    return interceptedImage;
  }

  // ─── Fallback: screenshot the viewer container ────────────────────────────
  logger.debug(
    `No intercepted image for page ${pageNum} — using screenshot fallback`
  );

  const viewerContainer = await page.$("#viewerContainer");
  if (viewerContainer) {
    const box = await viewerContainer.boundingBox();
    if (box && box.width > 300 && box.height > 300) {
      return await viewerContainer.screenshot({ type: "png" });
    }
  }

  // Last resort: clip screenshot excluding sidebar
  const viewport = page.viewportSize()!;
  return await page.screenshot({
    type: "png",
    clip: {
      x: 135,
      y: 80,
      width: viewport.width - 145,
      height: viewport.height - 90,
    },
  });
}

// ─── Navigate to a specific page number ───────────────────────────────────────

async function navigateToPage(
  page: Page,
  pageNum: number
): Promise<void> {
  // Page 1 is auto-loaded by the viewer — no navigation needed
  if (pageNum === 1) {
    return;
  }

  // Strategy: Click page thumbnails in the sidebar to navigate.
  // The AngularJS viewer has labeled thumbnails ("Page 1", "Page 2", etc.)
  // that reliably trigger the server-side render pipeline. Clicking a thumbnail
  // causes the viewer to fetch and display the full-resolution page image.
  //
  // The page input field does NOT trigger renders (AngularJS doesn't pick up
  // synthetic events), so we avoid it entirely.

  // Primary: click thumbnail for the target page
  const thumbClicked = await clickThumbnail(page, pageNum);

  if (thumbClicked) {
    return;
  }

  // Fallback: try "next page" button if thumbnail not found
  const nextButton = await page.$('button[title="next page"]');
  if (nextButton) {
    logger.debug(`Thumbnail not found — using "next page" button for page ${pageNum}`);
    await nextButton.click();
    await page.waitForTimeout(1500);
    return;
  }

  logger.warn(
    `Could not navigate to page ${pageNum} via thumbnail or next button`
  );
}

// ─── Click a page thumbnail in the sidebar ───────────────────────────────────

async function clickThumbnail(
  page: Page,
  pageNum: number
): Promise<boolean> {
  const clicked = await page.evaluate((num) => {
    const elements = Array.from(document.querySelectorAll("*"));
    for (const el of elements) {
      if (
        el.childNodes.length <= 2 &&
        el.textContent?.trim() === `Page ${num}`
      ) {
        (el as HTMLElement).click();
        return true;
      }
    }
    return false;
  }, pageNum);

  if (clicked) {
    await page.waitForTimeout(2000);
    return true;
  }

  return false;
}
