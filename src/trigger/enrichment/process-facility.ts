import { logger } from "@trigger.dev/sdk";
import type { Browser } from "playwright";
import { supabase } from "../lib/supabase";
import type {
  StateEnrichmentConfig,
  FacilityToEnrich,
  EnrichmentResult,
  DocumentInfo,
} from "./types";
import { renderDocumentPages } from "./lib/appxtender";
import { extractTextFromImages } from "./lib/vision-extractor";
import { analyzeInspectionReport } from "./lib/ai-analyzer";

/**
 * Process a single facility through the full enrichment pipeline.
 *
 * Supports two extraction paths:
 *
 * 1. Playwright path (Oklahoma): AppXtender page rendering → Vision OCR → AI analysis
 *    - Requires a Playwright Browser instance
 *    - Uses config.searchApiUrl for document list
 *    - Uses config.appXtenderBaseUrl for page rendering
 *
 * 2. PDF path (New Mexico and future states): HTTP fetch → PDF download → hybrid extraction → AI analysis
 *    - No Playwright needed (browser parameter is null)
 *    - Uses config.fetchDocumentList() for custom document fetching
 *    - Uses config.extractDocumentContent() for hybrid text/Vision extraction
 *
 * Both paths share: document selection, "no deficiencies" detection, AI analysis,
 * Supabase update, violation insertion, and change logging.
 */
export async function processFacility(
  browser: Browser | null,
  config: StateEnrichmentConfig,
  facility: FacilityToEnrich
): Promise<EnrichmentResult> {
  const portalId = config.extractPortalId(facility.license_number);
  const startTime = Date.now();

  logger.info(`Processing facility: ${facility.facility_name} (${portalId})`);

  // Build the report URL for this facility
  const reportUrl = config.getReportUrl
    ? config.getReportUrl(portalId)
    : `${config.portalBaseUrl}/Home/FacilityDocuments/${portalId}`;

  let context;
  let page;

  try {
    // ═══ Full Playwright extraction path (Alabama and future ASP.NET portals) ═══
    // When config.extractAllData is provided, it handles portal navigation,
    // document discovery, and text extraction in one method. This bypasses
    // the document list + AppXtender / PDF pipelines entirely.
    if (config.extractAllData) {
      const extracted = await config.extractAllData(facility, portalId, browser);

      if (!extracted || !extracted.text || extracted.text.trim().length < 50) {
        // No documents found — facility has no records in the portal
        logger.info(`No document content found for ${facility.facility_name} via extractAllData`);

        await updateFacilityNoDocuments(facility.id, reportUrl, config);

        return {
          facilityId: facility.id,
          success: true,
          aiSummary:
            "No deficiency records found in the state deficiencies portal.",
          totalViolations: 0,
          reportUrl,
        };
      }

      logger.info(
        `Extracted ${extracted.text.length} chars via extractAllData (survey date: ${extracted.surveyDate || "unknown"})`
      );

      // Check for "no deficiencies" early exit
      if (isNoDeficienciesDocument(extracted.text)) {
        logger.info(
          `Document confirms no deficiencies for ${facility.facility_name}`
        );

        const inspectionDate = extracted.surveyDate || null;

        await updateFacilityInSupabase(facility.id, {
          total_violations: 0,
          ai_summary:
            "No violations were cited in available state inspection records.",
          last_inspection_date: inspectionDate,
          report_url: reportUrl,
        });

        await logFacilityChange(
          facility.id,
          config.stateCode,
          0,
          inspectionDate
        );

        return {
          facilityId: facility.id,
          success: true,
          aiSummary:
            "No violations were cited in available state inspection records.",
          totalViolations: 0,
          lastInspectionDate: inspectionDate || undefined,
          reportUrl,
          pageCount: extracted.pageCount,
        };
      }

      // Run AI analysis
      const analysis = await analyzeInspectionReport(
        extracted.text,
        facility.facility_name,
        facility.city,
        facility.state
      );

      const inspectionDate = extracted.surveyDate || analysis.inspection_date;

      // Update Supabase — facility record
      await updateFacilityInSupabase(facility.id, {
        total_violations: analysis.total_violations,
        ai_summary: analysis.summary,
        last_inspection_date: inspectionDate,
        report_url: reportUrl,
      });

      // Insert violation detail rows
      if (analysis.full_violations && analysis.full_violations.length > 0) {
        await supabase
          .from("violations")
          .delete()
          .eq("facility_id", facility.id);

        const violationRows = analysis.full_violations.map((v) => ({
          facility_id: facility.id,
          violation_code: v.violation_code,
          violation_description: v.description,
          severity_level: v.severity,
          date_cited: v.date_cited,
          correction_deadline: v.correction_deadline,
          status: v.status,
        }));

        const { error: vError } = await supabase
          .from("violations")
          .insert(violationRows);

        if (vError) {
          logger.warn(
            `Failed to insert violations for ${facility.facility_name}: ${vError.message}`
          );
        }
      }

      // Log change
      await logFacilityChange(
        facility.id,
        config.stateCode,
        analysis.total_violations,
        inspectionDate
      );

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      logger.info(
        `Completed ${facility.facility_name}: ${analysis.total_violations} violations, ${extracted.pageCount} pages, ${elapsed}s`
      );

      return {
        facilityId: facility.id,
        success: true,
        aiSummary: analysis.summary,
        totalViolations: analysis.total_violations,
        lastInspectionDate: inspectionDate || undefined,
        reportUrl,
        pageCount: extracted.pageCount,
      };
    }

    // ═══ Standard document list pipeline (Oklahoma + New Mexico) ═══
    // Step 1: Get document list
    let documents: DocumentInfo[];

    if (config.fetchDocumentList) {
      // PDF-based path: custom document fetcher (NM and future states)
      documents = await config.fetchDocumentList(portalId);
    } else {
      // Playwright path: POST to search API (Oklahoma)
      documents = await fetchDocumentListOklahoma(config, portalId);
    }

    if (!documents || documents.length === 0) {
      // No survey documents — set total_violations = 0
      logger.info(`No survey documents for ${facility.facility_name}`);

      await updateFacilityNoDocuments(facility.id, reportUrl, config);

      return {
        facilityId: facility.id,
        success: true,
        aiSummary:
          "No survey documents are available for this facility in the state inspection database.",
        totalViolations: 0,
        reportUrl,
      };
    }

    // Step 2: Select most recent survey document
    const selectedDoc = config.selectDocument(documents);

    if (!selectedDoc) {
      logger.info(
        `No survey-type documents for ${facility.facility_name} (${documents.length} other docs found)`
      );

      await updateFacilityNoDocuments(facility.id, reportUrl, config);

      return {
        facilityId: facility.id,
        success: true,
        aiSummary:
          "No survey documents are available for this facility in the state inspection database.",
        totalViolations: 0,
        reportUrl,
      };
    }

    logger.info(
      `Selected document ${selectedDoc.documentId} (exit ${selectedDoc.exitDate})`
    );

    // Step 3-4: Extract content — branch based on config
    let extractedText: string;
    let capturedPageCount: number;

    if (config.extractDocumentContent) {
      // ═══ PDF-based path (NM and future states) ═══
      // No Playwright needed — downloads PDF and uses hybrid text/Vision extraction
      const extraction = await config.extractDocumentContent(selectedDoc);
      extractedText = extraction.text;
      capturedPageCount = extraction.pageCount;
      logger.info(
        `PDF extraction: ${extraction.method} method, ${capturedPageCount} total pages`
      );
    } else {
      // ═══ Playwright path (Oklahoma) ═══
      // Renders pages via AppXtender and extracts text via Vision OCR
      if (!browser) {
        throw new Error(
          `Playwright browser required for ${config.stateCode} but not provided`
        );
      }

      if (selectedDoc.pageCount > config.maxPagesPerDocument) {
        logger.warn(
          `Document ${selectedDoc.documentId} has ${selectedDoc.pageCount} pages — processing first ${config.maxPagesPerDocument} only`
        );
      }

      context = await browser.newContext({ ignoreHTTPSErrors: true });
      page = await context.newPage();

      let imageBuffers: Buffer[] | null = await renderDocumentPages(
        page,
        config.appXtenderBaseUrl!,
        selectedDoc.documentId,
        selectedDoc.pageCount,
        config.maxPagesPerDocument
      );

      // Close Playwright context early — no longer needed
      await context.close();
      context = undefined;
      page = undefined;

      extractedText = await extractTextFromImages(imageBuffers);
      capturedPageCount = imageBuffers.length;

      // Release image buffers immediately
      imageBuffers = null;
    }

    // Step 5: Check for "no deficiencies" early exit
    if (isNoDeficienciesDocument(extractedText)) {
      logger.info(
        `Document confirms no deficiencies for ${facility.facility_name}`
      );

      const inspectionDate = parseExitDate(selectedDoc.exitDate);

      await updateFacilityInSupabase(facility.id, {
        total_violations: 0,
        ai_summary:
          "No violations were cited in available state inspection records.",
        last_inspection_date: inspectionDate,
        report_url: reportUrl,
      });

      await logFacilityChange(
        facility.id,
        config.stateCode,
        0,
        inspectionDate
      );

      return {
        facilityId: facility.id,
        success: true,
        aiSummary:
          "No violations were cited in available state inspection records.",
        totalViolations: 0,
        lastInspectionDate: inspectionDate || undefined,
        reportUrl,
        pageCount: capturedPageCount,
      };
    }

    // Step 6: Run AI analysis
    const analysis = await analyzeInspectionReport(
      extractedText,
      facility.facility_name,
      facility.city,
      facility.state
    );

    // Use exitDate from document metadata (more reliable than AI-extracted date)
    const inspectionDate =
      parseExitDate(selectedDoc.exitDate) || analysis.inspection_date;

    // Step 7: Update Supabase — facility record
    await updateFacilityInSupabase(facility.id, {
      total_violations: analysis.total_violations,
      ai_summary: analysis.summary,
      last_inspection_date: inspectionDate,
      report_url: reportUrl,
    });

    // Step 7b: Insert violation detail rows
    if (analysis.full_violations && analysis.full_violations.length > 0) {
      // Clear existing violations first
      await supabase
        .from("violations")
        .delete()
        .eq("facility_id", facility.id);

      const violationRows = analysis.full_violations.map((v) => ({
        facility_id: facility.id,
        violation_code: v.violation_code,
        violation_description: v.description,
        severity_level: v.severity,
        date_cited: v.date_cited,
        correction_deadline: v.correction_deadline,
        status: v.status,
      }));

      const { error: vError } = await supabase
        .from("violations")
        .insert(violationRows);

      if (vError) {
        logger.warn(
          `Failed to insert violations for ${facility.facility_name}: ${vError.message}`
        );
      }
    }

    // Step 7c: Log to facility_change_log
    await logFacilityChange(
      facility.id,
      config.stateCode,
      analysis.total_violations,
      inspectionDate
    );

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    logger.info(
      `Completed ${facility.facility_name}: ${analysis.total_violations} violations, ${capturedPageCount} pages, ${elapsed}s`
    );

    return {
      facilityId: facility.id,
      success: true,
      aiSummary: analysis.summary,
      totalViolations: analysis.total_violations,
      lastInspectionDate: inspectionDate || undefined,
      reportUrl,
      pageCount: capturedPageCount,
    };
  } catch (err: any) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    logger.error(
      `Failed to process ${facility.facility_name} after ${elapsed}s: ${err.message}`
    );

    return {
      facilityId: facility.id,
      success: false,
      error: err.message,
    };
  } finally {
    // Ensure Playwright context is cleaned up
    if (context) {
      try {
        await context.close();
      } catch {
        // Ignore close errors
      }
    }
  }
}

/**
 * Fetch the document list for a facility from the Oklahoma portal search API.
 * This is the original Oklahoma-specific implementation using POST to searchApiUrl.
 */
async function fetchDocumentListOklahoma(
  config: StateEnrichmentConfig,
  portalId: string
): Promise<DocumentInfo[]> {
  const response = await fetch(config.searchApiUrl!, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      FacilityId: portalId,
      FacilityName: "",
      County: "",
      City: "",
      Zip: "",
      SurveyDocsOnly: true,
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Search API failed for ${portalId}: ${response.status}`
    );
  }

  const data = await response.json();
  return data.documents || [];
}

/**
 * Check if extracted text indicates "no deficiencies were cited."
 */
function isNoDeficienciesDocument(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    lower.includes("no deficiencies were cited") ||
    lower.includes("no deficiencies cited") ||
    (lower.includes("no deficiencies") && lower.includes("cited"))
  );
}

/**
 * Parse date strings to ISO YYYY-MM-DD format.
 * Handles both Oklahoma format (MM-DD-YYYY) and ISO format (YYYY-MM-DD).
 */
function parseExitDate(dateStr: string): string | null {
  if (!dateStr) return null;

  // Already ISO format (from NM config)
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const parsed = new Date(dateStr);
    return isNaN(parsed.getTime()) ? null : dateStr;
  }

  // Oklahoma format: MM-DD-YYYY
  const parts = dateStr.split("-");
  if (parts.length === 3 && parts[2].length === 4) {
    const [month, day, year] = parts;
    const isoDate = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    const parsed = new Date(isoDate);
    return isNaN(parsed.getTime()) ? null : isoDate;
  }

  return null;
}

/**
 * Update a facility record in Supabase with enrichment data.
 */
async function updateFacilityInSupabase(
  facilityId: string,
  data: {
    total_violations: number;
    ai_summary: string;
    last_inspection_date: string | null;
    report_url: string;
  }
) {
  const { error } = await supabase
    .from("facilities")
    .update({
      total_violations: data.total_violations,
      ai_summary: data.ai_summary,
      last_inspection_date: data.last_inspection_date,
      report_url: data.report_url,
      last_updated: new Date().toISOString(),
      last_scraped: new Date().toISOString(),
    })
    .eq("id", facilityId);

  if (error) {
    throw new Error(
      `Supabase update failed for ${facilityId}: ${error.message}`
    );
  }
}

/**
 * Update a facility with no survey documents.
 */
async function updateFacilityNoDocuments(
  facilityId: string,
  reportUrl: string,
  config: StateEnrichmentConfig
) {
  await updateFacilityInSupabase(facilityId, {
    total_violations: 0,
    ai_summary:
      "No survey documents are available for this facility in the state inspection database.",
    last_inspection_date: null,
    report_url: reportUrl,
  });

  await logFacilityChange(facilityId, config.stateCode, 0, null);
}

/**
 * Log enrichment completion to facility_change_log.
 */
async function logFacilityChange(
  facilityId: string,
  stateCode: string,
  totalViolations: number,
  inspectionDate: string | null
) {
  await supabase.from("facility_change_log").insert({
    facility_id: facilityId,
    state_code: stateCode,
    change_type: "info_update",
    new_value: {
      type: "enrichment_complete",
      total_violations: totalViolations,
      inspection_date: inspectionDate,
    },
    detected_at: new Date().toISOString(),
  });
}
