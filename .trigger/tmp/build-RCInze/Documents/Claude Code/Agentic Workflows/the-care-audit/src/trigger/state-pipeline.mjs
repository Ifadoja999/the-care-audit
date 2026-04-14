import {
  sendStateOutreach
} from "../../../../../../chunk-O6YJMHPM.mjs";
import {
  checkViolationTierChanges
} from "../../../../../../chunk-3DHDUTHD.mjs";
import {
  detectFacilityChanges
} from "../../../../../../chunk-TZSEDVCK.mjs";
import "../../../../../../chunk-M6FT73AR.mjs";
import {
  regenerateChangedSummaries
} from "../../../../../../chunk-PNA4GMLB.mjs";
import {
  pipelineQueue
} from "../../../../../../chunk-MAUVSJ26.mjs";
import "../../../../../../chunk-6KQBLFPX.mjs";
import {
  logAutomation
} from "../../../../../../chunk-OQTFKTYY.mjs";
import {
  supabase
} from "../../../../../../chunk-7DCWVU2K.mjs";
import {
  logger,
  schedules_exports,
  task,
  wait
} from "../../../../../../chunk-MMQGKQDQ.mjs";
import "../../../../../../chunk-U3REXNIV.mjs";
import {
  __name,
  init_esm
} from "../../../../../../chunk-6ULOIQV4.mjs";

// src/trigger/state-pipeline.ts
init_esm();
var runStatePipeline = task({
  id: "run-state-pipeline",
  queue: pipelineQueue,
  // Only 1 state runs at a time
  retry: { maxAttempts: 2 },
  maxDuration: 21600,
  // 6 hours max (Florida can take 4-5 hours)
  run: /* @__PURE__ */ __name(async (payload) => {
    const startedAt = /* @__PURE__ */ new Date();
    await logAutomation({
      taskId: `pipeline-${payload.stateCode}`,
      taskName: "run-state-pipeline",
      stateCode: payload.stateCode,
      status: "started",
      startedAt
    });
    logger.info(`Starting pipeline for ${payload.stateName} (${payload.stateCode})`);
    const { data: preRunFacilities } = await supabase.from("facilities").select("id, license_number, total_violations, facility_status, ai_summary").eq("state", payload.stateCode);
    const preRunMap = new Map(
      (preRunFacilities || []).map((f) => [f.license_number, f])
    );
    logger.info("Triggering n8n Navigator pipeline");
    const n8nResponse = await fetch(payload.n8nWebhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stateCode: payload.stateCode,
        triggeredBy: "trigger-dev",
        callbackUrl: `${process.env.TRIGGER_CALLBACK_URL}/api/pipeline-complete`
      })
    });
    if (!n8nResponse.ok) {
      throw new Error(
        `n8n webhook failed: ${n8nResponse.status} ${await n8nResponse.text()}`
      );
    }
    logger.info("Waiting for n8n pipeline completion...");
    const completionResult = await wait.forToken({
      token: `pipeline-complete-${payload.stateCode}-${startedAt.getTime()}`,
      timeoutInSeconds: 21600
      // 6 hour timeout
    });
    logger.info("n8n pipeline completed", { result: completionResult });
    logger.info("Running facility change detection...");
    const changes = await detectFacilityChanges.triggerAndWait({
      stateCode: payload.stateCode,
      preRunSnapshot: Object.fromEntries(preRunMap)
    });
    if (changes.ok && changes.output.facilitiesWithChangedViolations > 0) {
      logger.info("Regenerating AI summaries for changed facilities...");
      await regenerateChangedSummaries.triggerAndWait({
        stateCode: payload.stateCode
      });
    }
    logger.info("Checking violation tier changes...");
    await checkViolationTierChanges.triggerAndWait({
      stateCode: payload.stateCode,
      stateName: payload.stateName
    });
    logger.info("Running outreach check...");
    await sendStateOutreach.trigger({
      stateCode: payload.stateCode,
      stateName: payload.stateName
    });
    await supabase.from("facilities").update({ last_scraped: (/* @__PURE__ */ new Date()).toISOString() }).eq("state", payload.stateCode);
    await logAutomation({
      taskId: `pipeline-${payload.stateCode}`,
      taskName: "run-state-pipeline",
      stateCode: payload.stateCode,
      status: "completed",
      result: {
        changesDetected: changes.ok ? changes.output : null,
        duration: Date.now() - startedAt.getTime()
      },
      startedAt
    });
    return { success: true, stateCode: payload.stateCode };
  }, "run")
});
var floridaPipeline = schedules_exports.task({
  id: "pipeline-FL",
  cron: { pattern: "0 7 1 * *", timezone: "America/Chicago" },
  // 1st of month, 2:00 AM CT (7 UTC)
  run: /* @__PURE__ */ __name(async (payload) => {
    const result = await runStatePipeline.triggerAndWait({
      stateCode: "FL",
      stateName: "Florida",
      n8nWebhookUrl: process.env.N8N_PIPELINE_WEBHOOK_URL
    });
    return result.ok ? result.output : Promise.reject(result.error);
  }, "run")
});
export {
  floridaPipeline,
  runStatePipeline
};
//# sourceMappingURL=state-pipeline.mjs.map
