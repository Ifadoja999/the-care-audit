import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createServerClient } from '@/lib/supabase';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB server-side limit (client compresses to ~200KB)
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const supabase = createServerClient();

  // Verify token is valid and facility is sponsored
  const { data: facility, error: lookupError } = await supabase
    .from('facilities')
    .select('id, sponsor_tier, slug')
    .eq('onboarding_token', token)
    .eq('is_sponsored', true)
    .single();

  if (lookupError || !facility) {
    return NextResponse.json({ error: 'Invalid or expired link.' }, { status: 404 });
  }

  if (facility.sponsor_tier !== 'featured_verified') {
    return NextResponse.json({ error: 'Photo upload is only available for Featured Verified subscribers.' }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  const photoIndex = formData.get('index') as string | null;

  if (!file) {
    return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'Invalid file type. Only JPEG, PNG, and WebP are allowed.' }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: 'File too large. Maximum 5MB.' }, { status: 400 });
  }

  const index = parseInt(photoIndex || '1', 10);
  if (index < 1 || index > 4) {
    return NextResponse.json({ error: 'Photo index must be 1-4.' }, { status: 400 });
  }

  // Build storage path from slug
  const storagePath = `${facility.slug}/${index}.jpg`;

  // Read file as buffer
  const buffer = Buffer.from(await file.arrayBuffer());

  // Upload to Supabase Storage (upsert to replace existing)
  const { error: uploadError } = await supabase.storage
    .from('facility-photos')
    .upload(storagePath, buffer, {
      contentType: file.type,
      upsert: true,
    });

  if (uploadError) {
    console.error('Photo upload error:', uploadError);
    return NextResponse.json({ error: 'Failed to upload photo.' }, { status: 500 });
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from('facility-photos')
    .getPublicUrl(storagePath);

  // Revalidate facility page so photo shows immediately
  if (facility.slug) {
    revalidatePath(`/${facility.slug}`);
  }

  return NextResponse.json({
    success: true,
    url: urlData.publicUrl,
    index,
  });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const supabase = createServerClient();

  const { data: facility, error: lookupError } = await supabase
    .from('facilities')
    .select('id, sponsor_tier, slug')
    .eq('onboarding_token', token)
    .eq('is_sponsored', true)
    .single();

  if (lookupError || !facility) {
    return NextResponse.json({ error: 'Invalid or expired link.' }, { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  const index = parseInt(searchParams.get('index') || '0', 10);
  if (index < 1 || index > 4) {
    return NextResponse.json({ error: 'Invalid photo index.' }, { status: 400 });
  }

  const storagePath = `${facility.slug}/${index}.jpg`;

  const { error: deleteError } = await supabase.storage
    .from('facility-photos')
    .remove([storagePath]);

  if (deleteError) {
    console.error('Photo delete error:', deleteError);
    return NextResponse.json({ error: 'Failed to delete photo.' }, { status: 500 });
  }

  if (facility.slug) {
    revalidatePath(`/${facility.slug}`);
  }

  return NextResponse.json({ success: true });
}
