import { schedules, logger } from "@trigger.dev/sdk";
import { supabase } from "./lib/supabase";
import { resend, FROM_EMAIL, ALERT_EMAIL } from "./lib/resend";
import { logAutomation } from "./lib/log";

const MILESTONES = [
  { value: 5000, label: "5K" },
  { value: 20000, label: "20K" },
  { value: 50000, label: "50K" },
  { value: 100000, label: "100K" },
];

export const gscMilestoneCheck = schedules.task({
  id: "gsc-milestone-check",
  cron: "0 12 * * *", // 12:00 UTC = 7:00 AM CT
  run: async (payload) => {
    const startedAt = new Date();
    await logAutomation({
      taskId: payload.scheduleId,
      taskName: "gsc-milestone-check",
      status: "started",
      startedAt,
    });

    try {
      // 1. Authenticate with GSC API via service account
      const auth = await getGSCAccessToken();

      // 2. Query last 28 days of clicks
      const response = await fetch(
        `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(
          process.env.GSC_SITE_URL!
        )}/searchAnalytics/query`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${auth.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            startDate: getDateDaysAgo(28),
            endDate: getDateDaysAgo(1),
            dimensions: [],
          }),
        }
      );

      const data = await response.json();
      const monthlyClicks = Math.round(data.rows?.[0]?.clicks || 0);
      const monthlyImpressions = Math.round(
        data.rows?.[0]?.impressions || 0
      );

      logger.info("GSC data fetched", { monthlyClicks, monthlyImpressions });

      // 3. Check each milestone
      for (const milestone of MILESTONES) {
        if (monthlyClicks >= milestone.value) {
          // Check if already notified
          const { data: existing } = await supabase
            .from("gsc_milestones")
            .select("id")
            .eq("milestone_value", milestone.value)
            .eq("metric", "clicks")
            .eq("period", "monthly")
            .eq("notified", true)
            .single();

          if (!existing) {
            // Record milestone
            await supabase.from("gsc_milestones").upsert(
              {
                milestone_value: milestone.value,
                metric: "clicks",
                period: "monthly",
                reached_at: new Date().toISOString(),
                notified: true,
                notified_at: new Date().toISOString(),
              },
              { onConflict: "milestone_value,metric,period" }
            );

            // Send notification email
            await resend.emails.send({
              from: FROM_EMAIL,
              to: ALERT_EMAIL,
              subject: `The Care Audit hit ${milestone.label} monthly clicks!`,
              html: buildMilestoneEmail(milestone.label, monthlyClicks, monthlyImpressions),
            });

            logger.info(`Milestone reached: ${milestone.label}`, {
              clicks: monthlyClicks,
            });

            // SPECIAL: 5K milestone triggers outreach activation flag
            if (milestone.value === 5000) {
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
        startedAt,
      });

      return { monthlyClicks, monthlyImpressions };
    } catch (error: any) {
      await logAutomation({
        taskId: payload.scheduleId,
        taskName: "gsc-milestone-check",
        status: "failed",
        errorMessage: error.message,
        startedAt,
      });
      throw error;
    }
  },
});

// Helper: get GSC access token from service account JSON
async function getGSCAccessToken() {
  const serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON!);
  const jwt = await createJWT(serviceAccount);
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  return tokenResponse.json();
}

// Helper: create JWT for Google service account auth
async function createJWT(serviceAccount: any) {
  const header = Buffer.from(
    JSON.stringify({ alg: "RS256", typ: "JWT" })
  ).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  const claim = Buffer.from(
    JSON.stringify({
      iss: serviceAccount.client_email,
      scope: "https://www.googleapis.com/auth/webmasters.readonly",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    })
  ).toString("base64url");

  const { createSign } = await import("node:crypto");
  const sign = createSign("RSA-SHA256");
  sign.update(`${header}.${claim}`);
  const signature = sign.sign(serviceAccount.private_key, "base64url");

  return `${header}.${claim}.${signature}`;
}

function getDateDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split("T")[0];
}

function buildMilestoneEmail(
  label: string,
  clicks: number,
  impressions: number
): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #2563EB;">${label} Monthly Clicks!</h1>
      <p>The Care Audit has reached <strong>${clicks.toLocaleString()}</strong> monthly clicks
      and <strong>${impressions.toLocaleString()}</strong> monthly impressions in Google Search.</p>
      ${
        label === "5K"
          ? `<div style="background: #FEF3C7; border: 1px solid #F59E0B; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <strong>Outreach Activation Eligible</strong>
          <p>You can now activate facility outreach emails. Tell Claude Code: "We've hit 5K monthly visitors, turn on outreach."</p>
        </div>`
          : ""
      }
      <p style="color: #6B7280; font-size: 14px;">This is an automated notification from The Care Audit Automations.</p>
    </div>
  `;
}
