/**
 * Oklahoma AppXtender — Phase 3: Successfully Extract All Pages
 *
 * Phase 2 found the token is in the `jobToken` field (not `Token`).
 * The render status check shows `status: 0` during rendering, needs to become `status: 2`.
 * The actual image endpoint returns `image/jpeg` at ~348KB per page.
 *
 * Also: the underlying document is PDF (mimeType: "application/pdf") so we'll try
 * to get the raw PDF binary too.
 *
 * Key findings from Phase 2:
 * - Document has 8 pages, stored as PDF (fileType: 7, mimeType: "application/pdf")
 * - hasTextView: false (no OCR/text layer available)
 * - Page rendering works but takes time (async job queue)
 * - The `jobToken` GUID is the render token
 * - Need to poll GetRenderingResult until status changes from 0 to 2
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE_DIR = '/Users/aftonjohnson/Documents/Agentic Workflows/the-care-audit';
const OUTPUT_DIR = path.join(BASE_DIR, 'ok_appxtender_pages');
const TARGET_URL = 'https://imaging.ok.gov/Appxtender/TestLaunch?AppId=346&DocId=114380';
const APP_ID = '346';
const DOC_ID = '114380';
const TOTAL_PAGES = 8;

async function main() {
  console.log('=== Oklahoma AppXtender — Phase 3: Extract All Document Pages ===\n');

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1920, height: 1080 },
    ignoreHTTPSErrors: true,
    acceptDownloads: true,
  });

  const popupPages = [];
  context.on('page', (p) => popupPages.push(p));

  const page = context.pages()[0] || await context.newPage();

  // Intercept the page 1 render image from auto-load to verify image quality
  let autoRenderedImageUrl = null;
  page.on('response', async (resp) => {
    const url = resp.url();
    if (url.includes('GetRenderImage/') && resp.status() === 200) {
      autoRenderedImageUrl = url;
      console.log(`  [AUTO-RENDER] Image URL detected: ${url.substring(0, 150)}...`);
      const contentType = resp.headers()['content-type'] || '';
      const contentLength = resp.headers()['content-length'] || 'unknown';
      console.log(`  [AUTO-RENDER] Content-Type: ${contentType}, Size: ${contentLength}`);
    }
  });

  try {
    // ============================================================
    // STEP 1: Navigate to viewer (auto-loads page 1)
    // ============================================================
    console.log('--- STEP 1: Navigate and wait for viewer ---');
    await page.goto(TARGET_URL, { waitUntil: 'networkidle', timeout: 60000 });

    // Wait for the viewer to fully initialize and render page 1
    await page.waitForTimeout(12000);

    // Get the popup viewer page
    let viewerPage = page;
    if (popupPages.length > 0) {
      viewerPage = popupPages[popupPages.length - 1];
      try {
        await viewerPage.waitForLoadState('networkidle', { timeout: 15000 });
      } catch (e) {}
      console.log(`Using popup viewer page`);
    }

    // Get cookies
    const cookies = await context.cookies();
    const xsrfCookie = cookies.find(c => c.name === 'WX-XSRF-TOKEN');
    const xsrfToken = xsrfCookie?.value || '';
    console.log(`XSRF Token: ${xsrfToken}`);

    // ============================================================
    // STEP 2: Try to get the raw PDF binary
    // ============================================================
    console.log('\n--- STEP 2: Try raw PDF binary extraction ---');

    // DocumentPageVersion showed: fileType: 7, mimeType: "application/pdf"
    // Try the content/binary endpoints
    const binaryEndpoints = [
      // These are typical AppXtender REST endpoints for page binary
      `/AppXtender/api/dataSources/Xtender/Applications/${APP_ID}/DocumentPageVersion/${DOC_ID}/1/1/content`,
      `/AppXtender/api/dataSources/Xtender/Applications/${APP_ID}/DocumentPageVersion/${DOC_ID}/1/1/binary`,
      `/AppXtender/api/dataSources/Xtender/Applications/${APP_ID}/DocumentPageVersion/${DOC_ID}/1/1/file`,
      `/AppXtender/api/dataSources/Xtender/Applications/${APP_ID}/Document/${DOC_ID}/content`,
      `/AppXtender/api/dataSources/Xtender/Applications/${APP_ID}/Document/${DOC_ID}/binary`,
      `/AppXtender/api/dataSources/Xtender/Applications/${APP_ID}/Document/${DOC_ID}/file`,
      // Export endpoints
      `/AppXtender/actionApi/dataSources/Xtender/applications/${APP_ID}/ExportDocument/${DOC_ID}`,
      `/AppXtender/actionApi/dataSources/Xtender/applications/${APP_ID}/DocumentExport/${DOC_ID}`,
      `/AppXtender/actionApi/dataSources/Xtender/applications/${APP_ID}/PrintDocument/${DOC_ID}`,
    ];

    for (const endpoint of binaryEndpoints) {
      const result = await viewerPage.evaluate(async (url) => {
        try {
          const r = await fetch(url, {
            credentials: 'include',
            headers: { 'Accept': 'application/pdf, application/json, */*' }
          });
          const contentType = r.headers.get('content-type') || '';
          const contentLength = r.headers.get('content-length') || 'unknown';
          const contentDisposition = r.headers.get('content-disposition') || '';

          let bodyPreview = '';
          if (contentType.includes('json')) {
            const j = await r.json();
            bodyPreview = JSON.stringify(j).substring(0, 300);
          } else if (contentType.includes('pdf') || contentType.includes('octet')) {
            bodyPreview = `[Binary: ${contentLength} bytes]`;
          } else {
            bodyPreview = (await r.text()).substring(0, 300);
          }

          return { status: r.status, contentType, contentLength, contentDisposition, body: bodyPreview };
        } catch (e) {
          return { error: e.message };
        }
      }, endpoint);

      const statusEmoji = result.status === 200 ? 'OK' : result.status;
      console.log(`  [${statusEmoji}] ${endpoint}`);
      if (result.contentType) console.log(`       Content-Type: ${result.contentType}`);
      if (result.body) console.log(`       Body: ${result.body}`);
      if (result.error) console.log(`       Error: ${result.error}`);
    }

    // ============================================================
    // STEP 3: Render each page using the correct jobToken field
    // ============================================================
    console.log('\n--- STEP 3: Render and download all pages (using jobToken) ---');

    for (let pageNum = 1; pageNum <= TOTAL_PAGES; pageNum++) {
      console.log(`\n  Page ${pageNum}/${TOTAL_PAGES}:`);

      // Step 3a: Request rendering — use version 0 for pages 2+ (as seen in Phase 1 traffic)
      const version = pageNum === 1 ? 1 : 0;
      const renderResp = await viewerPage.evaluate(async (params) => {
        try {
          const r = await fetch(
            `/AppXtender/actionApi/dataSources/Xtender/applications/${params.appId}/PageRendering/RenderDocPageContent/${params.docId}/${params.pageNum}/${params.version}?dPI=-1&fileSubPage=1&formOverlayOption=0`,
            {
              method: 'POST',
              credentials: 'include',
              headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
              body: '{}'
            }
          );
          return await r.json();
        } catch (e) {
          return { error: e.message };
        }
      }, { appId: APP_ID, docId: DOC_ID, pageNum, version });

      const jobToken = renderResp.jobToken;
      if (!jobToken) {
        console.log(`    ERROR: No jobToken in response: ${JSON.stringify(renderResp)}`);
        continue;
      }
      console.log(`    jobToken: ${jobToken}`);

      // Step 3b: Poll until rendering is complete (status changes from 0 to 2)
      let renderStatus = 0;
      let pollCount = 0;
      const maxPolls = 60;

      while (renderStatus !== 2 && pollCount < maxPolls) {
        pollCount++;
        await viewerPage.waitForTimeout(500);

        const pollResp = await viewerPage.evaluate(async (token) => {
          try {
            const r = await fetch(
              `/AppXtender/actionApi/dataSources/Xtender/PageRendering/GetRenderingResult/${token}`,
              { credentials: 'include', headers: { 'Accept': 'application/json' } }
            );
            return await r.json();
          } catch (e) {
            return { error: e.message };
          }
        }, jobToken);

        renderStatus = pollResp.status;

        if (pollCount % 10 === 0) {
          console.log(`    Polling... attempt ${pollCount}, status: ${renderStatus}`);
        }

        if (renderStatus === 2) {
          console.log(`    Render complete after ${pollCount} polls (status=2)`);
          if (pollResp.width) console.log(`    Dimensions: ${pollResp.width}x${pollResp.height} @ ${pollResp.dpi} DPI`);
        }
      }

      if (renderStatus !== 2) {
        console.log(`    WARNING: Render did not complete (status=${renderStatus}) after ${maxPolls} polls`);
        // Try to get the image anyway
      }

      // Step 3c: Download the rendered JPEG image
      const imageUrl = `/AppXtender/actionApi/dataSources/Xtender/PageRendering/GetRenderImage/${jobToken}?ts=${Date.now()}&X-XSRF-TOKEN=${xsrfToken}`;

      const imageData = await viewerPage.evaluate(async (url) => {
        try {
          const r = await fetch(url, { credentials: 'include' });
          if (!r.ok) return { error: `HTTP ${r.status}`, contentType: r.headers.get('content-type') };
          const blob = await r.blob();
          const buffer = await blob.arrayBuffer();
          const bytes = new Uint8Array(buffer);
          let binary = '';
          for (let i = 0; i < bytes.length; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          return {
            contentType: r.headers.get('content-type'),
            size: buffer.byteLength,
            base64: btoa(binary),
          };
        } catch (e) {
          return { error: e.message };
        }
      }, imageUrl);

      if (imageData.error) {
        console.log(`    FAILED: ${imageData.error} (Content-Type: ${imageData.contentType || 'unknown'})`);
        continue;
      }

      console.log(`    Downloaded: ${imageData.contentType}, ${imageData.size} bytes`);

      if (imageData.size < 1000) {
        console.log(`    WARNING: Image seems too small (${imageData.size} bytes), might be an error page`);
      }

      const imgBuffer = Buffer.from(imageData.base64, 'base64');
      const filename = `page_${pageNum}.jpg`;
      fs.writeFileSync(path.join(OUTPUT_DIR, filename), imgBuffer);
      console.log(`    Saved: ${filename} (${imgBuffer.length} bytes)`);
    }

    // ============================================================
    // STEP 4: Try the Export Document flow via the Angular controller
    // ============================================================
    console.log('\n--- STEP 4: Test Export Document via Angular scope ---');

    const exportResult = await viewerPage.evaluate(async (params) => {
      const { appId, docId } = params;
      // Try common AppXtender export endpoints
      const endpoints = [
        {
          url: `/AppXtender/actionApi/dataSources/Xtender/applications/${appId}/ExportDocumentPages/${docId}`,
          method: 'POST',
          body: { pages: [1, 2, 3, 4, 5, 6, 7, 8], format: 'pdf' }
        },
        {
          url: `/AppXtender/actionApi/dataSources/Xtender/applications/${appId}/ExportDocumentPages/${docId}`,
          method: 'POST',
          body: { pages: '1-8', exportFormat: 0 }
        },
        {
          url: `/AppXtender/actionApi/dataSources/Xtender/applications/${appId}/PageRendering/ExportDocument/${docId}`,
          method: 'POST',
          body: { format: 'pdf' }
        },
        {
          url: `/AppXtender/actionApi/dataSources/Xtender/applications/${appId}/PageRendering/ExportPages/${docId}`,
          method: 'POST',
          body: { pageRange: '1-8', exportType: 0 }
        },
      ];

      const results = [];
      for (const ep of endpoints) {
        try {
          const r = await fetch(ep.url, {
            method: ep.method,
            credentials: 'include',
            headers: { 'Accept': 'application/json, application/pdf, */*', 'Content-Type': 'application/json' },
            body: JSON.stringify(ep.body),
          });
          const contentType = r.headers.get('content-type') || '';
          let body = '';
          if (contentType.includes('json')) {
            body = JSON.stringify(await r.json());
          } else if (contentType.includes('pdf') || contentType.includes('octet')) {
            body = `[Binary: ${r.headers.get('content-length')} bytes]`;
          } else {
            body = (await r.text()).substring(0, 300);
          }
          results.push({ url: ep.url, status: r.status, contentType, body: body.substring(0, 300) });
        } catch (e) {
          results.push({ url: ep.url, error: e.message });
        }
      }
      return results;
    }, { appId: APP_ID, docId: DOC_ID });

    exportResult.forEach(r => {
      console.log(`  [${r.status || 'ERR'}] ${r.url}`);
      if (r.body) console.log(`       ${r.body}`);
      if (r.error) console.log(`       Error: ${r.error}`);
    });

    // ============================================================
    // STEP 5: Try to use the Export via the print/export controller
    // ============================================================
    console.log('\n--- STEP 5: Explore Angular controller for export functions ---');

    const controllerInfo = await viewerPage.evaluate(() => {
      // Try to access Angular scope for export functions
      const el = document.querySelector('[ng-controller]');
      if (!el) return { error: 'No ng-controller found' };

      const scope = angular.element(el).scope();
      if (!scope) return { error: 'No scope found' };

      // List all function names on scope
      const fns = [];
      for (const key in scope) {
        if (typeof scope[key] === 'function' && !key.startsWith('$') && !key.startsWith('_')) {
          fns.push(key);
        }
      }

      // Look for export/print/download related functions
      const exportFns = fns.filter(f =>
        f.toLowerCase().includes('export') ||
        f.toLowerCase().includes('print') ||
        f.toLowerCase().includes('download') ||
        f.toLowerCase().includes('save')
      );

      return { allFunctions: fns, exportFunctions: exportFns };
    });

    console.log(`  Angular scope functions found: ${controllerInfo.allFunctions?.length || 0}`);
    if (controllerInfo.exportFunctions?.length > 0) {
      console.log(`  Export-related functions: ${controllerInfo.exportFunctions.join(', ')}`);
    }
    if (controllerInfo.allFunctions) {
      console.log(`  All functions: ${controllerInfo.allFunctions.join(', ')}`);
    }

    // ============================================================
    // STEP 6: Trigger the exportDocument function via Angular scope
    // ============================================================
    console.log('\n--- STEP 6: Trigger export via Angular scope ---');

    // Set up download listener and network listener
    const exportNetworkCaptures = [];
    const exportHandler = async (resp) => {
      const url = resp.url();
      if (!url.includes('.js') && !url.includes('.css') && !url.includes('.woff') && !url.includes('.gif') && !url.includes('.png') && !url.includes('.ico')) {
        try {
          exportNetworkCaptures.push({
            url: url.substring(0, 200),
            status: resp.status(),
            contentType: resp.headers()['content-type'] || '',
            contentLength: resp.headers()['content-length'] || '',
            contentDisposition: resp.headers()['content-disposition'] || '',
          });
        } catch (e) {}
      }
    };

    viewerPage.on('response', exportHandler);

    const exportTriggerResult = await viewerPage.evaluate(() => {
      try {
        const el = document.querySelector('[ng-controller]');
        if (!el) return { error: 'No controller element' };
        const scope = angular.element(el).scope();
        if (!scope) return { error: 'No scope' };

        // exportDocument(0) was the ng-click we saw: 0 = export format parameter
        if (typeof scope.exportDocument === 'function') {
          scope.exportDocument(0);
          return { triggered: 'exportDocument(0)' };
        }
        return { error: 'exportDocument function not found on scope' };
      } catch (e) {
        return { error: e.message };
      }
    });

    console.log(`  Export trigger result: ${JSON.stringify(exportTriggerResult)}`);

    // Wait for export dialog or download
    await viewerPage.waitForTimeout(5000);

    viewerPage.removeListener('response', exportHandler);

    // Check what network requests were made
    if (exportNetworkCaptures.length > 0) {
      console.log(`  Network requests during export: ${exportNetworkCaptures.length}`);
      exportNetworkCaptures.forEach((r, i) => {
        console.log(`    ${i}: [${r.status}] ${r.url}`);
        if (r.contentType) console.log(`       Content-Type: ${r.contentType}, Size: ${r.contentLength}`);
        if (r.contentDisposition) console.log(`       Content-Disposition: ${r.contentDisposition}`);
      });
    }

    // Take a screenshot to see if an export dialog appeared
    await viewerPage.screenshot({
      path: path.join(BASE_DIR, 'ok_appxtender_export_attempt.png'),
      fullPage: true
    });
    console.log('  Screenshot saved: ok_appxtender_export_attempt.png');

    // Check for dialog/modal elements
    const dialogElements = await viewerPage.$$eval(
      '.modal, .modal-dialog, .ng-popup-content, [class*="export"], [class*="dialog"]',
      els => els.map(el => ({
        tag: el.tagName,
        className: el.className?.substring(0, 100),
        visible: el.offsetParent !== null || el.style?.display !== 'none',
        text: el.textContent?.trim().substring(0, 500),
        innerHTML: el.innerHTML?.substring(0, 500),
      })).filter(el => el.visible || el.text?.length > 0)
    );

    if (dialogElements.length > 0) {
      console.log('\n  Export dialog elements:');
      dialogElements.forEach((el, i) => {
        console.log(`    ${i}: [${el.tag}] class="${el.className}" visible=${el.visible}`);
        console.log(`       Text: ${el.text?.substring(0, 200)}`);
      });
    }

    // ============================================================
    // RESULTS
    // ============================================================
    console.log('\n\n========================================');
    console.log('RESULTS SUMMARY');
    console.log('========================================');

    const savedFiles = fs.readdirSync(OUTPUT_DIR);
    console.log(`\nSaved files in ${OUTPUT_DIR}:`);
    if (savedFiles.length === 0) {
      console.log('  (no files saved)');
    } else {
      let totalSize = 0;
      savedFiles.forEach(f => {
        const stat = fs.statSync(path.join(OUTPUT_DIR, f));
        totalSize += stat.size;
        console.log(`  ${f}: ${(stat.size / 1024).toFixed(1)} KB`);
      });
      console.log(`  Total: ${(totalSize / 1024).toFixed(1)} KB`);
    }

  } catch (error) {
    console.error('\nFATAL ERROR:', error.message);
    console.error(error.stack);
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
