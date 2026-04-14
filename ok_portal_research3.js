/**
 * Oklahoma Survey Portal Research Script - Part 3
 * Fetch and analyze the key JS files + interact with the documents page.
 */

const { chromium } = require('playwright');

const DIVIDER = '='.repeat(80);

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });

  // =========================================================================
  // STEP 1: Fetch facilitydocuments.js (8415 chars) — the key file
  // =========================================================================
  console.log(DIVIDER);
  console.log('STEP 1: facilitydocuments.js — FULL CONTENT');
  console.log(DIVIDER);

  const page1 = await context.newPage();
  const resp1 = await page1.goto('https://surveys.health.ok.gov/js/facilitydocuments.js', { timeout: 10000 });
  const facilityDocJs = await resp1.text();
  console.log(facilityDocJs);
  await page1.close();

  // =========================================================================
  // STEP 2: Fetch site.js (9468 chars) — main site logic
  // =========================================================================
  console.log('\n' + DIVIDER);
  console.log('STEP 2: site.js — FULL CONTENT');
  console.log(DIVIDER);

  const page2 = await context.newPage();
  const resp2 = await page2.goto('https://surveys.health.ok.gov/js/site.js', { timeout: 10000 });
  const siteJs = await resp2.text();
  console.log(siteJs);
  await page2.close();

  // =========================================================================
  // STEP 3: Fetch search.js
  // =========================================================================
  console.log('\n' + DIVIDER);
  console.log('STEP 3: search.js / search.min.js — FULL CONTENT');
  console.log(DIVIDER);

  const page3 = await context.newPage();
  try {
    const resp3 = await page3.goto('https://surveys.health.ok.gov/js/search.js', { timeout: 10000 });
    if (resp3.status() === 200) {
      const searchJs = await resp3.text();
      console.log(searchJs);
    } else {
      console.log(`search.js returned ${resp3.status()}, trying search.min.js...`);
      const resp3b = await page3.goto('https://surveys.health.ok.gov/js/search.min.js', { timeout: 10000 });
      const searchMinJs = await resp3b.text();
      console.log(searchMinJs);
    }
  } catch(e) {
    console.log(`Error fetching search.js: ${e.message}`);
  }
  await page3.close();

  // =========================================================================
  // STEP 4: Fetch dataTables.bulma.js
  // =========================================================================
  console.log('\n' + DIVIDER);
  console.log('STEP 4: dataTables.bulma.js — FULL CONTENT');
  console.log(DIVIDER);

  const page4 = await context.newPage();
  const resp4 = await page4.goto('https://surveys.health.ok.gov/js/dataTables.bulma.js', { timeout: 10000 });
  const dtBulmaJs = await resp4.text();
  console.log(dtBulmaJs);
  await page4.close();

  // =========================================================================
  // STEP 5: Navigate to CC7201AL and click "Survey Events Only" button
  // =========================================================================
  console.log('\n' + DIVIDER);
  console.log('STEP 5: CC7201AL — CLICK "Survey Events Only" + INTERCEPT AJAX');
  console.log(DIVIDER);

  const docPage = await context.newPage();

  const intercepted = [];
  docPage.on('response', async response => {
    const req = response.request();
    const rt = req.resourceType();
    if (rt === 'xhr' || rt === 'fetch') {
      let body = '';
      try { body = await response.text(); } catch(e) { body = `[Error: ${e.message}]`; }
      intercepted.push({
        url: response.url(),
        status: response.status(),
        contentType: response.headers()['content-type'] || '',
        bodyLength: body.length,
        bodyPreview: body.substring(0, 5000),
        method: req.method(),
        postData: req.postData() || null
      });
    }
  });

  await docPage.goto('https://surveys.health.ok.gov/Home/FacilityDocuments/CC7201AL', {
    waitUntil: 'networkidle',
    timeout: 30000
  });

  console.log('Page loaded. Waiting for JS to initialize...');
  await docPage.waitForTimeout(2000);

  // Click "Survey Events Only"
  console.log('\nClicking "Survey Events Only"...');
  try {
    await docPage.click('text=Survey Events Only');
    await docPage.waitForTimeout(5000);
    await docPage.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
  } catch(e) {
    console.log(`Click error: ${e.message}`);
  }

  // Check page content after click
  const postClick1 = await docPage.evaluate(() => ({
    tables: document.querySelectorAll('table').length,
    rows: document.querySelectorAll('tr').length,
    bodyText: document.body.innerText.substring(0, 3000)
  }));
  console.log(`After "Survey Events Only" click:`);
  console.log(`Tables: ${postClick1.tables}, Rows: ${postClick1.rows}`);
  console.log(`Body text:\n${postClick1.bodyText}`);

  // Click "All Documents"
  console.log('\nClicking "All Documents"...');
  try {
    await docPage.click('text=All Documents');
    await docPage.waitForTimeout(5000);
    await docPage.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
  } catch(e) {
    console.log(`Click error: ${e.message}`);
  }

  const postClick2 = await docPage.evaluate(() => ({
    tables: document.querySelectorAll('table').length,
    rows: document.querySelectorAll('tr').length,
    bodyText: document.body.innerText.substring(0, 3000),
    allLinks: Array.from(document.querySelectorAll('a')).map(a => ({
      href: a.getAttribute('href') || '',
      text: a.textContent.trim().substring(0, 100)
    }))
  }));
  console.log(`After "All Documents" click:`);
  console.log(`Tables: ${postClick2.tables}, Rows: ${postClick2.rows}`);
  console.log(`Links: ${postClick2.allLinks.length}`);
  console.log(`Body text:\n${postClick2.bodyText}`);

  // Log all intercepted XHR/fetch
  console.log(`\nALL INTERCEPTED XHR/FETCH RESPONSES (${intercepted.length}):`);
  intercepted.forEach((r, i) => {
    console.log(`\nResponse #${i + 1}:`);
    console.log(`  URL: ${r.url}`);
    console.log(`  Method: ${r.method}`);
    console.log(`  Status: ${r.status}`);
    console.log(`  Content-Type: ${r.contentType}`);
    console.log(`  Body Length: ${r.bodyLength}`);
    if (r.postData) console.log(`  Post Data: ${r.postData.substring(0, 500)}`);
    if (r.contentType.includes('json')) {
      console.log(`  Body: ${r.bodyPreview}`);
    }
  });

  // Check the full HTML again for dynamically loaded content
  const finalHtml = await docPage.content();
  console.log(`\nFINAL HTML LENGTH: ${finalHtml.length}`);

  // Search for data-* attributes, hidden elements with document data
  const dynamicContent = await docPage.evaluate(() => {
    // Look for any element with data attributes
    const dataElements = [];
    document.querySelectorAll('[data-url], [data-id], [data-facility]').forEach(el => {
      dataElements.push({
        tag: el.tagName,
        attrs: Array.from(el.attributes).map(a => `${a.name}="${a.value}"`).join(', ')
      });
    });

    // Check for any content inside the pageloader
    const pageloader = document.querySelector('.pageloader');
    const isActive = pageloader ? pageloader.classList.contains('is-active') : false;

    return { dataElements, pageloaderActive: isActive };
  });

  console.log(`\nData elements: ${dynamicContent.dataElements.length}`);
  dynamicContent.dataElements.forEach(d => console.log(`  <${d.tag}> ${d.attrs}`));
  console.log(`Pageloader still active: ${dynamicContent.pageloaderActive}`);

  await docPage.close();

  // =========================================================================
  // STEP 6: Look at the full HTML of the CC7201AL FacilityDocuments page
  // =========================================================================
  console.log('\n' + DIVIDER);
  console.log('STEP 6: CC7201AL — COMPLETE HTML (looking for hidden facility ID / API paths)');
  console.log(DIVIDER);

  const page6 = await context.newPage();
  const resp6 = await page6.goto('https://surveys.health.ok.gov/Home/FacilityDocuments/CC7201AL', {
    waitUntil: 'domcontentloaded',
    timeout: 30000
  });

  // Get raw HTML before JS modifies it
  const rawHtml = await resp6.text();
  console.log(`Raw HTML length: ${rawHtml.length}`);

  // Look for facility-specific data embedded in the HTML
  const facilityDataPatterns = [
    /CC7201AL/g,
    /facilityId/g,
    /data-facility/g,
    /data-id/g,
    /var\s+facility/g,
    /var\s+surveyId/g,
    /\/Api\//g,
    /surveyEvent/gi,
    /surveyDocs/gi,
  ];

  for (const p of facilityDataPatterns) {
    const matches = rawHtml.match(p);
    if (matches) {
      console.log(`\nPattern ${p}: ${matches.length} match(es)`);
      // Get context
      let searchStr = rawHtml;
      const regex = new RegExp(p.source, p.flags);
      let match;
      let count = 0;
      while ((match = regex.exec(searchStr)) !== null && count < 5) {
        const start = Math.max(0, match.index - 100);
        const end = Math.min(searchStr.length, match.index + 200);
        console.log(`  Context: ...${searchStr.substring(start, end).replace(/\n/g, ' ')}...`);
        count++;
      }
    }
  }

  await page6.close();
  await browser.close();

  console.log('\n' + DIVIDER);
  console.log('RESEARCH PART 3 COMPLETE');
  console.log(DIVIDER);
}

main().catch(e => {
  console.error('FATAL ERROR:', e);
  process.exit(1);
});
