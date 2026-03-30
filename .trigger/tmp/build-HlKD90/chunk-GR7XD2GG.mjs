import {
  logger
} from "./chunk-QXSSDGE5.mjs";
import {
  __name,
  init_esm
} from "./chunk-23OQHB7B.mjs";

// src/trigger/enrichment/lib/appxtender.ts
init_esm();
var APP_ID = "346";
async function establishSession(page, baseUrl, documentId) {
  const testLaunchUrl = `${baseUrl}/Appxtender/TestLaunch?AppId=${APP_ID}&DocId=${documentId}`;
  logger.debug("Establishing AppXtender session", { testLaunchUrl });
  await page.goto(testLaunchUrl, { waitUntil: "networkidle", timeout: 6e4 });
  await page.waitForTimeout(3e3);
  const cookies = await page.context().cookies();
  const xsrfCookie = cookies.find((c) => c.name === "WX-XSRF-TOKEN");
  if (!xsrfCookie) {
    await page.waitForTimeout(5e3);
    const retryCookes = await page.context().cookies();
    const retryCookie = retryCookes.find((c) => c.name === "WX-XSRF-TOKEN");
    if (!retryCookie) {
      throw new Error(
        "Failed to obtain WX-XSRF-TOKEN cookie after AppXtender session init"
      );
    }
    return { xsrfToken: retryCookie.value };
  }
  return { xsrfToken: xsrfCookie.value };
}
__name(establishSession, "establishSession");
async function renderSinglePage(page, baseUrl, documentId, pageNum, xsrfToken) {
  const actionApiBase = `${baseUrl}/AppXtender/actionApi/dataSources/Xtender`;
  const renderUrl = `${actionApiBase}/applications/${APP_ID}/PageRendering/RenderDocPageContent/${documentId}/${pageNum}/1?dPI=-1&fileSubPage=1&formOverlayOption=0`;
  const renderResponse = await page.evaluate(
    async ({ url, token }) => {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-XSRF-TOKEN": token
        },
        body: "{}",
        credentials: "include"
      });
      return { status: res.status, body: await res.json() };
    },
    { url: renderUrl, token: xsrfToken }
  );
  if (renderResponse.status !== 200 || !renderResponse.body?.jobToken) {
    throw new Error(
      `Render request failed for page ${pageNum}: status=${renderResponse.status}, body=${JSON.stringify(renderResponse.body)}`
    );
  }
  const jobToken = renderResponse.body.jobToken;
  const pollUrl = `${actionApiBase}/PageRendering/GetRenderingResult/${jobToken}`;
  const maxPollAttempts = 40;
  let renderComplete = false;
  for (let attempt = 0; attempt < maxPollAttempts; attempt++) {
    await page.waitForTimeout(1500);
    const pollResponse = await page.evaluate(
      async ({ url, token }) => {
        const res = await fetch(url, {
          headers: { "X-XSRF-TOKEN": token },
          credentials: "include"
        });
        return { status: res.status, body: await res.json() };
      },
      { url: pollUrl, token: xsrfToken }
    );
    if (pollResponse.body?.status === 2) {
      renderComplete = true;
      break;
    }
    if (pollResponse.body?.status !== 0 && pollResponse.body?.status !== 1) {
      throw new Error(
        `Unexpected render status for page ${pageNum}: ${JSON.stringify(pollResponse.body)}`
      );
    }
  }
  if (!renderComplete) {
    throw new Error(
      `Render timed out for page ${pageNum} (document ${documentId})`
    );
  }
  const imageUrl = `${actionApiBase}/PageRendering/GetRenderImage/${jobToken}?ts=${Date.now()}&X-XSRF-TOKEN=${encodeURIComponent(xsrfToken)}`;
  const imageBuffer = await page.evaluate(
    async ({ url }) => {
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error(`Image fetch failed: ${res.status}`);
      const arrayBuffer = await res.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = "";
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      return btoa(binary);
    },
    { url: imageUrl }
  );
  return Buffer.from(imageBuffer, "base64");
}
__name(renderSinglePage, "renderSinglePage");
async function renderDocumentPages(page, baseUrl, documentId, pageCount, maxPages) {
  const pagesToRender = Math.min(pageCount, maxPages);
  const buffers = [];
  const { xsrfToken } = await establishSession(page, baseUrl, documentId);
  logger.info(`Rendering ${pagesToRender} pages for document ${documentId}`);
  for (let pageNum = 1; pageNum <= pagesToRender; pageNum++) {
    let lastError = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const buffer = await renderSinglePage(
          page,
          baseUrl,
          documentId,
          pageNum,
          xsrfToken
        );
        buffers.push(buffer);
        lastError = null;
        break;
      } catch (err) {
        lastError = err;
        logger.warn(
          `Page ${pageNum} render attempt ${attempt}/3 failed: ${err.message}`
        );
        if (attempt < 3) {
          await page.waitForTimeout(5e3 * attempt);
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
      `All page renders failed for document ${documentId}`
    );
  }
  logger.info(
    `Successfully rendered ${buffers.length}/${pagesToRender} pages for document ${documentId}`
  );
  return buffers;
}
__name(renderDocumentPages, "renderDocumentPages");

export {
  establishSession,
  renderDocumentPages
};
//# sourceMappingURL=chunk-GR7XD2GG.mjs.map
