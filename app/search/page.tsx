import Link from 'next/link';
import type { Metadata } from 'next';
import { searchFacilities } from '@/lib/queries';
import Header from '@/components/Header';
import SafetyGradeBadge from '@/components/SafetyGradeBadge';
import Footer from '@/components/Footer';

interface Props {
  searchParams: Promise<{ q?: string }>;
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { q } = await searchParams;
  const query = q?.trim() ?? '';
  if (!query) return { title: 'Search' };
  return { title: `Results for "${query}"` };
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
    <div className="flex min-h-screen flex-col bg-white">
      <Header />

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
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
                  className="block rounded-xl border border-gray-200 p-5 transition-colors hover:border-gray-300 hover:bg-gray-50"
                >
                  <div className="flex items-start gap-4">
                    <div className="shrink-0 pt-0.5">
                      <SafetyGradeBadge grade={facility.safety_grade} size="md" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="text-lg font-semibold text-navy">
                        {facility.facility_name}
                      </h2>
                      <p className="mt-0.5 text-sm text-gray-500">
                        {displayCity(facility.city)}, {facility.state}
                      </p>
                      {facility.ai_summary && (
                        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-gray-600">
                          {facility.ai_summary}
                        </p>
                      )}
                    </div>
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
