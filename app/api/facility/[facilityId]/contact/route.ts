import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { sendLeadNotification } from '@/lib/emails';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ facilityId: string }> }
) {
  const { facilityId } = await params;

  let body: { name?: string; email?: string; phone?: string; message?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const { name, email, phone, message } = body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ error: 'Name is required.' }, { status: 400 });
  }
  if (!email || typeof email !== 'string' || !email.trim()) {
    return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return NextResponse.json({ error: 'Please provide a valid email address.' }, { status: 400 });
  }

  const supabase = createServerClient();

  // Look up facility — must exist, be sponsored, and have a contact_email
  const { data: facility, error: facilityError } = await supabase
    .from('facilities')
    .select('id, facility_name, contact_email, is_sponsored, sponsor_tier')
    .eq('id', facilityId)
    .single();

  if (facilityError || !facility) {
    return NextResponse.json({ error: 'Facility not found.' }, { status: 404 });
  }

  const isTier1 = facility.sponsor_tier === 'featured_verified';
  const isTier2 = facility.sponsor_tier === 'verified_profile';

  if (!facility.is_sponsored || (!isTier1 && !isTier2)) {
    return NextResponse.json({ error: 'This facility does not accept inquiries.' }, { status: 400 });
  }

  if (!facility.contact_email) {
    return NextResponse.json({ error: 'This facility has not set up a contact email.' }, { status: 400 });
  }

  // Rate limit: max 5 submissions from the same email for the same facility in 24 hours
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count } = await supabase
    .from('facility_leads')
    .select('id', { count: 'exact', head: true })
    .eq('facility_id', facilityId)
    .eq('submitter_email', email.trim().toLowerCase())
    .gte('created_at', since);

  if (count !== null && count >= 5) {
    return NextResponse.json(
      { error: 'Too many inquiries submitted. Please try again later.' },
      { status: 429 }
    );
  }

  // Insert the lead record
  const { data: lead, error: insertError } = await supabase
    .from('facility_leads')
    .insert({
      facility_id: facilityId,
      submitter_name: name.trim(),
      submitter_email: email.trim().toLowerCase(),
      submitter_phone: phone?.trim() || null,
      message: message?.trim() || null,
    })
    .select('id')
    .single();

  if (insertError || !lead) {
    console.error('Lead insert error:', insertError);
    return NextResponse.json({ error: 'Failed to submit inquiry. Please try again.' }, { status: 500 });
  }

  // Send notification email to facility operator
  try {
    await sendLeadNotification({
      facilityEmail: facility.contact_email,
      facilityName: facility.facility_name,
      submitterName: name.trim(),
      submitterEmail: email.trim(),
      submitterPhone: phone?.trim() || undefined,
      message: message?.trim() || undefined,
    });

    // Mark as notified
    await supabase
      .from('facility_leads')
      .update({ notified_at: new Date().toISOString() })
      .eq('id', lead.id);
  } catch (emailError) {
    // Don't fail the request if email sending fails — lead is already recorded
    console.error('Lead notification email error:', emailError);
  }

  return NextResponse.json({ success: true });
}
