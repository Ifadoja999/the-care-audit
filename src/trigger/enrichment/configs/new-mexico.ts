import { logger } from "@trigger.dev/sdk";
import * as fs from "fs";
import * as path from "path";
import type { StateEnrichmentConfig, DocumentInfo } from "../types";
import {
  downloadPdf,
  extractPdfContent,
  cleanupTempFiles,
} from "../lib/pdf-extractor";

const PORTAL_BASE_URL = "https://providersearch.hca.nm.gov";
const PDF_BASE_URL = "https://providersearch.test.hca.nm.gov/2567";
const TEMP_DIR = "/tmp/tca-enrichment";

/**
 * Parse NM report page HTML to extract survey entries.
 *
 * The actual HTML structure uses label/value pairs in separate table rows:
 *   <tr><td class="H12_violet_left">Type of Survey: </td><td class="H12_violet_leftn">HEALTH</td></tr>
 *   <tr><td class="H12_violet_left">Survey Event ID: </td><td class="H12_violet_leftn">UP5L11</td></tr>
 *   <tr><td class="H12_violet_left">Survey Entrance Date: </td><td class="H12_violet_leftn">04/07/2025</td></tr>
 *   <tr><td class="H12_violet_left">Survey Exit Date: </td><td class="H12_violet_leftn">04/08/2025</td></tr>
 *   <tr><td class="H12_violet_left">Name of Provider: </td><td class="H12_violet_leftn">...</td></tr>
 *   <tr><td class="H12_violet_left">Highest Citation: </td><td class="H12_violet_leftn">...</td></tr>
 *   <tr><td colspan="4"><a href="...2567/UP5L11.pdf">Click here to view the survey</a></td></tr>
 *   <tr><td colspan="2"><hr></td></tr>
 *
 * Each survey block ends with an <hr>. We split the HTML at <hr> boundaries
 * and parse each block for the label/value pairs and PDF link.
 */
function parseSurveyTable(html: string, portalId: string): DocumentInfo[] {
  const documents: DocumentInfo[] = [];

  // Split HTML at <hr> delimiters to isolate each survey block
  const blocks = html.split(/<hr\s*\/?>/i);

  for (const block of blocks) {
    // Check if this block contains a PDF link
    const pdfLinkMatch = block.match(
      /href=["'](?:https?:\/\/providersearch\.(?:test\.)?hca\.nm\.gov)?\/2567\/([^"']+?)\.pdf["']/i
    );
    if (!pdfLinkMatch) continue;

    const surveyEventId = pdfLinkMatch[1];

    // Extract label/value pairs from H12_violet_left/H12_violet_leftn table cells
    const labelValueRegex =
      /<td[^>]*class=["']H12_violet_left["'][^>]*>([\s\S]*?)<\/td>\s*<td[^>]*class=["']H12_violet_leftn["'][^>]*>([\s\S]*?)<\/td>/gi;

    const fields: Record<string, string> = {};
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

    // Parse dates from MM/DD/YYYY to YYYY-MM-DD
    const isoExitDate = parseNmDate(exitDate);
    const isoEntranceDate = parseNmDate(entranceDate);

    documents.push({
      documentId: surveyEventId,
      pageCount: 0, // Unknown until PDF is downloaded
      documentType: surveyType,
      documentTitle: highestCitation || surveyType,
      facilityId: portalId,
      facilityName: providerName,
      exitDate: isoExitDate || exitDate,
      scanDate: isoEntranceDate || entranceDate,
      year: isoExitDate ? isoExitDate.substring(0, 4) : "",
    });
  }

  return documents;
}

/**
 * Parse NM date format (MM/DD/YYYY) to ISO (YYYY-MM-DD).
 */
function parseNmDate(dateStr: string): string | null {
  if (!dateStr) return null;

  const match = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;

  const [, month, day, year] = match;
  const iso = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;

  // Validate it's a real date
  const parsed = new Date(iso);
  if (isNaN(parsed.getTime())) return null;

  return iso;
}

/**
 * Fetch the survey document list for a facility from the NM portal.
 * Uses dual-lookup: tries numeric ID first, then NM-prefixed ID.
 * All requests are plain HTTP GETs — no Playwright needed.
 */
async function fetchNmDocumentList(
  portalId: string
): Promise<DocumentInfo[]> {
  // Build the two possible portal IDs to try
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

      // Check if the page has any survey data (look for PDF links)
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
    } catch (err: any) {
      logger.warn(`Failed to fetch report page for facid=${id}: ${err.message}`);
    }
  }

  // Neither format returned results — facility has no survey reports
  logger.info(
    `No survey reports found for portal ID ${portalId} (tried: ${idsToTry.join(", ")})`
  );
  return [];
}

/**
 * Download a survey PDF and extract its content using the hybrid strategy:
 * try text extraction (pdftotext) first, fall back to Vision OCR (pdftoppm + Claude).
 * Enforces "first 3 + last 2" page strategy — maximum 5 pages per document.
 */
async function extractNmDocumentContent(
  doc: DocumentInfo
): Promise<{ text: string; pageCount: number; method: string }> {
  const surveyEventId = doc.documentId;
  const pdfUrl = `${PDF_BASE_URL}/${surveyEventId}.pdf`;

  // Ensure temp directory exists
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
  }

  const pdfPath = path.join(TEMP_DIR, `${surveyEventId}.pdf`);

  try {
    // Step 1: Download PDF to disk via streaming (never load into Buffer)
    logger.info(`Downloading PDF: ${pdfUrl}`);
    await downloadPdf(pdfUrl, pdfPath);

    const fileSizeBytes = fs.statSync(pdfPath).size;
    const fileSizeMB = (fileSizeBytes / (1024 * 1024)).toFixed(1);
    logger.info(`PDF downloaded: ${fileSizeMB}MB → ${pdfPath}`);

    // Step 2: Extract content using hybrid strategy (text first, Vision fallback)
    // Page strategy is ALWAYS "first3last2" — maximum 5 pages
    const result = await extractPdfContent(pdfPath, {
      pageStrategy: "first3last2",
    });

    logger.info(
      `Extraction complete: ${result.method} method, ${result.pagesExtracted.length} pages, ${result.text.length} chars`
    );

    return {
      text: result.text,
      pageCount: result.pageCount,
      method: result.method,
    };
  } finally {
    // Always delete the PDF file after extraction
    try {
      if (fs.existsSync(pdfPath)) {
        fs.unlinkSync(pdfPath);
      }
    } catch {
      /* ignore cleanup errors */
    }

    // Clean up any remaining temp files
    cleanupTempFiles();
  }
}

export const newMexicoConfig: StateEnrichmentConfig = {
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
  extractPortalId: (licenseNumber: string) =>
    licenseNumber.replace(/^NM-/, ""),

  // Select the most recent survey document by exit date
  selectDocument: (documents: DocumentInfo[]): DocumentInfo | null => {
    if (documents.length === 0) return null;

    // Sort by exitDate descending (ISO format YYYY-MM-DD)
    const sorted = [...documents].sort((a, b) => {
      const dateA = a.exitDate || "0000-00-00";
      const dateB = b.exitDate || "0000-00-00";
      return dateB.localeCompare(dateA);
    });

    return sorted[0];
  },

  // Custom document fetcher — HTML scraping with dual-lookup
  fetchDocumentList: fetchNmDocumentList,

  // Custom content extractor — hybrid PDF text/Vision
  extractDocumentContent: extractNmDocumentContent,

  // Build report page URL for Supabase report_url field
  getReportUrl: (portalId: string) =>
    `${PORTAL_BASE_URL}/p_reports.php?facid=${portalId}`,

  // Mixed PDF types: ~78% scanned images, ~22% text-extractable CMS-2567
  pdfType: "mixed",
  maxConcurrency: 3,
  delayBetweenRequests: 1000, // 1 second between facilities
  maxPagesPerDocument: 5, // "first 3 + last 2" strategy — maximum 5 pages
};
