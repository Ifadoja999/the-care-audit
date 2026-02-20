import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { getAllStates, getAllCitiesByState, getFacilitiesByCity, getFeaturedFacilities } from '@/lib/queries';
import {
  slugToStateCode,
  stateCodeToName,
  stateCodeToSlug,
  cityToSlug,
  slugToCity,
} from '@/lib/states';
import { generateCityMetadata, breadcrumbJsonLd } from '@/lib/seo';
import { toTitleCase } from '@/lib/utils';
import Header from '@/components/Header';
import Breadcrumb from '@/components/Breadcrumb';
import SafetyGradeBadge from '@/components/SafetyGradeBadge';
import Footer from '@/components/Footer';
import ShowMoreFeatured from '@/components/ShowMoreFeatured';

interface Props {
  params: Promise<{ state: string; city: string }>;
}

export async function generateStaticParams() {
  const states = await getAllStates();
  const params: { state: string; city: string }[] = [];
  for (const s of states) {
    const stateSlug = stateCodeToSlug(s.state);
    const cities = await getAllCitiesByState(s.state);
    for (const c of cities) {
      params.push({ state: stateSlug, city: cityToSlug(c.city) });
    }
  }
  return params;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { state: stateSlug, city: citySlug } = await params;
  const stateCode = slugToStateCode(stateSlug);
  if (!stateCode) return {};
  const cityName = slugToCity(citySlug);
  const facilities = await getFacilitiesByCity(stateCode, cityName);
  return generateCityMetadata(stateCode, cityName, facilities.length);
}

const GRADE_ORDER: Record<string, number> = { A: 0, B: 1, C: 2, F: 3 };

export default async function CityPage({ params }: Props) {
  const { state: stateSlug, city: citySlug } = await params;
  const stateCode = slugToStateCode(stateSlug);
  if (!stateCode) notFound();

  const cityName = slugToCity(citySlug);
  const stateName = stateCodeToName(stateCode);

  const [facilities, featured] = await Promise.all([
    getFacilitiesByCity(stateCode, cityName),
    getFeaturedFacilities(stateCode, cityName),
  ]);
  if (facilities.length === 0) notFound();

  // Sort: sponsored first, then by safety grade (A→F), then by name
  const sorted = [...facilities].sort((a, b) => {
    const aSponsored = a.is_sponsored ? 0 : 1;
    const bSponsored = b.is_sponsored ? 0 : 1;
    if (aSponsored !== bSponsored) return aSponsored - bSponsored;
    const ag = GRADE_ORDER[a.safety_grade] ?? 4;
    const bg = GRADE_ORDER[b.safety_grade] ?? 4;
    return ag !== bg ? ag - bg : a.facility_name.localeCompare(b.facility_name);
  });

  const breadcrumbItems = [
    { name: 'Home', href: '/' },
    { name: stateName, href: `/${stateSlug}` },
    { name: cityName, href: `/${stateSlug}/${citySlug}` },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Header />

      {/* Schema.org BreadcrumbList */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbJsonLd(breadcrumbItems)),
        }}
      />

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
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

        {/* Facilities table */}
        <div className="mt-6 overflow-hidden rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">
                  Facility Name
                </th>
                <th className="px-4 py-3 text-center font-semibold text-gray-600">
                  Safety Grade
                </th>
                <th className="px-4 py-3 text-center font-semibold text-gray-600">
                  Violations
                </th>
                <th className="hidden px-4 py-3 text-left font-semibold text-gray-600 sm:table-cell">
                  Last Inspection
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sorted.map(facility => {
                const facilitySlug = facility.slug.split('/').pop() ?? facility.slug;
                const inspDate = facility.last_inspection_date
                  ? new Date(facility.last_inspection_date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })
                  : '\u2014';

                return (
                  <tr
                    key={facility.id}
                    className={
                      facility.is_sponsored
                        ? 'bg-amber-50/60 transition-colors hover:bg-amber-50'
                        : 'transition-colors hover:bg-gray-50'
                    }
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/${stateSlug}/${citySlug}/${facilitySlug}`}
                          className="font-medium text-navy hover:underline"
                        >
                          {toTitleCase(facility.facility_name)}
                        </Link>
                        {facility.is_sponsored && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-gradient-to-r from-amber-50 to-amber-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-navy">
                            <svg className="h-3 w-3 text-amber-500" viewBox="0 0 20 20" fill="currentColor">
                              <path
                                fillRule="evenodd"
                                d="M16.403 12.652a3 3 0 010-5.304 3 3 0 00-3.75-3.751 3 3 0 00-5.305 0 3 3 0 00-3.751 3.75 3 3 0 000 5.305 3 3 0 003.75 3.751 3 3 0 005.305 0 3 3 0 003.751-3.75zm-2.546-4.46a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                                clipRule="evenodd"
                              />
                            </svg>
                            Verified
                          </span>
                        )}
                      </div>
                      {facility.address && (
                        <p className="mt-0.5 text-xs text-gray-400">{facility.address}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex justify-center">
                        <SafetyGradeBadge grade={facility.safety_grade} />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center text-gray-700">
                      {facility.total_violations ?? 0}
                    </td>
                    <td className="hidden px-4 py-3 text-gray-500 sm:table-cell">
                      {inspDate}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </main>

      <Footer />
    </div>
  );
}
