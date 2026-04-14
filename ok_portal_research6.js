/**
 * Oklahoma Survey Portal Research Script - Part 6
 * Use direct HTTP requests via the page's fetch API, blocking navigation.
 */

const { chromium } = require('playwright');

const DIVIDER = '='.repeat(80);

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });

  // =========================================================================
  // STEP 1: Get all facilities from the API directly
  // =========================================================================
  console.log(DIVIDER);
  console.log('STEP 1: GET ALL FACILITIES');
  console.log(DIVIDER);

  const page = await context.newPage();

  // Navigate to the page but block any redirects from site JS
  await page.route('**/*', (route) => {
    const url = route.request().url();
    // Only allow the initial page load and API calls
    if (url.includes('/Api/') || url === 'about:blank') {
      route.continue();
    } else if (url.includes('surveys.health.ok.gov') && !url.includes('/Home/Search') && !url.includes('/Home/FacilityDocuments')) {
      route.continue();
    } else {
      route.continue(); // Let everything through but we'll handle navigation
    }
  });

  // Navigate to a blank page, then make API calls from there
  await page.goto('https://surveys.health.ok.gov/', {
    waitUntil: 'domcontentloaded',
    timeout: 15000
  });

  // Block any navigation attempts from the page JS
  await page.evaluate(() => {
    // Prevent the site's JS from navigating
    window.addEventListener('beforeunload', (e) => {
      e.preventDefault();
      return false;
    });
    // Override location.href setter
    Object.defineProperty(window, 'location_href_backup', { value: window.location.href });
  });

  // Now call the facilities API
  const facilities = await page.evaluate(async () => {
    const resp = await fetch('/Api/facilities', {
      headers: { 'Accept': 'application/json' }
    });
    const data = await resp.json();
    return data.result;
  });

  const alcs = facilities.filter(f => f.facilityTypeCode === '43S');
  const openAlcs = alcs.filter(f => f.status === 'Open');

  console.log(`Total facilities: ${facilities.length}`);
  console.log(`ALCs: ${alcs.length} (${openAlcs.length} open)`);

  await page.close();

  // =========================================================================
  // STEP 2: Call POST /Api/search for facilities, using a fresh page each time
  // and blocking navigation
  // =========================================================================
  console.log('\n' + DIVIDER);
  console.log('STEP 2: POST /Api/search — GET DOCUMENTS');
  console.log(DIVIDER);

  const testFacilities = openAlcs.slice(0, 5);

  for (const facility of testFacilities) {
    console.log(`\n--- ${facility.facilityId}: ${facility.facilityName} (${facility.city}) ---`);

    const searchPage = await context.newPage();

    // Use page.request API instead of page.evaluate to avoid navigation issues
    try {
      const apiResponse = await searchPage.request.post('https://surveys.health.ok.gov/Api/search', {
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Accept': 'application/json'
        },
        data: {
          FacilityId: facility.facilityId,
          FacilityName: '',
          County: '',
          City: '',
          Zip: '',
          SurveyDocsOnly: false
        }
      });

      const status = apiResponse.status();
      console.log(`  API Status: ${status}`);

      if (status === 200) {
        const data = await apiResponse.json();

        if (data.documents && data.documents.length > 0) {
          console.log(`  Documents found: ${data.documents.length}`);

          // Show full structure of first document
          console.log(`  First document: ${JSON.stringify(data.documents[0], null, 4)}`);

          // List all documents
          data.documents.forEach((doc, i) => {
            console.log(`    ${i + 1}. Date: ${doc.exitDate} | Type: ${doc.documentType} | Pages: ${doc.pageCount} | DocId: ${doc.documentId}`);
          });

          // Survey docs only
          const surveyDocs = data.documents.filter(d => d.documentType === 'SURVEY DOCUMENTS');
          console.log(`  Survey Documents: ${surveyDocs.length}`);
          surveyDocs.forEach((doc, i) => {
            console.log(`    Survey ${i + 1}: ${doc.exitDate} | ${doc.pageCount} pages | DocId: ${doc.documentId}`);
          });
        } else {
          console.log(`  No documents found`);
          const bodyText = await apiResponse.text();
          console.log(`  Response: ${bodyText.substring(0, 500)}`);
        }
      } else {
        const bodyText = await apiResponse.text();
        console.log(`  Response body: ${bodyText.substring(0, 500)}`);
      }
    } catch (e) {
      console.log(`  ERROR: ${e.message}`);
    }

    await searchPage.close();
  }

  // =========================================================================
  // STEP 3: SurveyDocsOnly = true
  // =========================================================================
  console.log('\n' + DIVIDER);
  console.log('STEP 3: POST /Api/search WITH SurveyDocsOnly = true');
  console.log(DIVIDER);

  const fac = openAlcs[0];
  console.log(`Testing: ${fac.facilityId} (${fac.facilityName})`);

  const page3 = await context.newPage();
  try {
    const resp3 = await page3.request.post('https://surveys.health.ok.gov/Api/search', {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Accept': 'application/json'
      },
      data: {
        FacilityId: fac.facilityId,
        FacilityName: '',
        County: '',
        City: '',
        Zip: '',
        SurveyDocsOnly: true
      }
    });

    console.log(`Status: ${resp3.status()}`);
    const data3 = await resp3.json();
    if (data3.documents) {
      console.log(`Documents: ${data3.documents.length}`);
      data3.documents.forEach((d, i) => {
        console.log(`  ${i + 1}. Date: ${d.exitDate} | Type: ${d.documentType} | Pages: ${d.pageCount} | DocId: ${d.documentId}`);
      });
    }
  } catch(e) {
    console.log(`ERROR: ${e.message}`);
  }
  await page3.close();

  // =========================================================================
  // STEP 4: Test imaging.ok.gov document URL
  // =========================================================================
  console.log('\n' + DIVIDER);
  console.log('STEP 4: TEST IMAGING.OK.GOV DOCUMENT URL');
  console.log(DIVIDER);

  // Get a document ID first
  const page4a = await context.newPage();
  let testDocId = null;
  try {
    const resp4 = await page4a.request.post('https://surveys.health.ok.gov/Api/search', {
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      data: { FacilityId: fac.facilityId, FacilityName: '', County: '', City: '', Zip: '', SurveyDocsOnly: true }
    });
    const data4 = await resp4.json();
    if (data4.documents && data4.documents.length > 0) {
      testDocId = data4.documents[0].documentId;
    }
  } catch(e) {}
  await page4a.close();

  if (testDocId) {
    const docUrl = `https://imaging.ok.gov/Appxtender/TestLaunch?AppId=346&DocId=${testDocId}`;
    console.log(`\nDocument URL: ${docUrl}`);

    const docPage = await context.newPage();
    try {
      const docResp = await docPage.goto(docUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });

      console.log(`Status: ${docResp.status()}`);
      console.log(`Final URL: ${docPage.url()}`);

      const html = await docPage.content();
      console.log(`HTML length: ${html.length}`);
      console.log(`HTML (first 3000 chars):\n${html.substring(0, 3000)}`);

      const bodyText = await docPage.evaluate(() => document.body?.innerText?.substring(0, 2000) || '');
      console.log(`\nBody text:\n${bodyText}`);
    } catch(e) {
      console.log(`Error: ${e.message}`);
    }
    await docPage.close();

    // Also try the REST API format noted in the JS comments
    // https://imaging.ok.gov/AppXtenderReST/api/AXDataSources/Xtender/AXApps/346/AXDocs/{docId}
    const restUrl = `https://imaging.ok.gov/AppXtenderReST/api/AXDataSources/Xtender/AXApps/346/AXDocs/${testDocId}`;
    console.log(`\nTrying REST API: ${restUrl}`);

    const restPage = await context.newPage();
    try {
      const restResp = await restPage.request.get(restUrl, {
        headers: { 'Accept': 'application/json' }
      });
      console.log(`Status: ${restResp.status()}`);
      const restBody = await restResp.text();
      console.log(`Body (first 2000 chars):\n${restBody.substring(0, 2000)}`);
    } catch(e) {
      console.log(`Error: ${e.message}`);
    }
    await restPage.close();
  }

  // =========================================================================
  // STEP 5: Broader sampling — how many ALCs have survey docs?
  // =========================================================================
  console.log('\n' + DIVIDER);
  console.log('STEP 5: BROADER SAMPLING — 15 RANDOM OPEN ALCs');
  console.log(DIVIDER);

  const sampleAlcs = openAlcs.sort(() => Math.random() - 0.5).slice(0, 15);
  let withDocs = 0;
  let withSurveyDocs = 0;
  let withoutDocs = 0;
  let errors = 0;

  for (const f of sampleAlcs) {
    const sPage = await context.newPage();
    try {
      const resp = await sPage.request.post('https://surveys.health.ok.gov/Api/search', {
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        data: { FacilityId: f.facilityId, FacilityName: '', County: '', City: '', Zip: '', SurveyDocsOnly: false }
      });
      const data = await resp.json();
      const totalDocs = (data.documents || []).length;
      const surveyDocs = (data.documents || []).filter(d => d.documentType === 'SURVEY DOCUMENTS');

      if (totalDocs > 0) withDocs++;
      if (surveyDocs.length > 0) withSurveyDocs++;
      if (totalDocs === 0) withoutDocs++;

      console.log(`  ${f.facilityId} ${f.facilityName}: ${totalDocs} docs, ${surveyDocs.length} survey docs${surveyDocs.length > 0 ? `, latest: ${surveyDocs[0].exitDate}` : ''}`);
    } catch(e) {
      console.log(`  ${f.facilityId} ${f.facilityName}: ERROR - ${e.message}`);
      errors++;
    }
    await sPage.close();
  }

  console.log(`\n  RESULTS (${sampleAlcs.length} open ALCs):`);
  console.log(`  With any documents: ${withDocs}`);
  console.log(`  With survey documents: ${withSurveyDocs}`);
  console.log(`  Without documents: ${withoutDocs}`);
  console.log(`  Errors: ${errors}`);

  await browser.close();

  // =========================================================================
  // FINAL SUMMARY
  // =========================================================================
  console.log('\n' + DIVIDER);
  console.log('COMPLETE API ARCHITECTURE SUMMARY');
  console.log(DIVIDER);
  console.log(`
OKLAHOMA SURVEY PORTAL — surveys.health.ok.gov

API ENDPOINTS:
1. GET https://surveys.health.ok.gov/Api/facilities
   Returns ALL ${facilities.length} facilities across all types
   ALC type code: "43S" (${alcs.length} total, ${openAlcs.length} open)
   RC type code: "40S"

2. POST https://surveys.health.ok.gov/Api/search
   Body: { FacilityId: "AL5541", FacilityName: "", County: "", City: "", Zip: "", SurveyDocsOnly: false }
   Returns: { documents: [{ documentId, exitDate, documentType, pageCount }] }
   Document types: "SURVEY DOCUMENTS", "LICENSE", "CERTIFICATION - 1539", "CORRESPONDENCE - CMS/MISC"

3. Document viewer: https://imaging.ok.gov/Appxtender/TestLaunch?AppId=346&DocId={documentId}
   (referenced in JS as: https://imaging.ok.gov/AppXtenderReST/api/AXDataSources/Xtender/AXApps/346/AXDocs/{docId})

PHASE 2 ENRICHMENT PATH:
1. Call GET /Api/facilities → filter facilityTypeCode === "43S"
2. For each ALC: POST /Api/search with FacilityId → get documents array
3. Filter to documentType === "SURVEY DOCUMENTS"
4. latest exitDate → last_inspection_date
5. total survey docs as a proxy or download/parse docs for violation details
6. report_url = https://surveys.health.ok.gov/Home/FacilityDocuments/{facilityId}
`);
}

main().catch(e => {
  console.error('FATAL ERROR:', e);
  process.exit(1);
});
