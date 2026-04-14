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

// src/trigger/enrichment/configs/new-mexico.ts
init_esm();
import * as fs from "fs";
import * as path from "path";
var PORTAL_BASE_URL = "https://providersearch.hca.nm.gov";
var PDF_BASE_URL = "https://providersearch.test.hca.nm.gov/2567";
var TEMP_DIR = "/tmp/tca-enrichment";
function parseSurveyTable(html, portalId) {
  const documents = [];
  const blocks = html.split(/<hr\s*\/?>/i);
  for (const block of blocks) {
    const pdfLinkMatch = block.match(
      /href=["'](?:https?:\/\/providersearch\.(?:test\.)?hca\.nm\.gov)?\/2567\/([^"']+?)\.pdf["']/i
    );
    if (!pdfLinkMatch) continue;
    const surveyEventId = pdfLinkMatch[1];
    const labelValueRegex = /<td[^>]*class=["']H12_violet_left["'][^>]*>([\s\S]*?)<\/td>\s*<td[^>]*class=["']H12_violet_leftn["'][^>]*>([\s\S]*?)<\/td>/gi;
    const fields = {};
    let match;
    while ((match = labelValueRegex.exec(block)) !== null) {
      const label = match[1].replace(/<[^>]*>/g, "").trim().replace(/:$/, "");
      const value = match[2].replace(/<[^>]*>/g, "").trim();
      fields[label.toLowerCase()] = value;
    }
    const surveyType = fields["type of survey"] || "Survey";
    const entranceDate = fields["survey entrance date"] || "";
    const exitDate = fields["survey exit date"] || "";
    const providerName = fields["name of provider"] || "";
    const highestCitation = fields["highest citation"] || "";
    const isoExitDate = parseNmDate(exitDate);
    const isoEntranceDate = parseNmDate(entranceDate);
    documents.push({
      documentId: surveyEventId,
      pageCount: 0,
      // Unknown until PDF is downloaded
      documentType: surveyType,
      documentTitle: highestCitation || surveyType,
      facilityId: portalId,
      facilityName: providerName,
      exitDate: isoExitDate || exitDate,
      scanDate: isoEntranceDate || entranceDate,
      year: isoExitDate ? isoExitDate.substring(0, 4) : ""
    });
  }
  return documents;
}
__name(parseSurveyTable, "parseSurveyTable");
function parseNmDate(dateStr) {
  if (!dateStr) return null;
  const match = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;
  const [, month, day, year] = match;
  const iso = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  const parsed = new Date(iso);
  if (isNaN(parsed.getTime())) return null;
  return iso;
}
__name(parseNmDate, "parseNmDate");
async function fetchNmDocumentList(portalId) {
  const idsToTry = [portalId, `NM${portalId}`];
  for (const id of idsToTry) {
    const url = `${PORTAL_BASE_URL}/p_reports.php?facid=${id}`;
    logger.info(`Fetching report page: ${url}`);
    try {
      const response = await fetch(url);
      if (!response.ok) {
        logger.info(`Report page returned ${response.status} for facid=${id}`);
        continue;
      }
      const html = await response.text();
      if (!html.includes("/2567/") && !html.includes("Survey Event")) {
        logger.info(`No survey data found for facid=${id}`);
        continue;
      }
      const documents = parseSurveyTable(html, id);
      if (documents.length > 0) {
        logger.info(
          `Found ${documents.length} survey(s) for facid=${id} (format: ${id === portalId ? "numeric" : "NM-prefixed"})`
        );
        return documents;
      }
    } catch (err) {
      logger.warn(`Failed to fetch report page for facid=${id}: ${err.message}`);
    }
  }
  logger.info(
    `No survey reports found for portal ID ${portalId} (tried: ${idsToTry.join(", ")})`
  );
  return [];
}
__name(fetchNmDocumentList, "fetchNmDocumentList");
async function extractNmDocumentContent(doc) {
  const surveyEventId = doc.documentId;
  const pdfUrl = `${PDF_BASE_URL}/${surveyEventId}.pdf`;
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
  }
  const pdfPath = path.join(TEMP_DIR, `${surveyEventId}.pdf`);
  try {
    logger.info(`Downloading PDF: ${pdfUrl}`);
    await downloadPdf(pdfUrl, pdfPath);
    const fileSizeBytes = fs.statSync(pdfPath).size;
    const fileSizeMB = (fileSizeBytes / (1024 * 1024)).toFixed(1);
    logger.info(`PDF downloaded: ${fileSizeMB}MB → ${pdfPath}`);
    const result = await extractPdfContent(pdfPath, {
      pageStrategy: "first3last2"
    });
    logger.info(
      `Extraction complete: ${result.method} method, ${result.pagesExtracted.length} pages, ${result.text.length} chars`
    );
    return {
      text: result.text,
      pageCount: result.pageCount,
      method: result.method
    };
  } finally {
    try {
      if (fs.existsSync(pdfPath)) {
        fs.unlinkSync(pdfPath);
      }
    } catch {
    }
    cleanupTempFiles();
  }
}
__name(extractNmDocumentContent, "extractNmDocumentContent");
var newMexicoConfig = {
  stateCode: "NM",
  stateName: "New Mexico",
  // Portal URLs
  portalBaseUrl: PORTAL_BASE_URL,
  // No facilitiesApiUrl — NM doesn't have a bulk metadata API
  // No searchApiUrl — NM uses HTML scraping, not a JSON API
  // No appXtenderBaseUrl — NM serves PDFs directly, no AppXtender
  // No Playwright needed — all requests are plain HTTP GETs
  requiresPlaywright: false,
  // Supabase license_number format: "NM-7294" → Portal ID: "7294"
  // Dual-lookup handled inside fetchNmDocumentList (tries "7294" then "NM7294")
  extractPortalId: /* @__PURE__ */ __name((licenseNumber) => licenseNumber.replace(/^NM-/, ""), "extractPortalId"),
  // Select the most recent survey document by exit date
  selectDocument: /* @__PURE__ */ __name((documents) => {
    if (documents.length === 0) return null;
    const sorted = [...documents].sort((a, b) => {
      const dateA = a.exitDate || "0000-00-00";
      const dateB = b.exitDate || "0000-00-00";
      return dateB.localeCompare(dateA);
    });
    return sorted[0];
  }, "selectDocument"),
  // Custom document fetcher — HTML scraping with dual-lookup
  fetchDocumentList: fetchNmDocumentList,
  // Custom content extractor — hybrid PDF text/Vision
  extractDocumentContent: extractNmDocumentContent,
  // Build report page URL for Supabase report_url field
  getReportUrl: /* @__PURE__ */ __name((portalId) => `${PORTAL_BASE_URL}/p_reports.php?facid=${portalId}`, "getReportUrl"),
  // Mixed PDF types: ~78% scanned images, ~22% text-extractable CMS-2567
  pdfType: "mixed",
  maxConcurrency: 3,
  delayBetweenRequests: 1e3,
  // 1 second between facilities
  maxPagesPerDocument: 5
  // "first 3 + last 2" strategy — maximum 5 pages
};

export {
  newMexicoConfig
};
//# sourceMappingURL=chunk-H2RPEXXM.mjs.map
