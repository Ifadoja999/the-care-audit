import { schedules } from "@trigger.dev/sdk";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Run this once to create all state schedules, and again when adding new states
// Usage: npx tsx src/trigger/setup-state-schedules.ts
export async function setupStateSchedules() {
  const configPath = resolve(process.cwd(), "state_config.json");
  const stateConfig = JSON.parse(readFileSync(configPath, "utf-8"));

  for (const [stateCode, config] of Object.entries(stateConfig)) {
    const { stateName, schedule_day, schedule_time } = config as any;
    const [hour, minute] = (schedule_time || "02:00").split(":");

    // Convert local time to UTC (CT is UTC-6, so add 6 hours)
    // Note: this doesn't account for DST — use timezone parameter instead
    const cronPattern = `${minute} ${parseInt(hour) + 5} ${schedule_day} * *`;

    await schedules.create({
      task: "run-state-pipeline",
      cron: cronPattern,
      timezone: "America/Chicago",
      externalId: stateCode,
      deduplicationKey: `pipeline-${stateCode}`,
    });

    console.log(
      `Created schedule for ${stateName} (${stateCode}): day ${schedule_day} at ${schedule_time} CT`
    );
  }
}
