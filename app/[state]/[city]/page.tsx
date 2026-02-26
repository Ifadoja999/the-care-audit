import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { getFacilitiesByCity, getFeaturedFacilities } from '@/lib/queries';
import {
  slugToStateCode,
  stateCodeToName,
  slugToCity,
} from '@/lib/states';
import { generateCityMetadata, breadcrumbJsonLd, collectionPageJsonLd } from '@/lib/seo';
import { toTitleCase, displayCityFromDb } from '@/lib/utils';
import Header from '@/components/Header';
import Breadcrumb from '@/components/Breadcrumb';
import Footer from '@/components/Footer';
import ShowMoreFeatured from '@/components/ShowMoreFeatured';
import CityFacilitiesTable from '@/components/CityFacilitiesTable';

// ISR: pages generate on first visit, then revalidate every 24 hours
export const dynamicParams = true;
export const revalidate = 86400;

interface Props {
  params: Promise<{ state: string; city: string }>;
}

export async function generateStaticParams() {
  // Return empty array — all city pages render on-demand via ISR
  // This keeps the build output under Vercel's size limit
  return [];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { state: stateSlug, city: citySlug } = await params;
  const stateCode = slugToStateCode(stateSlug);
  if (!stateCode) return {};
  const cityFromSlug = slugToCity(citySlug);
  const facilities = await getFacilitiesByCity(stateCode, cityFromSlug);
  const cityName = facilities[0]?.city
    ? displayCityFromDb(facilities[0].city)
    : cityFromSlug;
  return generateCityMetadata(stateCode, cityName, facilities.length);
}

export default async function CityPage({ params }: Props) {
  const { state: stateSlug, city: citySlug } = await params;
  const stateCode = slugToStateCode(stateSlug);
  if (!stateCode) notFound();

  const cityFromSlug = slugToCity(citySlug);
  const stateName = stateCodeToName(stateCode);

  const [facilities, featured] = await Promise.all([
    getFacilitiesByCity(stateCode, cityFromSlug),
    getFeaturedFacilities(stateCode, cityFromSlug),
  ]);
  if (facilities.length === 0) notFound();

  // Use actual DB city name (preserves hyphens like "KAILUA-KONA") for display
  const cityName = facilities[0]?.city
    ? displayCityFromDb(facilities[0].city)
    : cityFromSlug;

  const breadcrumbItems = [
    { name: 'Home', href: '/' },
    { name: stateName, href: `/${stateSlug}` },
    { name: cityName, href: `/${stateSlug}/${citySlug}` },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-warm-50">
      <Header />

      {/* Schema.org BreadcrumbList */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbJsonLd(breadcrumbItems)),
        }}
      />
      {/* Schema.org CollectionPage */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(collectionPageJsonLd({
            name: `Assisted Living Facilities in ${cityName}, ${stateName}`,
            description: `Inspection reports and violation data for ${facilities.length} assisted living facilities in ${cityName}, ${stateName}.`,
            url: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.thecareaudit.com'}/${stateSlug}/${citySlug}`,
            count: facilities.length,
          })),
        }}
      />

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 animate-fade-in">
        <Breadcrumb
          items={[
            { label: 'Home', href: '/' },
            { label: stateName, href: `/${stateSlug}` },
            { label: cityName },
          ]}
        />

        <h1 className="mt-4 text-3xl font-bold text-gray-900">
          Assisted Living Facilities in {cityName}, {stateCode}
        </h1>
        <p className="mt-1 text-gray-500">
          {facilities.length} {facilities.length === 1 ? 'facility' : 'facilities'} found
        </p>

        {/* Featured Facilities */}
        {featured.length > 0 && (
          <div className="mt-6">
            <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold text-gray-900">
              <svg className="h-5 w-5 text-amber-500" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M16.403 12.652a3 3 0 010-5.304 3 3 0 00-3.75-3.751 3 3 0 00-5.305 0 3 3 0 00-3.751 3.75 3 3 0 000 5.305 3 3 0 003.75 3.751 3 3 0 005.305 0 3 3 0 003.751-3.75zm-2.546-4.46a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                  clipRule="evenodd"
                />
              </svg>
              Featured Facilities
            </h2>
            {(() => {
              const MAX_VISIBLE = 4;
              const visible = featured.slice(0, MAX_VISIBLE);
              const overflow = featured.slice(MAX_VISIBLE);

              function renderCard(f: typeof featured[number]) {
                const fSlug = f.slug.split('/').pop() ?? f.slug;
                const excerpt = f.ai_summary
                  ? f.ai_summary.length > 120
                    ? f.ai_summary.slice(0, 120) + '...'
                    : f.ai_summary
                  : null;

                return (
                  <Link
                    key={f.id}
                    href={`/${stateSlug}/${citySlug}/${fSlug}`}
                    className="flex flex-col gap-2 rounded-xl border-2 border-amber-200 bg-white p-5 shadow-md transition-all hover:border-amber-300 hover:shadow-lg"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-semibold text-gray-900">
                        {toTitleCase(f.facility_name)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-gradient-to-r from-amber-50 to-amber-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-navy">
                        <svg className="h-3 w-3 text-amber-500" viewBox="0 0 20 20" fill="currentColor">
                          <path
                            fillRule="evenodd"
                            d="M16.403 12.652a3 3 0 010-5.304 3 3 0 00-3.75-3.751 3 3 0 00-5.305 0 3 3 0 00-3.751 3.75 3 3 0 000 5.305 3 3 0 003.75 3.751 3 3 0 005.305 0 3 3 0 003.751-3.75zm-2.546-4.46a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                            clipRule="evenodd"
                          />
                        </svg>
                        Featured Verified
                      </span>
                      <span className="text-sm text-gray-500">
                        {cityName}, {stateCode}
                      </span>
                    </div>
                    {f.address && (
                      <p className="text-sm text-gray-500">{f.address}</p>
                    )}
                    {f.phone && (
                      <p className="text-sm text-gray-500">{f.phone}</p>
                    )}
                    {excerpt && (
                      <p className="text-sm leading-relaxed text-gray-600">{excerpt}</p>
                    )}
                  </Link>
                );
              }

              return (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {visible.map(renderCard)}
                  </div>
                  {overflow.length > 0 && (
                    <ShowMoreFeatured extraCount={overflow.length}>
                      <div className="mt-4 grid gap-4 sm:grid-cols-2">
                        {overflow.map(renderCard)}
                      </div>
                    </ShowMoreFeatured>
                  )}
                </>
              );
            })()}
          </div>
        )}

        <CityFacilitiesTable
          facilities={facilities}
          stateSlug={stateSlug}
          citySlug={citySlug}
        />
      </main>

      <Footer />
    </div>
  );
}
