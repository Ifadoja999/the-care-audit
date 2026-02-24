#!/usr/bin/env node
/**
 * send-outreach-blast.mjs
 * Sends outreach emails to facilities with enriched contact info.
 * Usage: node scripts/send-outreach-blast.mjs --state FL
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RESEND_KEY = process.env.RESEND_API_KEY;
const OUTREACH_ENABLED = process.env.OUTREACH_ENABLED === 'true';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.thecareaudit.com';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Parse --state flag
const stateIdx = process.argv.indexOf('--state');
const stateCode = stateIdx !== -1 ? process.argv[stateIdx + 1] : null;

if (!stateCode) {
  console.error('Usage: node scripts/send-outreach-blast.mjs --state FL');
  process.exit(1);
}

if (!OUTREACH_ENABLED) {
  console.log('Outreach is not enabled. Set OUTREACH_ENABLED=true to activate.');
  process.exit(0);
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function buildEmailHtml(f) {
  const optOutUrl = `${SITE_URL}/api/outreach/opt-out?facility_id=${f.id}`;
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 16px">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;max-width:600px;width:100%">
<tr><td style="background:linear-gradient(135deg,#2563EB,#1e40af);padding:24px 32px;text-align:center">
<img src="${SITE_URL}/images/logo.png" alt="The Care Audit" width="40" height="40" style="display:inline-block;vertical-align:middle;margin-right:12px">
<span style="color:#fff;font-size:20px;font-weight:700;vertical-align:middle">The Care Audit</span>
</td></tr>
<tr><td style="padding:32px">
<h2 style="margin:0 0 16px;color:#111827;font-size:22px">Families are viewing your facility&rsquo;s inspection report</h2>
<p style="color:#374151;line-height:1.6;margin:0 0 16px"><strong>${f.facility_name}</strong> in ${f.city}, ${f.state} is listed on The Care Audit, a public directory of assisted living facility inspection reports.</p>
<p style="color:#374151;line-height:1.6;margin:0 0 16px">Thousands of families visit The Care Audit every month to research assisted living options. Your facility's profile currently shows <strong>${f.total_violations} violation${f.total_violations === 1 ? '' : 's'}</strong> from the most recent state inspection.</p>
<p style="color:#374151;line-height:1.6;margin:0 0 16px">The Care Audit organizes publicly available government inspection data into a searchable, readable format. All data comes directly from official state inspection reports.</p>
<p style="color:#374151;line-height:1.6;margin:0 0 16px">The Care Audit offers facility owners the ability to enhance their listing, update their contact information, and stand out to families actively searching for care options.</p>
<table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0"><tr><td align="center">
<a href="${SITE_URL}/for-facilities" style="display:inline-block;background:#2563EB;color:#fff;font-weight:600;font-size:16px;padding:14px 32px;border-radius:8px;text-decoration:none">View Your Options</a>
</td></tr></table>
</td></tr>
<tr><td style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center;font-size:11px;color:#9ca3af">
<a href="${optOutUrl}" style="color:#9ca3af;text-decoration:underline">Unsubscribe from these emails</a>
</td></tr>
</table></td></tr></table>
</body></html>`;
}

async function main() {
  console.log(`\n=== OUTREACH BLAST — ${stateCode} ===`);

  // Query facilities eligible for outreach
  const { data: facilities, error } = await supabase
    .from('facilities')
    .select('id, facility_name, city, state, total_violations, outreach_email')
    .eq('state', stateCode.toUpperCase())
    .not('outreach_email', 'is', null)
    .eq('outreach_sent', false)
    .eq('outreach_opt_out', false);

  if (error) { console.error('Query error:', error.message); process.exit(1); }

  console.log(`Facilities to email: ${facilities.length}`);

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const f of facilities) {
    if (!f.outreach_email) { skipped++; continue; }

    try {
      const resp = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'The Care Audit <noreply@thecareaudit.com>',
          to: f.outreach_email,
          subject: "Families are viewing your facility's inspection report",
          html: buildEmailHtml(f),
        }),
      });

      if (resp.ok) {
        sent++;
        // Mark as sent
        await supabase
          .from('facilities')
          .update({ outreach_sent: true })
          .eq('id', f.id);
      } else {
        failed++;
        console.error(`Failed to send to ${f.facility_name}: ${await resp.text()}`);
      }
    } catch (err) {
      failed++;
      console.error(`Error for ${f.facility_name}: ${err.message}`);
    }

    // 1-second delay between sends
    await sleep(1000);

    if ((sent + failed) % 50 === 0) {
      console.log(`Progress: ${sent + failed}/${facilities.length} (${sent} sent, ${failed} failed)`);
    }
  }

  console.log(`\n--- SUMMARY ---`);
  console.log(`Total queried: ${facilities.length}`);
  console.log(`Total sent: ${sent}`);
  console.log(`Total failed: ${failed}`);
  console.log(`Total skipped: ${skipped}`);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
