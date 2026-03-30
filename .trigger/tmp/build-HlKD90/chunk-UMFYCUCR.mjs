import {
  stripe_esm_node_default
} from "./chunk-22ERR4GL.mjs";
import {
  emailQueue
} from "./chunk-O7YGMB64.mjs";
import {
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
  logger,
  task
} from "./chunk-QXSSDGE5.mjs";
import {
  __name,
  init_esm
} from "./chunk-23OQHB7B.mjs";

// src/trigger/tier-change-emails.ts
init_esm();
var stripe = new stripe_esm_node_default(process.env.STRIPE_SECRET_KEY);
var checkViolationTierChanges = task({
  id: "check-violation-tier-changes",
  queue: emailQueue,
  retry: { maxAttempts: 3 },
  run: /* @__PURE__ */ __name(async (payload) => {
    const startedAt = /* @__PURE__ */ new Date();
    const { data: sponsored } = await supabase.from("facilities").select("*").eq("state", payload.stateCode).eq("is_sponsored", true).eq("facility_status", "active");
    if (!sponsored || sponsored.length === 0) {
      return { checked: 0, changes: 0 };
    }
    let downgrades = 0;
    let upgrades = 0;
    for (const facility of sponsored) {
      const violations = facility.total_violations ?? 0;
      const tier = facility.sponsor_tier;
      if ((tier === "featured_verified" || tier === "verified_profile") && violations >= 4) {
        const email = facility.contact_email || facility.outreach_email;
        if (email) {
          await resend.emails.send({
            from: FROM_EMAIL,
            to: email,
            subject: "Important update about your listing on The Care Audit",
            html: buildDowngradeEmail(facility)
          });
        }
        await supabase.from("facility_change_log").insert({
          facility_id: facility.id,
          state_code: payload.stateCode,
          change_type: "violation_change",
          previous_data: { tier, violations: facility.total_violations },
          new_data: {
            tier: "facility_response",
            violations,
            action: "downgrade_email_sent"
          }
        });
        downgrades++;
        logger.info(`Downgrade email sent: ${facility.facility_name}`);
      }
      if (tier === "facility_response" && violations <= 3) {
        const email = facility.contact_email || facility.outreach_email;
        if (email) {
          await resend.emails.send({
            from: FROM_EMAIL,
            to: email,
            subject: "Great news — your facility now qualifies for a Featured listing",
            html: buildUpgradeEmail(facility)
          });
        }
        await supabase.from("facility_change_log").insert({
          facility_id: facility.id,
          state_code: payload.stateCode,
          change_type: "violation_change",
          previous_data: { tier, violations: facility.total_violations },
          new_data: {
            tier: "upgrade_eligible",
            violations,
            action: "upgrade_email_sent"
          }
        });
        upgrades++;
        logger.info(`Upgrade email sent: ${facility.facility_name}`);
      }
    }
    await logAutomation({
      taskId: `tier-check-${payload.stateCode}`,
      taskName: "check-violation-tier-changes",
      stateCode: payload.stateCode,
      status: "completed",
      result: {
        checked: sponsored.length,
        downgrades,
        upgrades
      },
      startedAt
    });
    return { checked: sponsored.length, downgrades, upgrades };
  }, "run")
});
function buildDowngradeEmail(facility) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <img src="https://www.thecareaudit.com/logo.png" alt="The Care Audit" style="height: 40px; margin-bottom: 24px;" />
      <h2 style="color: #1e293b;">Important update about your listing</h2>
      <p>Hi,</p>
      <p>Following the most recent state inspection data update, <strong>${facility.facility_name}</strong>
      now shows <strong>${facility.total_violations} violations</strong>.</p>
      <p>Because Featured Verified and Verified Profile listings are available only to facilities with
      3 or fewer violations, your listing will transition to <strong>Facility Response ($49/month)</strong>
      on your next billing cycle.</p>
      <p><strong>What Facility Response includes:</strong></p>
      <ul>
        <li>Post an official response on your profile (up to 1,000 characters)</li>
        <li>Update your phone number and address</li>
      </ul>
      <p>If your violation count decreases to 3 or fewer in a future inspection, you'll be eligible
      to upgrade back to Featured Verified or Verified Profile.</p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="https://billing.stripe.com/p/login/..."
           style="background: #6B7280; color: white; padding: 14px 32px; border-radius: 8px;
                  text-decoration: none; font-weight: bold; display: inline-block;">
          Manage or Cancel Subscription
        </a>
      </div>
    </div>
  `;
}
__name(buildDowngradeEmail, "buildDowngradeEmail");
function buildUpgradeEmail(facility) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <img src="https://www.thecareaudit.com/logo.png" alt="The Care Audit" style="height: 40px; margin-bottom: 24px;" />
      <h2 style="color: #2563EB;">Great news for ${facility.facility_name}!</h2>
      <p>Hi,</p>
      <p>Based on the most recent state inspection data, <strong>${facility.facility_name}</strong>
      now shows <strong>${facility.total_violations} violation${facility.total_violations !== 1 ? "s" : ""}</strong>.</p>
      <p>This means you now qualify for our premium listing options:</p>
      <ul>
        <li><strong>Featured Verified ($149/mo)</strong> — Gold badge, featured placement, photos, "Schedule a Tour" button</li>
        <li><strong>Verified Profile ($79/mo)</strong> — Verified badge, updated contact info, facility description</li>
      </ul>
      <p>Your current Facility Response subscription will continue unless you choose to upgrade.</p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="https://www.thecareaudit.com/for-facilities"
           style="background: #2563EB; color: white; padding: 14px 32px; border-radius: 8px;
                  text-decoration: none; font-weight: bold; display: inline-block;">
          View Upgrade Options
        </a>
      </div>
    </div>
  `;
}
__name(buildUpgradeEmail, "buildUpgradeEmail");

export {
  checkViolationTierChanges
};
//# sourceMappingURL=chunk-UMFYCUCR.mjs.map
