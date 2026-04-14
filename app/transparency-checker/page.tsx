import type { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import TransparencyChecker from '@/components/TransparencyChecker';
import { Shield } from 'lucide-react';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.thecareaudit.com';

export const metadata: Metadata = {
  title: 'Transparency Checker — Instant Facility Inspection Snapshot',
  description:
    'Look up any assisted living facility and get an instant inspection snapshot: violation count, last inspection date, and AI-generated plain-English summary.',
  alternates: { canonical: `${SITE_URL}/transparency-checker` },
  openGraph: {
    title: 'Transparency Checker — Instant Facility Inspection Snapshot',
    description:
      'Look up any assisted living facility and get an instant inspection snapshot: violation count, last inspection date, and AI-generated plain-English summary.',
    url: `${SITE_URL}/transparency-checker`,
    siteName: 'The Care Audit',
    type: 'website',
  },
};

export default function TransparencyCheckerPage() {
  return (
    <div className="flex min-h-screen flex-col bg-warm-50">
      <Header />

      <main className="flex flex-1 flex-col items-center px-4 py-16 animate-fade-in">
        {/* Hero */}
        <div className="mb-10 flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-navy/10">
            <Shield className="h-7 w-7 text-navy" />
          </div>
          <h1
            className="text-3xl font-bold text-navy sm:text-4xl"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Transparency Checker
          </h1>
          <p className="mt-3 max-w-lg text-base leading-relaxed text-gray-600 sm:text-lg">
            Search any assisted living facility and get an instant inspection
            snapshot — violation count, last inspection date, and a plain-English summary.
          </p>
        </div>

        {/* Tool */}
        <div className="w-full max-w-xl">
          <TransparencyChecker />
        </div>

        {/* Trust signals */}
        <div className="mt-16 grid w-full max-w-2xl grid-cols-1 gap-4 sm:grid-cols-3 animate-fade-in-delay">
          {[
            {
              label: 'Government Data',
              desc: 'Sourced directly from state inspection agencies and CMS reports.',
            },
            {
              label: 'Plain English',
              desc: 'AI-generated summaries written for families, not regulators.',
            },
            {
              label: 'Always Free',
              desc: 'No paywall. No subscription required to check any facility.',
            },
          ].map(({ label, desc }) => (
            <div
              key={label}
              className="rounded-xl border border-warm-200 bg-white p-4 text-center shadow-sm"
            >
              <p className="text-sm font-semibold text-navy">{label}</p>
              <p className="mt-1 text-xs leading-relaxed text-gray-500">{desc}</p>
            </div>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
}
