import { schedules, logger } from "@trigger.dev/sdk";
import { supabase } from "./lib/supabase";
import { resend, FROM_EMAIL, ALERT_EMAIL } from "./lib/resend";
import { logAutomation } from "./lib/log";

// How many days past a state's schedule_day before we alert
const STALENESS_THRESHOLD_DAYS = 5;

export const dataFreshnessCheck = schedules.task({
  id: "data-freshness-check",
  cron: "0 14 * * *", // 14:00 UTC = 9:00 AM CT
  run: async (payload) => {
    const startedAt = new Date();
    const today = new Date();
    const currentDayOfMonth = today.getDate();

    // Get the most recent last_scraped per state
    const { data: states } = await supabase
      .from("facilities")
      .select("state, last_scraped")
      .not("last_scraped", "is", null)
      .order("last_scraped", { ascending: false });

    // Group by state, get most recent scrape date
    const stateLastScraped = new Map<string, Date>();
    for (const row of states || []) {
      if (!stateLastScraped.has(row.state)) {
        stateLastScraped.set(row.state, new Date(row.last_scraped));
      }
    }

    const staleStates: Array<{
      stateCode: string;
      lastScraped: Date;
      daysSinceUpdate: number;
    }> = [];

    for (const [stateCode, lastScraped] of stateLastScraped) {
      const daysSinceUpdate = Math.floor(
        (today.getTime() - lastScraped.getTime()) / (1000 * 60 * 60 * 24)
      );

      // If data is older than 35 days (more than a month), it's stale
      if (daysSinceUpdate > 35) {
        staleStates.push({ stateCode, lastScraped, daysSinceUpdate });
      }
    }

    if (staleStates.length > 0) {
      await resend.emails.send({
        from: FROM_EMAIL,
        to: ALERT_EMAIL,
        subject: `${staleStates.length} state(s) have stale data`,
        html: buildFreshnessEmail(staleStates),
      });
    }

    await logAutomation({
      taskId: payload.scheduleId,
      taskName: "data-freshness-check",
      status: "completed",
      result: {
        statesChecked: stateLastScraped.size,
        staleStates: staleStates.length,
        staleList: staleStates.map((s) => s.stateCode),
      },
      startedAt,
    });

    return {
      statesChecked: stateLastScraped.size,
      staleStates: staleStates.length,
    };
  },
});

function buildFreshnessEmail(staleStates: any[]): string {
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
