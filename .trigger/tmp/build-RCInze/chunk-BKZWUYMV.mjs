import {
  cleanupTempFiles,
  downloadPdf,
  extractPdfContent
} from "./chunk-QOP3X44L.mjs";
import {
  logger
} from "./chunk-MMQGKQDQ.mjs";
import {
  __name,
  init_esm
} from "./chunk-6ULOIQV4.mjs";

// src/trigger/enrichment/configs/alabama.ts
init_esm();
import * as fs from "fs";
import * as path from "path";
var PORTAL_URL = "https://dph1.adph.state.al.us/Deficiencies/";
var TEMP_DIR = "/tmp/tca-enrichment";
var KNOWN_MISSING_IDS = [
  "D5281",
  "D5280",
  "D5278",
  "D5268",
  "D5266",
  "D5265",
  "D5262",
  "D5249",
  "D5248",
  "D5250"
];
async function waitForAjaxComplete(page, label, timeoutMs = 15e3) {
  try {
    await page.waitForFunction(
      () => {
        const prm = window.Sys?.WebForms?.PageRequestManager?.getInstance?.();
        if (prm) {
          return !prm.get_isInAsyncPostBack();
        }
        return true;
      },
      { timeout: timeoutMs }
    );
    logger.info(`  [AJAX] ${label} — postback complete`);
  } catch {
    logger.warn(`  [AJAX] ${label} — waitForFunction timed out after ${timeoutMs}ms, falling back to networkidle`);
    await page.waitForLoadState("networkidle", { timeout: 5e3 }).catch(() => {
    });
  }
  await page.waitForTimeout(500);
}
__name(waitForAjaxComplete, "waitForAjaxComplete");
async function logPageDiagnostics(page, label) {
  const diagnostics = await page.evaluate(() => {
    const dropdown = document.querySelector("#MainContent_DropDownListFacTypes");
    const searchType = document.querySelector("#MainContent_DropDownListSearchType");
    const searchBox = document.querySelector("#MainContent_TextBoxSearch");
    const searchBtn = document.querySelector("#MainContent_ButtonSearch");
    const grid = document.querySelector("#MainContent_GridView1");
    const allInputs = Array.from(document.querySelectorAll("input[type='submit'], input[type='button'], button")).map((el) => ({
      tag: el.tagName,
      id: el.getAttribute("id") || "",
      name: el.getAttribute("name") || "",
      value: el.value || el.textContent?.trim() || "",
      type: el.getAttribute("type") || ""
    })).filter((b) => b.id || b.value);
    return {
      title: document.title,
      dropdownExists: !!dropdown,
      dropdownValue: dropdown?.value ?? null,
      dropdownSelectedText: dropdown?.options?.[dropdown.selectedIndex]?.text ?? null,
      dropdownOptions: dropdown ? Array.from(dropdown.options).map((o) => ({ value: o.value, text: o.text })) : [],
      searchTypeExists: !!searchType,
      searchTypeValue: searchType?.value ?? null,
      searchBoxExists: !!searchBox,
      searchBoxValue: searchBox?.value ?? null,
      searchBtnExists: !!searchBtn,
      searchBtnTag: searchBtn?.tagName ?? null,
      searchBtnType: searchBtn?.getAttribute("type") ?? null,
      gridExists: !!grid,
      gridRowCount: grid ? grid.querySelectorAll("tr").length : 0,
      allButtons: allInputs
    };
  });
  logger.info(`  [DIAG:${label}] ${JSON.stringify(diagnostics)}`);
}
__name(logPageDiagnostics, "logPageDiagnostics");
async function logResultsArea(page) {
  const info = await page.evaluate(() => {
    const grid = document.querySelector("#MainContent_GridView1");
    if (grid) {
      const rows = grid.querySelectorAll("tr");
      const rowTexts = [];
      rows.forEach((row, i) => {
        if (i < 10) {
          const cells = Array.from(row.querySelectorAll("td, th")).map((c) => c.textContent?.trim() || "");
          rowTexts.push(`Row ${i}: [${cells.join(" | ")}]`);
        }
      });
      return `GRID FOUND (${rows.length} rows):
${rowTexts.join("\n")}`;
    }
    const mainContent = document.querySelector("#MainContent, [id*='MainContent'], form");
    if (mainContent) {
      const text = mainContent.textContent?.replace(/\s+/g, " ").trim().substring(0, 1500) || "";
      return `NO GRID FOUND. MainContent text: ${text}`;
    }
    return "NO MainContent or GRID found on page";
  });
  logger.info(`  [RESULTS] ${info}`);
}
__name(logResultsArea, "logResultsArea");
async function takeScreenshot(page, portalId, step) {
  try {
    const buffer = await page.screenshot({ fullPage: true });
    const filename = `/tmp/al-${portalId}-${step}.png`;
    fs.writeFileSync(filename, buffer);
    logger.info(`  [SCREENSHOT] ${filename} (${buffer.length} bytes)`);
  } catch (err) {
    logger.warn(`  [SCREENSHOT] Failed for ${step}: ${err.message}`);
  }
}
__name(takeScreenshot, "takeScreenshot");
function getSearchTerm(facilityName) {
  const cleaned = facilityName.replace(/\b(LLC|Inc|II|III|IV|ALF|SCALF|of\s+\w+)\b/gi, "").replace(/[^\w\s]/g, "").trim();
  const words = cleaned.split(/\s+/).filter((w) => w.length > 1);
  const termWords = words.slice(0, Math.min(3, words.length));
  return termWords.join(" ");
}
__name(getSearchTerm, "getSearchTerm");
function parseSurveyDate(dateStr) {
  const match = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;
  const month = match[1].padStart(2, "0");
  const day = match[2].padStart(2, "0");
  return `${match[3]}-${month}-${day}`;
}
__name(parseSurveyDate, "parseSurveyDate");
async function extractFacilityFromPortal(facility, portalId, browser) {
  const facilityType = portalId.charAt(0);
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await context.newPage();
  try {
    logger.info(`  [STEP 1] Navigating to portal for ${portalId}...`);
    await page.goto(PORTAL_URL, { waitUntil: "networkidle", timeout: 3e4 });
    await page.waitForTimeout(1500);
    await logPageDiagnostics(page, "after-load");
    logger.info(`  [STEP 2] Selecting facility type: "${facilityType}"...`);
    await page.selectOption("#MainContent_DropDownListFacTypes", facilityType);
    await page.dispatchEvent("#MainContent_DropDownListFacTypes", "change");
    await waitForAjaxComplete(page, "dropdown-change");
    const dropdownCheck = await page.evaluate(() => {
      const el = document.querySelector("#MainContent_DropDownListFacTypes");
      return el ? { value: el.value, text: el.options[el.selectedIndex]?.text } : null;
    });
    logger.info(`  [STEP 2] Dropdown value: ${JSON.stringify(dropdownCheck)}`);
    if (dropdownCheck && dropdownCheck.value !== facilityType) {
      logger.error(`  [STEP 2] Dropdown did NOT change! Expected "${facilityType}", got "${dropdownCheck.value}"`);
      await page.evaluate((type) => {
        const el = document.querySelector("#MainContent_DropDownListFacTypes");
        if (el) {
          el.value = type;
          el.dispatchEvent(new Event("change", { bubbles: true }));
        }
      }, facilityType);
      await waitForAjaxComplete(page, "dropdown-change-retry");
    }
    const searchTerm = getSearchTerm(facility.facility_name);
    logger.info(`  [STEP 3] Searching: "${searchTerm}" (type: ${facilityType}, portalId: ${portalId})`);
    await page.selectOption("#MainContent_DropDownListSearchType", "Contains");
    await page.waitForTimeout(300);
    await page.fill("#MainContent_TextBoxSearch", "");
    await page.waitForTimeout(200);
    await page.fill("#MainContent_TextBoxSearch", searchTerm);
    const searchFieldValue = await page.evaluate(() => {
      const el = document.querySelector("#MainContent_TextBoxSearch");
      return el?.value ?? null;
    });
    logger.info(`  [STEP 3] Search field value: "${searchFieldValue}"`);
    logger.info(`  [STEP 4] Clicking search button...`);
    const btnExists = await page.locator("#MainContent_ButtonSearch").count();
    if (btnExists === 0) {
      logger.error("  [STEP 4] #MainContent_ButtonSearch NOT FOUND!");
      await logPageDiagnostics(page, "no-button");
      await takeScreenshot(page, portalId, "no-button");
      const altSelectors = [
        "input[value='Search']",
        "input[value='search']",
        "#MainContent input[type='submit']",
        "[id*='ButtonSearch']",
        "[id*='btnSearch']"
      ];
      let foundAlt = false;
      for (const sel of altSelectors) {
        const count = await page.locator(sel).count();
        if (count > 0) {
          logger.info(`  [STEP 4] Found alternate button: "${sel}"`);
          await page.click(sel);
          foundAlt = true;
          break;
        }
      }
      if (!foundAlt) {
        logger.error("  [STEP 4] NO search button found with any selector!");
        await takeScreenshot(page, portalId, "no-button-at-all");
        return null;
      }
    } else {
      await page.click("#MainContent_ButtonSearch");
    }
    await waitForAjaxComplete(page, "search-click", 2e4);
    await takeScreenshot(page, portalId, "after-search");
    await logResultsArea(page);
    logger.info(`  [STEP 5] Looking for FacID "${portalId}" in results grid...`);
    let matchFound = await findAndSelectFacility(page, portalId);
    if (!matchFound) {
      const shortTerm = searchTerm.split(" ")[0];
      if (shortTerm !== searchTerm && shortTerm.length >= 3) {
        logger.info(`  [STEP 5] No match — retrying with: "${shortTerm}"`);
        await page.goto(PORTAL_URL, { waitUntil: "networkidle", timeout: 3e4 });
        await page.waitForTimeout(1500);
        await page.selectOption("#MainContent_DropDownListFacTypes", facilityType);
        await page.dispatchEvent("#MainContent_DropDownListFacTypes", "change");
        await waitForAjaxComplete(page, "retry-dropdown");
        await page.selectOption("#MainContent_DropDownListSearchType", "Contains");
        await page.fill("#MainContent_TextBoxSearch", shortTerm);
        await page.click("#MainContent_ButtonSearch");
        await waitForAjaxComplete(page, "retry-search", 2e4);
        await takeScreenshot(page, portalId, "after-retry-search");
        await logResultsArea(page);
        matchFound = await findAndSelectFacility(page, portalId);
      }
      if (!matchFound) {
        logger.warn(`  [STEP 5] Facility ${portalId} NOT FOUND in portal after all attempts`);
        return null;
      }
    }
    logger.info(`  [STEP 6] Facility selected — reading survey list...`);
    await waitForAjaxComplete(page, "select-facility");
    await takeScreenshot(page, portalId, "after-select");
    const surveyData = await extractSurveyAndPdfUrl(page, portalId);
    if (!surveyData) {
      logger.info(`  [STEP 6] No surveys found for ${portalId}`);
      return null;
    }
    logger.info(`  [STEP 6] Survey date: ${surveyData.surveyDate}, PDF: ${surveyData.pdfUrl ? "yes" : "no"}`);
    if (!surveyData.pdfUrl) {
      logger.warn(`  [STEP 6] Survey found but no PDF URL for ${portalId}`);
      return null;
    }
    logger.info(`  [STEP 7] Downloading PDF: ${surveyData.pdfUrl}`);
    if (!fs.existsSync(TEMP_DIR)) {
      fs.mkdirSync(TEMP_DIR, { recursive: true });
    }
    const pdfPath = path.join(TEMP_DIR, `al-${portalId}-${Date.now()}.pdf`);
    try {
      await downloadPdf(surveyData.pdfUrl, pdfPath);
      const fileSizeBytes = fs.statSync(pdfPath).size;
      logger.info(`  [STEP 7] PDF downloaded: ${(fileSizeBytes / 1024).toFixed(0)}KB`);
      const result = await extractPdfContent(pdfPath, {
        pageStrategy: "first3last2"
      });
      logger.info(`  [STEP 7] Extracted ${result.text.length} chars (${result.method} method, ${result.pagesExtracted.length} pages)`);
      return {
        text: result.text,
        surveyDate: surveyData.surveyDate,
        pageCount: result.pageCount
      };
    } finally {
      try {
        if (fs.existsSync(pdfPath)) fs.unlinkSync(pdfPath);
      } catch {
      }
      cleanupTempFiles();
    }
  } finally {
    await context.close().catch(() => {
    });
  }
}
__name(extractFacilityFromPortal, "extractFacilityFromPortal");
async function findAndSelectFacility(page, targetFacId) {
  const gridExists = await page.locator("#MainContent_GridView1").count();
  if (gridExists === 0) {
    logger.warn(`  [GRID] #MainContent_GridView1 not found`);
    for (const sel of ["[id*='GridView']", "table.GridView", "#MainContent table"]) {
      const count = await page.locator(sel).count();
      if (count > 0) {
        logger.info(`  [GRID] Found alternate: "${sel}" (count: ${count})`);
      }
    }
    return false;
  }
  const rows = await page.locator("#MainContent_GridView1 tr").all();
  logger.info(`  [GRID] Found ${rows.length} rows in results grid`);
  for (let rowIdx = 1; rowIdx < rows.length; rowIdx++) {
    const cells = await rows[rowIdx].locator("td").all();
    if (cells.length < 3) continue;
    const facIdText = (await cells[1].textContent())?.trim();
    if (rowIdx <= 5) {
      const cellTexts = [];
      for (let c = 0; c < Math.min(cells.length, 5); c++) {
        cellTexts.push((await cells[c].textContent())?.trim() || "");
      }
      logger.info(`  [GRID] Row ${rowIdx}: [${cellTexts.join(" | ")}]`);
    }
    if (facIdText === targetFacId) {
      logger.info(`  [GRID] Found match at row ${rowIdx}: FacID="${facIdText}"`);
      const selectLink = cells[0].locator("a");
      const linkCount = await selectLink.count();
      if (linkCount > 0) {
        await selectLink.click();
        await waitForAjaxComplete(page, "select-click");
        return true;
      } else {
        logger.warn(`  [GRID] No "Select" link in first cell of matching row`);
      }
    }
  }
  logger.warn(`  [GRID] Target FacID "${targetFacId}" not found in ${rows.length - 1} data rows`);
  return false;
}
__name(findAndSelectFacility, "findAndSelectFacility");
async function extractSurveyAndPdfUrl(page, portalId) {
  const detailPanel = page.locator("#MainContent_FormView1, #MainContent_DetailsView1, .aspNetHidden + div, #MainContent_Panel1");
  const panelExists = await detailPanel.first().count();
  logger.info(`  [SURVEY] Detail panel exists: ${panelExists > 0}`);
  const allLinks = await page.locator("#MainContent a").all();
  logger.info(`  [SURVEY] Total links in #MainContent: ${allLinks.length}`);
  let surveyDateLink = null;
  let latestDate = null;
  for (const link of allLinks) {
    const text = (await link.textContent())?.trim() || "";
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(text)) {
      const parts = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (parts) {
        const date = new Date(parseInt(parts[3]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        logger.info(`  [SURVEY] Found survey date: "${text}" (${date.toISOString().split("T")[0]})`);
        if (!latestDate || date > latestDate) {
          latestDate = date;
          surveyDateLink = { element: link, date: text };
        }
      }
    }
  }
  if (!surveyDateLink) {
    logger.info("  [SURVEY] No survey date links found — checking for direct PDF links");
    const directPdf = await findSodPdfLink(page);
    if (directPdf) {
      logger.info(`  [SURVEY] Found direct PDF: ${directPdf}`);
      return { surveyDate: null, pdfUrl: directPdf };
    }
    const linkTexts = [];
    for (const link of allLinks.slice(0, 20)) {
      const text = (await link.textContent())?.trim() || "";
      const href = await link.getAttribute("href");
      if (text || href) linkTexts.push(`"${text}" → ${href}`);
    }
    logger.info(`  [SURVEY] Links found: ${linkTexts.join(", ")}`);
    return null;
  }
  const surveyDate = parseSurveyDate(surveyDateLink.date);
  logger.info(`  [SURVEY] Clicking most recent: "${surveyDateLink.date}" (${surveyDate})`);
  await surveyDateLink.element.click();
  await waitForAjaxComplete(page, "survey-expand");
  await takeScreenshot(page, portalId, "after-survey-expand");
  const pdfUrl = await findSodPdfLink(page);
  return { surveyDate, pdfUrl };
}
__name(extractSurveyAndPdfUrl, "extractSurveyAndPdfUrl");
async function findSodPdfLink(page) {
  const allLinks = await page.locator("a[href]").all();
  let sodUrl = null;
  let anyPdfUrl = null;
  for (const link of allLinks) {
    const href = await link.getAttribute("href");
    if (!href) continue;
    if (href.includes("DeficienciesReports") || href.includes("deficienciesreports")) {
      const text = (await link.textContent())?.trim().toLowerCase() || "";
      let fullUrl = href;
      if (!href.startsWith("http")) {
        fullUrl = new URL(href, "https://dph1.adph.state.al.us/").href;
      }
      logger.info(`  [PDF] Found report link: text="${text}", href="${fullUrl}"`);
      if (text.includes("sod") || text.includes("statement") || text.includes("deficien")) {
        sodUrl = fullUrl;
      }
      if (!anyPdfUrl) {
        anyPdfUrl = fullUrl;
      }
    }
  }
  return sodUrl || anyPdfUrl;
}
__name(findSodPdfLink, "findSodPdfLink");
var alabamaConfig = {
  stateCode: "AL",
  stateName: "Alabama",
  portalBaseUrl: PORTAL_URL,
  pdfType: "text",
  maxPagesPerDocument: 5,
  maxConcurrency: 1,
  // Sequential — ASP.NET session is stateful
  delayBetweenRequests: 2e3,
  requiresPlaywright: true,
  extractPortalId: /* @__PURE__ */ __name((licenseNumber) => licenseNumber.replace("AL-", ""), "extractPortalId"),
  // Not used by extractAllData path, but required by interface
  selectDocument: /* @__PURE__ */ __name((documents) => {
    if (documents.length === 0) return null;
    return documents[0];
  }, "selectDocument"),
  getReportUrl: /* @__PURE__ */ __name((_portalId) => PORTAL_URL, "getReportUrl"),
  /**
   * Full Playwright-based extraction for Alabama's ASP.NET WebForms portal.
   * Handles portal navigation, document discovery, PDF download, and text extraction.
   */
  extractAllData: /* @__PURE__ */ __name(async (facility, portalId, browser) => {
    if (!browser) {
      throw new Error("Alabama requires Playwright but no browser provided");
    }
    if (KNOWN_MISSING_IDS.includes(portalId)) {
      logger.info(`  Skipping ${portalId} — known to not be in portal (newly licensed)`);
      return null;
    }
    return extractFacilityFromPortal(facility, portalId, browser);
  }, "extractAllData")
};

export {
  alabamaConfig
};
//# sourceMappingURL=chunk-BKZWUYMV.mjs.map
