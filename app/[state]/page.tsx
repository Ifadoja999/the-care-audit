import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { getAllStates, getAllCitiesByState, getFacilitiesByState, getFeaturedFacilities } from '@/lib/queries';
import {
  slugToStateCode,
  stateCodeToName,
  stateCodeToSlug,
  cityToSlug,
  displayCity,
} from '@/lib/states';
import { generateStateMetadata, breadcrumbJsonLd } from '@/lib/seo';
import { toTitleCase } from '@/lib/utils';
import Header from '@/components/Header';
import Breadcrumb from '@/components/Breadcrumb';
import SafetyGradeBadge from '@/components/SafetyGradeBadge';
import Footer from '@/components/Footer';
import ShowMoreFeatured from '@/components/ShowMoreFeatured';

interface Props {
  params: Promise<{ state: string }>;
}

export async function generateStaticParams() {
  const states = await getAllStates();
  return states.map(s => ({ state: stateCodeToSlug(s.state) }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { state: stateSlug } = await params;
  const stateCode = slugToStateCode(stateSlug);
  if (!stateCode) return {};
  const facilities = await getFacilitiesByState(stateCode);
  return generateStateMetadata(stateCode, facilities.length);
}

export default async function StatePage({ params }: Props) {
  const { state: stateSlug } = await params;
  const stateCode = slugToStateCode(stateSlug);
  if (!stateCode) notFound();

  const stateName = stateCodeToName(stateCode);

  const [facilities, cities, featured] = await Promise.all([
    getFacilitiesByState(stateCode),
    getAllCitiesByState(stateCode),
    getFeaturedFacilities(stateCode),
  ]);

  if (facilities.length === 0) notFound();

  const total = facilities.length;
  const abCount = facilities.filter(
    f => f.safety_grade === 'A' || f.safety_grade === 'B'
  ).length;
  const abPct = total > 0 ? Math.round((abCount / total) * 100) : 0;
  const withViolations = facilities.filter(f => (f.total_violations ?? 0) > 0).length;

  const breadcrumbItems = [
    { name: 'Home', href: '/' },
    { name: stateName, href: `/${stateSlug}` },
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

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 animate-fade-in">
        <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: stateName }]} />

        <h1 className="mt-4 text-3xl font-bold text-gray-900">
          Assisted Living Facility Safety Grades in {stateName}
        </h1>

        {/* Stats bar */}
        <div className="mt-6 grid grid-cols-3 gap-4 rounded-2xl border border-warm-200 bg-white p-8 shadow-sm">
          <div className="text-center">
            <p className="text-4xl font-bold text-navy">{total.toLocaleString()}</p>
            <p className="mt-1.5 text-sm text-gray-500">Total Facilities</p>
          </div>
          <div className="text-center">
            <p className="text-4xl font-bold text-green-600">{abPct}%</p>
            <p className="mt-1.5 text-sm text-gray-500">Graded A or B</p>
          </div>
          <div className="text-center">
            <p className="text-4xl font-bold text-red-600">{withViolations.toLocaleString()}</p>
            <p className="mt-1.5 text-sm text-gray-500">With Violations</p>
          </div>
        </div>

        {/* Featured Facilities */}
        {featured.length > 0 && (
          <div className="mt-10">
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
                const excerpt = f.ai_summary
                  ? f.ai_summary.length > 120
                    ? f.ai_summary.slice(0, 120) + '...'
                    : f.ai_summary
                  : null;

                return (
                  <Link
                    key={f.id}
                    href={`/${f.slug}`}
                    className="flex flex-col gap-2 rounded-xl border-2 border-amber-200 bg-white p-5 shadow-md transition-all hover:border-amber-300 hover:shadow-lg"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-semibold text-gray-900">
                        {toTitleCase(f.facility_name)}
                      </span>
                      <SafetyGradeBadge grade={f.safety_grade} size="sm" />
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
                        Verified Facility
                      </span>
                      <span className="text-sm text-gray-500">
                        {displayCity(f.city)}, {stateCode}
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

        {/* Cities list */}
        <div className="mt-10">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">Browse by City</h2>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4">
            {cities.map(({ city, facility_count }) => (
              <Link
                key={city}
                href={`/${stateSlug}/${cityToSlug(city)}`}
                className="flex items-center justify-between rounded-xl border border-warm-200 bg-white px-4 py-3 text-sm shadow-sm transition-all duration-200 hover:border-navy hover:shadow-md"
              >
                <span className="font-medium text-gray-800">
                  {displayCity(city)}
                </span>
                <span className="ml-2 shrink-0 rounded-full bg-warm-100 px-2 py-0.5 text-xs font-medium text-gray-500">{facility_count}</span>
              </Link>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
