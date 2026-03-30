export interface StateEnrichmentConfig {
  stateCode: string;
  stateName: string;
  portalBaseUrl: string;
  facilitiesApiUrl?: string;
  searchApiUrl?: string;
  appXtenderBaseUrl?: string;
  extractPortalId: (licenseNumber: string) => string;
  selectDocument: (documents: DocumentInfo[]) => DocumentInfo | null;
  pdfType: "text" | "scanned" | "mixed";
  maxConcurrency: number;
  delayBetweenRequests: number;
  maxPagesPerDocument: number;

  /**
   * If false, the enrichment pipeline skips Playwright entirely and uses
   * the PDF-based extraction path (fetchDocumentList + extractDocumentContent).
   * Default: true (backward compatible — Oklahoma uses Playwright).
   */
  requiresPlaywright?: boolean;

  /**
   * Custom document list fetcher for states that don't use the Oklahoma-style
   * POST API. The function receives the portal facility ID and returns an array
   * of DocumentInfo objects parsed from the state's report page.
   */
  fetchDocumentList?: (portalId: string) => Promise<DocumentInfo[]>;

  /**
   * Custom content extractor for states that serve PDFs directly (no Playwright).
   * Receives the selected DocumentInfo and returns extracted text with metadata.
   */
  extractDocumentContent?: (
    doc: DocumentInfo
  ) => Promise<{ text: string; pageCount: number; method: string }>;

  /**
   * Build the report URL for a facility given its portal ID.
   * Used when updating report_url in Supabase. Falls back to
   * `${portalBaseUrl}/Home/FacilityDocuments/${portalId}` if not provided.
   */
  getReportUrl?: (portalId: string) => string;

  /**
   * Full Playwright-based extraction for portals that require browser navigation
   * to find and extract documents (e.g., ASP.NET WebForms with AJAX search).
   *
   * When provided, processFacility calls this INSTEAD of the document list +
   * AppXtender / PDF pipelines. The method handles portal navigation, document
   * discovery, and text extraction, returning extracted text + metadata.
   *
   * The browser parameter is the Playwright Browser instance managed by enrich-state.
   * Returns null if no documents were found for this facility.
   */
  extractAllData?: (
    facility: FacilityToEnrich,
    portalId: string,
    browser: any,
  ) => Promise<{
    text: string;
    surveyDate: string | null;
    pageCount: number;
  } | null>;
}

export interface DocumentInfo {
  documentId: string;
  pageCount: number;
  documentType: string;
  documentTitle: string;
  facilityId: string;
  facilityName: string;
  exitDate: string;
  scanDate: string;
  year: string;
}

export interface FacilityToEnrich {
  id: string;
  facility_name: string;
  license_number: string;
  facility_type: string;
  city: string;
  state: string;
}

export interface EnrichmentResult {
  facilityId: string;
  success: boolean;
  aiSummary?: string;
  totalViolations?: number;
  lastInspectionDate?: string;
  reportUrl?: string;
  pageCount?: number;
  error?: string;
}

export interface AnalysisResult {
  total_violations: number;
  summary: string;
  full_violations: ViolationDetail[];
  inspection_date: string | null;
}

export interface ViolationDetail {
  violation_code: string | null;
  description: string;
  severity: "High" | "Medium" | "Low";
  date_cited: string | null;
  correction_deadline: string | null;
  status: "Open" | "Corrected" | "Pending" | "Unknown";
}
