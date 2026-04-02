import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.thecareaudit.com';

export const metadata: Metadata = {
  title: 'Assisted Living Resources for Families',
  description:
    'Free guides for families navigating assisted living — costs, Medicare coverage, inspection reports, memory care, and how to know when it\'s time.',
  alternates: { canonical: `${SITE_URL}/resources` },
  openGraph: {
    title: 'Assisted Living Resources for Families',
    description:
      'Free guides for families navigating assisted living — costs, Medicare coverage, inspection reports, memory care, and how to know when it\'s time.',
    url: `${SITE_URL}/resources`,
    siteName: 'The Care Audit',
    type: 'website',
  },
};

const resources = [
  {
    slug: 'medicare-assisted-living',
    category: 'Financial',
    title: 'Does Medicare Cover Assisted Living? (The Real Answer)',
    description: 'Medicare does not cover assisted living costs. Learn what Medicare does and does not pay for, plus what programs can help.',
    readTime: '6 min',
  },
  {
    slug: 'assisted-living-cost',
    category: 'Financial',
    title: 'How Much Does Assisted Living Cost Per Month in 2026?',
    description: 'The national median is $4,500–$5,000/month. Learn what drives costs, how they vary by state, and how families pay for it.',
    readTime: '7 min',
  },
  {
    slug: 'assisted-living-vs-memory-care',
    category: 'Care Types',
    title: "Assisted Living vs. Memory Care: What's the Difference?",
    description: 'Assisted living is for seniors needing daily support. Memory care is a secured, specialized environment for Alzheimer\'s and dementia.',
    readTime: '7 min',
  },
  {
    slug: 'signs-its-time-for-assisted-living',
    category: 'Family Guide',
    title: "Signs It's Time for Assisted Living: A Family Guide",
    description: 'Falls, medication errors, weight loss, cognitive decline — learn the key warning signs that it may be time to consider assisted living.',
    readTime: '8 min',
  },
  {
    slug: 'how-to-read-inspection-report',
    category: 'Research Guide',
    title: 'How to Read an Assisted Living Inspection Report',
    description: 'Inspection reports are official state records. Learn what violations mean, what red flags to look for, and how to find them.',
    readTime: '9 min',
  },
];

export default function ResourcesPage() {
  return (
    <div className="flex min-h-screen flex-col bg-warm-50">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
              { '@type': 'ListItem', position: 2, name: 'Resources', item: `${SITE_URL}/resources` },
            ],
          }),
        }}
      />

      <Header />

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-12">
        <header className="mb-10">
          <Link href="/" className="mb-6 inline-flex items-center text-sm text-gray-500 hover:text-navy hover:underline">
            &larr; Back to Home
          </Link>
          <h1 className="text-3xl font-bold text-navy sm:text-4xl" style={{ fontFamily: 'var(--font-heading)' }}>
            Assisted Living Resources
          </h1>
          <p className="mt-3 max-w-2xl text-gray-600 leading-relaxed">
            Free guides to help families navigate assisted living — from understanding costs and
            coverage to reading inspection reports and knowing when it&apos;s time to make a move.
          </p>
        </header>

        <div className="grid gap-5 sm:grid-cols-2">
          {resources.map((r) => (
            <Link
              key={r.slug}
              href={`/resources/${r.slug}`}
              className="group rounded-xl border border-warm-200 bg-white p-6 transition-shadow hover:shadow-md"
            >
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-accent">{r.category}</p>
              <h2 className="text-lg font-bold text-navy group-hover:underline leading-snug">{r.title}</h2>
              <p className="mt-2 text-sm text-gray-600 leading-relaxed">{r.description}</p>
              <p className="mt-3 text-xs text-gray-400">{r.readTime} read</p>
            </Link>
          ))}
        </div>

        <div className="mt-12 rounded-xl bg-navy p-6 text-center text-white">
          <p className="text-lg font-semibold">Ready to research a specific facility?</p>
          <p className="mt-1 text-blue-200 text-sm">
            Search inspection records for 44,000+ assisted living facilities across all 50 states.
          </p>
          <Link
            href="/"
            className="mt-4 inline-block rounded-lg bg-accent px-6 py-3 font-semibold text-white transition-opacity hover:opacity-90"
          >
            Search Facilities
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
