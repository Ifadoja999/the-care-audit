import {
  ALERT_EMAIL,
  FROM_EMAIL,
  resend
} from "./chunk-SFQ54REZ.mjs";
import {
  logAutomation
} from "./chunk-WDHVAXWT.mjs";
import {
  supabase
} from "./chunk-SZEMJ223.mjs";
import {
  task
} from "./chunk-QXSSDGE5.mjs";
import {
  __name,
  init_esm
} from "./chunk-23OQHB7B.mjs";

// src/trigger/facility-detection.ts
init_esm();
var detectFacilityChanges = task({
  id: "detect-facility-changes",
  retry: { maxAttempts: 2 },
  run: /* @__PURE__ */ __name(async (payload) => {
    const startedAt = /* @__PURE__ */ new Date();
    const { data: postRunFacilities } = await supabase.from("facilities").select("id, license_number, facility_name, city, total_violations, facility_status, last_scraped").eq("state", payload.stateCode);
    const preRunMap = new Map(
      Object.entries(payload.preRunSnapshot)
    );
    const postRunMap = new Map(
      (postRunFacilities || []).map((f) => [f.license_number, f])
    );
    const newFacilities = [];
    const missingFacilities = [];
    const violationChanges = [];
    for (const [license, facility] of postRunMap) {
      if (!preRunMap.has(license)) {
        newFacilities.push(facility);
        await supabase.from("facility_change_log").insert({
          facility_id: facility.id,
          state_code: payload.stateCode,
          change_type: "new_facility",
          new_data: facility
        });
      }
    }
    for (const [license, preData] of preRunMap) {
      const postData = postRunMap.get(license);
      if (!postData || !postData.last_scraped) {
        const { data: existing } = await supabase.from("facilities").select("id, consecutive_missing_scrapes, facility_name").eq("license_number", license).eq("state", payload.stateCode).single();
        if (existing) {
          const newCount = (existing.consecutive_missing_scrapes || 0) + 1;
          await supabase.from("facilities").update({ consecutive_missing_scrapes: newCount }).eq("id", existing.id);
          if (newCount >= 2) {
            await supabase.from("facilities").update({ facility_status: "closed" }).eq("id", existing.id);
            missingFacilities.push({
              ...existing,
              action: "marked_closed"
            });
            await supabase.from("facility_change_log").insert({
              facility_id: existing.id,
              state_code: payload.stateCode,
              change_type: "closed_facility",
              previous_data: preData,
              consecutive_missing_count: newCount
            });
          } else {
            await supabase.from("facility_change_log").insert({
              facility_id: existing.id,
              state_code: payload.stateCode,
              change_type: "missing_from_scrape",
              previous_data: preData,
              consecutive_missing_count: newCount
            });
          }
        }
      } else {
        await supabase.from("facilities").update({
          consecutive_missing_scrapes: 0,
          last_seen_in_scrape: (/* @__PURE__ */ new Date()).toISOString()
        }).eq("license_number", license).eq("state", payload.stateCode);
      }
    }
    for (const [license, postData] of postRunMap) {
      const preData = preRunMap.get(license);
      if (preData && preData.total_violations !== void 0 && postData.total_violations !== preData.total_violations) {
        violationChanges.push({
          facilityId: postData.id,
          license,
          name: postData.facility_name,
          oldViolations: preData.total_violations,
          newViolations: postData.total_violations
        });
        await supabase.from("facility_change_log").insert({
          facility_id: postData.id,
          state_code: payload.stateCode,
          change_type: "violation_change",
          previous_data: { total_violations: preData.total_violations },
          new_data: { total_violations: postData.total_violations }
        });
      }
    }
    if (newFacilities.length > 0 || missingFacilities.length > 0 || violationChanges.length > 10) {
      await resend.emails.send({
        from: FROM_EMAIL,
        to: ALERT_EMAIL,
        subject: `${payload.stateCode} Pipeline: ${newFacilities.length} new, ${missingFacilities.length} closed, ${violationChanges.length} violation changes`,
        html: buildChangeAlertEmail(
          payload.stateCode,
          newFacilities,
          missingFacilities,
          violationChanges
        )
      });
    }
    const result = {
      newFacilities: newFacilities.length,
      missingFacilities: missingFacilities.length,
      facilitiesWithChangedViolations: violationChanges.length
    };
    await logAutomation({
      taskId: `detection-${payload.stateCode}`,
      taskName: "detect-facility-changes",
      stateCode: payload.stateCode,
      status: "completed",
      result,
      startedAt
    });
    return result;
  }, "run")
});
function buildChangeAlertEmail(stateCode, newFacilities, closed, violations) {
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
__name(buildChangeAlertEmail, "buildChangeAlertEmail");

export {
  detectFacilityChanges
};
//# sourceMappingURL=chunk-LHX7A2C7.mjs.map
