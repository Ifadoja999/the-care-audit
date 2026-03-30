import {
  analyzeInspectionReport
} from "./chunk-WZCL4N2S.mjs";
import {
  renderDocumentPages
} from "./chunk-GR7XD2GG.mjs";
import {
  extractTextFromImages
} from "./chunk-HIBSMY6H.mjs";
import {
  supabase
} from "./chunk-SZEMJ223.mjs";
import {
  logger
} from "./chunk-QXSSDGE5.mjs";
import {
  __name,
  init_esm
} from "./chunk-23OQHB7B.mjs";

// src/trigger/enrichment/process-facility.ts
init_esm();
async function processFacility(browser, config, facility) {
  const portalId = config.extractPortalId(facility.license_number);
  const startTime = Date.now();
  logger.info(`Processing facility: ${facility.facility_name} (${portalId})`);
  let context;
  let page;
  try {
    const documents = await fetchDocumentList(config, portalId);
    if (!documents || documents.length === 0) {
      logger.info(`No survey documents for ${facility.facility_name}`);
      await updateFacilityNoDocuments(facility.id, portalId, config);
      return {
        facilityId: facility.id,
        success: true,
        aiSummary: "No survey documents are available for this facility in the state inspection database.",
        totalViolations: 0,
        reportUrl: `${config.portalBaseUrl}/Home/FacilityDocuments/${portalId}`
      };
    }
    const selectedDoc = config.selectDocument(documents);
    if (!selectedDoc) {
      logger.info(
        `No survey-type documents for ${facility.facility_name} (${documents.length} other docs found)`
      );
      await updateFacilityNoDocuments(facility.id, portalId, config);
      return {
        facilityId: facility.id,
        success: true,
        aiSummary: "No survey documents are available for this facility in the state inspection database.",
        totalViolations: 0,
        reportUrl: `${config.portalBaseUrl}/Home/FacilityDocuments/${portalId}`
      };
    }
    logger.info(
      `Selected document ${selectedDoc.documentId} (${selectedDoc.pageCount} pages, exit ${selectedDoc.exitDate})`
    );
    if (selectedDoc.pageCount > config.maxPagesPerDocument) {
      logger.warn(
        `Document ${selectedDoc.documentId} has ${selectedDoc.pageCount} pages — exceeds limit of ${config.maxPagesPerDocument}. Processing first ${config.maxPagesPerDocument} pages only.`
      );
    }
    context = await browser.newContext({
      ignoreHTTPSErrors: true
    });
    page = await context.newPage();
    const imageBuffers = await renderDocumentPages(
      page,
      config.appXtenderBaseUrl,
      selectedDoc.documentId,
      selectedDoc.pageCount,
      config.maxPagesPerDocument
    );
    await context.close();
    context = void 0;
    page = void 0;
    const extractedText = await extractTextFromImages(imageBuffers);
    if (isNoDeficienciesDocument(extractedText)) {
      logger.info(
        `Document confirms no deficiencies for ${facility.facility_name}`
      );
      const inspectionDate2 = parseExitDate(selectedDoc.exitDate);
      await updateFacilityInSupabase(facility.id, {
        total_violations: 0,
        ai_summary: "No violations were cited in available state inspection records.",
        last_inspection_date: inspectionDate2,
        report_url: `${config.portalBaseUrl}/Home/FacilityDocuments/${portalId}`
      });
      await logFacilityChange(
        facility.id,
        config.stateCode,
        0,
        inspectionDate2
      );
      return {
        facilityId: facility.id,
        success: true,
        aiSummary: "No violations were cited in available state inspection records.",
        totalViolations: 0,
        lastInspectionDate: inspectionDate2 || void 0,
        reportUrl: `${config.portalBaseUrl}/Home/FacilityDocuments/${portalId}`,
        pageCount: imageBuffers.length
      };
    }
    const analysis = await analyzeInspectionReport(
      extractedText,
      facility.facility_name,
      facility.city,
      facility.state
    );
    const inspectionDate = parseExitDate(selectedDoc.exitDate) || analysis.inspection_date;
    await updateFacilityInSupabase(facility.id, {
      total_violations: analysis.total_violations,
      ai_summary: analysis.summary,
      last_inspection_date: inspectionDate,
      report_url: `${config.portalBaseUrl}/Home/FacilityDocuments/${portalId}`
    });
    if (analysis.full_violations && analysis.full_violations.length > 0) {
      await supabase.from("violations").delete().eq("facility_id", facility.id);
      const violationRows = analysis.full_violations.map((v) => ({
        facility_id: facility.id,
        violation_code: v.violation_code,
        violation_description: v.description,
        severity_level: v.severity,
        date_cited: v.date_cited,
        correction_deadline: v.correction_deadline,
        status: v.status
      }));
      const { error: vError } = await supabase.from("violations").insert(violationRows);
      if (vError) {
        logger.warn(`Failed to insert violations for ${facility.facility_name}: ${vError.message}`);
      }
    }
    await logFacilityChange(
      facility.id,
      config.stateCode,
      analysis.total_violations,
      inspectionDate
    );
    const elapsed = ((Date.now() - startTime) / 1e3).toFixed(1);
    logger.info(
      `Completed ${facility.facility_name}: ${analysis.total_violations} violations, ${imageBuffers.length} pages, ${elapsed}s`
    );
    return {
      facilityId: facility.id,
      success: true,
      aiSummary: analysis.summary,
      totalViolations: analysis.total_violations,
      lastInspectionDate: inspectionDate || void 0,
      reportUrl: `${config.portalBaseUrl}/Home/FacilityDocuments/${portalId}`,
      pageCount: imageBuffers.length
    };
  } catch (err) {
    const elapsed = ((Date.now() - startTime) / 1e3).toFixed(1);
    logger.error(
      `Failed to process ${facility.facility_name} after ${elapsed}s: ${err.message}`
    );
    return {
      facilityId: facility.id,
      success: false,
      error: err.message
    };
  } finally {
    if (context) {
      try {
        await context.close();
      } catch {
      }
    }
  }
}
__name(processFacility, "processFacility");
async function fetchDocumentList(config, portalId) {
  const response = await fetch(config.searchApiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      FacilityId: portalId,
      FacilityName: "",
      County: "",
      City: "",
      Zip: "",
      SurveyDocsOnly: true
    })
  });
  if (!response.ok) {
    throw new Error(
      `Search API failed for ${portalId}: ${response.status}`
    );
  }
  const data = await response.json();
  return data.documents || [];
}
__name(fetchDocumentList, "fetchDocumentList");
function isNoDeficienciesDocument(text) {
  const lower = text.toLowerCase();
  return lower.includes("no deficiencies were cited") || lower.includes("no deficiencies cited") || lower.includes("no deficiencies") && lower.includes("cited");
}
__name(isNoDeficienciesDocument, "isNoDeficienciesDocument");
function parseExitDate(dateStr) {
  if (!dateStr) return null;
  const parts = dateStr.split("-");
  if (parts.length !== 3) return null;
  const [month, day, year] = parts;
  const isoDate = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  const parsed = new Date(isoDate);
  if (isNaN(parsed.getTime())) return null;
  return isoDate;
}
__name(parseExitDate, "parseExitDate");
async function updateFacilityInSupabase(facilityId, data) {
  const { error } = await supabase.from("facilities").update({
    total_violations: data.total_violations,
    ai_summary: data.ai_summary,
    last_inspection_date: data.last_inspection_date,
    report_url: data.report_url,
    last_updated: (/* @__PURE__ */ new Date()).toISOString(),
    last_scraped: (/* @__PURE__ */ new Date()).toISOString()
  }).eq("id", facilityId);
  if (error) {
    throw new Error(`Supabase update failed for ${facilityId}: ${error.message}`);
  }
}
__name(updateFacilityInSupabase, "updateFacilityInSupabase");
async function updateFacilityNoDocuments(facilityId, portalId, config) {
  await updateFacilityInSupabase(facilityId, {
    total_violations: 0,
    ai_summary: "No survey documents are available for this facility in the state inspection database.",
    last_inspection_date: null,
    report_url: `${config.portalBaseUrl}/Home/FacilityDocuments/${portalId}`
  });
  await logFacilityChange(facilityId, config.stateCode, 0, null);
}
__name(updateFacilityNoDocuments, "updateFacilityNoDocuments");
async function logFacilityChange(facilityId, stateCode, totalViolations, inspectionDate) {
  await supabase.from("facility_change_log").insert({
    facility_id: facilityId,
    state_code: stateCode,
    change_type: "info_update",
    new_value: {
      type: "enrichment_complete",
      total_violations: totalViolations,
      inspection_date: inspectionDate
    },
    detected_at: (/* @__PURE__ */ new Date()).toISOString()
  });
}
__name(logFacilityChange, "logFacilityChange");

export {
  processFacility
};
//# sourceMappingURL=chunk-5JBXC5EI.mjs.map
