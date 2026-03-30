import { task, logger } from "@trigger.dev/sdk";
import { supabase } from "../lib/supabase";
import { logAutomation } from "../lib/log";
import { getConfig } from "./configs";
import { processFacility } from "./process-facility";
import type { FacilityToEnrich, EnrichmentResult } from "./types";

/**
 * Phase 2 enrichment orchestrator — scrapes inspection report documents from
 * state portals, extracts text via Claude Vision, runs AI analysis, and writes
 * results to Supabase.
 *
 * Reusable across states — each state provides its own config in configs/.
 *
 * Supports two modes:
 * 1. Playwright mode (Oklahoma): Launches Chromium, renders pages via AppXtender.
 *    Requires Playwright installed in the container.
 * 2. PDF mode (New Mexico, future states): No Playwright. Downloads PDFs via HTTP,
 *    extracts text (pdftotext), falls back to Vision OCR (pdftoppm + Claude).
 *    Requires poppler-utils installed in the container.
 *
 * The mode is determined by config.requiresPlaywright (default: true).
 */
const BROWSER_RESTART_INTERVAL = 20; // Restart Playwright every N facilities to prevent memory leaks

// Container-safe Chrome launch args — required for Trigger.dev's Docker environment
const CHROME_LAUNCH_ARGS = [
  "--no-sandbox", // Container has no sandboxing namespace
  "--disable-dev-shm-usage", // Use /tmp instead of /dev/shm (often too small in containers)
  "--disable-gpu", // No GPU in container
  "--disable-software-rasterizer",
  "--single-process", // Reduce process count in constrained environment
];

/**
 * Launch Chromium with retry logic. Browser launch can fail transiently
 * in containerized environments (OOM killer, /dev/shm exhaustion, stale locks).
 */
async function launchBrowserWithRetry(
  chromiumModule: any,
  maxAttempts = 3
): Promise<any> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const browser = await chromiumModule.launch({
        headless: true,
        args: CHROME_LAUNCH_ARGS,
      });
      if (attempt > 1) {
        logger.info(`Browser launched successfully on attempt ${attempt}`);
      }
      return browser;
    } catch (err: any) {
      logger.warn(
        `Browser launch attempt ${attempt}/${maxAttempts} failed: ${err.message}`
      );
      if (attempt === maxAttempts) {
        throw new Error(
          `Failed to launch browser after ${maxAttempts} attempts: ${err.message}`
        );
      }
      // Wait before retrying — give the container time to reclaim resources
      await new Promise((resolve) => setTimeout(resolve, 3000 * attempt));
    }
  }
}

export const enrichState = task({
  id: "enrich-state",
  machine: "large-2x", // 8 vCPU, 16 GB RAM — safety margin for Playwright + image buffers
  maxDuration: 28800, // 8 hours (217 facilities × ~2 min avg = ~7 hours)
  retry: { maxAttempts: 1 }, // Don't retry the full orchestrator — individual facilities retry internally
  run: async (payload: {
    stateCode: string;
    testMode?: boolean;
    testLimit?: number;
  }) => {
    const { stateCode, testMode = false, testLimit = 5 } = payload;
    const startedAt = new Date();

    // Load state config
    const config = getConfig(stateCode);
    const needsPlaywright = config.requiresPlaywright !== false;

    await logAutomation({
      taskId: `enrich-${stateCode}-${startedAt.getTime()}`,
      taskName: "enrich-state",
      stateCode,
      status: "started",
      payload: { testMode, testLimit, requiresPlaywright: needsPlaywright },
      startedAt,
    });

    logger.info(
      `Starting Phase 2 enrichment for ${config.stateName} (${stateCode})`,
      { testMode, testLimit, requiresPlaywright: needsPlaywright }
    );

    // Step 1: Bulk metadata update from facilities API (if available)
    if (config.facilitiesApiUrl) {
      await updateFacilityMetadata(config);
    }

    // Step 2: Query Supabase for unenriched facilities
    const facilities = await getUnenrichedFacilities(stateCode);
    const toProcess = testMode ? facilities.slice(0, testLimit) : facilities;

    logger.info(
      `Found ${facilities.length} unenriched facilities, processing ${toProcess.length}`
    );

    if (toProcess.length === 0) {
      logger.info("No facilities to enrich");

      await logAutomation({
        taskId: `enrich-${stateCode}-${startedAt.getTime()}`,
        taskName: "enrich-state",
        stateCode,
        status: "completed",
        result: { total: 0, succeeded: 0, failed: 0, skipped: 0 },
        startedAt,
      });

      return { total: 0, succeeded: 0, failed: 0, skipped: 0 };
    }

    // Step 3: Launch Playwright browser (only if config requires it)
    let browser: any = null;
    let chromiumModule: any = null;

    if (needsPlaywright) {
      // CRITICAL: Set PLAYWRIGHT_BROWSERS_PATH BEFORE importing playwright.
      // Playwright resolves browser executable paths at module load time, not at launch().
      // Using dynamic import ensures the env var is read when the module initializes.
      process.env.PLAYWRIGHT_BROWSERS_PATH = "/app/.playwright-browsers";
      const pw = await import("playwright");
      chromiumModule = pw.chromium;
      logger.info("Launching Playwright browser", {
        browsersPath: process.env.PLAYWRIGHT_BROWSERS_PATH,
      });
      browser = await launchBrowserWithRetry(chromiumModule);
    } else {
      logger.info(
        `Skipping Playwright — ${config.stateName} uses PDF-based extraction`
      );
    }

    // Step 4: Process facilities sequentially with delay between each
    const failedFacilities: { id: string; error: string }[] = [];
    let succeeded = 0;
    let failed = 0;

    for (let i = 0; i < toProcess.length; i++) {
      const facility = toProcess[i];

      // Restart browser every N facilities to reclaim memory (Playwright only)
      if (
        needsPlaywright &&
        browser &&
        i > 0 &&
        i % BROWSER_RESTART_INTERVAL === 0
      ) {
        logger.info(
          `[${i}/${toProcess.length}] Restarting browser to reclaim memory`
        );
        try {
          await browser.close();
        } catch (err: any) {
          logger.warn(`Error closing browser during restart: ${err.message}`);
        }
        // Small delay to let the old process fully exit before launching a new one
        await new Promise((resolve) => setTimeout(resolve, 2000));
        browser = await launchBrowserWithRetry(chromiumModule);
        logger.info("Browser restarted successfully");
      }

      logger.info(
        `[${i + 1}/${toProcess.length}] Processing: ${facility.facility_name}`
      );

      try {
        const result = await processFacility(browser, config, facility);

        if (result.success) {
          succeeded++;
          logger.info(
            `[${i + 1}/${toProcess.length}] Success: ${facility.facility_name} — ${result.totalViolations} violations`
          );
        } else {
          failed++;
          failedFacilities.push({
            id: result.facilityId,
            error: result.error || "Unknown error",
          });
          logger.warn(
            `[${i + 1}/${toProcess.length}] Failed: ${facility.facility_name} — ${result.error}`
          );
        }
      } catch (err: any) {
        failed++;
        failedFacilities.push({
          id: facility.id,
          error: err.message,
        });
        logger.error(
          `[${i + 1}/${toProcess.length}] Unhandled error for ${facility.facility_name}: ${err.message}`
        );
      }

      // Delay between facilities to avoid overwhelming services
      if (i < toProcess.length - 1) {
        await new Promise((resolve) =>
          setTimeout(resolve, config.delayBetweenRequests)
        );
      }
    }

    // Step 5: Close browser (if it was launched)
    if (browser) {
      try {
        await browser.close();
        logger.info("Playwright browser closed");
      } catch (err: any) {
        logger.warn(`Error closing browser at end: ${err.message}`);
      }
    }

    // Step 6: Log results to automation_log
    const elapsed = ((Date.now() - startedAt.getTime()) / 1000).toFixed(0);

    await logAutomation({
      taskId: `enrich-${stateCode}-${startedAt.getTime()}`,
      taskName: "enrich-state",
      stateCode,
      status: "completed",
      result: {
        total: toProcess.length,
        succeeded,
        failed,
        testMode,
        requiresPlaywright: needsPlaywright,
        durationSeconds: parseInt(elapsed),
        failedFacilities,
      },
      startedAt,
    });

    logger.info(
      `Enrichment complete for ${config.stateName}: ${succeeded}/${toProcess.length} succeeded, ${failed} failed, ${elapsed}s total`
    );

    return { total: toProcess.length, succeeded, failed };
  },
});

/**
 * Query Supabase for facilities that haven't been enriched yet
 * (total_violations IS NULL or ai_summary is the placeholder).
 */
async function getUnenrichedFacilities(
  stateCode: string
): Promise<FacilityToEnrich[]> {
  const { data, error } = await supabase
    .from("facilities")
    .select("id, facility_name, license_number, facility_type, city, state")
    .eq("state", stateCode)
    .eq("facility_status", "active")
    .is("total_violations", null)
    .order("facility_name", { ascending: true });

  if (error) {
    throw new Error(`Failed to query unenriched facilities: ${error.message}`);
  }

  return data || [];
}

/**
 * Bulk update facility metadata from the portal facilities API.
 * This captures address, phone, capacity, administrator, and
 * facility-specific report URL — no Playwright needed.
 */
async function updateFacilityMetadata(config: {
  facilitiesApiUrl?: string;
  portalBaseUrl: string;
  stateCode: string;
  extractPortalId: (licenseNumber: string) => string;
}) {
  try {
    logger.info("Fetching facility metadata from portal API");

    if (!config.facilitiesApiUrl) return;
    const response = await fetch(config.facilitiesApiUrl);
    if (!response.ok) {
      logger.warn(
        `Facilities API returned ${response.status} — skipping metadata update`
      );
      return;
    }

    const data = await response.json();
    const portalFacilities = data.result || [];

    logger.info(
      `Portal API returned ${portalFacilities.length} facilities`
    );

    // Get our facilities from Supabase
    const { data: ourFacilities } = await supabase
      .from("facilities")
      .select("id, license_number")
      .eq("state", config.stateCode);

    if (!ourFacilities) return;

    // Build a lookup map: portalId → our facility
    const facilityMap = new Map<
      string,
      { id: string; license_number: string }
    >();
    for (const f of ourFacilities) {
      const portalId = config.extractPortalId(f.license_number);
      facilityMap.set(portalId, f);
    }

    // Update metadata for matching facilities
    let updated = 0;
    for (const portal of portalFacilities) {
      const match = facilityMap.get(portal.facilityId);
      if (!match) continue;

      const updates: Record<string, any> = {};

      if (portal.street) updates.address = portal.street;
      if (portal.phoneNumber) updates.phone = portal.phoneNumber;
      if (portal.licensedBed) updates.licensed_capacity = portal.licensedBed;
      if (portal.county) updates.county = portal.county;

      // Update report_url to facility-specific documents page
      updates.report_url = `${config.portalBaseUrl}/Home/FacilityDocuments/${portal.facilityId}`;

      if (Object.keys(updates).length > 0) {
        await supabase
          .from("facilities")
          .update(updates)
          .eq("id", match.id);
        updated++;
      }
    }

    logger.info(`Updated metadata for ${updated} facilities from portal API`);
  } catch (err: any) {
    logger.warn(`Metadata update failed (non-fatal): ${err.message}`);
  }
}
