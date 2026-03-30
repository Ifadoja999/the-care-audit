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
  logger,
  schedules_exports
} from "../../../../../chunk-QXSSDGE5.mjs";
import "../../../../../chunk-HPZM6FUT.mjs";
import {
  __name,
  init_esm
} from "../../../../../chunk-23OQHB7B.mjs";

// src/trigger/foia-reminders.ts
init_esm();
var foiaFollowUpCheck = schedules_exports.task({
  id: "foia-follow-up-check",
  cron: "0 13 * * *",
  // 13:00 UTC = 8:00 AM CT
  run: /* @__PURE__ */ __name(async (payload) => {
    const startedAt = /* @__PURE__ */ new Date();
    const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    const { data: dueRequests } = await supabase.from("foia_requests").select("*").in("status", ["submitted", "acknowledged", "processing"]).lte("next_follow_up_date", today);
    if (!dueRequests || dueRequests.length === 0) {
      return { reminders: 0 };
    }
    logger.info(`${dueRequests.length} FOIA follow-ups due`);
    let remindersSent = 0;
    for (const request of dueRequests) {
      await resend.emails.send({
        from: FROM_EMAIL,
        to: ALERT_EMAIL,
        subject: `FOIA Follow-Up Due: ${request.state_name} (${request.request_type})`,
        html: buildFoiaReminderEmail(request)
      });
      const followUpDates = request.follow_up_sent_dates || [];
      followUpDates.push(today);
      const nextFollowUp = /* @__PURE__ */ new Date();
      nextFollowUp.setDate(nextFollowUp.getDate() + 14);
      await supabase.from("foia_requests").update({
        follow_up_sent_dates: followUpDates,
        next_follow_up_date: nextFollowUp.toISOString().split("T")[0],
        updated_at: (/* @__PURE__ */ new Date()).toISOString()
      }).eq("id", request.id);
      remindersSent++;
    }
    const { data: overdueRequests } = await supabase.from("foia_requests").select("*").in("status", ["submitted", "acknowledged", "processing"]).not("expected_response_date", "is", null).lt("expected_response_date", today);
    if (overdueRequests && overdueRequests.length > 0) {
      await resend.emails.send({
        from: FROM_EMAIL,
        to: ALERT_EMAIL,
        subject: `${overdueRequests.length} FOIA request(s) overdue`,
        html: buildOverdueEmail(overdueRequests)
      });
    }
    await logAutomation({
      taskId: payload.scheduleId,
      taskName: "foia-follow-up-check",
      status: "completed",
      result: {
        remindersSent,
        overdueRequests: overdueRequests?.length || 0
      },
      startedAt
    });
    return {
      remindersSent,
      overdueRequests: overdueRequests?.length || 0
    };
  }, "run")
});
function buildFoiaReminderEmail(request) {
  const daysSinceSubmit = Math.floor(
    (Date.now() - new Date(request.submitted_date).getTime()) / (1e3 * 60 * 60 * 24)
  );
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px;">
      <h2 style="color: #2563EB;">FOIA Follow-Up Reminder</h2>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr><td style="padding: 4px 8px; font-weight: bold;">State:</td><td style="padding: 4px 8px;">${request.state_name} (${request.state_code})</td></tr>
        <tr><td style="padding: 4px 8px; font-weight: bold;">Request Type:</td><td style="padding: 4px 8px;">${request.request_type}</td></tr>
        <tr><td style="padding: 4px 8px; font-weight: bold;">Agency:</td><td style="padding: 4px 8px;">${request.agency_name}</td></tr>
        ${request.agency_email ? `<tr><td style="padding: 4px 8px; font-weight: bold;">Contact:</td><td style="padding: 4px 8px;"><a href="mailto:${request.agency_email}">${request.agency_email}</a></td></tr>` : ""}
        <tr><td style="padding: 4px 8px; font-weight: bold;">Submitted:</td><td style="padding: 4px 8px;">${request.submitted_date} (${daysSinceSubmit} days ago)</td></tr>
        <tr><td style="padding: 4px 8px; font-weight: bold;">Status:</td><td style="padding: 4px 8px;">${request.status}</td></tr>
        <tr><td style="padding: 4px 8px; font-weight: bold;">Previous Follow-Ups:</td><td style="padding: 4px 8px;">${(request.follow_up_sent_dates || []).length}</td></tr>
        ${request.notes ? `<tr><td style="padding: 4px 8px; font-weight: bold;">Notes:</td><td style="padding: 4px 8px;">${request.notes}</td></tr>` : ""}
      </table>
      <p><strong>Action:</strong> Follow up with ${request.agency_name} on the status of this request.</p>
    </div>
  `;
}
__name(buildFoiaReminderEmail, "buildFoiaReminderEmail");
function buildOverdueEmail(requests) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px;">
      <h2 style="color: #dc2626;">Overdue FOIA Requests</h2>
      <ul>
        ${requests.map((r) => `<li><strong>${r.state_name}</strong> (${r.request_type}) — submitted ${r.submitted_date}, expected by ${r.expected_response_date}</li>`).join("")}
      </ul>
    </div>
  `;
}
__name(buildOverdueEmail, "buildOverdueEmail");
export {
  foiaFollowUpCheck
};
//# sourceMappingURL=foia-reminders.mjs.map
