# Oklahoma Portal Research Results — Phase 2 Enrichment

**Date:** February 28, 2026
**Portal:** surveys.health.ok.gov + imaging.ok.gov (AppXtender)
**Facilities:** 217 (188 ALC + 29 RCH)

---

## Question 1: Supabase Facility ID Format

### License Number Format
All Oklahoma facilities use the prefix `OK-{PortalID}`:

| Prefix | Count | Example | Portal ID |
|--------|-------|---------|-----------|
| `OK-AL` | 173 | `OK-AL7201` | `AL7201` (Assisted Living Centers) |
| `OK-RC` | 29 | `OK-RC4101` | `RC4101` (Residential Care Homes) |
| `OK-NH` | 8 | `OK-NH240801` | `NH240801` (Nursing homes with ALC wings) |
| `OK-CC` | 7 | `OK-CC...` | Continuum of Care cross-license |

### Mapping to Portal
**Strip the `OK-` prefix** to get the portal facility ID. Example:
- Supabase `license_number`: `OK-AL5541`
- Portal `facilityId`: `AL5541`
- Search API parameter: `{ FacilityId: "AL5541" }`
- Documents page URL: `surveys.health.ok.gov/Home/FacilityDocuments/AL5541`

### Current State
- All 217 facilities have `total_violations = NULL` (directory only)
- All `report_url` values are the generic portal URL: `https://surveys.health.ok.gov/`
- Facility types: "Assisted Living Center (ALC)" and "Residential Care Home (RCH)"

---

## Question 2: Portal AJAX API Endpoints

### Endpoint 1: GET `/Api/facilities` — Master Facility List

**No parameters needed.** Returns ALL 1,152 facilities across all types in a single JSON response (~559KB).

```
GET https://surveys.health.ok.gov/Api/facilities
```

**Response format:**
```json
{
  "result": [
    {
      "facilityId": "AL5541",
      "facilityName": "TEAL CREEK ASSISTED LIVING & MEMORY CARE",
      "facilityTypeCode": "43S",
      "facilityTypeDescription": "Assisted Living Centers",
      "administrator": "SCOTT SLEMP",
      "facilitySubType": null,
      "street": "13501 N BRYANT AVE",
      "city": "EDMOND",
      "state": "OK",
      "zip": "73013",
      "phoneNumber": "(405) 509-1200",
      "county": "OKLAHOMA",
      "licensedBed": 87,
      "status": "Open",
      "surveyDocsOnly": false
    }
  ]
}
```

**Facility type codes:**
- `43S` = Assisted Living Centers (242 total: 188 open, 54 closed)
- `40S` = Residential Care Homes (152 total: 30 open, 122 closed)
- `021` = Nursing Homes (490)
- `111` = ICF/IID (150)
- `41S` = Adult Day Care Centers (114)

**Key insight:** This single endpoint gives us administrator name, street address, phone, county, licensed beds, and open/closed status for EVERY facility — more data than we currently have in Supabase. We can enrich address, phone, capacity, and administrator from this API alone, without scraping anything.

### Endpoint 2: POST `/Api/search` — Facility Document List

```
POST https://surveys.health.ok.gov/Api/search
Content-Type: application/json

{
  "FacilityId": "AL5541",
  "FacilityName": "",
  "County": "",
  "City": "",
  "Zip": "",
  "SurveyDocsOnly": true
}
```

**Response format:**
```json
{
  "documents": [
    {
      "documentId": 114380,
      "pageCount": 8,
      "documentType": "SURVEY DOCUMENTS",
      "documentTitle": "TEAL CREEK ASSISTED LIVING & MEMORY CARE",
      "facilityId": "AL5541",
      "facilityName": "TEAL CREEK ASSISTED LIVING & MEMORY CARE",
      "exitDate": "02-04-2026",
      "scanDate": "02-17-2026",
      "year": "2026"
    },
    {
      "documentId": 111316,
      "pageCount": 115,
      "documentType": "SURVEY DOCUMENTS",
      "documentTitle": "TEAL CREEK ASSISTED LIVING & MEMORY CARE",
      "facilityId": "AL5541",
      "facilityName": "TEAL CREEK ASSISTED LIVING & MEMORY CARE",
      "exitDate": "08-15-2025",
      "scanDate": "09-18-2025",
      "year": "2025"
    }
  ]
}
```

**Key fields:**
- `documentId` — unique ID for AppXtender document retrieval
- `exitDate` — survey/investigation completion date (MM-DD-YYYY format)
- `pageCount` — total pages in the document
- `documentType` — filter for `"SURVEY DOCUMENTS"` to get inspections
- Setting `SurveyDocsOnly: true` does server-side filtering

**Other document types observed:** `LICENSE`, `OTHER`, `COURT-ADMINISTRATIVE ORDER`, `CERTIFICATION - 1539`, `CORRESPONDENCE - CMS`, `CORRESPONDENCE - MISC`

### Important: Direct API Access Works
Both endpoints are standard HTTP calls — **no Playwright needed for data retrieval.** The sessionStorage/DataTables frontend is just UI chrome. We can call these APIs directly with `fetch()` or `axios`.

---

## Question 3: Document/PDF URL Pattern

### Documents Are NOT Direct PDFs

Documents are stored in Oklahoma's **AppXtender imaging system** at `imaging.ok.gov`. There is no direct PDF download URL.

### Document Viewer URL
```
https://imaging.ok.gov/Appxtender/TestLaunch?AppId=346&DocId={documentId}
```

### Authentication Flow (credential-less, public access)
1. Navigate to the TestLaunch URL
2. AngularJS app auto-POSTs to `/Appxtender/TestLaunch/GenerateCredentions` (yes, misspelled)
3. Returns encrypted credential string: `AE:B73BE1C58609D22DA203CF86F81FD8D0...`
4. Browser redirects to viewer: `/AppXtender/datasources/Xtender/IDocument/?AppId=346&Credentials=AE:...&DocId={id}`
5. Server sets `ASP.NET_SessionId` and `WX-XSRF-TOKEN` cookies for session

### Page Rendering API (3-step async flow per page)

**Step 1 — Request render job:**
```
POST /AppXtender/actionApi/dataSources/Xtender/applications/346/PageRendering/RenderDocPageContent/{docId}/{pageNum}/1?dPI=-1&fileSubPage=1&formOverlayOption=0
Body: {}
```
Returns: `{ "jobToken": "uuid-here", "status": 0 }`

**Step 2 — Poll for completion:**
```
GET /AppXtender/actionApi/dataSources/Xtender/PageRendering/GetRenderingResult/{jobToken}
```
Returns status: `0` = queued, `1` = rendering, `2` = complete

**Step 3 — Download rendered JPEG:**
```
GET /AppXtender/actionApi/dataSources/Xtender/PageRendering/GetRenderImage/{jobToken}?ts={timestamp}&X-XSRF-TOKEN={xsrfToken}
```
Returns: `image/jpeg` (150KB–625KB per page)

### What Did NOT Work
- **AppXtenderReST API** (`/AppXtenderReST/api/...`): Returns `401 Unauthorized`
- **Direct PDF binary download**: No endpoint found — `/content`, `/binary`, `/file` all return 400/500
- **Text extraction APIs**: `/DocumentFullText/`, `/DocPageText/` return 404 — `hasTextView: false` confirms no server-side OCR

---

## Question 4: Text-Based or Scanned Images?

### Answer: Scanned/rendered images — NO text layer

The documents are stored as PDF in AppXtender but served **only as rendered JPEG images**. The metadata confirms:

```json
{
  "hasTextView": false,
  "fileInfo": { "fileType": 7, "mimeType": "application/pdf" },
  "pageInfo": { "type": "PDF" }
}
```

- `hasTextView: false` = no server-side text extraction available
- No `pdftotext` equivalent is possible — documents are only accessible as page images
- **Claude Vision is required** (same approach as Delaware and DC builds)

### Image Quality
- **Resolution:** High — all text is crisp and perfectly legible
- **Size:** 150KB–625KB per page JPEG
- **Color:** Full color (OSDH letterhead has blue/orange logo)
- Claude Vision will have zero difficulty reading these documents

### Performance Characteristics
- ~35 seconds per page (30s render poll + 5s download)
- ~5 minutes per 8-page document
- Session cookies persist for the full document (no re-auth per page)
- Transient render failures possible (1 out of 8 pages failed in test) — retry logic needed

---

## Question 5: Violation/Deficiency Structure Inside Documents

### Document Structure (8-page test document — Teal Creek AL, Doc ID 114380)

The test document contained **3 complaint investigations** bundled into one survey document:

| Page | Content |
|------|---------|
| **Page 1** | **Cover letter** from Lisa Calvin, Enforcement Analyst II, OSDH Long Term Care. States: "Enclosed is a report of the complaint investigation conducted at your Adult Day Care facility on **February 4, 2026**. No deficiencies were cited." Contains: License Number (AL5541), Survey Event ID (4CB811). |
| **Page 2** | **Investigative Report — Complaint #88347.** Header: Facility name, address, city/state/zip, Provider #, Complaint #, Investigation Dates (02/02/26–02/04/26). **ALLEGATION(S) table** with 5 rows: (1) Failed to ensure residents free from abuse, (2) Failed to ensure sufficient supplies, (3) Failed to maintain clean/homelike environment, (4) Failed to ensure call light system functioning, (5) Failed to ensure sufficient staff. Followed by investigation narrative: "A Summary of Complaint Investigation" describing methodology (observations, interviews, records review). |
| **Page 3** | **Closing page** — "Date report completed: 02/10/2026" |
| **Page 4** | **Investigative Report — Complaint #89004.** Same header format. **ALLEGATION(S) table** with 2 rows: (1) Failed to ensure care and supervision / prevent accidents / assess, monitor, intervene, (2) Failed to ensure food temperatures were safe. Same narrative format. |
| **Page 5** | **Closing page** — "Date report completed: 02/06/2026" |
| **Page 6** | **Investigative Report — Complaint #89141.** **ALLEGATION(S) table** with 4 rows: (1) Failed to assess, monitor and intervene in a timely manner, (2) Failed to ensure meals served at safe temperature, (3) Failed to ensure medications ordered for administration in timely manner, (4) Failed to ensure adequate staff. |
| **Page 7** | *(Render failed — transient server error, would succeed on retry)* |
| **Page 8** | **Statement of Deficiencies (CMS-2567 equivalent).** Formal state form with: Provider ID (AL5541), Name, Address, Date Survey Completed (02/04/2026), Survey Event ID (4CB811). Tag C 000 INITIAL COMMENTS: "Complaint investigations (#OK00088347, OK00089004, and #OK00089141) were conducted on 02/02/26 through 02/04/26. **No deficiencies were cited.**" Facility Census: 71 |

### Document Format Classification
- **Cover letter**: Oklahoma state-specific format
- **Investigative Reports**: Oklahoma state-specific format (NOT CMS-2567)
- **Statement of Deficiencies**: CMS-2567 equivalent (standard federal form adapted for Oklahoma)

### Key Observation: This Was a "No Deficiencies" Document
The test document (Doc ID 114380) was a complaint investigation where **no deficiencies were cited** despite 3 separate complaints with 11 total allegations investigated. The SOD (page 8) explicitly states "No deficiencies were cited."

For facilities **WITH** cited deficiencies, the SOD would contain actual deficiency tags (beyond C 000) with:
- (X4) ID Prefix Tag — deficiency code
- Summary Statement of Deficiencies — violation description
- Provider's Plan of Correction
- (X5) Complete Date

### What Claude Vision Needs to Extract
From each survey document:
1. **Cover letter (page 1):** Investigation date, license number, whether deficiencies were cited
2. **Investigative Reports:** Complaint numbers, allegation descriptions, investigation dates, investigation narrative
3. **Statement of Deficiencies (last page):** Deficiency tags, descriptions, plans of correction, survey completion date, facility census

### Severity Determination
Oklahoma does not use explicit High/Medium/Low severity labels. Severity must be inferred from:
- Type of allegation (abuse = High, supplies = Medium, record-keeping = Low)
- Whether fines or administrative orders were issued
- Whether the complaint was substantiated vs. unsubstantiated

---

## Question 6: Survey Documents Per Facility

### Test Facility: Teal Creek Assisted Living (AL5541)
- **13 survey documents** spanning 2019–February 2026
- Most recent: exit date 02/04/2026 (8 pages, Doc ID 114380)
- Oldest available: 2019

### Broader Sample (15 randomly sampled open ALCs)
- **100% of sampled facilities had survey documents** (15/15)
- Document counts ranged from **3 to 13** survey documents per facility
- Date range: **2019 to February 2026** (very current data)
- Page counts: **2 to 115 pages** per document

### Document Types/Labels
Documents are labeled by `documentType`:
- `SURVEY DOCUMENTS` — inspection/survey reports (what we want)
- `LICENSE` — licensing documents
- `COURT-ADMINISTRATIVE ORDER` — enforcement actions
- `CERTIFICATION - 1539` — federal certification
- `CORRESPONDENCE - CMS` — CMS correspondence
- `CORRESPONDENCE - MISC` — miscellaneous correspondence
- `OTHER` — other documents

### Identifying the Most Recent Annual Inspection
The API returns `exitDate` (survey completion date) for each document. Strategy:
1. Filter to `documentType === "SURVEY DOCUMENTS"`
2. Sort by `exitDate` descending
3. The **most recent** survey document is the one to extract for violation data
4. Use `exitDate` as `last_inspection_date`

**Note:** Survey documents may be complaint investigations (like the test doc) or annual surveys. Both are inspection events. The API does not distinguish between them — both appear as `SURVEY DOCUMENTS`. For our purposes, the most recent survey document of any type is appropriate.

### Identifying Facilities with NO Survey Documents
Some facilities may have no survey documents at all (newly licensed, etc.). The API will return `{ documents: [] }` for these. Set `total_violations = 0` and use a fallback summary.

---

## Recommended Phase 2 Enrichment Architecture

### Step 1: Bulk Metadata Update (No Playwright — direct API calls)

Call `GET /Api/facilities` once to get the full master list. For each ALC/RCH:
- Update Supabase with: `address`, `phone`, `licensed_capacity` (licensedBed), `county`
- Update `report_url` to facility-specific: `https://surveys.health.ok.gov/Home/FacilityDocuments/{facilityId}`
- Match via: strip `OK-` prefix from `license_number`

### Step 2: Get Document Lists (No Playwright — direct API calls)

For each facility, call `POST /Api/search` with `{ FacilityId: "{id}", SurveyDocsOnly: true }`:
- Extract `documentId` and `exitDate` of the most recent survey document
- Set `last_inspection_date` from latest `exitDate`
- If no survey documents exist: `total_violations = 0`, skip Step 3

### Step 3: Extract Survey Pages via AppXtender (Playwright required)

For each facility with survey documents:
1. Launch Playwright, navigate to `TestLaunch?AppId=346&DocId={documentId}`
2. Wait for auto-redirect and session cookie establishment
3. Get page count from document metadata API
4. For each page: POST render request → poll for completion → download JPEG
5. Include retry logic (max 3 retries per page with 10s backoff)
6. Pass all page JPEGs to Claude Vision for analysis

### Step 4: Claude Vision Analysis

Send page images to Claude with system prompt:
- Extract: deficiency tags, violation descriptions, inspection date, facility census
- Determine: total violation count (count of deficiency tags beyond C 000 INITIAL COMMENTS)
- Generate: plain English AI summary
- Handle "No deficiencies were cited" documents → `total_violations = 0`

### Performance Estimates
- **Step 1:** ~1 second (single API call)
- **Step 2:** ~217 API calls at ~0.5s each = ~2 minutes
- **Step 3:** ~35 seconds per page, avg ~8 pages per doc = ~5 min per facility
  - 217 facilities x 5 min = ~18 hours total (can parallelize with 3 concurrent sessions to ~6 hours)
- **Step 4:** Claude API calls, ~10s per facility = ~36 minutes

**Total estimated runtime: ~6-7 hours** (with 3x parallelization on AppXtender)

### Optimization: Skip Facilities with "No Deficiencies" Cover Letters
If page 1 (cover letter) states "No deficiencies were cited," we can skip rendering remaining pages and set `total_violations = 0`. This could skip ~30-50% of facilities, reducing runtime significantly.

---

## Obstacles and Issues Encountered

1. **No direct PDF downloads.** AppXtender serves pages as rendered JPEGs only. No binary PDF export endpoint is accessible programmatically. This means Claude Vision is required (like DE and DC builds), not `pdftotext`.

2. **Render polling latency.** Each page takes ~30 seconds to render server-side. This is the primary bottleneck. A 115-page document would take ~67 minutes to fully render.

3. **Transient render failures.** 1 out of 8 pages failed to render (status stuck at 0). Retry logic is essential. Wait 10s and re-submit the render request.

4. **Session management.** Each Playwright session gets its own credentials and cookies. Sessions appear to be long-lived (tested over 5+ minutes). Multiple concurrent sessions should work for parallelization.

5. **NH-prefixed facilities (8 total).** These are nursing homes with ALC wings. Their portal ID starts with `NH` not `AL`. The search API should still work with the full ID (e.g., `NH240801`), but they may appear under `facilityTypeCode: "021"` (Nursing Homes) rather than `43S` (ALCs). Need to verify during implementation.

6. **CC-prefixed facilities (7 total).** Continuum of Care cross-license facilities. Same potential issue as NH — may need to search under a different facility type code. Verify during implementation.

7. **The test document had no deficiencies.** We confirmed the document structure but didn't see a filled-out Statement of Deficiencies with actual violation tags. For the enrichment build, we should test with a facility known to have violations (e.g., one with a 115-page survey document likely has many cited deficiencies).
