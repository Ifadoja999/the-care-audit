import { NextRequest, NextResponse } from 'next/server';
import { searchFacilities } from '@/lib/queries';
import { STATE_INFO } from '@/lib/states';
import { createServerClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q') ?? '';

  if (q.trim().length < 2) {
    return NextResponse.json([]);
  }

  const query = q.trim().toLowerCase();
  const results: Record<string, unknown>[] = [];

  // Check for state name match (partial, from start of name)
  let stateMatch: { code: string; name: string; slug: string } | null = null;
  for (const [code, info] of Object.entries(STATE_INFO)) {
    if (info.name.toLowerCase().startsWith(query)) {
      stateMatch = { code, name: info.name, slug: info.slug };
      break;
    }
  }

  // Also check exact 2-letter state code match (e.g., "FL")
  if (!stateMatch && query.length === 2) {
    const code = query.toUpperCase();
    if (STATE_INFO[code]) {
      const info = STATE_INFO[code];
      stateMatch = { code, name: info.name, slug: info.slug };
    }
  }

  if (stateMatch) {
    // Get facility count for the matched state
    const supabase = createServerClient();
    const { count } = await supabase
      .from('facilities')
      .select('*', { count: 'exact', head: true })
      .eq('state', stateMatch.code);

    results.push({
      type: 'state',
      state_name: stateMatch.name,
      state_code: stateMatch.code,
      slug: stateMatch.slug,
      facility_count: count ?? 0,
    });
  }

  // Get facility matches (limit based on whether state match exists)
  const maxFacilities = stateMatch ? 7 : 8;
  const facilities = await searchFacilities(q);

  for (const f of facilities.slice(0, maxFacilities)) {
    results.push({
      type: 'facility',
      id: f.id,
      facility_name: f.facility_name,
      city: f.city,
      state: f.state,
      total_violations: f.total_violations,
      slug: f.slug,
    });
  }

  return NextResponse.json({ results });
}
