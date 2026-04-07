import type { Metadata } from 'next';
import Image from 'next/image';
import { getAllStates } from '@/lib/queries';
import { ALL_STATE_CODES } from '@/lib/states';
import { websiteSearchJsonLd, breadcrumbJsonLd } from '@/lib/seo';
import SearchBar from '@/components/SearchBar';
import StateCard from '@/components/StateCard';
import Footer from '@/components/Footer';

// Revalidate homepage every hour so new states appear quickly
export const revalidate = 3600;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.thecareaudit.com';

export const metadata: Metadata = {
  title: 'The Care Audit — Assisted Living Facility Inspection Reports In Plain English',
  description:
    'Search inspection reports and violation histories for assisted living facilities in all 50 states. AI-generated summaries in plain English. Always free.',
  alternates: { canonical: SITE_URL },
  openGraph: {
    title: 'The Care Audit — Assisted Living Facility Inspection Reports In Plain English',
    description:
      'Search inspection reports and violation histories for assisted living facilities in all 50 states. AI-generated summaries in plain English. Always free.',
    url: SITE_URL,
    siteName: 'The Care Audit',
    type: 'website',
    images: [{ url: `${SITE_URL}/opengraph-image`, width: 1200, height: 630, alt: 'The Care Audit — Assisted Living Facility Inspection Reports' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'The Care Audit — Assisted Living Facility Inspection Reports In Plain English',
    description:
      'Search inspection reports and violation histories for assisted living facilities in all 50 states. AI-generated summaries in plain English. Always free.',
    images: [`${SITE_URL}/opengraph-image`],
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
      <section
        className="relative z-10 overflow-hidden px-6 py-24 md:py-32"
        style={{
          backgroundColor: '#0b1326',
          backgroundImage: 'radial-gradient(circle at 50% -20%, #131b2e 0%, #0b1326 70%)',
        }}
      >
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-12">
            {/* Content Column (Left) */}
            <div className="space-y-10 lg:col-span-6">
              {/* Branding Anchor */}
              <div className="relative inline-block">
                <p className="mb-4 text-2xl font-bold tracking-tighter text-slate-50" style={{ fontFamily: 'var(--font-heading)' }}>The Care Audit</p>
                <Image
                  src="/images/logo-transparent.png"
                  alt="The Care Audit Logo"
                  width={80}
                  height={80}
                  className="h-20 w-20"
                  priority
                />
              </div>

              <div className="space-y-6">
                <h1
                  className="text-5xl font-bold leading-[1.1] tracking-tight md:text-6xl"
                  style={{ fontFamily: 'var(--font-heading)', color: '#dae2fd' }}
                >
                  Assisted Living Inspection Reports
                  <br />
                  <span style={{ color: '#ffb95f' }}>In Plain English</span>
                </h1>
                <p className="max-w-xl text-xl leading-relaxed" style={{ color: '#c6c6cd' }}>
                  Inspection data for all 50 states. Instantly searchable. Always free.
                </p>
              </div>

              {/* Search Bar */}
              <div className="max-w-2xl">
                <SearchBar placeholder="Search by facility name or city..." />
              </div>

              {/* Trust Badge */}
              <div className="flex items-center gap-4 pt-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-full border-2" style={{ borderColor: '#0b1326', backgroundColor: '#222a3d' }}>
                  <span className="text-[10px] font-bold uppercase tracking-tighter" style={{ color: '#ffb95f' }}>50</span>
                </div>
                <p className="text-xs font-medium uppercase tracking-[0.05em]" style={{ color: '#c6c6cd' }}>
                  Comprehensive Data from All 50 U.S. States
                </p>
              </div>
            </div>

            {/* Imagery Column (Right) */}
            <div className="relative lg:col-span-6">
              <div
                className="group relative z-10 overflow-hidden rounded-lg"
                style={{ boxShadow: '0px 24px 48px rgba(0, 0, 0, 0.4)' }}
              >
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0b1326]/40 to-transparent opacity-60" />
                <Image
                  src="/images/hero-facility.png"
                  alt="Modern assisted living facility at dusk with warm interior lights"
                  width={1408}
                  height={768}
                  className="h-[600px] w-full rounded-lg object-cover transition-transform duration-700 group-hover:scale-105"
                  style={{ border: '1px solid rgba(144, 144, 151, 0.15)' }}
                  priority
                />
              </div>
              {/* Background Accent (Asymmetry) */}
              <div className="pointer-events-none absolute -right-12 -top-12 -z-10 h-64 w-64 rounded-full bg-[#adc6ff]/5 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-12 -left-12 -z-10 h-96 w-96 rounded-full bg-[#ffb95f]/5 blur-3xl" />
            </div>
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
                title: 'View Violations',
                desc: 'See the number of violations found in the most recent state inspection.',
                icon: (
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                  </svg>
                ),
              },
              {
                step: '3',
                title: 'Read Report',
                desc: 'Review the AI-generated plain English summary and link to the official state inspection report.',
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
