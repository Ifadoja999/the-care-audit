/**
 * Oklahoma AppXtender — Phase 2: Extract Document Page Images
 *
 * Based on Phase 1 research findings, the AppXtender viewer uses this flow:
 *
 * 1. POST /Appxtender/TestLaunch/GenerateCredentions  → gets encrypted credentials
 * 2. Navigate to /AppXtender/datasources/Xtender/IDocument/?AppId=346&Credentials=AE:...&DocId=...
 * 3. The viewer renders pages via:
 *    a. POST /actionApi/.../PageRendering/RenderDocPageContent/{docId}/{page}/{version}  → returns render token
 *    b. GET  /actionApi/.../PageRendering/GetRenderingResult/{token}  → poll until done (returns status)
 *    c. GET  /actionApi/.../PageRendering/GetRenderImage/{token}?ts=...&X-XSRF-TOKEN=...  → JPEG image
 *
 * This script automates the full flow to extract all 8 pages as JPEG images,
 * then also tests the "Export Document" and "Text View" features.
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
  console.log('=== Oklahoma AppXtender — Phase 2: Extract Document Pages ===\n');

  // Create output directory
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

  // Capture all API responses for analysis
  const apiResponses = {};

  // Track popup pages
  const popupPages = [];
  context.on('page', (p) => {
    popupPages.push(p);
  });

  const page = context.pages()[0] || await context.newPage();

  // Intercept key API responses
  page.on('response', async (resp) => {
    const url = resp.url();

    // Capture the GenerateCredentions response
    if (url.includes('GenerateCredentions')) {
      try {
        const body = await resp.json();
        apiResponses.credentials = body;
        console.log('  [CAPTURED] GenerateCredentions response:', JSON.stringify(body));
      } catch (e) {}
    }

    // Capture Document metadata
    if (url.includes(`/Document/${DOC_ID}?access=`)) {
      try {
        const body = await resp.json();
        apiResponses.documentMeta = body;
        console.log('  [CAPTURED] Document metadata:', JSON.stringify(body).substring(0, 500));
      } catch (e) {}
    }

    // Capture DocumentPage info
    if (url.match(/\/DocumentPage\/\d+\/\d+$/)) {
      try {
        const body = await resp.json();
        apiResponses.pageInfo = body;
        console.log('  [CAPTURED] DocumentPage info:', JSON.stringify(body));
      } catch (e) {}
    }

    // Capture DocumentPageVersion info
    if (url.includes('/DocumentPageVersion/')) {
      try {
        const body = await resp.json();
        apiResponses.pageVersionInfo = body;
        console.log('  [CAPTURED] DocumentPageVersion info:', JSON.stringify(body).substring(0, 500));
      } catch (e) {}
    }

    // Capture ServerSettings
    if (url.includes('/ServerSettings')) {
      try {
        const body = await resp.json();
        apiResponses.serverSettings = body;
        console.log('  [CAPTURED] ServerSettings:', JSON.stringify(body));
      } catch (e) {}
    }

    // Capture RenderDocPageContent token
    if (url.includes('RenderDocPageContent')) {
      try {
        const body = await resp.json();
        console.log('  [CAPTURED] RenderDocPageContent response:', JSON.stringify(body));
        if (!apiResponses.renderTokens) apiResponses.renderTokens = [];
        apiResponses.renderTokens.push({ url, body });
      } catch (e) {}
    }

    // Capture GetRenderingResult (polling status)
    if (url.includes('GetRenderingResult/') && !url.includes('GetRenderingResults')) {
      try {
        const body = await resp.json();
        if (!apiResponses.renderResults) apiResponses.renderResults = [];
        apiResponses.renderResults.push({ url, body });
        // Only log the first few to avoid spam
        if (apiResponses.renderResults.length <= 3) {
          console.log('  [CAPTURED] GetRenderingResult:', JSON.stringify(body));
        }
      } catch (e) {}
    }
  });

  try {
    // ============================================================
    // STEP 1: Navigate and let the viewer auto-load
    // ============================================================
    console.log('--- STEP 1: Navigate to document viewer ---');
    await page.goto(TARGET_URL, { waitUntil: 'networkidle', timeout: 60000 });
    console.log(`Loaded: ${page.url()}`);

    // Wait for viewer to finish loading (the popup is the actual viewer)
    await page.waitForTimeout(8000);

    // Use the popup if it opened (the viewer opens in a new window)
    let viewerPage = page;
    if (popupPages.length > 0) {
      viewerPage = popupPages[popupPages.length - 1];
      try {
        await viewerPage.waitForLoadState('networkidle', { timeout: 15000 });
      } catch (e) {}
      console.log(`Using popup viewer: ${viewerPage.url()}`);
    }

    // ============================================================
    // STEP 2: Extract cookies and XSRF token for API calls
    // ============================================================
    console.log('\n--- STEP 2: Extract session info ---');
    const cookies = await context.cookies();
    const sessionCookie = cookies.find(c => c.name === 'ASP.NET_SessionId');
    const xsrfCookie = cookies.find(c => c.name === 'WX-XSRF-TOKEN');

    console.log(`Session ID: ${sessionCookie?.value || 'NOT FOUND'}`);
    console.log(`XSRF Token: ${xsrfCookie?.value || 'NOT FOUND'}`);

    const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ');

    // ============================================================
    // STEP 3: Get document metadata via internal API
    // ============================================================
    console.log('\n--- STEP 3: Fetch document metadata ---');

    const docMetaResp = await viewerPage.evaluate(async (params) => {
      const { APP_ID, DOC_ID } = params;
      try {
        const r = await fetch(`/AppXtender/api/dataSources/Xtender/Applications/${APP_ID}/Document/${DOC_ID}?access=0&comment=&isCheckDoc=true`, {
          credentials: 'include',
          headers: { 'Accept': 'application/json' }
        });
        return { status: r.status, body: await r.json() };
      } catch (e) {
        return { error: e.message };
      }
    }, { APP_ID, DOC_ID });
    console.log('Document metadata:', JSON.stringify(docMetaResp, null, 2));

    // ============================================================
    // STEP 4: Render and download each page as JPEG
    // ============================================================
    console.log('\n--- STEP 4: Render and download all pages ---');

    for (let pageNum = 1; pageNum <= TOTAL_PAGES; pageNum++) {
      console.log(`\n  Processing page ${pageNum}/${TOTAL_PAGES}...`);

      // Step 4a: Request rendering
      const renderResult = await viewerPage.evaluate(async (params) => {
        const { APP_ID, DOC_ID, pageNum } = params;
        try {
          const r = await fetch(
            `/AppXtender/actionApi/dataSources/Xtender/applications/${APP_ID}/PageRendering/RenderDocPageContent/${DOC_ID}/${pageNum}/0?dPI=-1&fileSubPage=1&formOverlayOption=0`,
            {
              method: 'POST',
              credentials: 'include',
              headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({})
            }
          );
          return { status: r.status, body: await r.json() };
        } catch (e) {
          return { error: e.message };
        }
      }, { APP_ID, DOC_ID, pageNum });

      console.log(`    Render request result: ${JSON.stringify(renderResult)}`);

      if (renderResult.error || !renderResult.body) {
        console.log(`    FAILED to request render for page ${pageNum}`);
        continue;
      }

      // The response contains a token (GUID) for polling
      const renderToken = renderResult.body.Token || renderResult.body.token ||
        renderResult.body.RenderingToken || renderResult.body.renderingToken ||
        (typeof renderResult.body === 'string' ? renderResult.body : null);

      if (!renderToken) {
        console.log(`    No render token found. Full response: ${JSON.stringify(renderResult.body)}`);
        // Maybe the token is the whole response body if it's a string?
        continue;
      }

      console.log(`    Render token: ${renderToken}`);

      // Step 4b: Poll for rendering completion
      let renderComplete = false;
      let pollAttempts = 0;
      const maxPolls = 30;

      while (!renderComplete && pollAttempts < maxPolls) {
        pollAttempts++;
        await viewerPage.waitForTimeout(500);

        const pollResult = await viewerPage.evaluate(async (token) => {
          try {
            const r = await fetch(
              `/AppXtender/actionApi/dataSources/Xtender/PageRendering/GetRenderingResult/${token}`,
              {
                credentials: 'include',
                headers: { 'Accept': 'application/json' }
              }
            );
            return { status: r.status, body: await r.json() };
          } catch (e) {
            return { error: e.message };
          }
        }, renderToken);

        if (pollResult.body) {
          const status = pollResult.body.Status || pollResult.body.status;
          if (status === 2 || status === 'Complete' || status === 'complete' || pollResult.body.IsComplete) {
            renderComplete = true;
            console.log(`    Rendering complete after ${pollAttempts} polls`);
          } else if (pollAttempts % 5 === 0) {
            console.log(`    Still rendering... poll ${pollAttempts}, status: ${JSON.stringify(pollResult.body)}`);
          }
        }
      }

      if (!renderComplete) {
        console.log(`    WARNING: Rendering may not be complete after ${maxPolls} polls, trying to get image anyway`);
      }

      // Step 4c: Download the rendered image
      const xsrfToken = xsrfCookie?.value || '';
      const imageUrl = `https://imaging.ok.gov/AppXtender/actionApi/dataSources/Xtender/PageRendering/GetRenderImage/${renderToken}?ts=${Date.now()}&X-XSRF-TOKEN=${xsrfToken}`;

      console.log(`    Image URL: ${imageUrl}`);

      // Download the image by navigating to it in the authenticated context
      const imageData = await viewerPage.evaluate(async (url) => {
        try {
          const r = await fetch(url, { credentials: 'include' });
          if (!r.ok) return { error: `HTTP ${r.status}`, contentType: r.headers.get('content-type') };
          const blob = await r.blob();
          const buffer = await blob.arrayBuffer();
          // Convert to base64 for transfer
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
        console.log(`    FAILED to download image: ${imageData.error}`);
        continue;
      }

      console.log(`    Downloaded: ${imageData.contentType}, ${imageData.size} bytes`);

      // Save to file
      const imgBuffer = Buffer.from(imageData.base64, 'base64');
      const filename = `page_${pageNum}.jpg`;
      fs.writeFileSync(path.join(OUTPUT_DIR, filename), imgBuffer);
      console.log(`    Saved: ${filename} (${imgBuffer.length} bytes)`);
    }

    // ============================================================
    // STEP 5: Test "Text View" functionality
    // ============================================================
    console.log('\n--- STEP 5: Test Text View ---');

    // The Page menu has a "Text View" option with ng-click="onToggleShowText()"
    try {
      // First find and click the "Page" menu button
      const pageMenuBtn = await viewerPage.$('button:has-text("Page")');
      if (pageMenuBtn) {
        await pageMenuBtn.click();
        await viewerPage.waitForTimeout(500);

        // Look for "Text View" button
        const textViewBtn = await viewerPage.$('button:has-text("Text View")');
        if (textViewBtn) {
          const isVisible = await textViewBtn.isVisible();
          console.log(`Text View button found, visible: ${isVisible}`);

          if (isVisible) {
            // Capture responses during Text View toggle
            const textViewResponses = [];
            const textViewHandler = async (resp) => {
              const url = resp.url();
              if (url.includes('Text') || url.includes('text') || url.includes('fulltext') || url.includes('ocr')) {
                try {
                  const contentType = resp.headers()['content-type'] || '';
                  let body;
                  if (contentType.includes('json')) {
                    body = await resp.json();
                  } else if (contentType.includes('text')) {
                    body = await resp.text();
                  }
                  textViewResponses.push({ url, status: resp.status(), contentType, body });
                } catch (e) {}
              }
            };

            viewerPage.on('response', textViewHandler);
            await textViewBtn.click();
            await viewerPage.waitForTimeout(3000);
            viewerPage.removeListener('response', textViewHandler);

            console.log(`Text View responses captured: ${textViewResponses.length}`);
            textViewResponses.forEach((r, i) => {
              console.log(`  ${i}: [${r.status}] ${r.url}`);
              if (r.body) {
                const bodyStr = typeof r.body === 'string' ? r.body : JSON.stringify(r.body);
                console.log(`     Body (first 500 chars): ${bodyStr.substring(0, 500)}`);
              }
            });

            // Take screenshot of text view
            await viewerPage.screenshot({
              path: path.join(BASE_DIR, 'ok_appxtender_textview.png'),
              fullPage: true
            });
            console.log('Screenshot saved: ok_appxtender_textview.png');
          }
        }
      }
    } catch (e) {
      console.log(`Text View test failed: ${e.message}`);
    }

    // ============================================================
    // STEP 6: Test "Export Document" functionality
    // ============================================================
    console.log('\n--- STEP 6: Test Export Document ---');

    try {
      // Listen for download events
      const downloadPromise = viewerPage.waitForEvent('download', { timeout: 10000 }).catch(() => null);

      // Capture export-related network requests
      const exportResponses = [];
      const exportHandler = async (resp) => {
        const url = resp.url();
        if (url.includes('export') || url.includes('Export') || url.includes('download') || url.includes('Download') || url.includes('print') || url.includes('Print')) {
          try {
            const contentType = resp.headers()['content-type'] || '';
            exportResponses.push({
              url,
              status: resp.status(),
              contentType,
              contentLength: resp.headers()['content-length'],
              contentDisposition: resp.headers()['content-disposition'],
            });
          } catch (e) {}
        }
      };

      viewerPage.on('response', exportHandler);

      // Click the EXPORT toolbar button
      const exportToolbarBtn = await viewerPage.$('button:has-text("EXPORT")');
      if (exportToolbarBtn) {
        const isVisible = await exportToolbarBtn.isVisible();
        console.log(`EXPORT toolbar button found, visible: ${isVisible}`);

        if (isVisible) {
          await exportToolbarBtn.click();
          await viewerPage.waitForTimeout(3000);

          // Check if a dialog appeared
          await viewerPage.screenshot({
            path: path.join(BASE_DIR, 'ok_appxtender_export_dialog.png'),
            fullPage: true
          });
          console.log('Screenshot saved: ok_appxtender_export_dialog.png');

          // Look for export dialog elements
          const exportDialogElements = await viewerPage.$$eval(
            'select, input[type="radio"], input[type="checkbox"], .modal, .dialog, [class*="modal"], [class*="export"]',
            els => els.map(el => ({
              tag: el.tagName,
              type: el.type || null,
              id: el.id || null,
              className: el.className?.substring(0, 100) || null,
              value: el.value || null,
              text: el.textContent?.trim().substring(0, 200) || null,
              options: el.tagName === 'SELECT' ? Array.from(el.options || []).map(o => o.textContent) : null,
              visible: el.offsetParent !== null,
            }))
          );

          if (exportDialogElements.length > 0) {
            console.log('Export dialog elements:');
            exportDialogElements.forEach((el, i) => console.log(`  ${i}: ${JSON.stringify(el)}`));
          }

          // Also check for any ng-popup or modal content
          const modalContent = await viewerPage.$$eval(
            '.ng-popup, .modal-content, .modal-body, [ng-controller*="export"], [ng-controller*="Export"], [ng-include]',
            els => els.map(el => ({
              tag: el.tagName,
              className: el.className?.substring(0, 100),
              text: el.textContent?.trim().substring(0, 500),
              visible: el.offsetParent !== null,
            }))
          );

          if (modalContent.length > 0) {
            console.log('\nModal/popup content:');
            modalContent.forEach((el, i) => {
              if (el.visible || el.text.length > 0) {
                console.log(`  ${i}: ${JSON.stringify(el)}`);
              }
            });
          }
        }
      }

      viewerPage.removeListener('response', exportHandler);

      if (exportResponses.length > 0) {
        console.log('\nExport-related responses:');
        exportResponses.forEach((r, i) => console.log(`  ${i}: ${JSON.stringify(r)}`));
      }

      const download = await downloadPromise;
      if (download) {
        console.log(`\nDownload triggered! Filename: ${download.suggestedFilename()}`);
        const dlPath = path.join(OUTPUT_DIR, download.suggestedFilename());
        await download.saveAs(dlPath);
        console.log(`Downloaded to: ${dlPath}`);
      } else {
        console.log('\nNo download triggered within timeout.');
      }
    } catch (e) {
      console.log(`Export test error: ${e.message}`);
    }

    // ============================================================
    // STEP 7: Test direct internal API for text content
    // ============================================================
    console.log('\n--- STEP 7: Test internal text/OCR APIs ---');

    // Try various text extraction endpoints
    const textEndpoints = [
      `/AppXtender/api/dataSources/Xtender/Applications/${APP_ID}/DocumentFullText/${DOC_ID}`,
      `/AppXtender/api/dataSources/Xtender/Applications/${APP_ID}/DocumentFullText/${DOC_ID}/1`,
      `/AppXtender/api/dataSources/Xtender/Applications/${APP_ID}/Document/${DOC_ID}/text`,
      `/AppXtender/api/dataSources/Xtender/Applications/${APP_ID}/Document/${DOC_ID}/ocr`,
      `/AppXtender/api/dataSources/Xtender/Applications/${APP_ID}/DocumentPage/${DOC_ID}/1/text`,
      `/AppXtender/api/dataSources/Xtender/Applications/${APP_ID}/DocPageText/${DOC_ID}/1/1`,
      `/AppXtender/actionApi/dataSources/Xtender/applications/${APP_ID}/PageRendering/GetPageText/${DOC_ID}/1`,
    ];

    for (const endpoint of textEndpoints) {
      const result = await viewerPage.evaluate(async (url) => {
        try {
          const r = await fetch(url, {
            credentials: 'include',
            headers: { 'Accept': 'application/json, text/plain, */*' }
          });
          const contentType = r.headers.get('content-type') || '';
          let body;
          if (contentType.includes('json')) {
            body = await r.json();
          } else {
            body = await r.text();
          }
          return { status: r.status, contentType, body: typeof body === 'string' ? body.substring(0, 1000) : JSON.stringify(body).substring(0, 1000) };
        } catch (e) {
          return { error: e.message };
        }
      }, endpoint);

      console.log(`\n  ${endpoint}`);
      console.log(`    Status: ${result.status || 'ERROR'}`);
      if (result.contentType) console.log(`    Content-Type: ${result.contentType}`);
      if (result.body) console.log(`    Body: ${result.body.substring(0, 300)}`);
      if (result.error) console.log(`    Error: ${result.error}`);
    }

    // ============================================================
    // STEP 8: Summary and extraction method recommendation
    // ============================================================
    console.log('\n\n========================================');
    console.log('EXTRACTION METHOD ANALYSIS');
    console.log('========================================');

    // Check what files we saved
    const savedFiles = fs.readdirSync(OUTPUT_DIR);
    console.log(`\nSaved files in ${OUTPUT_DIR}:`);
    savedFiles.forEach(f => {
      const stat = fs.statSync(path.join(OUTPUT_DIR, f));
      console.log(`  ${f}: ${stat.size} bytes`);
    });

    console.log('\n--- API Pattern Summary ---');
    console.log('1. Authentication:');
    console.log('   POST /Appxtender/TestLaunch/GenerateCredentions');
    console.log('   Returns: { Url: "...IDocument/?AppId=...&Credentials=AE:...&DocId=..." }');
    console.log('');
    console.log('2. Document Info:');
    console.log(`   GET /api/dataSources/Xtender/Applications/${APP_ID}/Document/${DOC_ID}?access=0`);
    console.log(`   GET /api/dataSources/Xtender/Applications/${APP_ID}/DocumentPage/${DOC_ID}/{page}`);
    console.log(`   GET /api/dataSources/Xtender/Applications/${APP_ID}/DocumentPageVersion/${DOC_ID}/{page}/{version}`);
    console.log('');
    console.log('3. Page Rendering (JPEG images):');
    console.log(`   POST /actionApi/.../PageRendering/RenderDocPageContent/${DOC_ID}/{page}/{version}?dPI=-1&fileSubPage=1&formOverlayOption=0`);
    console.log('   Returns: { Token: "GUID" }');
    console.log('   GET  /actionApi/.../PageRendering/GetRenderingResult/{token}  (poll until Status=2)');
    console.log('   GET  /actionApi/.../PageRendering/GetRenderImage/{token}?ts=...&X-XSRF-TOKEN=...');
    console.log('   Returns: image/jpeg (full-resolution page image)');
    console.log('');
    console.log('4. Thumbnail Rendering:');
    console.log(`   GET /actionApi/.../PageRendering/RenderMultiDocPagesThumbnail/${DOC_ID}?pages=1,2,...,8`);
    console.log('   Returns tokens per page for thumbnail images');

  } catch (error) {
    console.error('\nFATAL ERROR:', error.message);
    console.error(error.stack);
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
