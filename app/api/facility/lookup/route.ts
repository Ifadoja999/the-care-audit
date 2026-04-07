import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id');
  const slug = request.nextUrl.searchParams.get('slug');

  if (!id && !slug) {
    return NextResponse.json({ error: 'Missing id or slug' }, { status: 400 });
  }

  const supabase = createServerClient();

  const base = supabase
    .from('facilities')
    .select('id, facility_name, city, state, total_violations, slug, last_inspection_date, licensed_capacity, ai_summary, address, phone');

  const { data, error } = await (id
    ? base.eq('id', id).single()
    : base.eq('slug', slug!).single());

  if (error || !data) {
    return NextResponse.json({ error: 'Facility not found' }, { status: 404 });
  }

  return NextResponse.json(data);
}
