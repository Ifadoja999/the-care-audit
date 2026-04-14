import {
  processFacility
} from "../../../../../../../chunk-XD7FIMN6.mjs";
import {
  getConfig
} from "../../../../../../../chunk-4Z5OKQ4Q.mjs";
import "../../../../../../../chunk-H2RPEXXM.mjs";
import "../../../../../../../chunk-HWSW4H4Y.mjs";
import "../../../../../../../chunk-PZSGO2QD.mjs";
import "../../../../../../../chunk-OXP4VPR4.mjs";
import {
  logAutomation
} from "../../../../../../../chunk-OQTFKTYY.mjs";
import {
  supabase
} from "../../../../../../../chunk-7DCWVU2K.mjs";
import "../../../../../../../chunk-BKZWUYMV.mjs";
import "../../../../../../../chunk-QOP3X44L.mjs";
import "../../../../../../../chunk-UTO7WHP6.mjs";
import {
  logger,
  task
} from "../../../../../../../chunk-MMQGKQDQ.mjs";
import "../../../../../../../chunk-U3REXNIV.mjs";
import {
  __name,
  init_esm
} from "../../../../../../../chunk-6ULOIQV4.mjs";

// src/trigger/enrichment/enrich-state.ts
init_esm();
var BROWSER_RESTART_INTERVAL = 20;
var CHROME_LAUNCH_ARGS = [
  "--no-sandbox",
  // Container has no sandboxing namespace
  "--disable-dev-shm-usage",
  // Use /tmp instead of /dev/shm (often too small in containers)
  "--disable-gpu",
  // No GPU in container
  "--disable-software-rasterizer",
  "--single-process"
  // Reduce process count in constrained environment
];
async function launchBrowserWithRetry(chromiumModule, maxAttempts = 3) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const browser = await chromiumModule.launch({
        headless: true,
        args: CHROME_LAUNCH_ARGS
      });
      if (attempt > 1) {
        logger.info(`Browser launched successfully on attempt ${attempt}`);
      }
      return browser;
    } catch (err) {
      logger.warn(
        `Browser launch attempt ${attempt}/${maxAttempts} failed: ${err.message}`
      );
      if (attempt === maxAttempts) {
        throw new Error(
          `Failed to launch browser after ${maxAttempts} attempts: ${err.message}`
        );
      }
      await new Promise((resolve) => setTimeout(resolve, 3e3 * attempt));
    }
  }
}
__name(launchBrowserWithRetry, "launchBrowserWithRetry");
var enrichState = task({
  id: "enrich-state",
  machine: "large-2x",
  // 8 vCPU, 16 GB RAM — safety margin for Playwright + image buffers
  maxDuration: 28800,
  // 8 hours (217 facilities × ~2 min avg = ~7 hours)
  retry: { maxAttempts: 1 },
  // Don't retry the full orchestrator — individual facilities retry internally
  run: /* @__PURE__ */ __name(async (payload) => {
    const { stateCode, testMode = false, testLimit = 5 } = payload;
    const startedAt = /* @__PURE__ */ new Date();
    const config = getConfig(stateCode);
    const needsPlaywright = config.requiresPlaywright !== false;
    await logAutomation({
      taskId: `enrich-${stateCode}-${startedAt.getTime()}`,
      taskName: "enrich-state",
      stateCode,
      status: "started",
      payload: { testMode, testLimit, requiresPlaywright: needsPlaywright },
      startedAt
    });
    logger.info(
      `Starting Phase 2 enrichment for ${config.stateName} (${stateCode})`,
      { testMode, testLimit, requiresPlaywright: needsPlaywright }
    );
    if (config.facilitiesApiUrl) {
      await updateFacilityMetadata(config);
    }
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
        startedAt
      });
      return { total: 0, succeeded: 0, failed: 0, skipped: 0 };
    }
    let browser = null;
    let chromiumModule = null;
    if (needsPlaywright) {
      process.env.PLAYWRIGHT_BROWSERS_PATH = "/app/.playwright-browsers";
      const pw = await import("playwright");
      chromiumModule = pw.chromium;
      logger.info("Launching Playwright browser", {
        browsersPath: process.env.PLAYWRIGHT_BROWSERS_PATH
      });
      browser = await launchBrowserWithRetry(chromiumModule);
    } else {
      logger.info(
        `Skipping Playwright — ${config.stateName} uses PDF-based extraction`
      );
    }
    const failedFacilities = [];
    let succeeded = 0;
    let failed = 0;
    for (let i = 0; i < toProcess.length; i++) {
      const facility = toProcess[i];
      if (needsPlaywright && browser && i > 0 && i % BROWSER_RESTART_INTERVAL === 0) {
        logger.info(
          `[${i}/${toProcess.length}] Restarting browser to reclaim memory`
        );
        try {
          await browser.close();
        } catch (err) {
          logger.warn(`Error closing browser during restart: ${err.message}`);
        }
        await new Promise((resolve) => setTimeout(resolve, 2e3));
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
            error: result.error || "Unknown error"
          });
          logger.warn(
            `[${i + 1}/${toProcess.length}] Failed: ${facility.facility_name} — ${result.error}`
          );
        }
      } catch (err) {
        failed++;
        failedFacilities.push({
          id: facility.id,
          error: err.message
        });
        logger.error(
          `[${i + 1}/${toProcess.length}] Unhandled error for ${facility.facility_name}: ${err.message}`
        );
      }
      if (i < toProcess.length - 1) {
        await new Promise(
          (resolve) => setTimeout(resolve, config.delayBetweenRequests)
        );
      }
    }
    if (browser) {
      try {
        await browser.close();
        logger.info("Playwright browser closed");
      } catch (err) {
        logger.warn(`Error closing browser at end: ${err.message}`);
      }
    }
    const elapsed = ((Date.now() - startedAt.getTime()) / 1e3).toFixed(0);
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
        failedFacilities
      },
      startedAt
    });
    logger.info(
      `Enrichment complete for ${config.stateName}: ${succeeded}/${toProcess.length} succeeded, ${failed} failed, ${elapsed}s total`
    );
    return { total: toProcess.length, succeeded, failed };
  }, "run")
});
async function getUnenrichedFacilities(stateCode) {
  const { data, error } = await supabase.from("facilities").select("id, facility_name, license_number, facility_type, city, state").eq("state", stateCode).eq("facility_status", "active").is("total_violations", null).order("facility_name", { ascending: true });
  if (error) {
    throw new Error(`Failed to query unenriched facilities: ${error.message}`);
  }
  return data || [];
}
__name(getUnenrichedFacilities, "getUnenrichedFacilities");
async function updateFacilityMetadata(config) {
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
    const { data: ourFacilities } = await supabase.from("facilities").select("id, license_number").eq("state", config.stateCode);
    if (!ourFacilities) return;
    const facilityMap = /* @__PURE__ */ new Map();
    for (const f of ourFacilities) {
      const portalId = config.extractPortalId(f.license_number);
      facilityMap.set(portalId, f);
    }
    let updated = 0;
    for (const portal of portalFacilities) {
      const match = facilityMap.get(portal.facilityId);
      if (!match) continue;
      const updates = {};
      if (portal.street) updates.address = portal.street;
      if (portal.phoneNumber) updates.phone = portal.phoneNumber;
      if (portal.licensedBed) updates.licensed_capacity = portal.licensedBed;
      if (portal.county) updates.county = portal.county;
      updates.report_url = `${config.portalBaseUrl}/Home/FacilityDocuments/${portal.facilityId}`;
      if (Object.keys(updates).length > 0) {
        await supabase.from("facilities").update(updates).eq("id", match.id);
        updated++;
      }
    }
    logger.info(`Updated metadata for ${updated} facilities from portal API`);
  } catch (err) {
    logger.warn(`Metadata update failed (non-fatal): ${err.message}`);
  }
}
__name(updateFacilityMetadata, "updateFacilityMetadata");
export {
  enrichState
};
//# sourceMappingURL=enrich-state.mjs.map
