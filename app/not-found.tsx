import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Page Not Found',
  robots: 'noindex',
};

export default function NotFound() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex flex-1 items-center justify-center px-4 py-20">
        <div className="mx-auto max-w-xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-[#2563EB]">
            Coverage in progress
          </p>
          <h1
            className="mt-4 text-3xl font-bold text-navy sm:text-4xl"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            This facility page isn&apos;t available yet
          </h1>
          <p className="mt-5 text-base leading-relaxed text-gray-600">
            Inspection data for this facility hasn&apos;t been added yet, but
            we&apos;re expanding our coverage across all 50 states constantly.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/search"
              className="inline-flex w-full items-center justify-center rounded-lg bg-[#2563EB] px-6 py-3 text-base font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-[#1e40af] sm:w-auto"
            >
              Search All Facilities
            </Link>
            <Link
              href="/"
              className="inline-flex w-full items-center justify-center rounded-lg border border-warm-200 bg-white px-6 py-3 text-base font-semibold text-navy shadow-sm transition-colors duration-200 hover:bg-warm-50 sm:w-auto"
            >
              Browse by State
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
