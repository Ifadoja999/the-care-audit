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
    <div className="flex min-h-screen flex-col bg-warm-50">

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

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-navy via-navy-light to-navy-dark px-4 py-24 text-white">
        {/* Subtle radial glow */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(201,147,62,0.12),transparent_70%)]" />

        <div className="relative mx-auto max-w-3xl text-center animate-fade-in">
          <Image
            src="/images/logo.png"
            alt="The Care Audit logo"
            width={88}
            height={88}
            className="mx-auto mb-8 h-22 w-auto drop-shadow-lg"
            priority
          />
          <h1 className="text-4xl font-bold leading-tight sm:text-5xl lg:text-[3.4rem]">
            Find the Safety Grade for Any
            <br className="hidden sm:block" />
            Assisted Living Facility
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-blue-100/90">
            Inspection data for all 50 states. Instantly searchable. Always free.
          </p>
          <div className="mt-10 flex justify-center">
            <SearchBar />
          </div>
        </div>
      </section>

      {/* Browse by State */}
      <section className="mx-auto w-full max-w-6xl px-4 py-16 animate-fade-in-delay">
        <h2 className="mb-8 text-2xl font-bold text-gray-900">Browse by State</h2>
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

      {/* How It Works */}
      <section className="border-y border-warm-200 bg-white px-4 py-16 animate-fade-in-delay-2">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-12 text-center text-2xl font-bold text-gray-900">How It Works</h2>
          <div className="grid gap-10 sm:grid-cols-3">
            {[
              {
                step: '1',
                title: 'Search',
                desc: 'Enter a facility name or city to find Assisted Living Facilities near you.',
                icon: (
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                  </svg>
                ),
              },
              {
                step: '2',
                title: 'View Grade',
                desc: 'See the safety grade (A\u2013F) calculated from the most recent state inspection.',
                icon: (
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                  </svg>
                ),
              },
              {
                step: '3',
                title: 'Read Report',
                desc: 'Review the full violation history and an AI plain-language summary of what it means.',
                icon: (
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                  </svg>
                ),
              },
            ].map(({ step, title, desc, icon }) => (
              <div key={step} className="flex flex-col items-center text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-navy/10 text-navy">
                  {icon}
                </div>
                <h3 className="mt-5 text-lg font-semibold text-gray-900" style={{ fontFamily: 'var(--font-heading)' }}>{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-500">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
