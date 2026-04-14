import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { getFacilitiesByCity, getFeaturedFacilities, resolveCity } from '@/lib/queries';
import {
  slugToStateCode,
  stateCodeToName,
  slugToCity,
} from '@/lib/states';
import { generateCityMetadata, breadcrumbJsonLd, collectionPageJsonLd, cityFaqPageJsonLd } from '@/lib/seo';
import { toTitleCase, displayCityFromDb } from '@/lib/utils';
import Header from '@/components/Header';
import Breadcrumb from '@/components/Breadcrumb';
import Footer from '@/components/Footer';
import ShowMoreFeatured from '@/components/ShowMoreFeatured';
import CityFacilitiesTable from '@/components/CityFacilitiesTable';

// ISR: pages generate on first visit, then revalidate every 7 days
// Data only changes monthly (pipeline runs), so 7-day interval reduces ISR writes ~7x
export const dynamicParams = true;
export const revalidate = 604800;

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
  let cityFromSlug = slugToCity(citySlug);
  let facilities = await getFacilitiesByCity(stateCode, cityFromSlug);

  // Fallback: resolve city by slug match
  if (facilities.length === 0) {
    const dbCity = await resolveCity(stateCode, citySlug);
    if (dbCity) {
      facilities = await getFacilitiesByCity(stateCode, dbCity);
      cityFromSlug = dbCity;
    }
  }

  const cityName = facilities[0]?.city
    ? displayCityFromDb(facilities[0].city)
    : cityFromSlug;
  return generateCityMetadata(stateCode, cityName, facilities.length);
}

export default async function CityPage({ params }: Props) {
  const { state: stateSlug, city: citySlug } = await params;
  const stateCode = slugToStateCode(stateSlug);
  if (!stateCode) notFound();

  const stateName = stateCodeToName(stateCode);

  // Try simple slug→city conversion first (fast path: works for most cities)
  let cityFromSlug = slugToCity(citySlug);
  let [facilities, featured] = await Promise.all([
    getFacilitiesByCity(stateCode, cityFromSlug),
    getFeaturedFacilities(stateCode, cityFromSlug),
  ]);

  // Fallback: resolve city by slug match (handles apostrophes, periods, etc.
  // where the ilike round-trip fails, e.g. LEE'S SUMMIT, O'FALLON, Mt. Juliet)
  if (facilities.length === 0) {
    const dbCity = await resolveCity(stateCode, citySlug);
    if (dbCity) {
      cityFromSlug = dbCity;
      [facilities, featured] = await Promise.all([
        getFacilitiesByCity(stateCode, dbCity),
        getFeaturedFacilities(stateCode, dbCity),
      ]);
    }
  }

  if (facilities.length === 0) notFound();

  // Use actual DB city name (preserves hyphens like "KAILUA-KONA") for display
  const cityName = facilities[0]?.city
    ? displayCityFromDb(facilities[0].city)
    : cityFromSlug;

  const hasInspectionData = facilities.some(f => f.total_violations !== null);
  const violationCount = facilities.filter(f => f.total_violations !== null && f.total_violations > 0).length;
  const cleanCount = facilities.filter(f => f.total_violations === 0).length;

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
      {/* Schema.org FAQPage */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(cityFaqPageJsonLd({
            cityName,
            stateName,
            facilityCount: facilities.length,
            violationCount,
            cleanCount,
            hasInspectionData,
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
              const MAX_VISIBLE = 5;
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

        {/* FAQ Section */}
        <div className="mt-12 rounded-2xl border border-warm-200 bg-white p-8 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900">
            Frequently Asked Questions About Assisted Living in {cityName}, {stateName}
          </h2>
          <dl className="mt-6 divide-y divide-warm-100">
            <div className="py-5">
              <dt className="text-base font-medium text-gray-900">
                How many assisted living facilities are in {cityName}, {stateName}?
              </dt>
              <dd className="mt-2 text-sm leading-relaxed text-gray-600">
                {cityName}, {stateName} has {facilities.length.toLocaleString()} licensed assisted living {facilities.length === 1 ? 'facility' : 'facilities'} listed in The Care Audit.
                {hasInspectionData && (
                  <> Of these, {violationCount.toLocaleString()} have documented violations on file, and {cleanCount.toLocaleString()} have clean inspection records.</>
                )}
              </dd>
            </div>
            <div className="py-5">
              <dt className="text-base font-medium text-gray-900">
                How do I find inspection reports for assisted living facilities in {cityName}?
              </dt>
              <dd className="mt-2 text-sm leading-relaxed text-gray-600">
                Click any facility above to view its full inspection history, violation records, and AI-generated summary. All data is sourced directly from official {stateName} state health department inspection records.
              </dd>
            </div>
            <div className="py-5">
              <dt className="text-base font-medium text-gray-900">
                Are assisted living facilities in {cityName} state-regulated?
              </dt>
              <dd className="mt-2 text-sm leading-relaxed text-gray-600">
                Yes. All assisted living facilities in {cityName}, {stateName} are licensed and inspected by the {stateName} state health authority. Inspections are typically conducted on an annual unannounced basis, with additional inspections triggered by complaints or incidents.
              </dd>
            </div>
            <div className="py-5">
              <dt className="text-base font-medium text-gray-900">
                What information does The Care Audit provide for {cityName} facilities?
              </dt>
              <dd className="mt-2 text-sm leading-relaxed text-gray-600">
                For each facility in {cityName}, The Care Audit provides the full inspection citation history, violation counts, facility address and contact information, license status, and — where available — an AI-generated plain-English summary of the inspection findings.
              </dd>
            </div>
          </dl>
        </div>

        {/* Internal linking: back to state directory */}
        <div className="mt-10">
          <Link
            href={`/${stateSlug}`}
            className="inline-flex items-center gap-2 rounded-xl border border-warm-200 bg-white px-5 py-3.5 text-sm font-medium text-navy shadow-sm transition-all hover:border-navy hover:shadow-md"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Browse all assisted living facilities in {stateName}
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
