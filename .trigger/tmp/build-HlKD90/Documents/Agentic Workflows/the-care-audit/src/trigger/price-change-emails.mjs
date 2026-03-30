import {
  stripe_esm_node_default
} from "../../../../../chunk-22ERR4GL.mjs";
import {
  emailQueue
} from "../../../../../chunk-O7YGMB64.mjs";
import {
  FROM_EMAIL,
  resend
} from "../../../../../chunk-SFQ54REZ.mjs";
import {
  logAutomation
} from "../../../../../chunk-WDHVAXWT.mjs";
import {
  supabase
} from "../../../../../chunk-SZEMJ223.mjs";
import {
  logger,
  task
} from "../../../../../chunk-QXSSDGE5.mjs";
import "../../../../../chunk-HPZM6FUT.mjs";
import {
  __name,
  init_esm
} from "../../../../../chunk-23OQHB7B.mjs";

// src/trigger/price-change-emails.ts
init_esm();
var stripe = new stripe_esm_node_default(process.env.STRIPE_SECRET_KEY);
var sendPriceChangeAnnouncement = task({
  id: "send-price-change-announcement",
  queue: emailQueue,
  run: /* @__PURE__ */ __name(async (payload) => {
    const startedAt = /* @__PURE__ */ new Date();
    logger.info("Starting price change announcement emails");
    const { data: subscribers } = await supabase.from("facilities").select("id, facility_name, contact_email, outreach_email, sponsor_tier, is_sponsored").eq("is_sponsored", true).eq("facility_status", "active");
    if (!subscribers || subscribers.length === 0) {
      return { sent: 0, reason: "no_subscribers" };
    }
    let sent = 0;
    let failed = 0;
    for (const sub of subscribers) {
      const email = sub.contact_email || sub.outreach_email;
      if (!email) continue;
      const tierPricing = getTierPricing(sub.sponsor_tier, payload);
      try {
        await resend.emails.send({
          from: FROM_EMAIL,
          to: email,
          subject: "Pricing update for The Care Audit",
          html: buildPriceChangeEmail1(sub, tierPricing)
        });
        sent++;
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (err) {
        logger.error(`Failed to send price change email`, {
          facility: sub.facility_name,
          error: err.message
        });
        failed++;
      }
    }
    for (const sub of subscribers) {
      await supabase.from("price_change_tracking").insert({
        facility_id: sub.id,
        stripe_customer_id: "pending_lookup",
        stripe_subscription_id: "pending_lookup",
        old_price_id: "pending_lookup",
        new_price_id: "pending_lookup",
        grandfathered_since: (/* @__PURE__ */ new Date()).toISOString(),
        grandfathered_expires: new Date(
          Date.now() + 365 * 24 * 60 * 60 * 1e3
        ).toISOString()
      });
    }
    await logAutomation({
      taskId: "price-change-announcement",
      taskName: "send-price-change-announcement",
      status: "completed",
      result: { sent, failed, total: subscribers.length },
      startedAt
    });
    return { sent, failed, total: subscribers.length };
  }, "run")
});
function getTierPricing(tier, payload) {
  switch (tier) {
    case "featured_verified":
      return { old: payload.tier1OldPrice, new: payload.tier1NewPrice };
    case "verified_profile":
      return { old: payload.tier2OldPrice, new: payload.tier2NewPrice };
    case "facility_response":
      return { old: payload.tier3OldPrice, new: payload.tier3NewPrice };
    default:
      return { old: "N/A", new: "N/A" };
  }
}
__name(getTierPricing, "getTierPricing");
function buildPriceChangeEmail1(facility, pricing) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <img src="https://www.thecareaudit.com/logo.png" alt="The Care Audit" style="height: 40px; margin-bottom: 24px;" />
      <h2 style="color: #1e293b;">Pricing update for The Care Audit</h2>
      <p>Hi,</p>
      <p>We're writing to let you know that we're updating our pricing for new customers.
      As a valued existing subscriber, <strong>your current rate of ${pricing.old}/month is locked in for 12 months</strong>
      from your sign-up date.</p>
      <p><strong>No action is needed on your part.</strong> You'll continue to be billed at your current rate.
      We'll notify you before any changes take effect.</p>
      <p>Thank you for being part of The Care Audit.</p>
      <p style="color: #6B7280; font-size: 12px;">
        Manage your subscription: <a href="https://billing.stripe.com/p/login/...">Stripe Customer Portal</a>
      </p>
    </div>
  `;
}
__name(buildPriceChangeEmail1, "buildPriceChangeEmail1");
export {
  sendPriceChangeAnnouncement
};
//# sourceMappingURL=price-change-emails.mjs.map
