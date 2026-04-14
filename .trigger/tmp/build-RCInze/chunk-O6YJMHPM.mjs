import {
  emailQueue
} from "./chunk-MAUVSJ26.mjs";
import {
  FROM_EMAIL,
  resend
} from "./chunk-6KQBLFPX.mjs";
import {
  logAutomation
} from "./chunk-OQTFKTYY.mjs";
import {
  supabase
} from "./chunk-7DCWVU2K.mjs";
import {
  logger,
  schedules_exports,
  task
} from "./chunk-MMQGKQDQ.mjs";
import {
  __name,
  init_esm
} from "./chunk-6ULOIQV4.mjs";

// src/trigger/outreach-emails.ts
init_esm();
var sendStateOutreach = task({
  id: "send-state-outreach",
  queue: emailQueue,
  retry: { maxAttempts: 3 },
  run: /* @__PURE__ */ __name(async (payload) => {
    const startedAt = /* @__PURE__ */ new Date();
    logger.info(`Starting outreach for ${payload.stateName}`);
    const { data: config } = await supabase.from("automation_log").select("id").eq("task_name", "outreach-activated").eq("status", "completed").limit(1).single();
    if (!config) {
      logger.info("Outreach not yet activated — skipping");
      return { skipped: true, reason: "outreach_not_activated" };
    }
    const { data: facilities, error } = await supabase.from("facilities").select("id, facility_name, city, state, total_violations, outreach_email").eq("state", payload.stateCode).eq("facility_status", "active").not("outreach_email", "is", null).eq("outreach_sent", false).eq("outreach_opt_out", false);
    if (error) throw new Error(`Supabase query failed: ${error.message}`);
    if (!facilities || facilities.length === 0) {
      logger.info("No eligible facilities for outreach");
      return { sent: 0 };
    }
    logger.info(`Found ${facilities.length} facilities to email`);
    let sent = 0;
    let failed = 0;
    for (const facility of facilities) {
      try {
        await resend.emails.send({
          from: FROM_EMAIL,
          to: facility.outreach_email,
          subject: "Families are viewing your facility's inspection report",
          html: buildOutreachEmail(facility)
        });
        await supabase.from("facilities").update({ outreach_sent: true }).eq("id", facility.id);
        sent++;
        await new Promise((resolve) => setTimeout(resolve, 1e3));
      } catch (err) {
        logger.error(`Failed to send to ${facility.facility_name}`, {
          error: err.message
        });
        failed++;
      }
    }
    await logAutomation({
      taskId: `outreach-${payload.stateCode}`,
      taskName: "send-state-outreach",
      stateCode: payload.stateCode,
      status: "completed",
      result: { sent, failed, total: facilities.length },
      startedAt
    });
    return { sent, failed, total: facilities.length };
  }, "run")
});
var monthlyOutreachSweep = schedules_exports.task({
  id: "monthly-outreach-sweep",
  cron: "0 8 28 * *",
  // 28th of every month, 8:00 UTC = 3:00 AM CT
  run: /* @__PURE__ */ __name(async (payload) => {
    const startedAt = /* @__PURE__ */ new Date();
    const { data: config } = await supabase.from("automation_log").select("id").eq("task_name", "outreach-activated").eq("status", "completed").limit(1).single();
    if (!config) {
      return { skipped: true, reason: "outreach_not_activated" };
    }
    const { data: states } = await supabase.from("facilities").select("state").eq("facility_status", "active").not("outreach_email", "is", null).eq("outreach_sent", false).eq("outreach_opt_out", false);
    const uniqueStates = [...new Set(states?.map((s) => s.state) || [])];
    logger.info(`Monthly sweep: ${uniqueStates.length} states with unsent outreach`);
    for (const stateCode of uniqueStates) {
      await sendStateOutreach.trigger({
        stateCode,
        stateName: stateCode
      });
    }
    return { statesTriggered: uniqueStates.length };
  }, "run")
});
function buildOutreachEmail(facility) {
  const optOutUrl = `https://www.thecareaudit.com/api/outreach/opt-out?id=${facility.id}`;
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <img src="https://www.thecareaudit.com/logo.png" alt="The Care Audit" style="height: 40px; margin-bottom: 24px;" />
      <h2 style="color: #1e293b;">Families are viewing your facility's inspection report</h2>
      <p>Hi,</p>
      <p><strong>${facility.facility_name}</strong> in ${facility.city}, ${facility.state} currently shows
      <strong>${facility.total_violations ?? 0} violation${facility.total_violations !== 1 ? "s" : ""}</strong>
      on The Care Audit.</p>
      <p>Thousands of families visit The Care Audit every month to research assisted living facilities
      using state inspection data. Your facility's profile is live and publicly accessible.</p>
      <p>You can enhance your listing with verified badges, updated contact info, photos, and more.</p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="https://www.thecareaudit.com/for-facilities?facility_id=${facility.id}"
           style="background: #2563EB; color: white; padding: 14px 32px; border-radius: 8px;
                  text-decoration: none; font-weight: bold; display: inline-block;">
          View Your Options
        </a>
      </div>
      <p style="color: #6B7280; font-size: 12px;">
        You're receiving this because your facility is listed in public state licensing records.
        <a href="${optOutUrl}">Unsubscribe from future emails</a>
      </p>
    </div>
  `;
}
__name(buildOutreachEmail, "buildOutreachEmail");

export {
  sendStateOutreach,
  monthlyOutreachSweep
};
//# sourceMappingURL=chunk-O6YJMHPM.mjs.map
