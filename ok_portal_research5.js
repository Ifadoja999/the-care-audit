/**
 * Oklahoma Survey Portal Research Script - Part 5
 * Now we know the API flow:
 *   POST /Api/search with { FacilityId: "AL5541", ... }
 *   Returns { documents: [...] } with documentId for each doc
 *   Documents viewed at: https://imaging.ok.gov/Appxtender/TestLaunch?AppId=346&DocId={docId}
 *
 * This script:
 * 1. Calls GET /Api/facilities to get all ALC facilities
 * 2. Calls POST /Api/search for a few facilities to get their document lists
 * 3. Reports the full document structure including dates, types, page counts
 * 4. Tests the imaging.ok.gov URL format
 */

const { chromium } = require('playwright');

const DIVIDER = '='.repeat(80);

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });

  // =========================================================================
  // STEP 1: Get all facilities from the API
  // =========================================================================
  console.log(DIVIDER);
  console.log('STEP 1: GET ALL FACILITIES FROM API');
  console.log(DIVIDER);

  const page = await context.newPage();
  const resp = await page.goto('https://surveys.health.ok.gov/Api/facilities', {
    timeout: 30000
  });
  const apiData = JSON.parse(await resp.text());
  const allFacilities = apiData.result;

  const alcs = allFacilities.filter(f => f.facilityTypeCode === '43S');
  const openAlcs = alcs.filter(f => f.status === 'Open');
  const rcs = allFacilities.filter(f => f.facilityTypeCode === '40S');
  const openRcs = rcs.filter(f => f.status === 'Open');

  console.log(`Total facilities in API: ${allFacilities.length}`);
  console.log(`ALCs: ${alcs.length} (${openAlcs.length} open, ${alcs.length - openAlcs.length} closed)`);
  console.log(`RCs: ${rcs.length} (${openRcs.length} open, ${rcs.length - openRcs.length} closed)`);

  await page.close();

  // =========================================================================
  // STEP 2: Call POST /Api/search for several ALC facilities
  // =========================================================================
  console.log('\n' + DIVIDER);
  console.log('STEP 2: POST /Api/search — GET DOCUMENTS FOR INDIVIDUAL FACILITIES');
  console.log(DIVIDER);

  const testFacilities = openAlcs.slice(0, 5);

  for (const facility of testFacilities) {
    console.log(`\n--- ${facility.facilityId}: ${facility.facilityName} (${facility.city}) ---`);

    const searchPage = await context.newPage();

    try {
      // We need to set up the session first by visiting the site
      await searchPage.goto('https://surveys.health.ok.gov/Home/Search/43S', {
        waitUntil: 'domcontentloaded',
        timeout: 15000
      });

      // Now make the API call
      const searchResult = await searchPage.evaluate(async (facId) => {
        try {
          const response = await fetch('/Api/search', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json; charset=utf-8'
            },
            body: JSON.stringify({
              FacilityId: facId,
              FacilityName: '',
              County: '',
              City: '',
              Zip: '',
              SurveyDocsOnly: false
            })
          });
          const data = await response.json();
          return { status: response.status, data };
        } catch (e) {
          return { error: e.message };
        }
      }, facility.facilityId);

      if (searchResult.error) {
        console.log(`  ERROR: ${searchResult.error}`);
      } else {
        console.log(`  API Status: ${searchResult.status}`);
        const data = searchResult.data;

        if (data.documents && data.documents.length > 0) {
          console.log(`  Documents found: ${data.documents.length}`);

          // Show the full structure of the first document
          console.log(`  First document (full object):`);
          console.log(`    ${JSON.stringify(data.documents[0], null, 4)}`);

          // Summarize all documents
          console.log(`  All documents:`);
          data.documents.forEach((doc, i) => {
            console.log(`    ${i + 1}. Date: ${doc.exitDate} | Type: ${doc.documentType} | Pages: ${doc.pageCount} | DocId: ${doc.documentId}`);
          });

          // Count by document type
          const typeMap = {};
          data.documents.forEach(d => {
            typeMap[d.documentType] = (typeMap[d.documentType] || 0) + 1;
          });
          console.log(`  By type: ${JSON.stringify(typeMap)}`);

          // Filter to SURVEY DOCUMENTS only
          const surveyDocs = data.documents.filter(d => d.documentType === 'SURVEY DOCUMENTS');
          console.log(`  Survey Documents count: ${surveyDocs.length}`);
          if (surveyDocs.length > 0) {
            console.log(`  Survey Documents:`);
            surveyDocs.forEach((doc, i) => {
              console.log(`    ${i + 1}. Date: ${doc.exitDate} | Pages: ${doc.pageCount} | DocId: ${doc.documentId}`);
              console.log(`       URL: https://imaging.ok.gov/Appxtender/TestLaunch?AppId=346&DocId=${doc.documentId}`);
            });
          }
        } else {
          console.log(`  No documents found`);
          console.log(`  Full response: ${JSON.stringify(data).substring(0, 500)}`);
        }
      }
    } catch (e) {
      console.log(`  ERROR: ${e.message}`);
    }

    await searchPage.close();
  }

  // =========================================================================
  // STEP 3: Also try with SurveyDocsOnly = true
  // =========================================================================
  console.log('\n' + DIVIDER);
  console.log('STEP 3: POST /Api/search WITH SurveyDocsOnly = true');
  console.log(DIVIDER);

  const testFac = openAlcs[0];
  console.log(`\nTesting with: ${testFac.facilityId} (${testFac.facilityName})`);

  const page3 = await context.newPage();
  await page3.goto('https://surveys.health.ok.gov/Home/Search/43S', {
    waitUntil: 'domcontentloaded',
    timeout: 15000
  });

  const surveyOnlyResult = await page3.evaluate(async (facId) => {
    try {
      const response = await fetch('/Api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify({
          FacilityId: facId,
          FacilityName: '',
          County: '',
          City: '',
          Zip: '',
          SurveyDocsOnly: true
        })
      });
      return { status: response.status, data: await response.json() };
    } catch (e) {
      return { error: e.message };
    }
  }, testFac.facilityId);

  if (surveyOnlyResult.data?.documents) {
    console.log(`SurveyDocsOnly=true returned ${surveyOnlyResult.data.documents.length} documents`);
    surveyOnlyResult.data.documents.forEach((doc, i) => {
      console.log(`  ${i + 1}. Date: ${doc.exitDate} | Type: ${doc.documentType} | Pages: ${doc.pageCount} | DocId: ${doc.documentId}`);
    });
  } else {
    console.log('No documents with SurveyDocsOnly=true');
    console.log(JSON.stringify(surveyOnlyResult).substring(0, 1000));
  }

  await page3.close();

  // =========================================================================
  // STEP 4: Test the imaging.ok.gov document URL
  // =========================================================================
  console.log('\n' + DIVIDER);
  console.log('STEP 4: TEST IMAGING.OK.GOV DOCUMENT URL');
  console.log(DIVIDER);

  // Get a real document ID from the API calls we made
  const page4 = await context.newPage();
  await page4.goto('https://surveys.health.ok.gov/Home/Search/43S', {
    waitUntil: 'domcontentloaded',
    timeout: 15000
  });

  const docResult = await page4.evaluate(async (facId) => {
    try {
      const response = await fetch('/Api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify({
          FacilityId: facId,
          FacilityName: '',
          County: '',
          City: '',
          Zip: '',
          SurveyDocsOnly: true
        })
      });
      const data = await response.json();
      if (data.documents && data.documents.length > 0) {
        return data.documents[0];
      }
      return null;
    } catch (e) {
      return { error: e.message };
    }
  }, testFac.facilityId);

  await page4.close();

  if (docResult && docResult.documentId) {
    const docUrl = `https://imaging.ok.gov/Appxtender/TestLaunch?AppId=346&DocId=${docResult.documentId}`;
    console.log(`\nTesting document URL: ${docUrl}`);

    const docPage = await context.newPage();
    try {
      const docResp = await docPage.goto(docUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });
      console.log(`Status: ${docResp.status()}`);
      console.log(`Final URL: ${docPage.url()}`);
      console.log(`Content-Type: ${docResp.headers()['content-type'] || 'unknown'}`);

      const docContent = await docPage.content();
      console.log(`HTML length: ${docContent.length}`);
      console.log(`HTML (first 3000 chars):\n${docContent.substring(0, 3000)}`);

      // Check for PDF viewer or embedded content
      const docInfo = await docPage.evaluate(() => ({
        iframes: Array.from(document.querySelectorAll('iframe')).map(f => f.src),
        objects: Array.from(document.querySelectorAll('object, embed')).map(o => o.getAttribute('data') || o.getAttribute('src')),
        images: Array.from(document.querySelectorAll('img')).map(i => i.src).filter(s => !s.includes('logo')),
        links: Array.from(document.querySelectorAll('a')).map(a => ({
          href: a.getAttribute('href') || '',
          text: a.textContent.trim().substring(0, 100)
        })),
        bodyText: document.body.innerText.substring(0, 2000)
      }));

      console.log(`\nIframes: ${docInfo.iframes.length}`);
      docInfo.iframes.forEach(s => console.log(`  ${s}`));
      console.log(`Objects/Embeds: ${docInfo.objects.length}`);
      docInfo.objects.forEach(s => console.log(`  ${s}`));
      console.log(`\nBody text:\n${docInfo.bodyText}`);
    } catch (e) {
      console.log(`Error loading document: ${e.message}`);
    }
    await docPage.close();
  } else {
    console.log('No document to test');
  }

  // =========================================================================
  // STEP 5: Try a few more ALCs and one RC to see if they all have docs
  // =========================================================================
  console.log('\n' + DIVIDER);
  console.log('STEP 5: BROADER FACILITY SAMPLING');
  console.log(DIVIDER);

  // Sample 10 more random open ALCs
  const sampleAlcs = openAlcs.sort(() => Math.random() - 0.5).slice(0, 10);
  let withDocs = 0;
  let withSurveyDocs = 0;
  let withoutDocs = 0;

  for (const fac of sampleAlcs) {
    const sPage = await context.newPage();
    await sPage.goto('https://surveys.health.ok.gov/', { waitUntil: 'domcontentloaded', timeout: 10000 });

    const result = await sPage.evaluate(async (facId) => {
      try {
        const response = await fetch('/Api/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
          body: JSON.stringify({ FacilityId: facId, FacilityName: '', County: '', City: '', Zip: '', SurveyDocsOnly: false })
        });
        const data = await response.json();
        const surveyDocs = (data.documents || []).filter(d => d.documentType === 'SURVEY DOCUMENTS');
        return {
          totalDocs: (data.documents || []).length,
          surveyDocs: surveyDocs.length,
          latestSurveyDate: surveyDocs.length > 0 ? surveyDocs[0].exitDate : null
        };
      } catch (e) {
        return { error: e.message };
      }
    }, fac.facilityId);

    if (result.error) {
      console.log(`  ${fac.facilityId} ${fac.facilityName}: ERROR - ${result.error}`);
    } else {
      console.log(`  ${fac.facilityId} ${fac.facilityName}: ${result.totalDocs} docs, ${result.surveyDocs} survey docs, latest: ${result.latestSurveyDate || 'N/A'}`);
      if (result.totalDocs > 0) withDocs++;
      if (result.surveyDocs > 0) withSurveyDocs++;
      if (result.totalDocs === 0) withoutDocs++;
    }

    await sPage.close();
  }

  console.log(`\nSample of ${sampleAlcs.length} open ALCs:`);
  console.log(`  With documents: ${withDocs}`);
  console.log(`  With survey documents: ${withSurveyDocs}`);
  console.log(`  Without documents: ${withoutDocs}`);

  // Also test an RC
  console.log('\nTesting a Residential Care Home...');
  const testRc = openRcs[0];
  if (testRc) {
    const rcPage = await context.newPage();
    await rcPage.goto('https://surveys.health.ok.gov/', { waitUntil: 'domcontentloaded', timeout: 10000 });

    const rcResult = await rcPage.evaluate(async (facId) => {
      try {
        const response = await fetch('/Api/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
          body: JSON.stringify({ FacilityId: facId, FacilityName: '', County: '', City: '', Zip: '', SurveyDocsOnly: false })
        });
        return await response.json();
      } catch (e) {
        return { error: e.message };
      }
    }, testRc.facilityId);

    console.log(`${testRc.facilityId} ${testRc.facilityName}: ${JSON.stringify(rcResult).substring(0, 500)}`);
    await rcPage.close();
  }

  await browser.close();

  // =========================================================================
  // SUMMARY
  // =========================================================================
  console.log('\n' + DIVIDER);
  console.log('COMPLETE API ARCHITECTURE SUMMARY');
  console.log(DIVIDER);
  console.log(`
OKLAHOMA SURVEY PORTAL — API ENDPOINTS DISCOVERED:

1. GET /Api/facilities
   - Returns ALL facilities across ALL types (1,152 total)
   - No filtering parameter (returns everything)
   - Fields: facilityId, facilityName, facilityTypeCode, facilityTypeDescription,
     administrator, facilitySubType, street, city, state, zip, phoneNumber,
     county, licensedBed, status (Open/Closed), surveyDocsOnly
   - Facility type codes: 43S (ALC), 40S (RC), 021 (Nursing), 111 (ICF), 41S (ADC)

2. POST /Api/search
   - Body: { FacilityId, FacilityName, County, City, Zip, SurveyDocsOnly }
   - When FacilityId is provided: returns facility info + documents array
   - Document fields: documentId, exitDate, documentType, pageCount
   - Document types: SURVEY DOCUMENTS, LICENSE, CERTIFICATION - 1539,
     CORRESPONDENCE - CMS, CORRESPONDENCE - MISC, COURT-ADMINISTRATIVE ORDER

3. Document viewing:
   - URL: https://imaging.ok.gov/Appxtender/TestLaunch?AppId=346&DocId={documentId}
   - Opens the Oklahoma state imaging system (AppXtender)
   - Contains the actual inspection/survey document

DATA AVAILABILITY:
   - ALCs (43S): ${openAlcs.length} open facilities
   - RCs (40S): ${openRcs.length} open facilities
   - Both have survey documents available via the /Api/search endpoint

PHASE 2 ENRICHMENT STRATEGY:
   1. Call GET /Api/facilities to get all ALC/RC facilities
   2. For each facility, call POST /Api/search with FacilityId
   3. Filter documents to "SURVEY DOCUMENTS" type only
   4. Get the latest survey document's exitDate as last_inspection_date
   5. Count of survey documents or download/parse for violation details
   6. Document URL: https://imaging.ok.gov/Appxtender/TestLaunch?AppId=346&DocId={docId}
   7. For violation extraction: download/screenshot the document from imaging.ok.gov
  `);

  console.log(DIVIDER);
  console.log('RESEARCH COMPLETE');
  console.log(DIVIDER);
}

main().catch(e => {
  console.error('FATAL ERROR:', e);
  process.exit(1);
});
