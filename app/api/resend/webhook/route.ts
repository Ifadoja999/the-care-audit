import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

// Resend sends webhook events for email lifecycle events.
// We listen for `email.bounced` to flag facilities so they are never contacted again.
//
// Resend webhook event shape (relevant fields):
// {
//   "type": "email.bounced",
//   "data": {
//     "email_id": "...",
//     "from": "...",
//     "to": ["recipient@example.com"],
//     "subject": "...",
//     "bounce": { "message": "..." }
//   }
// }
//
// To configure in Resend dashboard:
// 1. Go to Resend → Webhooks → Add endpoint
// 2. URL: https://www.thecareaudit.com/api/resend/webhook
// 3. Events: email.bounced (optionally also email.complained)
// 4. Copy the signing secret and add as RESEND_WEBHOOK_SECRET env var in Vercel

export async function POST(req: NextRequest) {
  // Optional: verify webhook secret if configured
  // Resend includes svix-signature headers but verifying requires the `svix` npm package.
  // For now we validate via the shared RESEND_WEBHOOK_SECRET as a bearer token in the
  // Resend webhook URL query param (set URL to /api/resend/webhook?secret=YOUR_SECRET).
  const configuredSecret = process.env.RESEND_WEBHOOK_SECRET;
  if (configuredSecret) {
    const providedSecret = req.nextUrl.searchParams.get('secret');
    if (providedSecret !== configuredSecret) {
      console.error('Resend webhook: invalid secret');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const eventType: string = body?.type ?? '';
  console.log(`Resend webhook received: ${eventType}`);

  // Handle bounce and complaint events — both should stop future outreach
  if (eventType === 'email.bounced' || eventType === 'email.complained') {
    const recipients: string[] = body?.data?.to ?? [];

    if (recipients.length === 0) {
      console.warn('Resend webhook: bounce event with no recipients', body);
      return NextResponse.json({ ok: true, flagged: 0 });
    }

    const supabase = createServerClient();
    let flagged = 0;

    for (const email of recipients) {
      const normalizedEmail = email.toLowerCase().trim();
      const { data, error } = await supabase
        .from('facilities')
        .update({ outreach_email_bounced: true })
        .eq('outreach_email', normalizedEmail)
        .select('id, facility_name, state');

      if (error) {
        console.error(`Resend webhook: failed to flag ${normalizedEmail}`, error);
      } else if (data && data.length > 0) {
        flagged += data.length;
        for (const f of data) {
          console.log(`Bounce flagged: ${f.facility_name} (${f.state}) — ${normalizedEmail} [${eventType}]`);
        }
      } else {
        // Email not found in outreach_email column — log but don't error
        console.log(`Resend webhook: ${normalizedEmail} not found in facilities.outreach_email (${eventType})`);
      }
    }

    return NextResponse.json({ ok: true, event: eventType, flagged });
  }

  // All other event types — acknowledge but take no action
  return NextResponse.json({ ok: true, event: eventType, action: 'ignored' });
}
