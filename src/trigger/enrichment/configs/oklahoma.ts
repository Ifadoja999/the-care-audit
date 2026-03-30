import { StateEnrichmentConfig, DocumentInfo } from "../types";

export const oklahomaConfig: StateEnrichmentConfig = {
  stateCode: "OK",
  stateName: "Oklahoma",

  // Portal API — direct HTTP calls, no Playwright needed for data retrieval
  portalBaseUrl: "https://surveys.health.ok.gov",
  facilitiesApiUrl: "https://surveys.health.ok.gov/Api/facilities",
  searchApiUrl: "https://surveys.health.ok.gov/Api/search",

  // AppXtender (document rendering) — requires Playwright for session/cookie management
  appXtenderBaseUrl: "https://imaging.ok.gov",

  // Supabase license_number format: "OK-AL5541" → Portal ID: "AL5541"
  extractPortalId: (licenseNumber: string) => licenseNumber.replace(/^OK-/, ""),

  // Select the most recent survey document
  selectDocument: (documents: DocumentInfo[]): DocumentInfo | null => {
    const surveyDocs = documents.filter(
      (d) =>
        d.documentType &&
        (d.documentType.toLowerCase().includes("survey") ||
          d.documentType.toLowerCase().includes("inspection") ||
          d.documentType.toLowerCase().includes("investigation"))
    );

    if (surveyDocs.length === 0) return null;

    // Sort by exitDate descending (format: MM-DD-YYYY)
    surveyDocs.sort((a, b) => {
      const parseDate = (dateStr: string) => {
        const [month, day, year] = dateStr.split("-");
        return new Date(`${year}-${month}-${day}`).getTime();
      };
      return parseDate(b.exitDate) - parseDate(a.exitDate);
    });

    return surveyDocs[0];
  },

  // All Oklahoma documents are scanned images rendered via AppXtender
  pdfType: "scanned",
  maxConcurrency: 3,
  delayBetweenRequests: 2000,
  maxPagesPerDocument: 5, // "first 3 + last 2" strategy — never more than 5 pages captured
};
