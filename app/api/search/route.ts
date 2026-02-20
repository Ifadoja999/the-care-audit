import { NextRequest, NextResponse } from 'next/server';
import { searchFacilities } from '@/lib/queries';

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q') ?? '';

  if (q.trim().length < 2) {
    return NextResponse.json([]);
  }

  const results = await searchFacilities(q);

  return NextResponse.json(
    results.map(f => ({
      facility_name: f.facility_name,
      city: f.city,
      state: f.state,
      safety_grade: f.safety_grade,
      slug: f.slug,
    }))
  );
}
