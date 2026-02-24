import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { sendUpdateListingLink } from '@/lib/emails';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const supabase = createServerClient();

    // Look up facility by contact_email
    const { data: facility, error } = await supabase
      .from('facilities')
      .select('id, facility_name, contact_email, onboarding_token, sponsor_tier, is_sponsored')
      .eq('contact_email', email)
      .eq('is_sponsored', true)
      .single();

    if (error || !facility || !facility.onboarding_token) {
      return NextResponse.json(
        { error: 'No active subscription found for this email address.' },
        { status: 404 }
      );
    }

    await sendUpdateListingLink({
      email,
      facilityName: facility.facility_name,
      token: facility.onboarding_token,
      tier: facility.sponsor_tier || '',
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Send magic link error:', err);
    return NextResponse.json({ error: 'Failed to send update link' }, { status: 500 });
  }
}
