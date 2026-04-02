import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createServerClient } from '@/lib/supabase';
import { getFacilityBySlug } from '@/lib/queries';

const resend = new Resend(process.env.RESEND_API_KEY!);
const FROM_EMAIL = 'The Care Audit <noreply@thecareaudit.com>';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, facilitySlug } = body as { email?: string; facilitySlug?: string };

    if (!email || !facilitySlug) {
      return NextResponse.json({ error: 'email and facilitySlug are required' }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
    }

    // Fetch facility data
    const facility = await getFacilityBySlug(facilitySlug);
    if (!facility) {
      return NextResponse.json({ error: 'Facility not found' }, { status: 404 });
    }

    const cleanEmail = email.toLowerCase().trim();

    // Store lead in Supabase (non-blocking — failure doesn't break UX)
    try {
      const supabase = createServerClient();
      await supabase.from('transparency_leads').upsert(
        {
          email: cleanEmail,
          facility_slug: facilitySlug,
          facility_name: facility.facility_name,
        },
        { onConflict: 'email,facility_slug' }
      );
    } catch {
      // Table may not exist yet — gracefully continue
      console.warn('[transparency-checker] Could not store lead — table may not exist yet');
    }

    // Add to Resend audience (non-blocking — requires RESEND_AUDIENCE_ID env var)
    // To enable: create an audience in the Resend dashboard and add its ID to .env.local
    const audienceId = process.env.RESEND_AUDIENCE_ID;
    if (audienceId) {
      try {
        await resend.contacts.create({
          email: cleanEmail,
          audienceId,
          unsubscribed: false,
        });
      } catch (err) {
        console.warn('[transparency-checker] Could not add contact to Resend audience:', err);
      }
    }

    // Send welcome email with facility snapshot (non-blocking)
    try {
      await resend.emails.send({
        from: FROM_EMAIL,
        to: cleanEmail,
        subject: `Your inspection snapshot: ${facility.facility_name}`,
        html: buildWelcomeEmail(facility),
      });
    } catch (err) {
      console.warn('[transparency-checker] Could not send welcome email:', err);
    }

    // Return snapshot data
    return NextResponse.json({
      facility_name: facility.facility_name,
      city: facility.city,
      state: facility.state,
      total_violations: facility.total_violations,
      last_inspection_date: facility.last_inspection_date,
      ai_summary: facility.ai_summary,
      slug: facility.slug,
      facility_type: facility.facility_type,
      licensed_capacity: facility.licensed_capacity,
    });
  } catch (err) {
    console.error('[transparency-checker] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function buildWelcomeEmail(facility: {
  facility_name: string;
  city: string;
  state: string;
  total_violations: number | null;
  last_inspection_date: string | null;
  ai_summary: string | null;
  slug: string;
}): string {
  const facilityUrl = `https://www.thecareaudit.com/facility/${facility.slug}`;
  const violationCount = facility.total_violations ?? null;

  const violationLine =
    violationCount === null
      ? 'Inspection data is pending for this state.'
      : violationCount === 0
        ? 'No violations cited in available records — a strong sign.'
        : `${violationCount} violation${violationCount === 1 ? '' : 's'} cited in available records.`;

  const inspectionLine = facility.last_inspection_date
    ? `Last inspection: ${new Date(facility.last_inspection_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`
    : '';

  const summarySection = facility.ai_summary
    ? `<p style="background:#f8fafc;border-left:4px solid #2563EB;padding:12px 16px;border-radius:4px;color:#334155;font-size:14px;line-height:1.6;">${facility.ai_summary}</p>`
    : '';

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b;">
      <img src="https://www.thecareaudit.com/images/logo.png" alt="The Care Audit" style="height: 40px; margin-bottom: 24px;" />
      <h2 style="color: #1e293b; margin-bottom: 4px;">Your inspection snapshot is ready</h2>
      <p style="color:#64748b;margin-top:0;">Here's what we found for <strong>${facility.facility_name}</strong> in ${facility.city}, ${facility.state}.</p>

      <div style="border:1px solid #e2e8f0;border-radius:8px;padding:20px;margin:24px 0;">
        <h3 style="margin-top:0;color:#1e293b;">${facility.facility_name}</h3>
        <p style="margin:4px 0;color:#64748b;">${facility.city}, ${facility.state}</p>
        <p style="margin:12px 0;">${violationLine}</p>
        ${inspectionLine ? `<p style="margin:4px 0;color:#64748b;font-size:13px;">${inspectionLine}</p>` : ''}
      </div>

      ${summarySection}

      <div style="text-align:center;margin:32px 0;">
        <a href="${facilityUrl}"
           style="background:#2563EB;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block;">
          View Full Inspection Report
        </a>
      </div>

      <p style="color:#64748b;font-size:13px;">The Care Audit organizes publicly available government inspection data into a searchable, readable format. We don't rate or rank facilities — we just make the data easier to understand.</p>

      <p style="color:#94a3b8;font-size:12px;">You're receiving this because you used the Transparency Checker at thecareaudit.com.</p>
    </div>
  `;
}
