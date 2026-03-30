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

// src/trigger/gsc-milestones.ts
init_esm();
var MILESTONES = [
  { value: 5e3, label: "5K" },
  { value: 2e4, label: "20K" },
  { value: 5e4, label: "50K" },
  { value: 1e5, label: "100K" }
];
var gscMilestoneCheck = schedules_exports.task({
  id: "gsc-milestone-check",
  cron: "0 12 * * *",
  // 12:00 UTC = 7:00 AM CT
  run: /* @__PURE__ */ __name(async (payload) => {
    const startedAt = /* @__PURE__ */ new Date();
    await logAutomation({
      taskId: payload.scheduleId,
      taskName: "gsc-milestone-check",
      status: "started",
      startedAt
    });
    try {
      const auth = await getGSCAccessToken();
      const response = await fetch(
        `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(
          process.env.GSC_SITE_URL
        )}/searchAnalytics/query`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${auth.access_token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            startDate: getDateDaysAgo(28),
            endDate: getDateDaysAgo(1),
            dimensions: []
          })
        }
      );
      const data = await response.json();
      const monthlyClicks = Math.round(data.rows?.[0]?.clicks || 0);
      const monthlyImpressions = Math.round(
        data.rows?.[0]?.impressions || 0
      );
      logger.info("GSC data fetched", { monthlyClicks, monthlyImpressions });
      for (const milestone of MILESTONES) {
        if (monthlyClicks >= milestone.value) {
          const { data: existing } = await supabase.from("gsc_milestones").select("id").eq("milestone_value", milestone.value).eq("metric", "clicks").eq("period", "monthly").eq("notified", true).single();
          if (!existing) {
            await supabase.from("gsc_milestones").upsert(
              {
                milestone_value: milestone.value,
                metric: "clicks",
                period: "monthly",
                reached_at: (/* @__PURE__ */ new Date()).toISOString(),
                notified: true,
                notified_at: (/* @__PURE__ */ new Date()).toISOString()
              },
              { onConflict: "milestone_value,metric,period" }
            );
            await resend.emails.send({
              from: FROM_EMAIL,
              to: ALERT_EMAIL,
              subject: `The Care Audit hit ${milestone.label} monthly clicks!`,
              html: buildMilestoneEmail(milestone.label, monthlyClicks, monthlyImpressions)
            });
            logger.info(`Milestone reached: ${milestone.label}`, {
              clicks: monthlyClicks
            });
            if (milestone.value === 5e3) {
              logger.info(
                "5K milestone reached — outreach activation eligible"
              );
            }
          }
        }
      }
      await logAutomation({
        taskId: payload.scheduleId,
        taskName: "gsc-milestone-check",
        status: "completed",
        result: { monthlyClicks, monthlyImpressions },
        startedAt
      });
      return { monthlyClicks, monthlyImpressions };
    } catch (error) {
      await logAutomation({
        taskId: payload.scheduleId,
        taskName: "gsc-milestone-check",
        status: "failed",
        errorMessage: error.message,
        startedAt
      });
      throw error;
    }
  }, "run")
});
async function getGSCAccessToken() {
  const serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  const jwt = await createJWT(serviceAccount);
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt
    })
  });
  return tokenResponse.json();
}
__name(getGSCAccessToken, "getGSCAccessToken");
async function createJWT(serviceAccount) {
  const header = Buffer.from(
    JSON.stringify({ alg: "RS256", typ: "JWT" })
  ).toString("base64url");
  const now = Math.floor(Date.now() / 1e3);
  const claim = Buffer.from(
    JSON.stringify({
      iss: serviceAccount.client_email,
      scope: "https://www.googleapis.com/auth/webmasters.readonly",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600
    })
  ).toString("base64url");
  const { createSign } = await import("node:crypto");
  const sign = createSign("RSA-SHA256");
  sign.update(`${header}.${claim}`);
  const signature = sign.sign(serviceAccount.private_key, "base64url");
  return `${header}.${claim}.${signature}`;
}
__name(createJWT, "createJWT");
function getDateDaysAgo(days) {
  const d = /* @__PURE__ */ new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split("T")[0];
}
__name(getDateDaysAgo, "getDateDaysAgo");
function buildMilestoneEmail(label, clicks, impressions) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #2563EB;">${label} Monthly Clicks!</h1>
      <p>The Care Audit has reached <strong>${clicks.toLocaleString()}</strong> monthly clicks
      and <strong>${impressions.toLocaleString()}</strong> monthly impressions in Google Search.</p>
      ${label === "5K" ? `<div style="background: #FEF3C7; border: 1px solid #F59E0B; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <strong>Outreach Activation Eligible</strong>
          <p>You can now activate facility outreach emails. Tell Claude Code: "We've hit 5K monthly visitors, turn on outreach."</p>
        </div>` : ""}
      <p style="color: #6B7280; font-size: 14px;">This is an automated notification from The Care Audit Automations.</p>
    </div>
  `;
}
__name(buildMilestoneEmail, "buildMilestoneEmail");
export {
  gscMilestoneCheck
};
//# sourceMappingURL=gsc-milestones.mjs.map
