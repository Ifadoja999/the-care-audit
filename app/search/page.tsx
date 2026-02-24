import Link from 'next/link';
import type { Metadata } from 'next';
import { searchFacilities } from '@/lib/queries';
import { toTitleCase } from '@/lib/utils';
import Header from '@/components/Header';
import ViolationCountBadge from '@/components/ViolationCountBadge';
import Footer from '@/components/Footer';

interface Props {
  searchParams: Promise<{ q?: string }>;
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.thecareaudit.com';

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { q } = await searchParams;
  const query = q?.trim() ?? '';
  if (!query) return { title: 'Search', alternates: { canonical: `${SITE_URL}/search` } };
  return {
    title: `Results for "${query}"`,
    alternates: { canonical: `${SITE_URL}/search` },
  };
}

function displayCity(city: string) {
  return city
    .toLowerCase()
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export default async function SearchPage({ searchParams }: Props) {
  const { q } = await searchParams;
  const query = q?.trim() ?? '';
  const results = query.length >= 2 ? await searchFacilities(query) : [];

  return (
    <div className="flex min-h-screen flex-col bg-warm-50">
      <Header />

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 animate-fade-in">
        {query.length < 2 ? (
          <div className="py-16 text-center">
            <h1 className="text-2xl font-bold text-gray-900">Search</h1>
            <p className="mt-2 text-gray-500">
              Enter at least 2 characters to search for facilities.
            </p>
          </div>
        ) : results.length === 0 ? (
          <div className="py-16 text-center">
            <h1 className="text-2xl font-bold text-gray-900">
              No results found for &ldquo;{query}&rdquo;
            </h1>
            <p className="mt-2 text-gray-500">
              Try a different facility name or city.
            </p>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-gray-900">
              Showing {results.length} result{results.length === 1 ? '' : 's'} for
              &ldquo;{query}&rdquo;
            </h1>

            <div className="mt-6 space-y-4">
              {results.map(facility => (
                <Link
                  key={facility.id}
                  href={`/${facility.slug}`}
                  className="block rounded-xl border border-warm-200 bg-white p-5 shadow-sm transition-all duration-200 hover:border-navy hover:shadow-md"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3">
                      <h2 className="text-lg font-semibold text-navy">
                        {toTitleCase(facility.facility_name)}
                      </h2>
                      <ViolationCountBadge totalViolations={facility.total_violations} size="sm" />
                    </div>
                    <p className="mt-0.5 text-sm text-gray-500">
                      {displayCity(facility.city)}, {facility.state}
                    </p>
                    {facility.ai_summary && (
                      <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-gray-600">
                        {facility.ai_summary}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}
