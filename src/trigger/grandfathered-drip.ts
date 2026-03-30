import { schedules, logger } from "@trigger.dev/sdk";
import { supabase } from "./lib/supabase";
import { resend, FROM_EMAIL } from "./lib/resend";
import { emailQueue } from "./lib/queues";
import { logAutomation } from "./lib/log";
import Stripe from "stripe";

// Lazy-initialized — cannot create at module level because env vars
// aren't available during Trigger.dev's indexing phase
let _stripe: Stripe | null = null;
function getStripe(): Stripe {
  if (!_stripe) _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  return _stripe;
}

export const grandfatheredDripCheck = schedules.task({
  id: "grandfathered-drip-check",
  cron: "0 13 * * *", // 13:00 UTC = 8:00 AM CT
  queue: emailQueue,
  run: async (payload) => {
    const startedAt = new Date();
    const today = new Date();

    // Get all non-migrated grandfathered subscribers
    const { data: records } = await supabase
      .from("price_change_tracking")
      .select("*, facilities(facility_name, contact_email, outreach_email, sponsor_tier)")
      .eq("migrated", false);

    if (!records || records.length === 0) {
      return { processed: 0, reason: "no_grandfathered_subscribers" };
    }

    let emailsSent = 0;
    let migrated = 0;

    for (const record of records) {
      const expiresDate = new Date(record.grandfathered_expires);
      const daysUntilExpiry = Math.ceil(
        (expiresDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );

      const email =
        record.facilities?.contact_email || record.facilities?.outreach_email;
      if (!email) continue;

      // Check each drip milestone
      const drips = [
        { days: 60, field: "drip_60_sent", sentField: "drip_60_sent_at" },
        { days: 30, field: "drip_30_sent", sentField: "drip_30_sent_at" },
        { days: 14, field: "drip_14_sent", sentField: "drip_14_sent_at" },
        { days: 3, field: "drip_3_sent", sentField: "drip_3_sent_at" },
      ];

      for (const drip of drips) {
        if (daysUntilExpiry <= drip.days && !record[drip.field]) {
          try {
            await resend.emails.send({
              from: FROM_EMAIL,
              to: email,
              subject:
                drip.days === 3
                  ? "Your grandfathered rate expires in 3 days"
                  : `Your grandfathered rate expires ${drip.days === 60 ? "in 2 months" : drip.days === 30 ? "next month" : "in 2 weeks"}`,
              html: buildDripEmail(record, drip.days),
            });

            await supabase
              .from("price_change_tracking")
              .update({
                [drip.field]: true,
                [drip.sentField]: new Date().toISOString(),
              })
              .eq("id", record.id);

            emailsSent++;
          } catch (err: any) {
            logger.error(`Failed to send drip email`, {
              facilityId: record.facility_id,
              dripDays: drip.days,
              error: err.message,
            });
          }
        }
      }

      // Migrate if expired
      if (daysUntilExpiry <= 0 && !record.migrated) {
        try {
          // Update Stripe subscription to new price
          if (
            record.stripe_subscription_id &&
            record.stripe_subscription_id !== "pending_lookup"
          ) {
            const stripe = getStripe();
            const subscription = await stripe.subscriptions.retrieve(
              record.stripe_subscription_id
            );
            const itemId = subscription.items.data[0]?.id;
            if (itemId) {
              await stripe.subscriptions.update(record.stripe_subscription_id, {
                items: [{ id: itemId, price: record.new_price_id }],
                proration_behavior: "none",
              });
            }
          }

          await supabase
            .from("price_change_tracking")
            .update({
              migrated: true,
              migrated_at: new Date().toISOString(),
            })
            .eq("id", record.id);

          migrated++;
          logger.info(`Migrated subscription for facility ${record.facility_id}`);
        } catch (err: any) {
          logger.error(`Failed to migrate subscription`, {
            facilityId: record.facility_id,
            error: err.message,
          });
        }
      }
    }

    await logAutomation({
      taskId: payload.scheduleId,
      taskName: "grandfathered-drip-check",
      status: "completed",
      result: { emailsSent, migrated, total: records.length },
      startedAt,
    });

    return { emailsSent, migrated, total: records.length };
  },
});

function buildDripEmail(record: any, daysUntilExpiry: number): string {
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
