/**
 * Verify Oklahoma enrichment results in Supabase.
 * Usage: npx tsx scripts/verify-enrichment.ts
 *
 * Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env
 */
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import { resolve } from "path";

dotenv.config({ path: resolve(__dirname, "../.env") });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function verify() {
  console.log("\n=== Oklahoma Enrichment Verification ===\n");

  // 1. Count total OK facilities
  const { count: totalOK } = await supabase
    .from("facilities")
    .select("*", { count: "exact", head: true })
    .eq("state", "OK");
  console.log(`Total OK facilities: ${totalOK}`);

  // 2. Count enriched facilities (total_violations NOT NULL)
  const { count: enrichedCount } = await supabase
    .from("facilities")
    .select("*", { count: "exact", head: true })
    .eq("state", "OK")
    .not("total_violations", "is", null);
  console.log(`Enriched (total_violations NOT NULL): ${enrichedCount}`);

  // 3. Count facilities with ai_summary
  const { count: summaryCount } = await supabase
    .from("facilities")
    .select("*", { count: "exact", head: true })
    .eq("state", "OK")
    .not("ai_summary", "is", null);
  console.log(`With AI summary: ${summaryCount}`);

  // 4. Count violations
  const { data: violationFacilities } = await supabase
    .from("violations")
    .select("facility_id")
    .in(
      "facility_id",
      (
        await supabase.from("facilities").select("id").eq("state", "OK")
      ).data?.map((f: any) => f.id) || []
    );

  const uniqueViolationFacilities = new Set(
    violationFacilities?.map((v: any) => v.facility_id)
  );
  console.log(
    `Violations rows: ${violationFacilities?.length || 0} across ${uniqueViolationFacilities.size} facilities`
  );

  // 5. Show enriched facilities detail
  const { data: enriched } = await supabase
    .from("facilities")
    .select(
      "facility_name, license_number, total_violations, ai_summary, last_inspection_date, report_url, last_scraped"
    )
    .eq("state", "OK")
    .not("total_violations", "is", null)
    .order("last_scraped", { ascending: false })
    .limit(10);

  if (enriched && enriched.length > 0) {
    console.log("\n--- Enriched Facilities ---\n");
    for (const f of enriched) {
      console.log(`📋 ${f.facility_name} (${f.license_number})`);
      console.log(`   Violations: ${f.total_violations}`);
      console.log(
        `   Last Inspection: ${f.last_inspection_date || "N/A"}`
      );
      console.log(`   Report URL: ${f.report_url || "N/A"}`);
      console.log(
        `   AI Summary: ${f.ai_summary?.substring(0, 150)}${(f.ai_summary?.length || 0) > 150 ? "..." : ""}`
      );
      console.log(`   Last Scraped: ${f.last_scraped}`);
      console.log();
    }
  } else {
    console.log("\n⚠️  No enriched OK facilities found yet.");
    console.log(
      "   If the test was just triggered, wait ~25-35 minutes for it to complete."
    );
  }

  // 6. Check change log
  const { data: changeLogs } = await supabase
    .from("facility_change_log")
    .select("*")
    .eq("state_code", "OK")
    .order("detected_at", { ascending: false })
    .limit(5);

  if (changeLogs && changeLogs.length > 0) {
    console.log("--- Recent Change Logs ---\n");
    for (const log of changeLogs) {
      console.log(
        `  ${log.change_type}: facility ${log.facility_id} at ${log.detected_at}`
      );
      console.log(`  Data: ${JSON.stringify(log.new_value)}`);
    }
  }

  // 7. Check automation log
  const { data: autoLogs } = await supabase
    .from("automation_log")
    .select("*")
    .eq("task_name", "enrich-state")
    .order("created_at", { ascending: false })
    .limit(3);

  if (autoLogs && autoLogs.length > 0) {
    console.log("\n--- Automation Logs ---\n");
    for (const log of autoLogs) {
      console.log(
        `  ${log.status}: ${log.task_id} (${log.duration_ms ? log.duration_ms / 1000 + "s" : "in progress"})`
      );
      console.log(`  Result: ${JSON.stringify(log.result)}`);
    }
  }
}

verify().catch(console.error);
