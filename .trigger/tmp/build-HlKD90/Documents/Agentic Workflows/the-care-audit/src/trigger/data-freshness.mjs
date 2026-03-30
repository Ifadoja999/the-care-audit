import {
  ALERT_EMAIL,
  FROM_EMAIL,
  resend
} from "../../../../../chunk-SFQ54REZ.mjs";
import {
  logAutomation
} from "../../../../../chunk-WDHVAXWT.mjs";
import {
  supabase
} from "../../../../../chunk-SZEMJ223.mjs";
import {
  schedules_exports
} from "../../../../../chunk-QXSSDGE5.mjs";
import "../../../../../chunk-HPZM6FUT.mjs";
import {
  __name,
  init_esm
} from "../../../../../chunk-23OQHB7B.mjs";

// src/trigger/data-freshness.ts
init_esm();
var dataFreshnessCheck = schedules_exports.task({
  id: "data-freshness-check",
  cron: "0 14 * * *",
  // 14:00 UTC = 9:00 AM CT
  run: /* @__PURE__ */ __name(async (payload) => {
    const startedAt = /* @__PURE__ */ new Date();
    const today = /* @__PURE__ */ new Date();
    const currentDayOfMonth = today.getDate();
    const { data: states } = await supabase.from("facilities").select("state, last_scraped").not("last_scraped", "is", null).order("last_scraped", { ascending: false });
    const stateLastScraped = /* @__PURE__ */ new Map();
    for (const row of states || []) {
      if (!stateLastScraped.has(row.state)) {
        stateLastScraped.set(row.state, new Date(row.last_scraped));
      }
    }
    const staleStates = [];
    for (const [stateCode, lastScraped] of stateLastScraped) {
      const daysSinceUpdate = Math.floor(
        (today.getTime() - lastScraped.getTime()) / (1e3 * 60 * 60 * 24)
      );
      if (daysSinceUpdate > 35) {
        staleStates.push({ stateCode, lastScraped, daysSinceUpdate });
      }
    }
    if (staleStates.length > 0) {
      await resend.emails.send({
        from: FROM_EMAIL,
        to: ALERT_EMAIL,
        subject: `${staleStates.length} state(s) have stale data`,
        html: buildFreshnessEmail(staleStates)
      });
    }
    await logAutomation({
      taskId: payload.scheduleId,
      taskName: "data-freshness-check",
      status: "completed",
      result: {
        statesChecked: stateLastScraped.size,
        staleStates: staleStates.length,
        staleList: staleStates.map((s) => s.stateCode)
      },
      startedAt
    });
    return {
      statesChecked: stateLastScraped.size,
      staleStates: staleStates.length
    };
  }, "run")
});
function buildFreshnessEmail(staleStates) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px;">
      <h2 style="color: #d97706;">Stale Data Alert</h2>
      <p>The following states haven't been updated in over 35 days:</p>
      <table style="width: 100%; border-collapse: collapse;">
        <tr style="background: #f1f5f9;">
          <th style="padding: 8px; text-align: left;">State</th>
          <th style="padding: 8px; text-align: left;">Last Updated</th>
          <th style="padding: 8px; text-align: left;">Days Stale</th>
        </tr>
        ${staleStates.map((s) => `
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 8px;">${s.stateCode}</td>
            <td style="padding: 8px;">${s.lastScraped.toLocaleDateString()}</td>
            <td style="padding: 8px; color: #dc2626; font-weight: bold;">${s.daysSinceUpdate} days</td>
          </tr>
        `).join("")}
      </table>
      <p>Check the automation_log table and Trigger.dev dashboard for failed pipeline runs.</p>
    </div>
  `;
}
__name(buildFreshnessEmail, "buildFreshnessEmail");
export {
  dataFreshnessCheck
};
//# sourceMappingURL=data-freshness.mjs.map
