import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { getAllStates, getAllCitiesByState, getFacilitiesByState, getFeaturedFacilities, getTopFacilitiesByState, getTopViolationTypesByState } from '@/lib/queries';
import {
  slugToStateCode,
  stateCodeToName,
  stateCodeToSlug,
  cityToSlug,
  displayCity,
} from '@/lib/states';
import { generateStateMetadata, breadcrumbJsonLd, collectionPageJsonLd, faqPageJsonLd } from '@/lib/seo';
import { toTitleCase } from '@/lib/utils';
import { STATE_AGENCY } from '@/lib/states';
import Header from '@/components/Header';
import Breadcrumb from '@/components/Breadcrumb';
import Footer from '@/components/Footer';
import ShowMoreFeatured from '@/components/ShowMoreFeatured';

// Revalidate state pages every 24 hours so updated pipeline data is reflected
export const revalidate = 86400;

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

  const [facilities, cities, featured, topFacilities, topViolationTypes] = await Promise.all([
    getFacilitiesByState(stateCode),
    getAllCitiesByState(stateCode),
    getFeaturedFacilities(stateCode),
    getTopFacilitiesByState(stateCode, 10),
    getTopViolationTypesByState(stateCode, 5),
  ]);

  if (facilities.length === 0) notFound();

  const total = facilities.length;
  const hasInspectionData = facilities.some(f => f.total_violations !== null);
  const totalCitations = facilities.reduce((sum, f) => sum + (f.total_violations ?? 0), 0);
  const violationCount = facilities.filter(f => f.total_violations !== null && f.total_violations > 0).length;
  const cleanCount = facilities.filter(f => f.total_violations === 0).length;
  const inspectedCount = facilities.filter(f => f.total_violations !== null).length;
  const avgViolations = inspectedCount > 0
    ? (totalCitations / inspectedCount).toFixed(1)
    : null;
  const agencyName = STATE_AGENCY[stateCode] ?? `${stateName} Department of Health`;

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
      {/* Schema.org CollectionPage */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(collectionPageJsonLd({
            name: `Assisted Living Facility Inspection Reports in ${stateName}`,
            description: `Inspection reports and violation data for ${total} assisted living facilities in ${stateName}.`,
            url: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.thecareaudit.com'}/${stateSlug}`,
            count: total,
          })),
        }}
      />
      {/* Schema.org FAQPage */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(faqPageJsonLd({
            stateName,
            totalCount: total,
            violationCount,
            cleanCount,
            agencyName,
          })),
        }}
      />

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 animate-fade-in">
        <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: stateName }]} />

        <h1 className="mt-4 text-3xl font-bold text-gray-900">
          Assisted Living Facility Inspection Reports in {stateName}
        </h1>

        {/* Stats bar */}
        <div className="mt-6 grid grid-cols-2 gap-4 rounded-2xl border border-warm-200 bg-white p-8 shadow-sm">
          <div className="text-center">
            <p className="text-4xl font-bold text-navy">{total.toLocaleString()}</p>
            <p className="mt-1.5 text-sm text-gray-500">Total Facilities</p>
          </div>
          <div className="text-center">
            {hasInspectionData ? (
              <>
                <p className="text-4xl font-bold text-navy">{totalCitations.toLocaleString()}</p>
                <p className="mt-1.5 text-sm text-gray-500">Total Citations</p>
              </>
            ) : (
              <>
                <p className="text-2xl font-bold text-gray-400">Pending</p>
                <p className="mt-1.5 text-sm text-gray-500">Inspection Data</p>
              </>
            )}
          </div>
        </div>

        {/* Inspection Summary Comparison Table */}
        {hasInspectionData && (
          <div className="mt-8">
            <h2 className="mb-3 text-xl font-semibold text-gray-900">
              Inspection Snapshot: {stateName}
            </h2>
            <div className="overflow-hidden rounded-2xl border border-warm-200 bg-white shadow-sm">
              <table className="w-full text-sm">
                <caption className="sr-only">
                  Key inspection statistics for assisted living facilities in {stateName}
                </caption>
                <thead>
                  <tr className="border-b border-warm-200 bg-warm-50">
                    <th scope="col" className="px-5 py-3 text-left font-semibold text-gray-700">
                      Metric
                    </th>
                    <th scope="col" className="px-5 py-3 text-right font-semibold text-gray-700">
                      {stateName}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-warm-100">
                  <tr>
                    <td className="px-5 py-3 text-gray-600">Total Licensed Facilities</td>
                    <td className="px-5 py-3 text-right font-medium text-gray-900">{total.toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td className="px-5 py-3 text-gray-600">Facilities with Violations on Record</td>
                    <td className="px-5 py-3 text-right font-medium text-gray-900">
                      {violationCount.toLocaleString()}
                      {inspectedCount > 0 && (
                        <span className="ml-1.5 text-xs text-gray-400">
                          ({Math.round((violationCount / inspectedCount) * 100)}%)
                        </span>
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-5 py-3 text-gray-600">Facilities with Clean Inspection Records</td>
                    <td className="px-5 py-3 text-right font-medium text-gray-900">
                      {cleanCount.toLocaleString()}
                      {inspectedCount > 0 && (
                        <span className="ml-1.5 text-xs text-gray-400">
                          ({Math.round((cleanCount / inspectedCount) * 100)}%)
                        </span>
                      )}
                    </td>
                  </tr>
                  {avgViolations !== null && (
                    <tr>
                      <td className="px-5 py-3 text-gray-600">Average Violations per Facility</td>
                      <td className="px-5 py-3 text-right font-medium text-gray-900">{avgViolations}</td>
                    </tr>
                  )}
                  {topViolationTypes.length > 0 && (
                    <tr>
                      <td className="px-5 py-3 align-top text-gray-600">Most Common Violation Codes</td>
                      <td className="px-5 py-3 text-right text-gray-900">
                        <ul className="space-y-0.5">
                          {topViolationTypes.map(({ violation_code, count }) => (
                            <li key={violation_code} className="flex items-center justify-end gap-2">
                              <span className="font-medium">{violation_code}</span>
                              <span className="rounded-full bg-warm-100 px-2 py-0.5 text-xs text-gray-500">
                                {count}×
                              </span>
                            </li>
                          ))}
                        </ul>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

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
              const MAX_VISIBLE = 5;
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
        {/* Top Facilities by Violations */}
        {topFacilities.length > 0 && (
          <div className="mt-10">
            <h2 className="mb-4 text-xl font-semibold text-gray-900">
              Most-Reviewed Facilities in {stateName}
            </h2>
            <div className="overflow-hidden rounded-2xl border border-warm-200 bg-white shadow-sm">
              <table className="w-full text-sm">
                <caption className="sr-only">
                  Facilities in {stateName} ranked by number of documented violations
                </caption>
                <thead>
                  <tr className="border-b border-warm-200 bg-warm-50">
                    <th scope="col" className="px-5 py-3 text-left font-semibold text-gray-700">Facility</th>
                    <th scope="col" className="px-5 py-3 text-left font-semibold text-gray-700">City</th>
                    <th scope="col" className="px-5 py-3 text-right font-semibold text-gray-700">Violations</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-warm-100">
                  {topFacilities.map((f) => (
                    <tr key={f.slug} className="transition-colors hover:bg-warm-50">
                      <td className="px-5 py-3">
                        <Link href={`/${f.slug}`} className="font-medium text-navy hover:underline">
                          {toTitleCase(f.facility_name)}
                        </Link>
                      </td>
                      <td className="px-5 py-3 text-gray-500">{displayCity(f.city)}</td>
                      <td className="px-5 py-3 text-right">
                        {f.total_violations !== null && f.total_violations > 0 ? (
                          <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700">
                            {f.total_violations}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* FAQ Section */}
        <div className="mt-12 rounded-2xl border border-warm-200 bg-white p-8 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900">
            Frequently Asked Questions About Assisted Living in {stateName}
          </h2>
          <dl className="mt-6 divide-y divide-warm-100">
            <div className="py-5">
              <dt className="text-base font-medium text-gray-900">
                How many assisted living facilities are in {stateName}?
              </dt>
              <dd className="mt-2 text-sm leading-relaxed text-gray-600">
                {stateName} has {total.toLocaleString()} licensed assisted living facilities.
                {hasInspectionData && (
                  <> Of these, {violationCount.toLocaleString()} have documented violations on file, and {cleanCount.toLocaleString()} have clean inspection records.</>
                )}{' '}
                Data is sourced from {agencyName} inspection records.
              </dd>
            </div>
            <div className="py-5">
              <dt className="text-base font-medium text-gray-900">
                How often are assisted living facilities inspected in {stateName}?
              </dt>
              <dd className="mt-2 text-sm leading-relaxed text-gray-600">
                {stateName} inspections are conducted by {agencyName}. Most assisted living facilities are subject to annual unannounced surveys, plus complaint-driven investigations. All reports reviewed by The Care Audit become part of each facility&apos;s public record.
              </dd>
            </div>
            <div className="py-5">
              <dt className="text-base font-medium text-gray-900">
                What should I look for in an inspection report?
              </dt>
              <dd className="mt-2 text-sm leading-relaxed text-gray-600">
                Look for the number of citations, their severity level, whether financial penalties were imposed, and whether deficiencies were corrected on follow-up. Repeat violations across multiple surveys are a significant red flag. Facilities with zero citations have passed all inspections in the reviewed period.
              </dd>
            </div>
            <div className="py-5">
              <dt className="text-base font-medium text-gray-900">
                What are the most common violations at assisted living facilities in {stateName}?
              </dt>
              <dd className="mt-2 text-sm leading-relaxed text-gray-600">
                Common violations include medication management errors, inadequate staffing ratios, failure to maintain individualized care plans, and physical plant or fire safety deficiencies. The Care Audit shows the full citation history for each facility.
              </dd>
            </div>
            <div className="py-5">
              <dt className="text-base font-medium text-gray-900">
                Is The Care Audit affiliated with {stateName} government?
              </dt>
              <dd className="mt-2 text-sm leading-relaxed text-gray-600">
                No. The Care Audit is an independent public resource. All data is sourced directly from official state health department inspection records and made available as a free public service.
              </dd>
            </div>
          </dl>
        </div>
      </main>

      <Footer />
    </div>
  );
}
