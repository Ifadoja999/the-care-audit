import {
  logger
} from "./chunk-MMQGKQDQ.mjs";
import {
  __name,
  init_esm
} from "./chunk-6ULOIQV4.mjs";

// src/trigger/enrichment/lib/appxtender.ts
init_esm();
var APP_ID = "346";
async function renderDocumentPages(page, baseUrl, documentId, pageCount, maxPages) {
  const targetPages = computeTargetPages(pageCount, maxPages);
  await page.setViewportSize({ width: 1920, height: 1200 });
  const imageQueue = [];
  const responseHandler = /* @__PURE__ */ __name(async (response) => {
    try {
      const url = response.url();
      if (url.includes("GetRenderImage") && response.status() === 200) {
        const body = await response.body();
        if (body.length > 3e4) {
          logger.debug(
            `Intercepted page image: ${body.length} bytes`
          );
          imageQueue.push(body);
        }
      }
    } catch {
    }
  }, "responseHandler");
  page.on("response", responseHandler);
  try {
    await navigateToViewer(page, baseUrl, documentId);
    await waitForViewerReady(page);
    logger.info(
      `Capturing ${targetPages.length} of ${pageCount} pages for document ${documentId} (pages: ${targetPages.join(", ")})`
    );
    const buffers = [];
    for (let i = 0; i < targetPages.length; i++) {
      const pageNum = targetPages[i];
      let lastError = null;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const buffer = await capturePage(page, pageNum, imageQueue);
          if (buffer && buffer.length > 1e4) {
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
        } catch (err) {
          lastError = err;
          logger.warn(
            `Page ${pageNum} attempt ${attempt}/3 failed: ${err.message}`
          );
          if (attempt < 3) {
            await page.waitForTimeout(3e3 * attempt);
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
__name(renderDocumentPages, "renderDocumentPages");
function computeTargetPages(pageCount, maxPages) {
  const effectiveCount = Math.min(pageCount, maxPages > 0 ? maxPages : pageCount);
  if (effectiveCount <= 5) {
    return Array.from({ length: effectiveCount }, (_, i) => i + 1);
  }
  const pages = /* @__PURE__ */ new Set([1, 2, 3, pageCount - 1, pageCount]);
  return Array.from(pages).sort((a, b) => a - b);
}
__name(computeTargetPages, "computeTargetPages");
async function navigateToViewer(page, baseUrl, documentId) {
  const testLaunchUrl = `${baseUrl}/Appxtender/TestLaunch?AppId=${APP_ID}&DocId=${documentId}`;
  logger.debug("Navigating to TestLaunch", { testLaunchUrl });
  await page.goto(testLaunchUrl, {
    waitUntil: "networkidle",
    timeout: 6e4
  });
  await page.waitForTimeout(5e3);
  const currentUrl = page.url();
  if (currentUrl.includes("IDocument")) {
    logger.debug("Auto-redirected to viewer");
    return;
  }
  const launchLink = await page.$('a[target="_self"]');
  if (launchLink) {
    const href = await launchLink.getAttribute("href");
    if (href && !href.includes("{{")) {
      logger.debug("Clicking launch link to enter viewer");
      await Promise.all([
        page.waitForNavigation({
          waitUntil: "networkidle",
          timeout: 45e3
        }),
        launchLink.click()
      ]);
      return;
    }
    await page.waitForTimeout(5e3);
    const retryHref = await launchLink.getAttribute("href");
    if (retryHref && !retryHref.includes("{{")) {
      logger.debug("Clicking launch link (retry)");
      await Promise.all([
        page.waitForNavigation({
          waitUntil: "networkidle",
          timeout: 45e3
        }),
        launchLink.click()
      ]);
      return;
    }
    throw new Error(
      "AngularJS failed to resolve credentials in TestLaunch link"
    );
  }
  logger.debug("No launch link found — assuming viewer is loaded");
}
__name(navigateToViewer, "navigateToViewer");
async function waitForViewerReady(page) {
  const timeoutMs = 3e4;
  const startTime = Date.now();
  while (Date.now() - startTime < timeoutMs) {
    const ready = await page.evaluate(() => {
      const inputs = Array.from(
        document.querySelectorAll("input[type='text']")
      );
      const pageInput = inputs.find(
        (inp) => /^\d+$/.test(inp.value.trim()) && inp.offsetWidth > 20 && inp.offsetWidth < 150
      );
      return !!pageInput;
    });
    if (ready) {
      logger.debug("Viewer is ready (page input detected)");
      return;
    }
    await page.waitForTimeout(1e3);
  }
  logger.warn(
    "Viewer ready check timed out — continuing anyway"
  );
}
__name(waitForViewerReady, "waitForViewerReady");
async function capturePage(page, pageNum, imageQueue) {
  if (pageNum > 1) {
    imageQueue.length = 0;
  }
  const imagePromise = new Promise((resolve) => {
    if (imageQueue.length > 0) {
      resolve(imageQueue.shift());
      return;
    }
    const timeoutId = setTimeout(() => resolve(null), 45e3);
    const checkInterval = setInterval(() => {
      if (imageQueue.length > 0) {
        clearTimeout(timeoutId);
        clearInterval(checkInterval);
        resolve(imageQueue.shift());
      }
    }, 200);
    setTimeout(() => clearInterval(checkInterval), 45500);
  });
  await navigateToPage(page, pageNum);
  const interceptedImage = await imagePromise;
  if (interceptedImage && interceptedImage.length > 1e4) {
    return interceptedImage;
  }
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
  const viewport = page.viewportSize();
  return await page.screenshot({
    type: "png",
    clip: {
      x: 135,
      y: 80,
      width: viewport.width - 145,
      height: viewport.height - 90
    }
  });
}
__name(capturePage, "capturePage");
async function navigateToPage(page, pageNum) {
  if (pageNum === 1) {
    return;
  }
  const thumbClicked = await clickThumbnail(page, pageNum);
  if (thumbClicked) {
    return;
  }
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
__name(navigateToPage, "navigateToPage");
async function clickThumbnail(page, pageNum) {
  const clicked = await page.evaluate((num) => {
    const elements = Array.from(document.querySelectorAll("*"));
    for (const el of elements) {
      if (el.childNodes.length <= 2 && el.textContent?.trim() === `Page ${num}`) {
        el.click();
        return true;
      }
    }
    return false;
  }, pageNum);
  if (clicked) {
    await page.waitForTimeout(2e3);
    return true;
  }
  return false;
}
__name(clickThumbnail, "clickThumbnail");

export {
  renderDocumentPages
};
//# sourceMappingURL=chunk-OXP4VPR4.mjs.map
