import type { Metadata } from 'next';
import Link from 'next/link';
import Footer from '@/components/Footer';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.thecareaudit.com';

export const metadata: Metadata = {
  title: 'About',
  description:
    'Learn about The Care Audit — a free directory of assisted living facility inspection reports in plain English across all 50 states.',
  alternates: { canonical: `${SITE_URL}/about` },
};

export default function AboutPage() {
  return (
    <div className="flex min-h-screen flex-col bg-warm-50">
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-16">
        <Link href="/" className="mb-8 inline-flex items-center text-sm text-navy hover:underline">
          &larr; Back to Home
        </Link>
        <h1 className="text-3xl font-bold text-navy">About The Care Audit</h1>
        <div className="mt-6 space-y-4 text-gray-700 leading-relaxed">
          <p>
            The Care Audit is a free directory of inspection reports for Assisted
            Living Facilities (ALFs) across the United States, presented in plain
            English.
          </p>
          <p>
            Our mission is simple: help families make informed decisions by
            providing easy access to official state inspection data. The Care Audit
            does not conduct inspections, assign ratings or grades, or make
            recommendations. All data is sourced directly from government records.
          </p>
          <p>
            Data is sourced from official state health department inspection
            records and updated monthly. AI-generated summaries translate complex
            inspection language into plain English that anyone can understand.
          </p>
          <p>
            The Care Audit is not affiliated with any government agency, facility
            operator, or healthcare provider. Information is provided for
            educational purposes only.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
