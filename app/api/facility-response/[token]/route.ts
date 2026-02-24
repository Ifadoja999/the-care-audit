import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from('facilities')
    .select('id, facility_name, phone, address, facility_response, slug, is_sponsored, sponsor_tier')
    .eq('onboarding_token', token)
    .eq('is_sponsored', true)
    .eq('sponsor_tier', 'facility_response')
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'This link is invalid or has expired.' }, { status: 404 });
  }

  return NextResponse.json(data);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const body = await req.json();
  const supabase = createServerClient();

  const { data: facility, error: lookupError } = await supabase
    .from('facilities')
    .select('id')
    .eq('onboarding_token', token)
    .eq('is_sponsored', true)
    .eq('sponsor_tier', 'facility_response')
    .single();

  if (lookupError || !facility) {
    return NextResponse.json({ error: 'This link is invalid or has expired.' }, { status: 404 });
  }

  const updateData: Record<string, unknown> = {
    onboarding_completed: true,
  };

  if (body.facility_response !== undefined) {
    const resp = body.facility_response;
    updateData.facility_response = resp ? resp.slice(0, 1000) : null;
  }
  if (body.phone !== undefined) updateData.phone = body.phone;
  if (body.address !== undefined) updateData.address = body.address;

  const { error: updateError } = await supabase
    .from('facilities')
    .update(updateData)
    .eq('id', facility.id);

  if (updateError) {
    console.error('Facility response update error:', updateError);
    return NextResponse.json({ error: 'Failed to save changes.' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
