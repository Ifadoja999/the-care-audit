import { task, logger } from "@trigger.dev/sdk";
import { supabase } from "./lib/supabase";
import { resend, FROM_EMAIL, ALERT_EMAIL } from "./lib/resend";
import { logAutomation } from "./lib/log";

export const detectFacilityChanges = task({
  id: "detect-facility-changes",
  retry: { maxAttempts: 2 },
  run: async (payload: {
    stateCode: string;
    preRunSnapshot: Record<string, any>;
  }) => {
    const startedAt = new Date();

    // Get current state of facilities after pipeline run
    const { data: postRunFacilities } = await supabase
      .from("facilities")
      .select("id, license_number, facility_name, city, total_violations, facility_status, last_scraped")
      .eq("state", payload.stateCode);

    const preRunMap = new Map(
      Object.entries(payload.preRunSnapshot)
    );
    const postRunMap = new Map(
      (postRunFacilities || []).map((f) => [f.license_number, f])
    );

    const newFacilities: any[] = [];
    const missingFacilities: any[] = [];
    const violationChanges: any[] = [];

    // Detect NEW facilities (in post-run but not in pre-run)
    for (const [license, facility] of postRunMap) {
      if (!preRunMap.has(license)) {
        newFacilities.push(facility);
        await supabase.from("facility_change_log").insert({
          facility_id: facility.id,
          state_code: payload.stateCode,
          change_type: "new_facility",
          new_data: facility,
        });
      }
    }

    // Detect MISSING facilities (in pre-run but not in post-run scrape)
    for (const [license, preData] of preRunMap) {
      const postData = postRunMap.get(license);
      if (!postData || !postData.last_scraped) {
        // Facility was in our DB but not in the latest scrape
        const { data: existing } = await supabase
          .from("facilities")
          .select("id, consecutive_missing_scrapes, facility_name")
          .eq("license_number", license)
          .eq("state", payload.stateCode)
          .single();

        if (existing) {
          const newCount = (existing.consecutive_missing_scrapes || 0) + 1;

          await supabase
            .from("facilities")
            .update({ consecutive_missing_scrapes: newCount })
            .eq("id", existing.id);

          if (newCount >= 2) {
            // 2 consecutive misses → mark as closed (per CLAUDE.md rule)
            await supabase
              .from("facilities")
              .update({ facility_status: "closed" })
              .eq("id", existing.id);

            missingFacilities.push({
              ...existing,
              action: "marked_closed",
            });

            await supabase.from("facility_change_log").insert({
              facility_id: existing.id,
              state_code: payload.stateCode,
              change_type: "closed_facility",
              previous_data: preData,
              consecutive_missing_count: newCount,
            });
          } else {
            await supabase.from("facility_change_log").insert({
              facility_id: existing.id,
              state_code: payload.stateCode,
              change_type: "missing_from_scrape",
              previous_data: preData,
              consecutive_missing_count: newCount,
            });
          }
        }
      } else {
        // Reset consecutive missing count if facility was found
        await supabase
          .from("facilities")
          .update({
            consecutive_missing_scrapes: 0,
            last_seen_in_scrape: new Date().toISOString(),
          })
          .eq("license_number", license)
          .eq("state", payload.stateCode);
      }
    }

    // Detect VIOLATION CHANGES
    for (const [license, postData] of postRunMap) {
      const preData = preRunMap.get(license);
      if (
        preData &&
        preData.total_violations !== undefined &&
        postData.total_violations !== preData.total_violations
      ) {
        violationChanges.push({
          facilityId: postData.id,
          license,
          name: postData.facility_name,
          oldViolations: preData.total_violations,
          newViolations: postData.total_violations,
        });

        await supabase.from("facility_change_log").insert({
          facility_id: postData.id,
          state_code: payload.stateCode,
          change_type: "violation_change",
          previous_data: { total_violations: preData.total_violations },
          new_data: { total_violations: postData.total_violations },
        });
      }
    }

    // Send summary alert if there were any notable changes
    if (
      newFacilities.length > 0 ||
      missingFacilities.length > 0 ||
      violationChanges.length > 10
    ) {
      await resend.emails.send({
        from: FROM_EMAIL,
        to: ALERT_EMAIL,
        subject: `${payload.stateCode} Pipeline: ${newFacilities.length} new, ${missingFacilities.length} closed, ${violationChanges.length} violation changes`,
        html: buildChangeAlertEmail(
          payload.stateCode,
          newFacilities,
          missingFacilities,
          violationChanges
        ),
      });
    }

    const result = {
      newFacilities: newFacilities.length,
      missingFacilities: missingFacilities.length,
      facilitiesWithChangedViolations: violationChanges.length,
    };

    await logAutomation({
      taskId: `detection-${payload.stateCode}`,
      taskName: "detect-facility-changes",
      stateCode: payload.stateCode,
      status: "completed",
      result,
      startedAt,
    });

    return result;
  },
});

function buildChangeAlertEmail(
  stateCode: string,
  newFacilities: any[],
  closed: any[],
  violations: any[]
): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px;">
      <h2>${stateCode} Pipeline Change Report</h2>
      ${newFacilities.length > 0 ? `<h3 style="color: #16a34a;">New Facilities (${newFacilities.length})</h3>
      <ul>${newFacilities.slice(0, 10).map((f) => `<li>${f.facility_name} — ${f.city}</li>`).join("")}</ul>` : ""}
      ${closed.length > 0 ? `<h3 style="color: #dc2626;">Closed Facilities (${closed.length})</h3>
      <ul>${closed.slice(0, 10).map((f) => `<li>${f.facility_name}</li>`).join("")}</ul>` : ""}
      ${violations.length > 0 ? `<h3 style="color: #d97706;">Violation Changes (${violations.length})</h3>
      <ul>${violations.slice(0, 10).map((v) => `<li>${v.name}: ${v.oldViolations} → ${v.newViolations}</li>`).join("")}</ul>` : ""}
    </div>
  `;
}
