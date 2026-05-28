'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import Footer from '@/components/Footer';

function ThankYouContent() {
  const searchParams = useSearchParams();
  const type = searchParams.get('type');

  const isDeal = type === 'deal';

  const heading = isDeal ? 'Deal registered' : 'Application received';
  const subtext = isDeal
    ? "Got it. This registration takes priority over cookie attribution for this facility. We'll confirm receipt via email."
    : 'Thanks for applying. We review applications within 2 business days and will be in touch shortly.';

  return (
    <div className="flex min-h-screen flex-col bg-warm-50">
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-16">
        <div className="flex flex-col items-center text-center">
          {/* Green checkmark in circle */}
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-12 w-12 text-green-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={3}
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <h1 className="text-4xl font-bold text-navy">{heading}</h1>
          <p className="mt-4 max-w-xl text-lg text-gray-700 leading-relaxed">{subtext}</p>

          <Link
            href="/partners"
            className="mt-10 inline-flex items-center text-sm text-navy hover:underline"
          >
            &larr; Back to partner program
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default function PartnersThankYouPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen flex-col bg-warm-50">
          <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-16" />
          <Footer />
        </div>
      }
    >
      <ThankYouContent />
    </Suspense>
  );
}
