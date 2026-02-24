import type { MetadataRoute } from 'next';
import { createServerClient } from '@/lib/supabase';
import { STATE_INFO, cityToSlug } from '@/lib/states';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.thecareaudit.com';
const PAGE_SIZE = 1000;

// Currently ~3,300 URLs. When exceeding 50,000, implement generateSitemaps()
// for automatic sitemap index splitting. See Next.js docs on multiple sitemaps.

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createServerClient();
  const entries: MetadataRoute.Sitemap = [];

  // Homepage
  entries.push({
    url: SITE_URL,
    lastModified: new Date(),
    changeFrequency: 'monthly',
    priority: 1.0,
  });

  // Static pages
  const staticPages: { path: string; priority: number }[] = [
    { path: '/about', priority: 0.3 },
    { path: '/contact', priority: 0.3 },
    { path: '/search', priority: 0.3 },
    { path: '/for-facilities', priority: 0.5 },
  ];
  for (const { path, priority } of staticPages) {
    entries.push({
      url: `${SITE_URL}${path}`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority,
    });
  }

  // Fetch all facilities with slug + last_updated + state + city
  const allFacilities: { slug: string; last_updated: string | null; state: string; city: string }[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from('facilities')
      .select('slug, last_updated, state, city')
      .order('slug')
      .range(from, from + PAGE_SIZE - 1);
    if (error || !data || data.length === 0) break;
    allFacilities.push(...data);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  // Collect unique states and cities
  const statesWithData = new Set<string>();
  const citiesWithData = new Set<string>();
  let latestUpdate = new Date();

  for (const f of allFacilities) {
    statesWithData.add(f.state);
    citiesWithData.add(`${f.state}|${f.city}`);
    if (f.last_updated) {
      const d = new Date(f.last_updated);
      if (d > latestUpdate) latestUpdate = d;
    }
  }

  // State pages
  for (const code of statesWithData) {
    const info = STATE_INFO[code];
    if (!info) continue;
    entries.push({
      url: `${SITE_URL}/${info.slug}`,
      lastModified: latestUpdate,
      changeFrequency: 'monthly',
      priority: 0.9,
    });
  }

  // City pages
  for (const key of citiesWithData) {
    const [stateCode, city] = key.split('|');
    const info = STATE_INFO[stateCode];
    if (!info || !city) continue;
    entries.push({
      url: `${SITE_URL}/${info.slug}/${cityToSlug(city)}`,
      lastModified: latestUpdate,
      changeFrequency: 'monthly',
      priority: 0.8,
    });
  }

  // Facility pages
  for (const f of allFacilities) {
    entries.push({
      url: `${SITE_URL}/${f.slug}`,
      lastModified: f.last_updated ? new Date(f.last_updated) : latestUpdate,
      changeFrequency: 'monthly',
      priority: 0.7,
    });
  }

  return entries;
}
