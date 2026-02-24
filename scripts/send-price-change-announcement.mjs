#!/usr/bin/env node
/**
 * send-price-change-announcement.mjs
 * Sends price change Email 1 (immediate announcement) to all sponsored facilities.
 * Usage: node scripts/send-price-change-announcement.mjs
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RESEND_KEY = process.env.RESEND_API_KEY;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.thecareaudit.com';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const TIER_NAMES = {
  featured_verified: 'Featured Verified',
  verified_profile: 'Verified Profile',
  facility_response: 'Facility Response',
};

const TIER_RATES = {
  featured_verified: 149,
  verified_profile: 79,
  facility_response: 49,
};

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  console.log('\n=== PRICE CHANGE ANNOUNCEMENT ===');

  const { data: facilities, error } = await supabase
    .from('facilities')
    .select('id, facility_name, contact_email, sponsor_tier')
    .eq('is_sponsored', true)
    .not('contact_email', 'is', null);

  if (error) { console.error('Query error:', error.message); process.exit(1); }

  console.log(`Sponsored facilities with email: ${facilities.length}`);

  let sent = 0;

  for (const f of facilities) {
    const tierName = TIER_NAMES[f.sponsor_tier] || f.sponsor_tier;
    const rate = TIER_RATES[f.sponsor_tier] || 0;

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 16px">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;max-width:600px;width:100%">
<tr><td style="background:linear-gradient(135deg,#2563EB,#1e40af);padding:24px 32px;text-align:center">
<span style="color:#fff;font-size:20px;font-weight:700">The Care Audit</span>
</td></tr>
<tr><td style="padding:32px">
<h2 style="margin:0 0 16px;color:#111827;font-size:22px">Pricing update for The Care Audit</h2>
<p style="color:#374151;line-height:1.6;margin:0 0 16px">We're raising prices for new customers. Your current rate is locked in for 12 months from your sign-up date. No action needed on your part.</p>
<p style="color:#374151;line-height:1.6;margin:0 0 16px"><strong>Your current plan:</strong> ${tierName} at $${rate}/month</p>
<p style="color:#374151;line-height:1.6;margin:0 0 16px">Thank you for being an early subscriber to The Care Audit.</p>
<p style="color:#6b7280;font-size:13px;margin:24px 0 0">Need to manage your subscription? <a href="${SITE_URL}/for-facilities" style="color:#2563EB">Manage subscription</a></p>
</td></tr>
</table></td></tr></table>
</body></html>`;

    try {
      const resp = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'The Care Audit <noreply@thecareaudit.com>',
          to: f.contact_email,
          subject: 'Pricing update for The Care Audit',
          html,
        }),
      });

      if (resp.ok) {
        sent++;
      } else {
        console.error(`Failed to send to ${f.facility_name}: ${await resp.text()}`);
      }
    } catch (err) {
      console.error(`Error for ${f.facility_name}: ${err.message}`);
    }

    await sleep(1000);
  }

  console.log(`\n--- SUMMARY ---`);
  console.log(`Total sent: ${sent}`);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
