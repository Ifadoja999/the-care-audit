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
    .select('id, facility_name, phone, address, website_url, contact_email, facility_description, sponsor_tier, slug, city, state, is_sponsored')
    .eq('onboarding_token', token)
    .eq('is_sponsored', true)
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

  // Verify token is valid
  const { data: facility, error: lookupError } = await supabase
    .from('facilities')
    .select('id, sponsor_tier')
    .eq('onboarding_token', token)
    .eq('is_sponsored', true)
    .single();

  if (lookupError || !facility) {
    return NextResponse.json({ error: 'This link is invalid or has expired.' }, { status: 404 });
  }

  const updateData: Record<string, unknown> = {
    onboarding_completed: true,
  };

  if (body.phone !== undefined) updateData.phone = body.phone;
  if (body.address !== undefined) updateData.address = body.address;
  if (body.website_url !== undefined) updateData.website_url = body.website_url;
  if (body.contact_email !== undefined) updateData.contact_email = body.contact_email;
  if (body.facility_description !== undefined) {
    const desc = body.facility_description;
    updateData.facility_description = desc ? desc.slice(0, 500) : null;
  }

  const { error: updateError } = await supabase
    .from('facilities')
    .update(updateData)
    .eq('id', facility.id);

  if (updateError) {
    console.error('Onboard update error:', updateError);
    return NextResponse.json({ error: 'Failed to save changes.' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
