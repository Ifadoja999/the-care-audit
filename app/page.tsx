import type { Metadata } from 'next';
import Image from 'next/image';
import { getAllStates } from '@/lib/queries';
import { ALL_STATE_CODES } from '@/lib/states';
import { websiteSearchJsonLd, breadcrumbJsonLd } from '@/lib/seo';
import SearchBar from '@/components/SearchBar';
import StateCard from '@/components/StateCard';
import Footer from '@/components/Footer';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.thecareaudit.com';

export const metadata: Metadata = {
  title: 'The Care Audit — ALF Safety Grades & Inspection Reports',
  description:
    'Find safety grades and inspection reports for Assisted Living Facilities across all 50 states. Instantly searchable. Always free.',
  alternates: { canonical: SITE_URL },
  openGraph: {
    title: 'The Care Audit — ALF Safety Grades & Inspection Reports',
    description:
      'Find safety grades and inspection reports for Assisted Living Facilities across all 50 states. Instantly searchable. Always free.',
    url: SITE_URL,
    siteName: 'The Care Audit',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'The Care Audit — ALF Safety Grades & Inspection Reports',
    description:
      'Find safety grades and inspection reports for Assisted Living Facilities across all 50 states.',
  },
};

export default async function HomePage() {
  const dbStates = await getAllStates();
  const countByCode: Record<string, number> = {};
  for (const s of dbStates) {
    countByCode[s.state] = s.facility_count;
  }

  return (
    <div className="flex min-h-screen flex-col bg-white">

      {/* Schema.org JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSearchJsonLd()) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbJsonLd([{ name: 'Home', href: '/' }])),
        }}
      />

      {/* ── Hero ── */}
      <section className="bg-navy px-4 py-20 text-white">
        <div className="mx-auto max-w-3xl text-center">
          <Image
            src="/images/logo.png"
            alt="The Care Audit logo"
            width={80}
            height={80}
            className="mx-auto mb-6 h-20 w-auto"
          />
          <h1 className="text-4xl font-bold leading-tight sm:text-5xl">
            Find the Safety Grade for Any<br className="hidden sm:block" />
            Assisted Living Facility
          </h1>
          <p className="mt-4 text-lg text-blue-100">
            Inspection data for all 50 states. Instantly searchable. Always free.
          </p>
          <div className="mt-8 flex justify-center">
            <SearchBar />
          </div>
        </div>
      </section>

      {/* ── Browse by State ── */}
      <section className="mx-auto w-full max-w-6xl px-4 py-14">
        <h2 className="mb-6 text-2xl font-bold text-gray-900">Browse by State</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {ALL_STATE_CODES.map(code => (
            <StateCard
              key={code}
              stateCode={code}
              facilityCount={countByCode[code] ?? 0}
            />
          ))}
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="bg-gray-50 px-4 py-14">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-10 text-center text-2xl font-bold text-gray-900">How It Works</h2>
          <div className="grid gap-8 sm:grid-cols-3">
            {[
              {
                step: '1',
                title: 'Search',
                desc: 'Enter a facility name or city to find Assisted Living Facilities near you.',
              },
              {
                step: '2',
                title: 'View Grade',
                desc: 'See the safety grade (A\u2013F) calculated from the most recent state inspection.',
              },
              {
                step: '3',
                title: 'Read Report',
                desc: 'Review the full violation history and an AI plain-language summary of what it means.',
              },
            ].map(({ step, title, desc }) => (
              <div key={step} className="flex flex-col items-center text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-navy text-xl font-bold text-white">
                  {step}
                </div>
                <h3 className="mt-4 text-lg font-semibold text-gray-900">{title}</h3>
                <p className="mt-2 text-sm text-gray-500">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
