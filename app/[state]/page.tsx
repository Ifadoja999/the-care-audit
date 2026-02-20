import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { getAllStates, getAllCitiesByState, getFacilitiesByState } from '@/lib/queries';
import {
  slugToStateCode,
  stateCodeToName,
  stateCodeToSlug,
  cityToSlug,
  displayCity,
} from '@/lib/states';
import { generateStateMetadata, breadcrumbJsonLd } from '@/lib/seo';
import Header from '@/components/Header';
import Breadcrumb from '@/components/Breadcrumb';
import Footer from '@/components/Footer';

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

  const [facilities, cities] = await Promise.all([
    getFacilitiesByState(stateCode),
    getAllCitiesByState(stateCode),
  ]);

  if (facilities.length === 0) notFound();

  const total = facilities.length;
  const abCount = facilities.filter(
    f => f.safety_grade === 'A' || f.safety_grade === 'B'
  ).length;
  const abPct = total > 0 ? Math.round((abCount / total) * 100) : 0;
  const withViolations = facilities.filter(f => (f.total_violations ?? 0) > 0).length;

  // Track which cities have F-grade facilities
  const citiesWithFGrade = new Set<string>();
  for (const f of facilities) {
    if (f.safety_grade === 'F') {
      citiesWithFGrade.add(f.city?.trim().toUpperCase());
    }
  }

  const breadcrumbItems = [
    { name: 'Home', href: '/' },
    { name: stateName, href: `/${stateSlug}` },
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
        <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: stateName }]} />

        <h1 className="mt-4 text-3xl font-bold text-gray-900">
          Assisted Living Facility Safety Grades in {stateName}
        </h1>

        {/* Stats bar */}
        <div className="mt-6 grid grid-cols-3 gap-4 rounded-xl bg-gray-50 p-6">
          <div className="text-center">
            <p className="text-3xl font-bold text-navy">{total.toLocaleString()}</p>
            <p className="mt-1 text-sm text-gray-500">Total Facilities</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-green-600">{abPct}%</p>
            <p className="mt-1 text-sm text-gray-500">Graded A or B</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-red-600">{withViolations.toLocaleString()}</p>
            <p className="mt-1 text-sm text-gray-500">With Violations</p>
          </div>
        </div>

        {/* Cities list */}
        <div className="mt-10">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">Browse by City</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
            {cities.map(({ city, facility_count }) => {
              const hasFGrade = citiesWithFGrade.has(city.trim().toUpperCase());
              return (
                <Link
                  key={city}
                  href={`/${stateSlug}/${cityToSlug(city)}`}
                  className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3 text-sm transition-all hover:border-navy hover:bg-gray-50"
                >
                  <span className="flex items-center gap-1.5 font-medium text-gray-800">
                    {displayCity(city)}
                    {hasFGrade && (
                      <span className="inline-block h-2 w-2 rounded-full bg-red-500" title="Has facilities with F grade" />
                    )}
                  </span>
                  <span className="ml-2 shrink-0 text-xs text-gray-400">{facility_count}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
