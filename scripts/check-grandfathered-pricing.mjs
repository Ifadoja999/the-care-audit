#!/usr/bin/env node
/**
 * check-grandfathered-pricing.mjs
 * Quarterly script: checks for customers on old Price IDs for 11+ months.
 * Sends reminder at month 11, migrates at month 12.
 * Usage: node scripts/check-grandfathered-pricing.mjs
 */
import 'dotenv/config';
import Stripe from 'stripe';

const STRIPE_KEY = process.env.STRIPE_SECRET_KEY;
const RESEND_KEY = process.env.RESEND_API_KEY;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.thecareaudit.com';

// Current price IDs (what new customers pay)
const CURRENT_PRICES = {
  featured_verified: process.env.STRIPE_PRICE_FEATURED,
  verified_profile: process.env.STRIPE_PRICE_VERIFIED,
  facility_response: process.env.STRIPE_PRICE_RESPONSE,
};

const stripe = new Stripe(STRIPE_KEY);

async function sendEmail(to, subject, html) {
  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'The Care Audit <noreply@thecareaudit.com>',
      to,
      subject,
      html,
    }),
  });
  if (!resp.ok) console.error('Email send failed:', await resp.text());
}

async function main() {
  console.log('\n=== GRANDFATHERED PRICING CHECK ===');

  let reminders = 0;
  let migrations = 0;
  let total = 0;
  let hasMore = true;
  let startingAfter = undefined;

  while (hasMore) {
    const params = { status: 'active', limit: 100 };
    if (startingAfter) params.starting_after = startingAfter;

    const subs = await stripe.subscriptions.list(params);
    hasMore = subs.has_more;

    for (const sub of subs.data) {
      total++;
      startingAfter = sub.id;

      const item = sub.items.data[0];
      if (!item) continue;

      const priceId = item.price.id;
      const currentPriceIds = Object.values(CURRENT_PRICES);

      // Skip if already on current pricing
      if (currentPriceIds.includes(priceId)) continue;

      // Calculate months since subscription started
      const startDate = new Date(sub.start_date * 1000);
      const now = new Date();
      const monthsActive = (now.getFullYear() - startDate.getFullYear()) * 12 + (now.getMonth() - startDate.getMonth());

      const customerEmail = sub.customer && typeof sub.customer === 'string'
        ? (await stripe.customers.retrieve(sub.customer)).email
        : null;

      const facilityName = sub.metadata?.facility_name || 'your facility';
      const currentRate = (item.price.unit_amount || 0) / 100;

      // Determine what the new rate would be
      let newPriceId = null;
      let newRate = 0;
      const tier = sub.metadata?.tier;
      if (tier && CURRENT_PRICES[tier]) {
        newPriceId = CURRENT_PRICES[tier];
        try {
          const newPrice = await stripe.prices.retrieve(newPriceId);
          newRate = (newPrice.unit_amount || 0) / 100;
        } catch { newRate = currentRate; }
      }

      if (monthsActive >= 12 && newPriceId) {
        // Month 12+: Migrate to current pricing
        migrations++;
        console.log(`MIGRATE: ${facilityName} (${monthsActive}m, $${currentRate} -> $${newRate})`);

        try {
          await stripe.subscriptions.update(sub.id, {
            items: [{ id: item.id, price: newPriceId }],
            proration_behavior: 'none',
          });
        } catch (err) {
          console.error(`  Migration failed: ${err.message}`);
        }
      } else if (monthsActive >= 11) {
        // Month 11: Send reminder
        reminders++;
        console.log(`REMINDER: ${facilityName} (${monthsActive}m, $${currentRate}/mo)`);

        if (customerEmail) {
          const expiryDate = new Date(startDate);
          expiryDate.setMonth(expiryDate.getMonth() + 12);

          await sendEmail(
            customerEmail,
            'Your grandfathered rate expires next month',
            `<p>Your grandfathered rate of <strong>$${currentRate}/month</strong> for <strong>${facilityName}</strong> expires next month.</p>
            <p>Your new rate will be <strong>$${newRate}/month</strong> starting ${expiryDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}.</p>
            <p>You can cancel anytime before then.</p>
            <p><a href="${SITE_URL}/for-facilities">Manage your subscription</a></p>`
          );
        }
      }
    }
  }

  console.log(`\n--- SUMMARY ---`);
  console.log(`Total subscriptions checked: ${total}`);
  console.log(`Reminders sent (month 11): ${reminders}`);
  console.log(`Migrations completed (month 12+): ${migrations}`);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
