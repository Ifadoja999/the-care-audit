import type { MetadataRoute } from 'next';
import { createServerClient } from '@/lib/supabase';
import { STATE_INFO, cityToSlug } from '@/lib/states';

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.thecareaudit.com').trim();
const PAGE_SIZE = 1000;
const FACILITIES_PER_SITEMAP = 5000;

/**
 * Generates sitemap index entries. Next.js creates /sitemap.xml as an index
 * pointing to /sitemap/0.xml, /sitemap/1.xml, etc.
 *
 * Sitemap 0: Static pages + state pages + city pages
 * Sitemaps 1+: Facility pages in chunks of 40,000
 */
export async function generateSitemaps() {
  const supabase = createServerClient();

  const { count } = await supabase
    .from('facilities')
    .select('*', { count: 'exact', head: true });

  const totalFacilities = count ?? 0;
  const facilitySitemapCount = Math.max(1, Math.ceil(totalFacilities / FACILITIES_PER_SITEMAP));

  // id 0 = static + state + city pages, ids 1+ = facility chunks
  const sitemaps: { id: number }[] = [];
  for (let i = 0; i <= facilitySitemapCount; i++) {
    sitemaps.push({ id: i });
  }

  return sitemaps;
}

export default async function sitemap(props: { id: number | Promise<number> }): Promise<MetadataRoute.Sitemap> {
  // Next.js 16 wraps dynamic params as Promises
  const numericId = Number(await Promise.resolve(props.id));
  const supabase = createServerClient();

  if (numericId === 0) {
    return await buildStaticSitemap(supabase);
  }

  return await buildFacilitySitemap(supabase, numericId);
}

async function buildStaticSitemap(supabase: ReturnType<typeof createServerClient>): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [];
  const now = new Date();

  // Homepage
  entries.push({
    url: SITE_URL,
    lastModified: now,
    changeFrequency: 'daily',
    priority: 1.0,
  });

  // Static pages
  entries.push(
    { url: `${SITE_URL}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${SITE_URL}/contact`, lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${SITE_URL}/search`, lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${SITE_URL}/for-facilities`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
  );

  // Fetch distinct state + city combinations for active facilities
  const statesWithData = new Set<string>();
  const citiesWithData = new Set<string>();

  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from('facilities')
      .select('state, city')
      .eq('facility_status', 'active')
      .order('state')
      .range(from, from + PAGE_SIZE - 1);
    if (error || !data || data.length === 0) break;
    for (const f of data) {
      statesWithData.add(f.state);
      citiesWithData.add(`${f.state}|${f.city}`);
    }
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  // State pages
  for (const code of Array.from(statesWithData)) {
    const info = STATE_INFO[code];
    if (!info) continue;
    entries.push({
      url: `${SITE_URL}/${info.slug}`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.9,
    });
  }

  // City pages
  for (const key of Array.from(citiesWithData)) {
    const [stateCode, city] = key.split('|');
    const info = STATE_INFO[stateCode];
    if (!info || !city) continue;
    entries.push({
      url: `${SITE_URL}/${info.slug}/${cityToSlug(city)}`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8,
    });
  }

  return entries;
}

async function buildFacilitySitemap(supabase: ReturnType<typeof createServerClient>, id: number): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [];
  const offset = (id - 1) * FACILITIES_PER_SITEMAP;

  let from = 0;
  while (from < FACILITIES_PER_SITEMAP) {
    const batchSize = Math.min(PAGE_SIZE, FACILITIES_PER_SITEMAP - from);
    const { data, error } = await supabase
      .from('facilities')
      .select('slug, last_updated, facility_status, total_violations, ai_summary')
      .order('id')
      .range(offset + from, offset + from + batchSize - 1);
    if (error || !data || data.length === 0) break;
    for (const f of data) {
      // Skip facilities with bad slug patterns (HTML entity artifacts)
      if (/39/.test(f.slug) || /-amp-/.test(f.slug)) continue;
      // Skip thin pages (no violation data and no AI summary) — matches noindex condition in seo.ts
      if (f.total_violations === null && !f.ai_summary) continue;

      const isClosed = f.facility_status === 'closed';
      const hasData = f.total_violations !== null;
      entries.push({
        url: `${SITE_URL}/${f.slug}`,
        lastModified: f.last_updated ? new Date(f.last_updated) : new Date(),
        changeFrequency: isClosed ? 'yearly' : hasData ? 'weekly' : 'monthly',
        priority: isClosed ? 0.3 : hasData ? 0.8 : 0.6,
      });
    }
    if (data.length < batchSize) break;
    from += batchSize;
  }

  return entries;
}
