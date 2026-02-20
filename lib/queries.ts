// Server-side only — never import in client components.
// All queries use the service role key via createServerClient().

import { createServerClient } from './supabase';
import type { Facility, FacilityWithViolations, StateStats, CityStats } from './types';

// Supabase PostgREST default limit is 1,000. Paginate for larger result sets.
const PAGE_SIZE = 1000;

export async function getFacilitiesByState(stateCode: string): Promise<Facility[]> {
  const supabase = createServerClient();
  const allData: Facility[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from('facilities')
      .select('*')
      .eq('state', stateCode.toUpperCase())
      .order('city', { ascending: true })
      .order('facility_name', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      console.error('getFacilitiesByState error:', error.message);
      break;
    }
    if (!data || data.length === 0) break;
    allData.push(...(data as Facility[]));
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return allData;
}

export async function getFacilitiesByCity(
  stateCode: string,
  city: string
): Promise<Facility[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('facilities')
    .select('*')
    .eq('state', stateCode.toUpperCase())
    .ilike('city', city)
    .order('safety_grade', { ascending: true })
    .order('facility_name', { ascending: true })
    .range(0, PAGE_SIZE - 1);

  if (error) {
    console.error('getFacilitiesByCity error:', error.message);
    return [];
  }

  return (data as Facility[]) ?? [];
}

export async function getFacilityBySlug(slug: string): Promise<FacilityWithViolations | null> {
  const supabase = createServerClient();

  const { data: facility, error: facilityError } = await supabase
    .from('facilities')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();

  if (facilityError || !facility) {
    console.error('getFacilityBySlug error:', facilityError?.message ?? 'Not found');
    return null;
  }

  const { data: violations, error: violationsError } = await supabase
    .from('violations')
    .select('*')
    .eq('facility_id', facility.id)
    .order('date_cited', { ascending: false });

  if (violationsError) {
    console.error('getFacilityBySlug violations error:', violationsError.message);
  }

  return {
    ...(facility as Facility),
    violations: violations ?? [],
  };
}

export async function searchFacilities(query: string): Promise<Facility[]> {
  if (!query || query.trim().length < 2) return [];

  const supabase = createServerClient();
  const q = `%${query.trim()}%`;

  const { data, error } = await supabase
    .from('facilities')
    .select('id, facility_name, city, state, safety_grade, slug, ai_summary')
    .or(`facility_name.ilike.${q},city.ilike.${q}`)
    .order('safety_grade', { ascending: true })
    .order('facility_name', { ascending: true })
    .limit(20);

  if (error) {
    console.error('searchFacilities error:', error.message);
    return [];
  }

  return (data as Facility[]) ?? [];
}

export async function getAllStates(): Promise<StateStats[]> {
  const supabase = createServerClient();
  const allData: { state: string }[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from('facilities')
      .select('state')
      .order('state', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      console.error('getAllStates error:', error.message);
      break;
    }
    if (!data || data.length === 0) break;
    allData.push(...data);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  const counts: Record<string, number> = {};
  for (const row of allData) {
    counts[row.state] = (counts[row.state] ?? 0) + 1;
  }

  return Object.entries(counts).map(([state, facility_count]) => ({
    state,
    facility_count,
  }));
}

export async function getAllFacilitySlugs(): Promise<string[]> {
  const supabase = createServerClient();
  const allSlugs: string[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from('facilities')
      .select('slug')
      .order('slug', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      console.error('getAllFacilitySlugs error:', error.message);
      break;
    }
    if (!data || data.length === 0) break;
    allSlugs.push(...data.map((r: { slug: string }) => r.slug));
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return allSlugs;
}

export async function getAllCitiesByState(stateCode: string): Promise<CityStats[]> {
  const supabase = createServerClient();
  const allData: { city: string }[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from('facilities')
      .select('city')
      .eq('state', stateCode.toUpperCase())
      .order('city', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      console.error('getAllCitiesByState error:', error.message);
      break;
    }
    if (!data || data.length === 0) break;
    allData.push(...data);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  const counts: Record<string, number> = {};
  for (const row of allData) {
    const city = row.city?.trim();
    if (city) counts[city] = (counts[city] ?? 0) + 1;
  }

  return Object.entries(counts)
    .map(([city, facility_count]) => ({ city, facility_count }))
    .sort((a, b) => a.city.localeCompare(b.city));
}
