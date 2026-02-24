#!/usr/bin/env node
/**
 * check-sponsor-thresholds.mjs
 * Runs after each state's monthly pipeline update.
 * Checks if sponsored facilities crossed the 0-3 violation threshold.
 * Usage: node scripts/check-sponsor-thresholds.mjs --state FL
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const STRIPE_KEY = process.env.STRIPE_SECRET_KEY;
const RESEND_KEY = process.env.RESEND_API_KEY;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.thecareaudit.com';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const stripe = new Stripe(STRIPE_KEY);

// Parse --state flag
const stateArg = process.argv.find(a => a.startsWith('--state'));
const stateCode = stateArg ? process.argv[process.argv.indexOf(stateArg) + 1] : null;

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
  console.log('\n=== SPONSOR THRESHOLD CHECK ===');
  if (stateCode) console.log(`State: ${stateCode}`);

  let query = supabase
    .from('facilities')
    .select('id, facility_name, city, state, total_violations, sponsor_tier, contact_email, is_sponsored')
    .eq('is_sponsored', true);

  if (stateCode) query = query.eq('state', stateCode.toUpperCase());

  const { data: facilities, error } = await query;
  if (error) { console.error('Query error:', error.message); process.exit(1); }

  console.log(`Sponsored facilities found: ${facilities.length}`);

  let downgrades = 0;
  let upgradeOpportunities = 0;

  for (const f of facilities) {
    const violations = f.total_violations ?? 0;
    const tier = f.sponsor_tier;

    // Check for downgrade: featured_verified or verified_profile with 4+ violations
    if ((tier === 'featured_verified' || tier === 'verified_profile') && violations > 3) {
      downgrades++;
      console.log(`DOWNGRADE: ${f.facility_name} (${tier}, ${violations} violations)`);

      if (f.contact_email) {
        const tierName = tier === 'featured_verified' ? 'Featured Verified' : 'Verified Profile';
        await sendEmail(
          f.contact_email,
          'Important update about your listing on The Care Audit',
          `<p>Your facility, <strong>${f.facility_name}</strong> in ${f.city}, ${f.state}, has ${violations} violations, which exceeds the eligibility threshold of 3 for ${tierName}.</p>
          <p>Your listing will transition to Facility Response ($49/month) on your next billing cycle.</p>
          <p><a href="${SITE_URL}/for-facilities">Manage your listing</a></p>`
        );
      }

      // Update tier in Supabase (Stripe subscription change handled separately)
      await supabase
        .from('facilities')
        .update({ sponsor_tier: 'facility_response' })
        .eq('id', f.id);
    }

    // Check for upgrade opportunity: facility_response with 0-3 violations
    if (tier === 'facility_response' && violations <= 3) {
      upgradeOpportunities++;
      console.log(`UPGRADE ELIGIBLE: ${f.facility_name} (${violations} violations)`);

      if (f.contact_email) {
        await sendEmail(
          f.contact_email,
          'Great news — your facility now qualifies for a Featured listing',
          `<p>Your facility, <strong>${f.facility_name}</strong> in ${f.city}, ${f.state}, now has ${violations} violations.</p>
          <p>You now qualify for Featured Verified ($149/month) or Verified Profile ($79/month).</p>
          <p><a href="${SITE_URL}/for-facilities">View your options</a></p>`
        );
      }
    }
  }

  console.log(`\n--- SUMMARY ---`);
  console.log(`Total checked: ${facilities.length}`);
  console.log(`Downgrades triggered: ${downgrades}`);
  console.log(`Upgrade opportunities sent: ${upgradeOpportunities}`);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
