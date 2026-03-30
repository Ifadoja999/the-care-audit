import { createServerClient } from '@/lib/supabase';

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.thecareaudit.com').trim();
const FACILITIES_PER_SITEMAP = 40000;

export async function GET() {
  const supabase = createServerClient();

  const { count } = await supabase
    .from('facilities')
    .select('*', { count: 'exact', head: true });

  const totalFacilities = count ?? 0;
  const facilitySitemapCount = Math.max(1, Math.ceil(totalFacilities / FACILITIES_PER_SITEMAP));

  // id 0 = static + state + city, ids 1+ = facility chunks
  const sitemapIds: number[] = [];
  for (let i = 0; i <= facilitySitemapCount; i++) {
    sitemapIds.push(i);
  }

  const now = new Date().toISOString();
  const sitemapEntries = sitemapIds
    .map(
      (id) =>
        `  <sitemap>\n    <loc>${SITE_URL}/sitemap/${id}.xml</loc>\n    <lastmod>${now}</lastmod>\n  </sitemap>`
    )
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapEntries}
</sitemapindex>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
    },
  });
}
