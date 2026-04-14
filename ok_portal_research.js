/**
 * Oklahoma Survey Portal Research Script
 * Explores surveys.health.ok.gov to discover API endpoints, page structure,
 * and PDF download links for Phase 2 enrichment.
 */

const { chromium } = require('playwright');

const DIVIDER = '='.repeat(80);
const SUBDIV = '-'.repeat(60);

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });

  // =========================================================================
  // PART 1: Search Page API Discovery
  // =========================================================================
  console.log(DIVIDER);
  console.log('PART 1: SEARCH PAGE API DISCOVERY');
  console.log('URL: https://surveys.health.ok.gov/Home/Search/43S');
  console.log(DIVIDER);

  const searchPage = await context.newPage();
  const searchRequests = [];

  // Intercept all network requests
  searchPage.on('request', request => {
    const resourceType = request.resourceType();
    if (['xhr', 'fetch', 'document'].includes(resourceType)) {
      searchRequests.push({
        url: request.url(),
        method: request.method(),
        resourceType,
        postData: request.postData() || null,
        headers: request.headers()
      });
    }
  });

  const searchResponses = [];
  searchPage.on('response', async response => {
    const request = response.request();
    const resourceType = request.resourceType();
    if (['xhr', 'fetch', 'document'].includes(resourceType)) {
      let body = '';
      try {
        body = await response.text();
      } catch (e) {
        body = `[Error reading body: ${e.message}]`;
      }
      searchResponses.push({
        url: response.url(),
        status: response.status(),
        contentType: response.headers()['content-type'] || 'unknown',
        bodyLength: body.length,
        bodyPreview: body.substring(0, 3000),
        method: request.method(),
        postData: request.postData() || null
      });
    }
  });

  try {
    console.log('\n[1.1] Navigating to search page...');
    await searchPage.goto('https://surveys.health.ok.gov/Home/Search/43S', {
      waitUntil: 'networkidle',
      timeout: 30000
    });
    console.log('[1.1] Page loaded successfully');
  } catch (e) {
    console.log(`[1.1] Navigation error: ${e.message}`);
  }

  // Log page title
  const searchTitle = await searchPage.title();
  console.log(`[1.2] Page title: "${searchTitle}"`);

  // Log the full page HTML structure (first 5000 chars)
  const searchHtml = await searchPage.content();
  console.log(`\n[1.3] SEARCH PAGE HTML (first 5000 chars):`);
  console.log(SUBDIV);
  console.log(searchHtml.substring(0, 5000));
  console.log(SUBDIV);

  // Look for form elements
  console.log('\n[1.4] FORM ELEMENTS FOUND:');
  const formElements = await searchPage.evaluate(() => {
    const forms = document.querySelectorAll('form');
    const inputs = document.querySelectorAll('input, select, textarea, button');
    const result = {
      forms: [],
      inputs: [],
      selects: [],
      buttons: [],
      links: []
    };
    forms.forEach(f => {
      result.forms.push({
        action: f.action,
        method: f.method,
        id: f.id,
        className: f.className
      });
    });
    inputs.forEach(i => {
      result.inputs.push({
        type: i.type,
        name: i.name,
        id: i.id,
        value: i.value,
        placeholder: i.placeholder
      });
    });
    document.querySelectorAll('select').forEach(s => {
      const options = [];
      s.querySelectorAll('option').forEach(o => {
        options.push({ value: o.value, text: o.textContent.trim() });
      });
      result.selects.push({ name: s.name, id: s.id, options: options.slice(0, 20) });
    });
    document.querySelectorAll('button, input[type="submit"]').forEach(b => {
      result.buttons.push({
        type: b.type,
        text: b.textContent?.trim(),
        id: b.id,
        className: b.className
      });
    });
    document.querySelectorAll('a').forEach(a => {
      const href = a.getAttribute('href');
      if (href && (href.includes('Search') || href.includes('Facility') || href.includes('Document'))) {
        result.links.push({ href, text: a.textContent.trim().substring(0, 100) });
      }
    });
    return result;
  });
  console.log(JSON.stringify(formElements, null, 2));

  // Try submitting the search with empty fields
  console.log('\n[1.5] ATTEMPTING SEARCH SUBMISSION...');

  // Clear previous request/response logs for the submission
  const preSubmitCount = searchResponses.length;

  try {
    // Look for a search/submit button and click it
    const submitButton = await searchPage.$('input[type="submit"], button[type="submit"], button.btn-primary, #btnSearch, .search-button, button:has-text("Search")');
    if (submitButton) {
      console.log('[1.5] Found submit button, clicking...');
      await Promise.all([
        searchPage.waitForResponse(resp => true, { timeout: 10000 }).catch(() => null),
        submitButton.click()
      ]);
      await sleep(3000);
      // Wait for any AJAX responses
      await searchPage.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    } else {
      console.log('[1.5] No submit button found. Trying form submission via JS...');
      await searchPage.evaluate(() => {
        const form = document.querySelector('form');
        if (form) form.submit();
      });
      await sleep(3000);
      await searchPage.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    }
  } catch (e) {
    console.log(`[1.5] Search submission error: ${e.message}`);
  }

  // Log post-submission page content
  const postSearchHtml = await searchPage.content();
  if (postSearchHtml !== searchHtml) {
    console.log('\n[1.6] POST-SUBMISSION HTML CHANGED (first 5000 chars):');
    console.log(SUBDIV);
    console.log(postSearchHtml.substring(0, 5000));
    console.log(SUBDIV);
  }

  // Check for any results table
  const resultsInfo = await searchPage.evaluate(() => {
    const tables = document.querySelectorAll('table');
    const grids = document.querySelectorAll('[class*="grid"], [class*="list"], [class*="result"]');
    const rows = document.querySelectorAll('tr');
    return {
      tableCount: tables.length,
      gridCount: grids.length,
      rowCount: rows.length,
      bodyText: document.body.innerText.substring(0, 3000)
    };
  });
  console.log(`\n[1.7] POST-SUBMISSION PAGE STATE:`);
  console.log(`Tables: ${resultsInfo.tableCount}, Grids: ${resultsInfo.gridCount}, Rows: ${resultsInfo.rowCount}`);
  console.log(`Body text (first 3000 chars):\n${resultsInfo.bodyText}`);

  // Log ALL intercepted requests/responses from search page
  console.log(`\n[1.8] ALL INTERCEPTED RESPONSES (${searchResponses.length} total):`);
  searchResponses.forEach((r, i) => {
    console.log(SUBDIV);
    console.log(`Response #${i + 1}:`);
    console.log(`  URL: ${r.url}`);
    console.log(`  Method: ${r.method}`);
    console.log(`  Status: ${r.status}`);
    console.log(`  Content-Type: ${r.contentType}`);
    console.log(`  Body Length: ${r.bodyLength}`);
    if (r.postData) {
      console.log(`  Post Data: ${r.postData.substring(0, 1000)}`);
    }
    // Only show body preview for non-HTML document responses or XHR/fetch
    if (r.contentType.includes('json') || r.contentType.includes('xml') || r.method === 'POST') {
      console.log(`  Body Preview: ${r.bodyPreview.substring(0, 2000)}`);
    }
  });

  await searchPage.close();

  // =========================================================================
  // PART 2: Facility Documents Page — AL7201
  // =========================================================================
  console.log('\n' + DIVIDER);
  console.log('PART 2: FACILITY DOCUMENTS PAGE — AL7201');
  console.log('URL: https://surveys.health.ok.gov/Home/FacilityDocuments/AL7201');
  console.log(DIVIDER);

  await researchFacilityPage(context, 'AL7201');

  // =========================================================================
  // PART 3: Try alternate facility IDs
  // =========================================================================
  console.log('\n' + DIVIDER);
  console.log('PART 3: ALTERNATE FACILITY IDs');
  console.log(DIVIDER);

  console.log('\n--- Trying AL7216 ---');
  await researchFacilityPage(context, 'AL7216');

  console.log('\n--- Trying RC4101 ---');
  await researchFacilityPage(context, 'RC4101');

  // Also try a few more IDs to get broader coverage
  console.log('\n--- Trying AL7001 ---');
  await researchFacilityPage(context, 'AL7001');

  console.log('\n--- Trying CC7201AL ---');
  await researchFacilityPage(context, 'CC7201AL');

  await browser.close();
  console.log('\n' + DIVIDER);
  console.log('RESEARCH COMPLETE');
  console.log(DIVIDER);
}

async function researchFacilityPage(context, facilityId) {
  const page = await context.newPage();
  const responses = [];

  page.on('response', async response => {
    const request = response.request();
    const resourceType = request.resourceType();
    if (['xhr', 'fetch', 'document'].includes(resourceType)) {
      let body = '';
      try {
        body = await response.text();
      } catch (e) {
        body = `[Error: ${e.message}]`;
      }
      responses.push({
        url: response.url(),
        status: response.status(),
        contentType: response.headers()['content-type'] || 'unknown',
        bodyLength: body.length,
        bodyPreview: body.substring(0, 3000),
        method: request.method(),
        postData: request.postData() || null
      });
    }
  });

  const url = `https://surveys.health.ok.gov/Home/FacilityDocuments/${facilityId}`;
  console.log(`\nNavigating to: ${url}`);

  try {
    const resp = await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    console.log(`Page status: ${resp.status()}`);

    // Check for redirects
    const finalUrl = page.url();
    if (finalUrl !== url) {
      console.log(`Redirected to: ${finalUrl}`);
    }
  } catch (e) {
    console.log(`Navigation error: ${e.message}`);
  }

  const title = await page.title();
  console.log(`Page title: "${title}"`);

  // Full page HTML
  const html = await page.content();
  console.log(`\nPAGE HTML (first 5000 chars):`);
  console.log(SUBDIV);
  console.log(html.substring(0, 5000));
  console.log(SUBDIV);

  // Look for PDF/document links
  const docLinks = await page.evaluate(() => {
    const links = [];
    document.querySelectorAll('a').forEach(a => {
      const href = a.getAttribute('href') || '';
      const text = a.textContent.trim();
      const hrefLower = href.toLowerCase();
      if (hrefLower.includes('pdf') || hrefLower.includes('document') ||
          hrefLower.includes('download') || hrefLower.includes('survey') ||
          hrefLower.includes('report') || hrefLower.includes('file') ||
          hrefLower.includes('blob') || hrefLower.includes('attachment')) {
        links.push({ href, text: text.substring(0, 200) });
      }
    });
    // Also check iframes, objects, embeds
    const iframes = [];
    document.querySelectorAll('iframe, object, embed').forEach(el => {
      iframes.push({
        tag: el.tagName,
        src: el.getAttribute('src') || el.getAttribute('data') || '',
        type: el.getAttribute('type') || ''
      });
    });
    return { docLinks: links, embeds: iframes };
  });

  console.log(`\nDOCUMENT/PDF LINKS FOUND (${docLinks.docLinks.length}):`);
  docLinks.docLinks.forEach((l, i) => {
    console.log(`  ${i + 1}. [${l.text}] → ${l.href}`);
  });

  if (docLinks.embeds.length > 0) {
    console.log(`\nEMBEDS/IFRAMES FOUND (${docLinks.embeds.length}):`);
    docLinks.embeds.forEach((e, i) => {
      console.log(`  ${i + 1}. <${e.tag}> src="${e.src}" type="${e.type}"`);
    });
  }

  // Get ALL links on the page
  const allLinks = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('a')).map(a => ({
      href: a.getAttribute('href') || '',
      text: a.textContent.trim().substring(0, 100)
    }));
  });
  console.log(`\nALL LINKS ON PAGE (${allLinks.length}):`);
  allLinks.forEach((l, i) => {
    console.log(`  ${i + 1}. [${l.text}] → ${l.href}`);
  });

  // Body text
  const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 3000));
  console.log(`\nBODY TEXT (first 3000 chars):`);
  console.log(bodyText);

  // Log intercepted XHR/fetch
  console.log(`\nINTERCEPTED RESPONSES (${responses.length}):`);
  responses.forEach((r, i) => {
    console.log(SUBDIV);
    console.log(`Response #${i + 1}:`);
    console.log(`  URL: ${r.url}`);
    console.log(`  Method: ${r.method}`);
    console.log(`  Status: ${r.status}`);
    console.log(`  Content-Type: ${r.contentType}`);
    console.log(`  Body Length: ${r.bodyLength}`);
    if (r.postData) {
      console.log(`  Post Data: ${r.postData.substring(0, 1000)}`);
    }
    if (r.contentType.includes('json') || r.contentType.includes('xml')) {
      console.log(`  Body Preview: ${r.bodyPreview.substring(0, 2000)}`);
    }
  });

  // Check for popup windows or JavaScript-driven content
  const jsLinks = await page.evaluate(() => {
    const onclickElements = [];
    document.querySelectorAll('[onclick]').forEach(el => {
      onclickElements.push({
        tag: el.tagName,
        onclick: el.getAttribute('onclick'),
        text: el.textContent.trim().substring(0, 100)
      });
    });
    // Check for window.open patterns in scripts
    const scripts = [];
    document.querySelectorAll('script').forEach(s => {
      const content = s.textContent || '';
      if (content.includes('window.open') || content.includes('popup') ||
          content.includes('document') || content.includes('ajax') ||
          content.includes('fetch') || content.includes('XMLHttpRequest')) {
        scripts.push(content.substring(0, 2000));
      }
    });
    return { onclickElements, scripts };
  });

  if (jsLinks.onclickElements.length > 0) {
    console.log(`\nONCLICK ELEMENTS (${jsLinks.onclickElements.length}):`);
    jsLinks.onclickElements.forEach((e, i) => {
      console.log(`  ${i + 1}. <${e.tag}> onclick="${e.onclick}" text="${e.text}"`);
    });
  }

  if (jsLinks.scripts.length > 0) {
    console.log(`\nRELEVANT SCRIPT CONTENT (${jsLinks.scripts.length}):`);
    jsLinks.scripts.forEach((s, i) => {
      console.log(`  Script #${i + 1}:`);
      console.log(`  ${s}`);
    });
  }

  await page.close();
}

main().catch(e => {
  console.error('FATAL ERROR:', e);
  process.exit(1);
});
