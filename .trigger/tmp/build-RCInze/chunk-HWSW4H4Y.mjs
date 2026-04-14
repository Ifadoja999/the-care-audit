import {
  __name,
  init_esm
} from "./chunk-6ULOIQV4.mjs";

// src/trigger/enrichment/configs/oklahoma.ts
init_esm();
var oklahomaConfig = {
  stateCode: "OK",
  stateName: "Oklahoma",
  // Portal API — direct HTTP calls, no Playwright needed for data retrieval
  portalBaseUrl: "https://surveys.health.ok.gov",
  facilitiesApiUrl: "https://surveys.health.ok.gov/Api/facilities",
  searchApiUrl: "https://surveys.health.ok.gov/Api/search",
  // AppXtender (document rendering) — requires Playwright for session/cookie management
  appXtenderBaseUrl: "https://imaging.ok.gov",
  // Supabase license_number format: "OK-AL5541" → Portal ID: "AL5541"
  extractPortalId: /* @__PURE__ */ __name((licenseNumber) => licenseNumber.replace(/^OK-/, ""), "extractPortalId"),
  // Select the most recent survey document
  selectDocument: /* @__PURE__ */ __name((documents) => {
    const surveyDocs = documents.filter(
      (d) => d.documentType && (d.documentType.toLowerCase().includes("survey") || d.documentType.toLowerCase().includes("inspection") || d.documentType.toLowerCase().includes("investigation"))
    );
    if (surveyDocs.length === 0) return null;
    surveyDocs.sort((a, b) => {
      const parseDate = /* @__PURE__ */ __name((dateStr) => {
        const [month, day, year] = dateStr.split("-");
        return (/* @__PURE__ */ new Date(`${year}-${month}-${day}`)).getTime();
      }, "parseDate");
      return parseDate(b.exitDate) - parseDate(a.exitDate);
    });
    return surveyDocs[0];
  }, "selectDocument"),
  // All Oklahoma documents are scanned images rendered via AppXtender
  pdfType: "scanned",
  maxConcurrency: 3,
  delayBetweenRequests: 2e3,
  maxPagesPerDocument: 5
  // "first 3 + last 2" strategy — never more than 5 pages captured
};

export {
  oklahomaConfig
};
//# sourceMappingURL=chunk-HWSW4H4Y.mjs.map
