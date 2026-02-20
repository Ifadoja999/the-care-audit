import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { getAllFacilitySlugs, getFacilityBySlug } from '@/lib/queries';
import {
  slugToStateCode,
  stateCodeToName,
  slugToCity,
  displayCity,
} from '@/lib/states';
import {
  generateFacilityMetadata,
  localBusinessJsonLd,
  breadcrumbJsonLd,
} from '@/lib/seo';
import Header from '@/components/Header';
import Breadcrumb from '@/components/Breadcrumb';
import SafetyGradeBadge from '@/components/SafetyGradeBadge';
import Footer from '@/components/Footer';

interface Props {
  params: Promise<{ state: string; city: string; facility: string }>;
}

/* ── Static generation ─────────────────────────────────────────────────────── */

export async function generateStaticParams() {
  const slugs = await getAllFacilitySlugs();
  return slugs.map(slug => {
    const parts = slug.split('/');
    return { state: parts[0], city: parts[1], facility: parts[2] };
  });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { state: stateSlug, city: citySlug, facility: facilitySlug } = await params;
  const slug = `${stateSlug}/${citySlug}/${facilitySlug}`;
  const data = await getFacilityBySlug(slug);
  if (!data) return {};
  return generateFacilityMetadata(data);
}

/* ── Severity badge colors ─────────────────────────────────────────────────── */

const severityColors: Record<string, string> = {
  High: 'bg-red-100 text-red-800',
  Medium: 'bg-orange-100 text-orange-800',
  Low: 'bg-gray-100 text-gray-600',
};

/* ── Grade hero colors ─────────────────────────────────────────────────────── */

const gradeHeroColors: Record<string, { ring: string; bg: string; text: string }> = {
  A: { ring: 'ring-green-200', bg: 'bg-green-100', text: 'text-green-700' },
  B: { ring: 'ring-blue-200', bg: 'bg-blue-100', text: 'text-blue-700' },
  C: { ring: 'ring-yellow-200', bg: 'bg-yellow-100', text: 'text-yellow-700' },
  F: { ring: 'ring-red-200', bg: 'bg-red-100', text: 'text-red-700' },
};

/* ── Page component ────────────────────────────────────────────────────────── */

export default async function FacilityPage({ params }: Props) {
  const { state: stateSlug, city: citySlug, facility: facilitySlug } = await params;
  const slug = `${stateSlug}/${citySlug}/${facilitySlug}`;

  const facility = await getFacilityBySlug(slug);
  if (!facility) notFound();

  const stateCode = slugToStateCode(stateSlug);
  const stateName = stateCode ? stateCodeToName(stateCode) : stateSlug;
  const cityName = slugToCity(citySlug);

  const inspDate = facility.last_inspection_date
    ? new Date(facility.last_inspection_date).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  const grade = facility.safety_grade;
  const hero = gradeHeroColors[grade] ?? gradeHeroColors.F;

  const breadcrumbItems = [
    { name: 'Home', href: '/' },
    { name: stateName, href: `/${stateSlug}` },
    { name: cityName, href: `/${stateSlug}/${citySlug}` },
    { name: facility.facility_name, href: `/${slug}` },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Header />

      {/* Schema.org JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbJsonLd(breadcrumbItems)),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(localBusinessJsonLd(facility)),
        }}
      />

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
        {/* 1. Breadcrumb */}
        <Breadcrumb
          items={[
            { label: 'Home', href: '/' },
            { label: stateName, href: `/${stateSlug}` },
            { label: cityName, href: `/${stateSlug}/${citySlug}` },
            { label: facility.facility_name },
          ]}
        />

        {/* 2. Facility Header */}
        <div
          className={`mt-6 rounded-xl p-6 ${
            facility.is_sponsored
              ? 'border-2 border-amber-300 bg-amber-50/30'
              : ''
          }`}
        >
          <div className="flex flex-wrap items-start gap-3">
            <h1 className="text-3xl font-bold text-gray-900">
              {facility.facility_name}
            </h1>
            {facility.is_sponsored && (
              <span className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-gradient-to-r from-amber-50 to-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-navy">
                <svg className="h-3.5 w-3.5 text-amber-500" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M16.403 12.652a3 3 0 010-5.304 3 3 0 00-3.75-3.751 3 3 0 00-5.305 0 3 3 0 00-3.751 3.75 3 3 0 000 5.305 3 3 0 003.75 3.751 3 3 0 005.305 0 3 3 0 003.751-3.75zm-2.546-4.46a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                    clipRule="evenodd"
                  />
                </svg>
                Verified Facility
              </span>
            )}
          </div>
          {facility.address && (
            <p className="mt-1 text-gray-500">{facility.address}</p>
          )}
          {facility.phone && (
            <p className="mt-1 text-sm text-gray-500">{facility.phone}</p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
            <span>Assisted Living Facility</span>
            {inspDate && (
              <>
                <span className="text-gray-300">|</span>
                <span>Last inspected {inspDate}</span>
              </>
            )}
          </div>
        </div>

        {/* 3. Safety Grade Hero */}
        <div className="mt-8 flex flex-col items-center rounded-2xl border border-gray-100 bg-gray-50 py-10">
          <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
            Safety Grade
          </p>
          <div
            className={`flex h-28 w-28 items-center justify-center rounded-full ring-4 ${hero.ring} ${hero.bg}`}
          >
            <span className={`text-6xl font-extrabold ${hero.text}`}>
              {grade}
            </span>
          </div>
          <p className="mt-4 text-gray-600">
            {facility.total_violations === 0
              ? 'No violations cited in most recent inspection'
              : `${facility.total_violations} violation${facility.total_violations === 1 ? '' : 's'} cited in most recent inspection`}
          </p>
        </div>

        {/* 4. AI Summary Box */}
        {facility.ai_summary && (
          <div className="mt-8 rounded-xl border border-blue-100 bg-blue-50/50 p-6">
            <h2 className="text-lg font-semibold text-gray-900">
              What This Means
            </h2>
            <p className="mt-2 leading-relaxed text-gray-700">
              {facility.ai_summary}
            </p>
            <p className="mt-3 text-xs text-gray-400">
              Summary generated by AI from official inspection records.
            </p>
          </div>
        )}

        {/* 5. Official Report Link */}
        {facility.report_url && (
          <div className="mt-8">
            <a
              href={facility.report_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-navy px-6 py-3 font-semibold text-white transition-colors hover:bg-navy-light"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-4.5-4.5h6m0 0v6m0-6L10.5 13.5"
                />
              </svg>
              View Official State Inspection Report
            </a>
            <p className="mt-2 text-xs text-gray-400">
              Opens original document on the state government website
            </p>
          </div>
        )}

        {/* 6. Violations Table */}
        <div className="mt-10">
          <h2 className="text-xl font-bold text-gray-900">Cited Violations</h2>
          {facility.violations.length === 0 ? (
            facility.total_violations > 0 ? (
              <div className="mt-4 rounded-lg border border-gray-100 bg-gray-50 px-6 py-8 text-center">
                <p className="text-gray-600">
                  {facility.total_violations} violation{facility.total_violations === 1 ? ' was' : 's were'} cited in the most recent inspection.
                  Detailed violation records are being processed.
                </p>
                {facility.report_url && (
                  <a
                    href={facility.report_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-navy hover:underline"
                  >
                    View the official inspection report for full details →
                  </a>
                )}
              </div>
            ) : (
              <p className="mt-4 rounded-lg border border-gray-100 bg-gray-50 px-6 py-8 text-center text-gray-500">
                No violations were cited in the most recent inspection.
              </p>
            )
          ) : (
            <div className="mt-4 overflow-hidden rounded-xl border border-gray-200">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600">
                        Code
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600">
                        Description
                      </th>
                      <th className="px-4 py-3 text-center font-semibold text-gray-600">
                        Severity
                      </th>
                      <th className="hidden px-4 py-3 text-left font-semibold text-gray-600 md:table-cell">
                        Date Cited
                      </th>
                      <th className="hidden px-4 py-3 text-center font-semibold text-gray-600 md:table-cell">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {facility.violations.map(v => {
                      const dateCited = v.date_cited
                        ? new Date(v.date_cited).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })
                        : '\u2014';

                      return (
                        <tr key={v.id} className="transition-colors hover:bg-gray-50">
                          <td className="px-4 py-3 font-mono text-xs text-gray-500">
                            {v.violation_code || '\u2014'}
                          </td>
                          <td className="max-w-md px-4 py-3 text-gray-700">
                            {v.violation_description}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span
                              className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                                severityColors[v.severity_level] ?? severityColors.Low
                              }`}
                            >
                              {v.severity_level}
                            </span>
                          </td>
                          <td className="hidden px-4 py-3 text-gray-500 md:table-cell">
                            {dateCited}
                          </td>
                          <td className="hidden px-4 py-3 text-center text-gray-500 md:table-cell">
                            {v.status}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

      </main>

      <Footer />
    </div>
  );
}
