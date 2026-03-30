import { schedules, task, logger, wait } from "@trigger.dev/sdk";
import { supabase } from "./lib/supabase";
import { pipelineQueue } from "./lib/queues";
import { logAutomation } from "./lib/log";
import { sendStateOutreach } from "./outreach-emails";
import { checkViolationTierChanges } from "./tier-change-emails";
import { detectFacilityChanges } from "./facility-detection";
import { regenerateChangedSummaries } from "./ai-regeneration";

// Master orchestrator for a single state pipeline run
export const runStatePipeline = task({
  id: "run-state-pipeline",
  queue: pipelineQueue, // Only 1 state runs at a time
  retry: { maxAttempts: 2 },
  maxDuration: 21600, // 6 hours max (Florida can take 4-5 hours)
  run: async (payload: {
    stateCode: string;
    stateName: string;
    n8nWebhookUrl: string;
  }) => {
    const startedAt = new Date();

    await logAutomation({
      taskId: `pipeline-${payload.stateCode}`,
      taskName: "run-state-pipeline",
      stateCode: payload.stateCode,
      status: "started",
      startedAt,
    });

    logger.info(`Starting pipeline for ${payload.stateName} (${payload.stateCode})`);

    // STEP 1: Snapshot current facility data for change detection
    const { data: preRunFacilities } = await supabase
      .from("facilities")
      .select("id, license_number, total_violations, facility_status, ai_summary")
      .eq("state", payload.stateCode);

    const preRunMap = new Map(
      (preRunFacilities || []).map((f) => [f.license_number, f])
    );

    // STEP 2: Trigger n8n pipeline via webhook
    logger.info("Triggering n8n Navigator pipeline");
    const n8nResponse = await fetch(payload.n8nWebhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stateCode: payload.stateCode,
        triggeredBy: "trigger-dev",
        callbackUrl: `${process.env.TRIGGER_CALLBACK_URL}/api/pipeline-complete`,
      }),
    });

    if (!n8nResponse.ok) {
      throw new Error(
        `n8n webhook failed: ${n8nResponse.status} ${await n8nResponse.text()}`
      );
    }

    // STEP 3: Wait for n8n pipeline completion callback
    logger.info("Waiting for n8n pipeline completion...");
    const completionResult = await wait.forToken({
      token: `pipeline-complete-${payload.stateCode}-${startedAt.getTime()}`,
      timeoutInSeconds: 21600, // 6 hour timeout
    });

    logger.info("n8n pipeline completed", { result: completionResult });

    // STEP 4: Post-pipeline tasks (run sequentially)

    // 4a: Detect new/closed facilities
    logger.info("Running facility change detection...");
    const changes = await detectFacilityChanges.triggerAndWait({
      stateCode: payload.stateCode,
      preRunSnapshot: Object.fromEntries(preRunMap),
    });

    // 4b: Regenerate AI summaries for changed facilities
    if (changes.ok && changes.output.facilitiesWithChangedViolations > 0) {
      logger.info("Regenerating AI summaries for changed facilities...");
      await regenerateChangedSummaries.triggerAndWait({
        stateCode: payload.stateCode,
      });
    }

    // 4c: Check violation tier changes for sponsored facilities
    logger.info("Checking violation tier changes...");
    await checkViolationTierChanges.triggerAndWait({
      stateCode: payload.stateCode,
      stateName: payload.stateName,
    });

    // 4d: Run outreach for this state (if activated)
    logger.info("Running outreach check...");
    await sendStateOutreach.trigger({
      stateCode: payload.stateCode,
      stateName: payload.stateName,
    });

    // STEP 5: Update data freshness timestamp
    await supabase
      .from("facilities")
      .update({ last_scraped: new Date().toISOString() })
      .eq("state", payload.stateCode);

    await logAutomation({
      taskId: `pipeline-${payload.stateCode}`,
      taskName: "run-state-pipeline",
      stateCode: payload.stateCode,
      status: "completed",
      result: {
        changesDetected: changes.ok ? changes.output : null,
        duration: Date.now() - startedAt.getTime(),
      },
      startedAt,
    });

    return { success: true, stateCode: payload.stateCode };
  },
});

// Example declarative schedule for Florida (schedule_day: 1)
// Additional states are created imperatively via setup-state-schedules.ts
export const floridaPipeline = schedules.task({
  id: "pipeline-FL",
  cron: { pattern: "0 7 1 * *", timezone: "America/Chicago" }, // 1st of month, 2:00 AM CT (7 UTC)
  run: async (payload) => {
    const result = await runStatePipeline.triggerAndWait({
      stateCode: "FL",
      stateName: "Florida",
      n8nWebhookUrl: process.env.N8N_PIPELINE_WEBHOOK_URL!,
    });
    return result.ok ? result.output : Promise.reject(result.error);
  },
});
