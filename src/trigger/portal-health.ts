import { schedules, task, logger } from "@trigger.dev/sdk";
import { supabase } from "./lib/supabase";
import { resend, FROM_EMAIL, ALERT_EMAIL } from "./lib/resend";
import { healthCheckQueue } from "./lib/queues";
import { logAutomation } from "./lib/log";
import { createHash } from "node:crypto";

// Get portal URLs from state_config or a dedicated portal registry
// In production, this reads from state_config.json or Supabase
const STATE_PORTALS: Array<{
  stateCode: string;
  stateName: string;
  url: string;
  portalType: "registry" | "inspection" | "profile";
}> = []; // Populated from state_config.json at runtime

export const dailyPortalHealthCheck = schedules.task({
  id: "daily-portal-health-check",
  cron: "0 11 * * *", // 11:00 UTC = 6:00 AM CT
  run: async (payload) => {
    const startedAt = new Date();

    // Load portal URLs from state_config.json (stored in Supabase or file)
    const portals = await loadPortalUrls();

    const results: any[] = [];
    const alerts: any[] = [];

    for (const portal of portals) {
      const result = await checkSinglePortal.triggerAndWait(portal);
      if (result.ok) {
        results.push(result.output);
        if (result.output.status !== "up") {
          alerts.push(result.output);
        }
      }
    }

    // Send alert email if any portals are down or changed
    if (alerts.length > 0) {
      await resend.emails.send({
        from: FROM_EMAIL,
        to: ALERT_EMAIL,
        subject: `${alerts.length} state portal(s) reporting issues`,
        html: buildPortalAlertEmail(alerts),
      });
    }

    await logAutomation({
      taskId: payload.scheduleId,
      taskName: "daily-portal-health-check",
      status: "completed",
      result: {
        checked: results.length,
        up: results.filter((r) => r.status === "up").length,
        down: results.filter((r) => r.status === "down").length,
        degraded: results.filter((r) => r.status === "degraded").length,
        changed: results.filter((r) => r.status === "changed").length,
      },
      startedAt,
    });

    return { checked: results.length, alerts: alerts.length };
  },
});

export const checkSinglePortal = task({
  id: "check-single-portal",
  queue: healthCheckQueue,
  retry: { maxAttempts: 2 },
  run: async (payload: {
    stateCode: string;
    stateName: string;
    url: string;
    portalType: "registry" | "inspection" | "profile";
  }) => {
    const startTime = Date.now();

    try {
      const response = await fetch(payload.url, {
        method: "GET",
        headers: { "User-Agent": "TheCareAudit-HealthCheck/1.0" },
        signal: AbortSignal.timeout(30000), // 30 second timeout
      });

      const responseTime = Date.now() - startTime;
      const body = await response.text();
      const contentHash = createHash("md5").update(body).digest("hex");

      // Check for previous hash to detect structural changes
      const { data: lastCheck } = await supabase
        .from("portal_health")
        .select("content_hash")
        .eq("state_code", payload.stateCode)
        .eq("portal_type", payload.portalType)
        .order("checked_at", { ascending: false })
        .limit(1)
        .single();

      let status: "up" | "down" | "degraded" | "changed" = "up";

      if (!response.ok) {
        status = "down";
      } else if (responseTime > 15000) {
        status = "degraded";
      } else if (lastCheck && lastCheck.content_hash !== contentHash) {
        status = "changed";
      }

      const record = {
        state_code: payload.stateCode,
        portal_url: payload.url,
        portal_type: payload.portalType,
        status,
        http_status: response.status,
        response_time_ms: responseTime,
        content_hash: contentHash,
      };

      await supabase.from("portal_health").insert(record);

      return record;
    } catch (error: any) {
      const record = {
        state_code: payload.stateCode,
        portal_url: payload.url,
        portal_type: payload.portalType,
        status: "down" as const,
        http_status: null,
        response_time_ms: Date.now() - startTime,
        error_message: error.message,
        content_hash: null,
      };

      await supabase.from("portal_health").insert(record);
      return record;
    }
  },
});

async function loadPortalUrls() {
  // In production, this reads from state_config.json
  // Each state has registryUrl, inspectionPortalUrl, profileUrlBase
  // Return array of portal check configs
  return STATE_PORTALS;
}

function buildPortalAlertEmail(alerts: any[]): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px;">
      <h2 style="color: #dc2626;">State Portal Health Issues</h2>
      <table style="width: 100%; border-collapse: collapse;">
        <tr style="background: #f1f5f9;">
          <th style="padding: 8px; text-align: left;">State</th>
          <th style="padding: 8px; text-align: left;">Portal</th>
          <th style="padding: 8px; text-align: left;">Status</th>
          <th style="padding: 8px; text-align: left;">HTTP</th>
        </tr>
        ${alerts.map((a) => `
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 8px;">${a.state_code}</td>
            <td style="padding: 8px;">${a.portal_type}</td>
            <td style="padding: 8px; color: ${a.status === "down" ? "#dc2626" : "#d97706"};">${a.status.toUpperCase()}</td>
            <td style="padding: 8px;">${a.http_status || "N/A"}</td>
          </tr>
        `).join("")}
      </table>
      <p style="margin-top: 16px;">Review these before the next scheduled pipeline runs.
      A portal marked "changed" may indicate structural changes that require scraper updates.</p>
    </div>
  `;
}
