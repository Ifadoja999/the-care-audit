import {
  stripe_esm_node_default
} from "../../../../../../chunk-M6FT73AR.mjs";
import {
  emailQueue
} from "../../../../../../chunk-MAUVSJ26.mjs";
import {
  FROM_EMAIL,
  resend
} from "../../../../../../chunk-6KQBLFPX.mjs";
import {
  logAutomation
} from "../../../../../../chunk-OQTFKTYY.mjs";
import {
  supabase
} from "../../../../../../chunk-7DCWVU2K.mjs";
import {
  logger,
  schedules_exports
} from "../../../../../../chunk-MMQGKQDQ.mjs";
import "../../../../../../chunk-U3REXNIV.mjs";
import {
  __name,
  init_esm
} from "../../../../../../chunk-6ULOIQV4.mjs";

// src/trigger/grandfathered-drip.ts
init_esm();
var _stripe = null;
function getStripe() {
  if (!_stripe) _stripe = new stripe_esm_node_default(process.env.STRIPE_SECRET_KEY);
  return _stripe;
}
__name(getStripe, "getStripe");
var grandfatheredDripCheck = schedules_exports.task({
  id: "grandfathered-drip-check",
  cron: "0 13 * * *",
  // 13:00 UTC = 8:00 AM CT
  queue: emailQueue,
  run: /* @__PURE__ */ __name(async (payload) => {
    const startedAt = /* @__PURE__ */ new Date();
    const today = /* @__PURE__ */ new Date();
    const { data: records } = await supabase.from("price_change_tracking").select("*, facilities(facility_name, contact_email, outreach_email, sponsor_tier)").eq("migrated", false);
    if (!records || records.length === 0) {
      return { processed: 0, reason: "no_grandfathered_subscribers" };
    }
    let emailsSent = 0;
    let migrated = 0;
    for (const record of records) {
      const expiresDate = new Date(record.grandfathered_expires);
      const daysUntilExpiry = Math.ceil(
        (expiresDate.getTime() - today.getTime()) / (1e3 * 60 * 60 * 24)
      );
      const email = record.facilities?.contact_email || record.facilities?.outreach_email;
      if (!email) continue;
      const drips = [
        { days: 60, field: "drip_60_sent", sentField: "drip_60_sent_at" },
        { days: 30, field: "drip_30_sent", sentField: "drip_30_sent_at" },
        { days: 14, field: "drip_14_sent", sentField: "drip_14_sent_at" },
        { days: 3, field: "drip_3_sent", sentField: "drip_3_sent_at" }
      ];
      for (const drip of drips) {
        if (daysUntilExpiry <= drip.days && !record[drip.field]) {
          try {
            await resend.emails.send({
              from: FROM_EMAIL,
              to: email,
              subject: drip.days === 3 ? "Your grandfathered rate expires in 3 days" : `Your grandfathered rate expires ${drip.days === 60 ? "in 2 months" : drip.days === 30 ? "next month" : "in 2 weeks"}`,
              html: buildDripEmail(record, drip.days)
            });
            await supabase.from("price_change_tracking").update({
              [drip.field]: true,
              [drip.sentField]: (/* @__PURE__ */ new Date()).toISOString()
            }).eq("id", record.id);
            emailsSent++;
          } catch (err) {
            logger.error(`Failed to send drip email`, {
              facilityId: record.facility_id,
              dripDays: drip.days,
              error: err.message
            });
          }
        }
      }
      if (daysUntilExpiry <= 0 && !record.migrated) {
        try {
          if (record.stripe_subscription_id && record.stripe_subscription_id !== "pending_lookup") {
            const stripe = getStripe();
            const subscription = await stripe.subscriptions.retrieve(
              record.stripe_subscription_id
            );
            const itemId = subscription.items.data[0]?.id;
            if (itemId) {
              await stripe.subscriptions.update(record.stripe_subscription_id, {
                items: [{ id: itemId, price: record.new_price_id }],
                proration_behavior: "none"
              });
            }
          }
          await supabase.from("price_change_tracking").update({
            migrated: true,
            migrated_at: (/* @__PURE__ */ new Date()).toISOString()
          }).eq("id", record.id);
          migrated++;
          logger.info(`Migrated subscription for facility ${record.facility_id}`);
        } catch (err) {
          logger.error(`Failed to migrate subscription`, {
            facilityId: record.facility_id,
            error: err.message
          });
        }
      }
    }
    await logAutomation({
      taskId: payload.scheduleId,
      taskName: "grandfathered-drip-check",
      status: "completed",
      result: { emailsSent, migrated, total: records.length },
      startedAt
    });
    return { emailsSent, migrated, total: records.length };
  }, "run")
});
function buildDripEmail(record, daysUntilExpiry) {
  const facilityName = record.facilities?.facility_name || "your facility";
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <img src="https://www.thecareaudit.com/logo.png" alt="The Care Audit" style="height: 40px; margin-bottom: 24px;" />
      <h2 style="color: #1e293b;">Your grandfathered rate ${daysUntilExpiry <= 3 ? "expires in 3 days" : "is expiring soon"}</h2>
      <p>Hi,</p>
      <p>Your grandfathered rate for <strong>${facilityName}</strong> on The Care Audit expires on
      <strong>${new Date(record.grandfathered_expires).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</strong>.</p>
      <p>After this date, your subscription will automatically update to the current rate.
      You can cancel anytime before then if you prefer.</p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="https://billing.stripe.com/p/login/..."
           style="background: #2563EB; color: white; padding: 14px 32px; border-radius: 8px;
                  text-decoration: none; font-weight: bold; display: inline-block;">
          Manage Subscription
        </a>
      </div>
      <p style="color: #6B7280; font-size: 12px;">
        This is an automated reminder from The Care Audit.
      </p>
    </div>
  `;
}
__name(buildDripEmail, "buildDripEmail");
export {
  grandfatheredDripCheck
};
//# sourceMappingURL=grandfathered-drip.mjs.map
