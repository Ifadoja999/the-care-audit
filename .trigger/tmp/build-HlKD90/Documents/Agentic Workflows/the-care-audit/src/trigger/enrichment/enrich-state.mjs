import {
  processFacility
} from "../../../../../../chunk-5JBXC5EI.mjs";
import "../../../../../../chunk-WZCL4N2S.mjs";
import "../../../../../../chunk-GR7XD2GG.mjs";
import "../../../../../../chunk-HIBSMY6H.mjs";
import {
  logAutomation
} from "../../../../../../chunk-WDHVAXWT.mjs";
import {
  supabase
} from "../../../../../../chunk-SZEMJ223.mjs";
import {
  logger,
  task
} from "../../../../../../chunk-QXSSDGE5.mjs";
import "../../../../../../chunk-HPZM6FUT.mjs";
import {
  getConfig
} from "../../../../../../chunk-QUUWQKZD.mjs";
import "../../../../../../chunk-O5WRJBH5.mjs";
import {
  __name,
  init_esm
} from "../../../../../../chunk-23OQHB7B.mjs";

// src/trigger/enrichment/enrich-state.ts
init_esm();
import { chromium } from "playwright";
var enrichState = task({
  id: "enrich-state",
  maxDuration: 28800,
  // 8 hours (217 facilities × ~2 min avg = ~7 hours)
  retry: { maxAttempts: 1 },
  // Don't retry the full orchestrator — individual facilities retry internally
  run: /* @__PURE__ */ __name(async (payload) => {
    const { stateCode, testMode = false, testLimit = 5 } = payload;
    const startedAt = /* @__PURE__ */ new Date();
    const config = getConfig(stateCode);
    await logAutomation({
      taskId: `enrich-${stateCode}-${startedAt.getTime()}`,
      taskName: "enrich-state",
      stateCode,
      status: "started",
      payload: { testMode, testLimit },
      startedAt
    });
    logger.info(
      `Starting Phase 2 enrichment for ${config.stateName} (${stateCode})`,
      { testMode, testLimit }
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
    logger.info("Launching Playwright browser");
    const browser = await chromium.launch({ headless: true });
    const results = [];
    let succeeded = 0;
    let failed = 0;
    for (let i = 0; i < toProcess.length; i++) {
      const facility = toProcess[i];
      logger.info(
        `[${i + 1}/${toProcess.length}] Processing: ${facility.facility_name}`
      );
      try {
        const result = await processFacility(browser, config, facility);
        results.push(result);
        if (result.success) {
          succeeded++;
          logger.info(
            `[${i + 1}/${toProcess.length}] Success: ${facility.facility_name} — ${result.totalViolations} violations`
          );
        } else {
          failed++;
          logger.warn(
            `[${i + 1}/${toProcess.length}] Failed: ${facility.facility_name} — ${result.error}`
          );
        }
      } catch (err) {
        failed++;
        results.push({
          facilityId: facility.id,
          success: false,
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
    await browser.close();
    logger.info("Playwright browser closed");
    const elapsed = ((Date.now() - startedAt.getTime()) / 1e3).toFixed(0);
    await logAutomation({
      taskId: `enrich-${stateCode}-${startedAt.getTime()}`,
      taskName: "enrich-state",
      stateCode,
      status: failed === 0 ? "completed" : "completed",
      result: {
        total: toProcess.length,
        succeeded,
        failed,
        testMode,
        durationSeconds: parseInt(elapsed),
        failedFacilities: results.filter((r) => !r.success).map((r) => ({ id: r.facilityId, error: r.error }))
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
