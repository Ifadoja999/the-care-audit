/**
 * Oklahoma AppXtender Document Viewer Research Script
 *
 * Investigates how to extract document content from imaging.ok.gov
 * for Oklahoma OSDH survey/inspection reports.
 *
 * Target: https://imaging.ok.gov/Appxtender/TestLaunch?AppId=346&DocId=114380
 * (8-page survey document from Teal Creek AL, exit date 02-04-2026)
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE_DIR = '/Users/aftonjohnson/Documents/Agentic Workflows/the-care-audit';
const TARGET_URL = 'https://imaging.ok.gov/Appxtender/TestLaunch?AppId=346&DocId=114380';
const APP_ID = '346';
const DOC_ID = '114380';

// REST API base patterns to try
const REST_BASE = 'https://imaging.ok.gov/AppXtenderReST/api';
const REST_PATTERNS = [
  `${REST_BASE}/AXDataSources/Xtender/AXApps/${APP_ID}/AXDocs/${DOC_ID}`,
  `${REST_BASE}/AXDataSources/Xtender/AXApps/${APP_ID}/AXDocs/${DOC_ID}/pages`,
  `${REST_BASE}/AXDataSources/Xtender/AXApps/${APP_ID}/AXDocs/${DOC_ID}/pages/1`,
  `${REST_BASE}/AXDataSources/Xtender/AXApps/${APP_ID}/AXDocs/${DOC_ID}/pages/1/bin`,
  `${REST_BASE}/AXDataSources/Xtender/AXApps/${APP_ID}/AXDocs/${DOC_ID}/export`,
  `${REST_BASE}/AXDataSources/Xtender/AXApps/${APP_ID}/AXDocs/${DOC_ID}/download`,
  `${REST_BASE}/AXDataSources/Xtender/AXApps/${APP_ID}/AXDocs/${DOC_ID}/content`,
  `${REST_BASE}/AXDataSources/Xtender/AXApps/${APP_ID}/AXDocs/${DOC_ID}/pdf`,
];

async function main() {
  console.log('=== Oklahoma AppXtender Document Viewer Research ===\n');
  console.log(`Target URL: ${TARGET_URL}`);
  console.log(`App ID: ${APP_ID}, Doc ID: ${DOC_ID}\n`);

  const browser = await chromium.launch({
    headless: true,
    args: ['--disable-web-security', '--allow-running-insecure-content']
  });

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1920, height: 1080 },
    ignoreHTTPSErrors: true,
  });

  // Collect ALL network requests
  const allRequests = [];
  const allResponses = [];

  // Track new pages/popups
  const newPages = [];
  context.on('page', (page) => {
    console.log(`\n>>> NEW PAGE/POPUP DETECTED: ${page.url()}`);
    newPages.push(page);

    // Set up network interception on the new page too
    page.on('request', (req) => {
      allRequests.push({
        url: req.url(),
        method: req.method(),
        resourceType: req.resourceType(),
        headers: req.headers(),
        source: 'popup',
        timestamp: new Date().toISOString(),
      });
    });

    page.on('response', (resp) => {
      allResponses.push({
        url: resp.url(),
        status: resp.status(),
        headers: resp.headers(),
        source: 'popup',
        timestamp: new Date().toISOString(),
      });
    });
  });

  const page = context.pages()[0] || await context.newPage();

  // Set up comprehensive network interception on main page
  page.on('request', (req) => {
    allRequests.push({
      url: req.url(),
      method: req.method(),
      resourceType: req.resourceType(),
      headers: req.headers(),
      source: 'main',
      timestamp: new Date().toISOString(),
    });
  });

  page.on('response', (resp) => {
    allResponses.push({
      url: resp.url(),
      status: resp.status(),
      headers: resp.headers(),
      source: 'main',
      timestamp: new Date().toISOString(),
    });
  });

  // Also capture console messages from the page
  const consoleLogs = [];
  page.on('console', (msg) => {
    consoleLogs.push({ type: msg.type(), text: msg.text() });
  });

  try {
    // ============================================================
    // STEP 1: Navigate to the landing page
    // ============================================================
    console.log('\n--- STEP 1: Navigate to landing page ---');
    await page.goto(TARGET_URL, { waitUntil: 'networkidle', timeout: 30000 });
    console.log(`Page URL after load: ${page.url()}`);
    console.log(`Page title: ${await page.title()}`);

    // Get full page HTML
    const html = await page.content();
    console.log(`\n--- Page HTML (first 5000 chars) ---`);
    console.log(html.substring(0, 5000));
    console.log(`\n--- [Total HTML length: ${html.length}] ---`);

    // Take screenshot of landing page
    await page.screenshot({
      path: path.join(BASE_DIR, 'ok_appxtender_landing.png'),
      fullPage: true
    });
    console.log('\nScreenshot saved: ok_appxtender_landing.png');

    // ============================================================
    // STEP 2: Analyze the page structure
    // ============================================================
    console.log('\n--- STEP 2: Analyze page structure ---');

    // Look for buttons, links, forms
    const buttons = await page.$$eval('button, input[type="button"], input[type="submit"], a[href], [ng-click], [onclick]',
      els => els.map(el => ({
        tag: el.tagName,
        text: el.textContent?.trim().substring(0, 100),
        href: el.href || null,
        onclick: el.getAttribute('onclick') || null,
        ngClick: el.getAttribute('ng-click') || null,
        id: el.id || null,
        className: el.className || null,
        type: el.type || null,
      }))
    );
    console.log('\nClickable elements found:');
    buttons.forEach((b, i) => console.log(`  ${i}: ${JSON.stringify(b)}`));

    // Look for AngularJS scope data
    const angularData = await page.evaluate(() => {
      const appEl = document.querySelector('[ng-app]') || document.querySelector('[data-ng-app]');
      if (appEl) return { ngApp: appEl.getAttribute('ng-app') || appEl.getAttribute('data-ng-app') };

      // Try to find Angular controller data
      const controllers = document.querySelectorAll('[ng-controller], [data-ng-controller]');
      const controllerNames = Array.from(controllers).map(c =>
        c.getAttribute('ng-controller') || c.getAttribute('data-ng-controller')
      );

      return { controllers: controllerNames };
    });
    console.log('\nAngular data:', JSON.stringify(angularData));

    // Look for script tags that might reveal API patterns
    const scripts = await page.$$eval('script', els => els.map(el => ({
      src: el.src || null,
      content: el.src ? null : el.textContent?.substring(0, 500),
    })));
    console.log('\nScript tags found:');
    scripts.forEach((s, i) => {
      if (s.src) console.log(`  ${i}: [external] ${s.src}`);
      else if (s.content) console.log(`  ${i}: [inline] ${s.content.substring(0, 200)}`);
    });

    // ============================================================
    // STEP 3: Click the Launch button
    // ============================================================
    console.log('\n--- STEP 3: Look for and click Launch button ---');

    // Try various selectors for a Launch button
    const launchSelectors = [
      'button:has-text("Launch")',
      'a:has-text("Launch")',
      'input[value="Launch"]',
      'button:has-text("View")',
      'a:has-text("View")',
      'button:has-text("Open")',
      'a:has-text("Open")',
      '[ng-click*="launch"]',
      '[ng-click*="Launch"]',
      '[ng-click*="open"]',
      '[onclick*="launch"]',
      '[onclick*="Launch"]',
      '#launchBtn',
      '#launch',
      '.launch-btn',
      '.btn-launch',
      'button.btn',
      'a.btn',
    ];

    let launchClicked = false;
    for (const selector of launchSelectors) {
      try {
        const el = await page.$(selector);
        if (el) {
          const text = await el.textContent();
          const isVisible = await el.isVisible();
          console.log(`Found element with selector "${selector}": text="${text?.trim()}", visible=${isVisible}`);

          if (isVisible) {
            console.log(`\nClicking: "${selector}" (text: "${text?.trim()}")`);

            // Clear request logs before click to isolate click-triggered requests
            const preClickRequestCount = allRequests.length;

            // Click and wait for either navigation, popup, or network activity
            await Promise.race([
              el.click(),
              page.waitForTimeout(1000),
            ]);

            // Wait for network activity to settle
            await page.waitForTimeout(5000);

            console.log(`\nRequests triggered by click: ${allRequests.length - preClickRequestCount}`);

            // Log post-click requests
            const postClickRequests = allRequests.slice(preClickRequestCount);
            if (postClickRequests.length > 0) {
              console.log('\nPost-click network requests:');
              postClickRequests.forEach((r, i) => {
                console.log(`  ${i}: [${r.method}] [${r.resourceType}] ${r.url.substring(0, 200)}`);
              });
            }

            launchClicked = true;
            break;
          }
        }
      } catch (e) {
        // selector didn't match, try next
      }
    }

    if (!launchClicked) {
      console.log('\nNo Launch button found with standard selectors.');
      console.log('Trying to click any visible button...');

      const allBtns = await page.$$('button, a.btn, input[type="button"]');
      for (const btn of allBtns) {
        const isVisible = await btn.isVisible();
        if (isVisible) {
          const text = await btn.textContent();
          console.log(`Clicking visible button: "${text?.trim()}"`);
          const preClick = allRequests.length;
          await btn.click();
          await page.waitForTimeout(5000);
          console.log(`Requests after click: ${allRequests.length - preClick}`);
          launchClicked = true;
          break;
        }
      }
    }

    // ============================================================
    // STEP 4: Capture what happens after click
    // ============================================================
    console.log('\n--- STEP 4: Post-click state ---');

    // Check if we navigated
    console.log(`Current URL: ${page.url()}`);
    console.log(`Page title: ${await page.title()}`);

    // Get updated HTML
    const postClickHtml = await page.content();
    if (postClickHtml !== html) {
      console.log(`\nPage HTML changed! New content (first 5000 chars):`);
      console.log(postClickHtml.substring(0, 5000));
    }

    // Take screenshot
    await page.screenshot({
      path: path.join(BASE_DIR, 'ok_appxtender_viewer.png'),
      fullPage: true
    });
    console.log('\nScreenshot saved: ok_appxtender_viewer.png');

    // Check for any new pages/popups
    if (newPages.length > 0) {
      console.log(`\n${newPages.length} new page(s)/popup(s) detected!`);
      for (let i = 0; i < newPages.length; i++) {
        const popup = newPages[i];
        try {
          await popup.waitForLoadState('networkidle', { timeout: 15000 });
        } catch (e) {
          console.log(`  Popup ${i} didn't reach networkidle, continuing...`);
        }
        console.log(`  Popup ${i} URL: ${popup.url()}`);
        console.log(`  Popup ${i} title: ${await popup.title()}`);

        const popupHtml = await popup.content();
        console.log(`  Popup ${i} HTML (first 5000 chars):`);
        console.log(popupHtml.substring(0, 5000));

        await popup.screenshot({
          path: path.join(BASE_DIR, `ok_appxtender_popup_${i}.png`),
          fullPage: true
        });
        console.log(`  Screenshot saved: ok_appxtender_popup_${i}.png`);

        // Look for viewer controls, download buttons, etc in popup
        const popupButtons = await popup.$$eval('button, a, input[type="button"], [title], [aria-label]',
          els => els.map(el => ({
            tag: el.tagName,
            text: el.textContent?.trim().substring(0, 100),
            title: el.getAttribute('title'),
            ariaLabel: el.getAttribute('aria-label'),
            href: el.href || null,
            id: el.id || null,
            className: el.className?.substring(0, 100) || null,
          }))
        );
        console.log(`\n  Popup ${i} clickable/titled elements:`);
        popupButtons.forEach((b, j) => console.log(`    ${j}: ${JSON.stringify(b)}`));

        // Look for iframes in popup (viewer might be embedded)
        const iframes = await popup.$$eval('iframe', els => els.map(el => ({
          src: el.src,
          id: el.id,
          className: el.className,
        })));
        if (iframes.length > 0) {
          console.log(`\n  Popup ${i} iframes:`);
          iframes.forEach((f, j) => console.log(`    ${j}: ${JSON.stringify(f)}`));
        }

        // Look for canvas elements (image-based viewers)
        const canvases = await popup.$$eval('canvas', els => els.map(el => ({
          id: el.id,
          width: el.width,
          height: el.height,
          className: el.className,
        })));
        if (canvases.length > 0) {
          console.log(`\n  Popup ${i} canvas elements (image viewer):`);
          canvases.forEach((c, j) => console.log(`    ${j}: ${JSON.stringify(c)}`));
        }

        // Look for img tags with document page images
        const images = await popup.$$eval('img', els => els.map(el => ({
          src: el.src?.substring(0, 200),
          alt: el.alt,
          id: el.id,
          width: el.naturalWidth || el.width,
          height: el.naturalHeight || el.height,
        })));
        if (images.length > 0) {
          console.log(`\n  Popup ${i} images:`);
          images.forEach((img, j) => console.log(`    ${j}: ${JSON.stringify(img)}`));
        }
      }
    }

    // ============================================================
    // STEP 5: Try direct REST API patterns
    // ============================================================
    console.log('\n--- STEP 5: Try direct REST API patterns ---');

    // First, try to extract any auth tokens/cookies from the current session
    const cookies = await context.cookies();
    console.log('\nCookies:');
    cookies.forEach(c => console.log(`  ${c.name}: ${c.value.substring(0, 50)}...`));

    // Try each REST pattern
    for (const url of REST_PATTERNS) {
      console.log(`\nTrying: ${url}`);
      try {
        const resp = await page.evaluate(async (fetchUrl) => {
          try {
            const r = await fetch(fetchUrl, {
              method: 'GET',
              credentials: 'include',
              headers: {
                'Accept': 'application/json, application/pdf, image/*, */*',
              }
            });
            const headers = {};
            r.headers.forEach((v, k) => headers[k] = v);
            let body = null;
            const contentType = r.headers.get('content-type') || '';
            if (contentType.includes('json')) {
              body = await r.json();
            } else if (contentType.includes('text')) {
              body = await r.text();
              body = body.substring(0, 1000);
            } else {
              body = `[Binary content, ${contentType}, size unknown]`;
            }
            return { status: r.status, statusText: r.statusText, headers, body };
          } catch (e) {
            return { error: e.message };
          }
        }, url);

        console.log(`  Status: ${resp.status || 'ERROR'} ${resp.statusText || ''}`);
        if (resp.headers) {
          console.log(`  Content-Type: ${resp.headers['content-type'] || 'unknown'}`);
          if (resp.headers['content-length']) console.log(`  Content-Length: ${resp.headers['content-length']}`);
        }
        if (resp.body) {
          const bodyStr = typeof resp.body === 'object' ? JSON.stringify(resp.body, null, 2) : resp.body;
          console.log(`  Body: ${bodyStr.substring(0, 500)}`);
        }
        if (resp.error) console.log(`  Error: ${resp.error}`);
      } catch (e) {
        console.log(`  Exception: ${e.message}`);
      }
    }

    // Also try with a direct page.goto for the REST endpoints (different auth context)
    console.log('\n--- STEP 5b: Try REST API via direct navigation ---');
    const restPage = await context.newPage();
    for (const url of REST_PATTERNS.slice(0, 3)) {  // Just try the first 3
      console.log(`\nNavigating to: ${url}`);
      try {
        const resp = await restPage.goto(url, { waitUntil: 'load', timeout: 10000 });
        if (resp) {
          console.log(`  Status: ${resp.status()}`);
          console.log(`  Content-Type: ${resp.headers()['content-type'] || 'unknown'}`);
          const body = await resp.text();
          console.log(`  Body (first 500 chars): ${body.substring(0, 500)}`);
        }
      } catch (e) {
        console.log(`  Error: ${e.message}`);
      }
    }
    await restPage.close();

    // ============================================================
    // STEP 6: Analyze all captured network traffic
    // ============================================================
    console.log('\n--- STEP 6: Full network traffic analysis ---');

    // Filter for interesting requests
    const interestingPatterns = [
      'AXDoc', 'page', 'document', 'content', 'download', 'export',
      'pdf', 'image', 'tiff', 'tif', 'png', 'jpg', 'jpeg', 'bin',
      'rest', 'api', 'viewer', 'launch', 'auth', 'token', 'session',
      'credential', 'login', 'appxtender', 'xtender',
    ];

    console.log('\nAll unique request URLs:');
    const uniqueUrls = [...new Set(allRequests.map(r => r.url))];
    uniqueUrls.forEach((url, i) => {
      const req = allRequests.find(r => r.url === url);
      const resp = allResponses.find(r => r.url === url);
      const status = resp ? resp.status : '???';
      const contentType = resp?.headers?.['content-type'] || '';
      console.log(`  ${i}: [${req.method}] [${status}] [${req.resourceType}] ${url.substring(0, 250)}`);
      if (contentType && !contentType.includes('text/css') && !contentType.includes('text/javascript')) {
        console.log(`     Content-Type: ${contentType}`);
      }
    });

    // Highlight especially interesting requests
    console.log('\n\nInteresting requests (matching keywords):');
    uniqueUrls.forEach(url => {
      const urlLower = url.toLowerCase();
      const matched = interestingPatterns.filter(p => urlLower.includes(p));
      if (matched.length > 0 && !urlLower.includes('.css') && !urlLower.includes('.js') && !urlLower.includes('font')) {
        const req = allRequests.find(r => r.url === url);
        const resp = allResponses.find(r => r.url === url);
        console.log(`  [${req.method}] [${resp?.status || '???'}] ${url}`);
        console.log(`    Matched: ${matched.join(', ')}`);
        if (resp?.headers?.['content-type']) console.log(`    Content-Type: ${resp.headers['content-type']}`);
        if (resp?.headers?.['content-length']) console.log(`    Content-Length: ${resp.headers['content-length']}`);
      }
    });

    // ============================================================
    // STEP 7: Check for Java/ActiveX/Silverlight requirements
    // ============================================================
    console.log('\n--- STEP 7: Check for plugin requirements ---');
    const pluginIndicators = await page.evaluate(() => {
      const html = document.documentElement.outerHTML.toLowerCase();
      return {
        hasJavaApplet: html.includes('applet') || html.includes('object') && html.includes('java'),
        hasActiveX: html.includes('activex') || html.includes('classid'),
        hasSilverlight: html.includes('silverlight'),
        hasFlash: html.includes('shockwave') || html.includes('flash'),
        hasEmbed: html.includes('<embed'),
        hasObject: html.includes('<object'),
      };
    });
    console.log('Plugin indicators:', JSON.stringify(pluginIndicators, null, 2));

    // ============================================================
    // STEP 8: Console messages from the page
    // ============================================================
    console.log('\n--- STEP 8: Browser console messages ---');
    if (consoleLogs.length > 0) {
      consoleLogs.forEach((log, i) => {
        console.log(`  [${log.type}] ${log.text.substring(0, 200)}`);
      });
    } else {
      console.log('  No console messages captured.');
    }

    // ============================================================
    // STEP 9: Try to find download/export functionality
    // ============================================================
    console.log('\n--- STEP 9: Search for download/export functionality ---');

    // Check all pages (main + popups) for download-related elements
    const pagesToCheck = [page, ...newPages];
    for (let i = 0; i < pagesToCheck.length; i++) {
      const p = pagesToCheck[i];
      const label = i === 0 ? 'Main page' : `Popup ${i - 1}`;

      try {
        const downloadElements = await p.$$eval(
          '[title*="download" i], [title*="export" i], [title*="print" i], [title*="save" i], ' +
          '[aria-label*="download" i], [aria-label*="export" i], [aria-label*="print" i], [aria-label*="save" i], ' +
          'a[href*="download" i], a[href*="export" i], a[href*="pdf" i], ' +
          'button:has-text("Download"), button:has-text("Export"), button:has-text("Print"), button:has-text("Save")',
          els => els.map(el => ({
            tag: el.tagName,
            text: el.textContent?.trim().substring(0, 100),
            title: el.getAttribute('title'),
            ariaLabel: el.getAttribute('aria-label'),
            href: el.href || null,
            onclick: el.getAttribute('onclick')?.substring(0, 200) || null,
          }))
        );

        if (downloadElements.length > 0) {
          console.log(`\n${label} - Download/Export elements:`);
          downloadElements.forEach((el, j) => console.log(`  ${j}: ${JSON.stringify(el)}`));
        } else {
          console.log(`\n${label} - No download/export elements found.`);
        }
      } catch (e) {
        console.log(`\n${label} - Could not check: ${e.message}`);
      }
    }

    // ============================================================
    // SUMMARY
    // ============================================================
    console.log('\n\n========================================');
    console.log('RESEARCH SUMMARY');
    console.log('========================================');
    console.log(`Total network requests captured: ${allRequests.length}`);
    console.log(`Total unique URLs: ${uniqueUrls.length}`);
    console.log(`New pages/popups opened: ${newPages.length}`);
    console.log(`Console messages: ${consoleLogs.length}`);
    console.log(`Cookies captured: ${cookies.length}`);

    // Count requests by type
    const byType = {};
    allRequests.forEach(r => {
      byType[r.resourceType] = (byType[r.resourceType] || 0) + 1;
    });
    console.log('\nRequests by resource type:');
    Object.entries(byType).sort((a, b) => b[1] - a[1]).forEach(([type, count]) => {
      console.log(`  ${type}: ${count}`);
    });

  } catch (error) {
    console.error('\n\nFATAL ERROR:', error.message);
    console.error(error.stack);

    // Take error screenshot
    try {
      await page.screenshot({
        path: path.join(BASE_DIR, 'ok_appxtender_error.png'),
        fullPage: true
      });
    } catch (e) {}
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
