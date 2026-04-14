/**
 * Oklahoma Survey Portal Research Script - Part 2
 * Deep dive into the API and document retrieval patterns.
 */

const { chromium } = require('playwright');

const DIVIDER = '='.repeat(80);
const SUBDIV = '-'.repeat(60);

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });

  // =========================================================================
  // STEP 1: Hit the API directly and filter for ALCs
  // =========================================================================
  console.log(DIVIDER);
  console.log('STEP 1: API FACILITY DATA — FILTER FOR ALC AND RC TYPES');
  console.log(DIVIDER);

  const page = await context.newPage();
  const apiResp = await page.goto('https://surveys.health.ok.gov/Api/facilities', {
    waitUntil: 'networkidle',
    timeout: 30000
  });
  const apiText = await apiResp.text();
  const apiData = JSON.parse(apiText);

  console.log(`Total facilities in API: ${apiData.result.length}`);

  // Group by facilityTypeCode
  const typeGroups = {};
  for (const f of apiData.result) {
    const key = `${f.facilityTypeCode} - ${f.facilityTypeDescription}`;
    if (!typeGroups[key]) typeGroups[key] = { count: 0, openCount: 0, closedCount: 0, sample: null };
    typeGroups[key].count++;
    if (f.status === 'Open') typeGroups[key].openCount++;
    if (f.status === 'Closed') typeGroups[key].closedCount++;
    if (!typeGroups[key].sample) typeGroups[key].sample = f;
  }

  console.log('\nFACILITY TYPES IN API:');
  for (const [key, val] of Object.entries(typeGroups)) {
    console.log(`  ${key}: ${val.count} total (${val.openCount} open, ${val.closedCount} closed)`);
  }

  // Get ALC facilities
  const alcs = apiData.result.filter(f => f.facilityTypeCode === '43S');
  const rcs = apiData.result.filter(f => f.facilityTypeCode === '40S');

  console.log(`\nASSISTED LIVING CENTERS (43S): ${alcs.length}`);
  console.log(`RESIDENTIAL CARE HOMES (40S): ${rcs.length}`);

  // Show full sample of ALC facility
  console.log('\nSAMPLE ALC FACILITY (full object):');
  console.log(JSON.stringify(alcs[0], null, 2));

  // Show first 10 ALC facility IDs
  console.log('\nFIRST 20 ALC FACILITY IDs:');
  alcs.slice(0, 20).forEach(f => {
    console.log(`  ${f.facilityId} — ${f.facilityName} — ${f.city} — ${f.status} — beds: ${f.licensedBed} — surveyDocsOnly: ${f.surveyDocsOnly}`);
  });

  // Show first 10 RC facility IDs
  console.log('\nFIRST 10 RC FACILITY IDs:');
  rcs.slice(0, 10).forEach(f => {
    console.log(`  ${f.facilityId} — ${f.facilityName} — ${f.city} — ${f.status} — beds: ${f.licensedBed}`);
  });

  await page.close();

  // =========================================================================
  // STEP 2: Try the SEARCH page with facility type 43S — look for JS that loads facilities
  // =========================================================================
  console.log('\n' + DIVIDER);
  console.log('STEP 2: SEARCH PAGE FULL HTML + JAVASCRIPT ANALYSIS');
  console.log(DIVIDER);

  const searchPage = await context.newPage();
  await searchPage.goto('https://surveys.health.ok.gov/Home/Search/43S', {
    waitUntil: 'networkidle',
    timeout: 30000
  });

  // Get ALL script content (including external script URLs)
  const scriptInfo = await searchPage.evaluate(() => {
    const scripts = [];
    document.querySelectorAll('script').forEach(s => {
      scripts.push({
        src: s.src || '(inline)',
        content: s.textContent.substring(0, 5000)
      });
    });
    // Also get all CSS link URLs
    const cssLinks = [];
    document.querySelectorAll('link[rel="stylesheet"]').forEach(l => {
      cssLinks.push(l.href);
    });
    // Get all script src URLs
    const scriptSrcs = [];
    document.querySelectorAll('script[src]').forEach(s => {
      scriptSrcs.push(s.src);
    });
    return { scripts, cssLinks, scriptSrcs };
  });

  console.log('\nEXTERNAL SCRIPT SOURCES:');
  scriptInfo.scriptSrcs.forEach(s => console.log(`  ${s}`));

  console.log('\nCSS LINKS:');
  scriptInfo.cssLinks.forEach(c => console.log(`  ${c}`));

  // Now look at the bundled JS file
  const jsBundleUrl = scriptInfo.scriptSrcs.find(s => s.includes('index.min.js') || s.includes('site.js') || s.includes('bundle'));
  if (jsBundleUrl) {
    console.log(`\nFOUND JS BUNDLE: ${jsBundleUrl}`);
  }

  // Let's get the full page HTML to look for Vue/React/Angular app init
  const fullHtml = await searchPage.content();
  // Search for facility-related JavaScript patterns
  const jsPatterns = [
    /facilityDocuments/gi,
    /FacilityDocuments/g,
    /\/Api\//g,
    /\/api\//g,
    /getDocuments/gi,
    /surveyEvents/gi,
    /window\.open/g,
    /popup/gi,
    /vue/gi,
    /angular/gi,
    /react/gi,
    /knockout/gi,
    /data-bind/gi,
    /v-bind/gi,
    /ng-/g,
    /select2/gi,
    /dataTables/gi,
    /dataTable/gi,
  ];

  console.log('\nJAVASCRIPT PATTERN MATCHES IN HTML:');
  for (const pattern of jsPatterns) {
    const matches = fullHtml.match(pattern);
    if (matches) {
      console.log(`  ${pattern}: ${matches.length} match(es)`);
    }
  }

  // Find the main JS file
  const mainJsUrls = scriptInfo.scriptSrcs.filter(s =>
    s.includes('surveys.health.ok.gov') && !s.includes('google')
  );
  console.log('\nSITE JS FILES:');
  mainJsUrls.forEach(u => console.log(`  ${u}`));

  await searchPage.close();

  // =========================================================================
  // STEP 3: Fetch the site's JS bundle to find API endpoints and document logic
  // =========================================================================
  console.log('\n' + DIVIDER);
  console.log('STEP 3: FETCH SITE JS BUNDLES');
  console.log(DIVIDER);

  // Try common JS file paths
  const jsUrls = [
    'https://surveys.health.ok.gov/js/index.min.js',
    'https://surveys.health.ok.gov/js/site.js',
    'https://surveys.health.ok.gov/js/app.js',
    'https://surveys.health.ok.gov/js/bundle.js',
    'https://surveys.health.ok.gov/lib/jquery/dist/jquery.min.js',
  ];

  for (const jsUrl of jsUrls) {
    const jsPage = await context.newPage();
    try {
      const resp = await jsPage.goto(jsUrl, { timeout: 10000 });
      if (resp.status() === 200) {
        const jsContent = await resp.text();
        console.log(`\n${jsUrl}: ${jsContent.length} chars`);

        // Search for API-related patterns
        const apiPatterns = [
          /Api\/facilities/g,
          /Api\/documents/gi,
          /Api\/survey/gi,
          /FacilityDocuments/g,
          /facilityId/g,
          /getDocuments/gi,
          /window\.open/g,
          /popup/gi,
          /\.pdf/gi,
          /download/gi,
          /blob/gi,
        ];

        for (const p of apiPatterns) {
          const matches = jsContent.match(p);
          if (matches) {
            console.log(`  Pattern ${p}: ${matches.length} match(es)`);
            // Find surrounding context
            let idx = 0;
            let searchStr = jsContent;
            const found = [];
            while ((idx = searchStr.search(p)) !== -1 && found.length < 3) {
              const start = Math.max(0, idx - 100);
              const end = Math.min(searchStr.length, idx + 200);
              found.push(searchStr.substring(start, end));
              searchStr = searchStr.substring(idx + 10);
            }
            found.forEach((ctx, i) => {
              console.log(`    Context ${i + 1}: ...${ctx.replace(/\n/g, ' ')}...`);
            });
          }
        }
      } else {
        console.log(`${jsUrl}: ${resp.status()}`);
      }
    } catch (e) {
      console.log(`${jsUrl}: ERROR - ${e.message}`);
    }
    await jsPage.close();
  }

  // Also check for a hashed JS bundle
  const bundlePage = await context.newPage();
  await bundlePage.goto('https://surveys.health.ok.gov/Home/Search/43S', {
    waitUntil: 'networkidle',
    timeout: 30000
  });
  const allScriptSrcs = await bundlePage.evaluate(() => {
    return Array.from(document.querySelectorAll('script[src]')).map(s => s.src);
  });
  console.log('\nALL SCRIPT SRCs ON SEARCH PAGE:');
  allScriptSrcs.forEach(s => console.log(`  ${s}`));
  await bundlePage.close();

  // =========================================================================
  // STEP 4: Now fetch the CC7201AL page JS and look for document API calls
  // =========================================================================
  console.log('\n' + DIVIDER);
  console.log('STEP 4: CC7201AL DOCUMENTS PAGE — FULL HTML + SCRIPTS');
  console.log(DIVIDER);

  const docPage = await context.newPage();

  const docResponses = [];
  docPage.on('response', async response => {
    const request = response.request();
    const rt = request.resourceType();
    if (['xhr', 'fetch', 'script'].includes(rt)) {
      let body = '';
      try { body = await response.text(); } catch(e) { body = `[Error: ${e.message}]`; }
      docResponses.push({
        url: response.url(),
        status: response.status(),
        contentType: response.headers()['content-type'] || '',
        bodyLength: body.length,
        bodyPreview: body.substring(0, 3000),
        resourceType: rt
      });
    }
  });

  await docPage.goto('https://surveys.health.ok.gov/Home/FacilityDocuments/CC7201AL', {
    waitUntil: 'networkidle',
    timeout: 30000
  });

  // Get full HTML
  const docHtml = await docPage.content();
  console.log(`\nFULL HTML LENGTH: ${docHtml.length} chars`);

  // Find document-related HTML sections
  const docHtmlLower = docHtml.toLowerCase();

  // Look for data tables
  const tableMatch = docHtml.match(/<table[\s\S]*?<\/table>/gi);
  if (tableMatch) {
    console.log(`\nTABLES FOUND: ${tableMatch.length}`);
    tableMatch.forEach((t, i) => {
      console.log(`  Table ${i + 1} (first 500 chars): ${t.substring(0, 500)}`);
    });
  }

  // Get all scripts on this page
  const docScripts = await docPage.evaluate(() => {
    return Array.from(document.querySelectorAll('script[src]')).map(s => s.src);
  });
  console.log('\nSCRIPT SRCs ON DOCUMENTS PAGE:');
  docScripts.forEach(s => console.log(`  ${s}`));

  // Wait a bit for any lazy-loaded content
  await docPage.waitForTimeout(3000);

  // Check if there's a DataTable or document list now
  const postWaitInfo = await docPage.evaluate(() => {
    const tables = document.querySelectorAll('table');
    const trs = document.querySelectorAll('tr');
    const tds = document.querySelectorAll('td');
    const anchors = document.querySelectorAll('a');
    const allText = document.body.innerText;

    // Look for any hidden/dynamic content
    const hiddenDivs = document.querySelectorAll('[style*="display: none"], .is-hidden, [hidden]');

    return {
      tables: tables.length,
      rows: trs.length,
      cells: tds.length,
      anchors: anchors.length,
      hiddenDivs: hiddenDivs.length,
      bodyText: allText.substring(0, 4000)
    };
  });

  console.log(`\nPOST-WAIT PAGE STATE:`);
  console.log(`Tables: ${postWaitInfo.tables}, Rows: ${postWaitInfo.rows}, Cells: ${postWaitInfo.cells}`);
  console.log(`Anchors: ${postWaitInfo.anchors}, Hidden divs: ${postWaitInfo.hiddenDivs}`);
  console.log(`\nBODY TEXT:\n${postWaitInfo.bodyText}`);

  // Log intercepted responses
  console.log(`\nINTERCEPTED XHR/FETCH/SCRIPT RESPONSES (${docResponses.length}):`);
  docResponses.forEach((r, i) => {
    if (!r.url.includes('google')) {
      console.log(SUBDIV);
      console.log(`  ${r.resourceType.toUpperCase()} ${r.url}`);
      console.log(`  Status: ${r.status} | Content-Type: ${r.contentType} | Length: ${r.bodyLength}`);
      if (r.contentType.includes('json') || r.contentType.includes('javascript')) {
        // For JS files, look for API-related code
        if (r.resourceType === 'script' && r.bodyLength > 100) {
          const apiRelated = r.bodyPreview.match(/[Aa]pi|[Dd]ocument|[Ff]acility|[Ss]urvey|[Pp]df|popup|window\.open/g);
          if (apiRelated) {
            console.log(`  API-related patterns: ${apiRelated.join(', ')}`);
          }
        }
        if (r.contentType.includes('json')) {
          console.log(`  Body: ${r.bodyPreview.substring(0, 2000)}`);
        }
      }
    }
  });

  await docPage.close();

  // =========================================================================
  // STEP 5: Try fetching the index.min.js with the versioned URL
  // =========================================================================
  console.log('\n' + DIVIDER);
  console.log('STEP 5: FETCH VERSIONED JS BUNDLE');
  console.log(DIVIDER);

  // Find the versioned JS URL from the scripts we found
  const versionedJs = allScriptSrcs.find(s => s.includes('index.min.js')) ||
                      docScripts.find(s => s.includes('index.min.js'));

  if (versionedJs) {
    console.log(`Fetching: ${versionedJs}`);
    const jsPage2 = await context.newPage();
    const resp = await jsPage2.goto(versionedJs, { timeout: 10000 });
    const jsContent = await resp.text();
    console.log(`JS Bundle size: ${jsContent.length} chars`);

    // Search for all API endpoint references
    const endpointMatches = jsContent.match(/["']\/[Aa]pi\/[^"']+["']/g) || [];
    console.log(`\nAPI ENDPOINT REFERENCES FOUND: ${endpointMatches.length}`);
    endpointMatches.forEach(m => console.log(`  ${m}`));

    // Search for facility document-related code
    const docMatches = jsContent.match(/[Ff]acility[Dd]ocument[^"'\s]*/g) || [];
    console.log(`\nFACILITY DOCUMENT REFERENCES: ${docMatches.length}`);
    docMatches.forEach(m => console.log(`  ${m}`));

    // Search for popup/window.open patterns
    const popupMatches = jsContent.match(/window\.open\([^)]+\)/g) || [];
    console.log(`\nWINDOW.OPEN CALLS: ${popupMatches.length}`);
    popupMatches.forEach(m => console.log(`  ${m}`));

    // Search for PDF patterns
    const pdfMatches = jsContent.match(/\.pdf|[Pp][Dd][Ff]/g) || [];
    console.log(`\nPDF REFERENCES: ${pdfMatches.length}`);

    // Look for document download or blob URLs
    const blobMatches = jsContent.match(/blob|[Dd]ownload|[Ff]ile[Uu]rl/g) || [];
    console.log(`BLOB/DOWNLOAD REFERENCES: ${blobMatches.length}`);

    // Find all fetch/ajax calls
    const fetchMatches = jsContent.match(/fetch\(|\.ajax\(|XMLHttpRequest|\.get\(|\.post\(/g) || [];
    console.log(`FETCH/AJAX CALLS: ${fetchMatches.length}`);

    // Print relevant sections
    const relevantPatterns = [
      /Api\/[a-zA-Z]+/g,
      /documents/gi,
      /survey.*event/gi,
    ];

    for (const p of relevantPatterns) {
      let idx = 0;
      const searchStr = jsContent;
      const regex = new RegExp(p.source, p.flags);
      let match;
      let count = 0;
      while ((match = regex.exec(searchStr)) !== null && count < 5) {
        const start = Math.max(0, match.index - 150);
        const end = Math.min(searchStr.length, match.index + 300);
        const ctx = searchStr.substring(start, end).replace(/\n/g, ' ');
        console.log(`\n  ${p} match #${count + 1} context:`);
        console.log(`    ...${ctx}...`);
        count++;
      }
    }

    await jsPage2.close();
  } else {
    console.log('No versioned JS bundle found. Trying alternate paths...');

    // Try to find JS files from the documents page
    const jsPage3 = await context.newPage();
    const paths = [
      '/js/index.min.js',
      '/js/site.min.js',
      '/js/app.min.js',
      '/js/facilityDocuments.min.js',
      '/js/search.min.js',
    ];
    for (const p of paths) {
      try {
        const resp = await jsPage3.goto(`https://surveys.health.ok.gov${p}`, { timeout: 5000 });
        console.log(`  ${p}: ${resp.status()}`);
      } catch(e) {
        console.log(`  ${p}: ERROR`);
      }
    }
    await jsPage3.close();
  }

  // =========================================================================
  // STEP 6: Try the documents API directly
  // =========================================================================
  console.log('\n' + DIVIDER);
  console.log('STEP 6: TRY DOCUMENT API ENDPOINTS DIRECTLY');
  console.log(DIVIDER);

  const apiPaths = [
    '/Api/documents/CC7201AL',
    '/Api/documents?facilityId=CC7201AL',
    '/Api/facilitydocuments/CC7201AL',
    '/Api/facilityDocuments/CC7201AL',
    '/Api/FacilityDocuments/CC7201AL',
    '/Api/surveyEvents/CC7201AL',
    '/Api/surveys/CC7201AL',
    '/Api/documents/AL7201',
    '/Api/facilitydocuments/AL7201',
    '/Api/surveyEvents/AL7201',
    '/Api/facilities/CC7201AL',
    '/Api/facilities/AL7201',
    '/Api/facilities?facilityTypeCode=43S',
  ];

  for (const apiPath of apiPaths) {
    const apiPage = await context.newPage();
    try {
      const resp = await apiPage.goto(`https://surveys.health.ok.gov${apiPath}`, { timeout: 10000 });
      const status = resp.status();
      const ct = resp.headers()['content-type'] || '';
      let body = '';
      try { body = await resp.text(); } catch(e) { body = ''; }
      console.log(`\n${apiPath}:`);
      console.log(`  Status: ${status} | Content-Type: ${ct} | Length: ${body.length}`);
      if (body.length > 0 && body.length < 10000 && (ct.includes('json') || ct.includes('text'))) {
        console.log(`  Body: ${body.substring(0, 2000)}`);
      } else if (body.length >= 10000) {
        console.log(`  Body (first 1000 chars): ${body.substring(0, 1000)}`);
      }
    } catch(e) {
      console.log(`${apiPath}: ERROR - ${e.message}`);
    }
    await apiPage.close();
  }

  await browser.close();
  console.log('\n' + DIVIDER);
  console.log('RESEARCH PART 2 COMPLETE');
  console.log(DIVIDER);
}

main().catch(e => {
  console.error('FATAL ERROR:', e);
  process.exit(1);
});
