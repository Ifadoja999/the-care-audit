/**
 * Oklahoma Survey Portal Research Script - Part 4
 * Simulate the FULL USER FLOW: Search → SearchResults → FacilityDocuments
 * The documents page reads from sessionStorage, which is set by the search results page.
 * We need to find the SearchResults page and understand the full data flow.
 */

const { chromium } = require('playwright');

const DIVIDER = '='.repeat(80);

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });

  // =========================================================================
  // STEP 1: Find the SearchResults page JS
  // =========================================================================
  console.log(DIVIDER);
  console.log('STEP 1: Fetch searchresults.js');
  console.log(DIVIDER);

  const jsFiles = [
    'https://surveys.health.ok.gov/js/searchresults.js',
    'https://surveys.health.ok.gov/js/searchResults.js',
    'https://surveys.health.ok.gov/js/SearchResults.js',
    'https://surveys.health.ok.gov/js/searchresults.min.js',
    'https://surveys.health.ok.gov/js/results.js',
  ];

  for (const url of jsFiles) {
    const page = await context.newPage();
    try {
      const resp = await page.goto(url, { timeout: 5000 });
      if (resp.status() === 200) {
        const content = await resp.text();
        console.log(`\nFOUND: ${url} (${content.length} chars)`);
        console.log(content);
      } else {
        console.log(`${url}: ${resp.status()}`);
      }
    } catch(e) {
      console.log(`${url}: ERROR`);
    }
    await page.close();
  }

  // =========================================================================
  // STEP 2: Simulate the FULL user flow
  // Go to search page → search by facility name → click facility → get docs
  // =========================================================================
  console.log('\n' + DIVIDER);
  console.log('STEP 2: FULL USER FLOW — Search → Results → Documents');
  console.log(DIVIDER);

  const page = await context.newPage();

  // Track all XHR
  const allXhr = [];
  page.on('response', async response => {
    const req = response.request();
    if (req.resourceType() === 'xhr' || req.resourceType() === 'fetch') {
      let body = '';
      try { body = await response.text(); } catch(e) {}
      allXhr.push({
        url: response.url(),
        status: response.status(),
        bodyLength: body.length,
        bodyPreview: body.substring(0, 3000)
      });
    }
  });

  // Step 2a: Navigate to the ALC search page
  console.log('\n[2a] Navigating to Assisted Living Centers search page...');
  await page.goto('https://surveys.health.ok.gov/Home/Search/43S', {
    waitUntil: 'networkidle',
    timeout: 30000
  });
  console.log('Search page loaded');

  // Wait for page initialization
  await page.waitForTimeout(3000);

  // Check if facilities are loaded in sessionStorage
  const facilities = await page.evaluate(() => {
    const data = sessionStorage.getItem("LTCFacilities");
    if (!data) return null;
    const parsed = JSON.parse(data);
    return {
      total: parsed.length,
      alcCount: parsed.filter(f => f.facilityTypeCode === '43S').length,
      firstAlc: parsed.find(f => f.facilityTypeCode === '43S')
    };
  });
  console.log('\nSession storage facilities:', JSON.stringify(facilities, null, 2));

  // Step 2b: Select a specific ALC facility by name and search
  console.log('\n[2b] Searching for first open ALC facility...');

  // Get an open ALC facility name
  const openAlcName = await page.evaluate(() => {
    const data = JSON.parse(sessionStorage.getItem("LTCFacilities"));
    const openAlcs = data.filter(f => f.facilityTypeCode === '43S' && f.status === 'Open');
    return openAlcs[0] ? openAlcs[0].facilityName : null;
  });
  console.log(`Selected facility: ${openAlcName}`);

  if (openAlcName) {
    // Remove pageloader if stuck
    await page.evaluate(() => {
      document.querySelector('.pageloader')?.classList.remove('is-active');
    });

    // Select the facility in the dropdown
    await page.evaluate((name) => {
      $('#FacilityName').val(name).trigger('change');
    }, openAlcName);

    await page.waitForTimeout(500);

    // Click the search button
    console.log('Clicking search button...');
    await page.evaluate(() => {
      search(); // Call the search function directly
    });

    await page.waitForTimeout(3000);
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});

    // Check where we ended up
    const currentUrl = page.url();
    console.log(`Current URL after search: ${currentUrl}`);

    // Check the page content
    const afterSearch = await page.evaluate(() => ({
      url: window.location.href,
      title: document.title,
      sessionSearchResults: JSON.parse(sessionStorage.getItem("SearchResults") || 'null'),
      sessionSelectedFacility: JSON.parse(sessionStorage.getItem("SelectedFacility") || 'null'),
      bodyText: document.body.innerText.substring(0, 2000),
      tables: document.querySelectorAll('table').length,
      links: Array.from(document.querySelectorAll('a')).filter(a =>
        a.getAttribute('href')?.includes('FacilityDocuments') ||
        a.getAttribute('onclick')?.includes('FacilityDocuments') ||
        a.getAttribute('onclick')?.includes('selectFacility')
      ).map(a => ({
        href: a.getAttribute('href'),
        onclick: a.getAttribute('onclick'),
        text: a.textContent.trim().substring(0, 100)
      }))
    }));

    console.log('\nAfter search:');
    console.log(`URL: ${afterSearch.url}`);
    console.log(`Title: ${afterSearch.title}`);
    console.log(`Tables: ${afterSearch.tables}`);
    console.log(`Search Results in session:`, afterSearch.sessionSearchResults ? 'YES' : 'NO');
    console.log(`Selected Facility in session:`, afterSearch.sessionSelectedFacility ? 'YES' : 'NO');
    console.log(`Facility Document links found: ${afterSearch.links.length}`);
    afterSearch.links.forEach((l, i) => {
      console.log(`  Link ${i + 1}: href="${l.href}" onclick="${l.onclick}" text="${l.text}"`);
    });
    console.log(`\nBody text:\n${afterSearch.bodyText}`);

    // If we're on the SearchResults page, find the JS
    if (currentUrl.includes('SearchResults')) {
      const scripts = await page.evaluate(() =>
        Array.from(document.querySelectorAll('script[src]')).map(s => s.src)
      );
      console.log('\nScripts on SearchResults page:');
      scripts.forEach(s => console.log(`  ${s}`));

      // Get the full HTML
      const html = await page.content();
      console.log(`\nSearchResults HTML (first 3000 chars):`);
      console.log(html.substring(0, 3000));
    }
  }

  // =========================================================================
  // STEP 3: Try the complete flow — populate sessionStorage manually,
  // then navigate to FacilityDocuments
  // =========================================================================
  console.log('\n' + DIVIDER);
  console.log('STEP 3: MANUAL SESSION STORAGE → FacilityDocuments');
  console.log(DIVIDER);

  const page3 = await context.newPage();

  // First, get a real facility's documents via the search→select flow
  // Navigate to search, search for a facility, look for the selectFacility function
  await page3.goto('https://surveys.health.ok.gov/Home/Search/43S', {
    waitUntil: 'networkidle',
    timeout: 30000
  });
  await page3.waitForTimeout(2000);

  // Look for the searchresults.js on the SearchResults page
  // First navigate there
  const facilityName = await page3.evaluate(() => {
    const data = JSON.parse(sessionStorage.getItem("LTCFacilities"));
    const openAlcs = data.filter(f => f.facilityTypeCode === '43S' && f.status === 'Open');
    return openAlcs[0].facilityName;
  });

  // Perform search via JS
  await page3.evaluate((name) => {
    document.querySelector('.pageloader')?.classList.remove('is-active');
    $('#FacilityName').val(name).trigger('change');
    search();
  }, facilityName);

  await page3.waitForTimeout(3000);
  await page3.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});

  console.log(`Now on: ${page3.url()}`);

  // Get the scripts and look for searchresults.js
  const srScripts = await page3.evaluate(() =>
    Array.from(document.querySelectorAll('script[src]')).map(s => s.src)
  );
  console.log('Scripts:');
  srScripts.forEach(s => console.log(`  ${s}`));

  // Get inline scripts
  const inlineScripts = await page3.evaluate(() => {
    return Array.from(document.querySelectorAll('script:not([src])'))
      .map(s => s.textContent)
      .filter(t => t.length > 50);
  });
  console.log('\nInline scripts:');
  inlineScripts.forEach((s, i) => console.log(`  Script ${i + 1}: ${s.substring(0, 500)}`));

  // Get the page HTML
  const srHtml = await page3.content();
  console.log(`\nSearchResults page HTML length: ${srHtml.length}`);
  console.log(srHtml.substring(0, 5000));

  // Look for facility links and click one
  await page3.evaluate(() => {
    document.querySelector('.pageloader')?.classList.remove('is-active');
  });
  await page3.waitForTimeout(1000);

  const facilityLinks = await page3.evaluate(() => {
    const links = [];
    document.querySelectorAll('a, [onclick]').forEach(el => {
      const onclick = el.getAttribute('onclick') || '';
      const href = el.getAttribute('href') || '';
      if (onclick.includes('select') || onclick.includes('Facility') ||
          href.includes('FacilityDocuments') || onclick.includes('Document')) {
        links.push({
          tag: el.tagName,
          href,
          onclick,
          text: el.textContent.trim().substring(0, 100)
        });
      }
    });
    return links;
  });
  console.log(`\nFacility links/buttons found: ${facilityLinks.length}`);
  facilityLinks.forEach((l, i) => console.log(`  ${i + 1}. <${l.tag}> href="${l.href}" onclick="${l.onclick}" text="${l.text}"`));

  // Check session storage for SelectedFacility
  const selectedFac = await page3.evaluate(() => {
    return sessionStorage.getItem("SelectedFacility");
  });
  console.log(`\nSelectedFacility in session: ${selectedFac ? selectedFac.substring(0, 1000) : 'NULL'}`);

  // Look for the table rows with facility data
  const tableInfo = await page3.evaluate(() => {
    const tables = document.querySelectorAll('table');
    const rows = [];
    tables.forEach(t => {
      t.querySelectorAll('tr').forEach(tr => {
        const cells = Array.from(tr.querySelectorAll('td, th')).map(c => c.textContent.trim().substring(0, 50));
        const links = Array.from(tr.querySelectorAll('a')).map(a => ({
          href: a.getAttribute('href') || '',
          onclick: a.getAttribute('onclick') || '',
          text: a.textContent.trim()
        }));
        rows.push({ cells, links });
      });
    });
    return { tableCount: tables.length, rows };
  });
  console.log(`\nTables: ${tableInfo.tableCount}`);
  tableInfo.rows.forEach((r, i) => {
    console.log(`  Row ${i + 1}: ${r.cells.join(' | ')}`);
    r.links.forEach(l => console.log(`    Link: href="${l.href}" onclick="${l.onclick}" text="${l.text}"`));
  });

  // If there's a facility link, click it and see what happens
  if (facilityLinks.length > 0 || tableInfo.rows.length > 0) {
    // Try clicking the first facility row/link
    console.log('\nAttempting to click first facility link...');
    try {
      // Look for the actual table link
      const firstFacLink = await page3.evaluate(() => {
        const firstLink = document.querySelector('table td a');
        if (firstLink) {
          const onclick = firstLink.getAttribute('onclick');
          return { onclick, text: firstLink.textContent };
        }
        return null;
      });

      if (firstFacLink) {
        console.log(`Clicking link: ${firstFacLink.text} (onclick: ${firstFacLink.onclick})`);
        await page3.evaluate(() => {
          const link = document.querySelector('table td a');
          if (link) link.click();
        });
        await page3.waitForTimeout(5000);
        await page3.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});

        console.log(`Now on: ${page3.url()}`);

        // Check SelectedFacility in session
        const selectedAfterClick = await page3.evaluate(() => {
          return sessionStorage.getItem("SelectedFacility");
        });
        console.log(`SelectedFacility after click: ${selectedAfterClick ? selectedAfterClick.substring(0, 2000) : 'NULL'}`);

        // Check the documents page content
        const docsPage = await page3.evaluate(() => {
          document.querySelector('.pageloader')?.classList.remove('is-active');
          return {
            bodyText: document.body.innerText.substring(0, 3000),
            tables: document.querySelectorAll('table').length,
            rows: document.querySelectorAll('tr').length,
            links: Array.from(document.querySelectorAll('a')).map(a => ({
              href: a.getAttribute('href') || '',
              onclick: a.getAttribute('onclick') || '',
              text: a.textContent.trim().substring(0, 100)
            }))
          };
        });
        console.log(`\nFacilityDocuments page:`);
        console.log(`Tables: ${docsPage.tables}, Rows: ${docsPage.rows}`);
        console.log(`Body text:\n${docsPage.bodyText}`);
        console.log(`\nAll links (${docsPage.links.length}):`);
        docsPage.links.forEach((l, i) => {
          if (l.onclick || l.href.includes('Document') || l.href.includes('pdf') ||
              l.href.includes('imaging')) {
            console.log(`  ${i + 1}. href="${l.href}" onclick="${l.onclick}" text="${l.text}"`);
          }
        });
      }
    } catch(e) {
      console.log(`Error: ${e.message}`);
    }
  }

  // Log all XHR requests
  console.log(`\nALL XHR REQUESTS DURING SESSION (${allXhr.length}):`);
  allXhr.forEach((r, i) => {
    if (!r.url.includes('google')) {
      console.log(`  ${i + 1}. ${r.url} — ${r.status} — ${r.bodyLength} chars`);
    }
  });

  await page3.close();
  await browser.close();

  console.log('\n' + DIVIDER);
  console.log('RESEARCH PART 4 COMPLETE');
  console.log(DIVIDER);
}

main().catch(e => {
  console.error('FATAL ERROR:', e);
  process.exit(1);
});
