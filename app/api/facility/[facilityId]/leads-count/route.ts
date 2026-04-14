import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ facilityId: string }> }
) {
  const { facilityId } = await params;
  const token = req.nextUrl.searchParams.get('token');

  if (!token) {
    return NextResponse.json({ error: 'Missing token.' }, { status: 400 });
  }

  const supabase = createServerClient();

  // Verify the facility exists and the onboarding token matches
  const { data: facility, error: facilityError } = await supabase
    .from('facilities')
    .select('id, sponsor_tier, contact_email')
    .eq('id', facilityId)
    .eq('onboarding_token', token)
    .eq('is_sponsored', true)
    .single();

  if (facilityError || !facility) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  // Total count
  const { count } = await supabase
    .from('facility_leads')
    .select('id', { count: 'exact', head: true })
    .eq('facility_id', facilityId);

  // Recent leads (last 10)
  const { data: recent } = await supabase
    .from('facility_leads')
    .select('submitter_name, submitter_email, submitter_phone, message, created_at')
    .eq('facility_id', facilityId)
    .order('created_at', { ascending: false })
    .limit(10);

  return NextResponse.json({
    count: count ?? 0,
    recent: recent ?? [],
  });
}
