import type { Metadata } from 'next';
import Link from 'next/link';
import Footer from '@/components/Footer';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.thecareaudit.com';

// Set NEXT_PUBLIC_PARTNERS_APPLY_URL in Vercel env vars after Tally form is created (Task 8).
// Falls back to email contact until the form exists.
const APPLY_FORM_URL = process.env.NEXT_PUBLIC_PARTNERS_APPLY_URL ?? 'mailto:info@thecareaudit.com';

export const metadata: Metadata = {
  title: 'Partner Program | The Care Audit',
  description:
    'Earn lifetime recurring commissions for every ALF client you refer to The Care Audit. Join the partner program for senior living marketing agencies.',
  alternates: { canonical: `${SITE_URL}/partners` },
};

export default function PartnersPage() {
  return (
    <div className="flex min-h-screen flex-col bg-warm-50">
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-16">
        <Link href="/" className="mb-8 inline-flex items-center text-sm text-navy hover:underline">
          &larr; Back to Home
        </Link>

        {/* Hero */}
        <h1 className="text-4xl font-bold text-navy">Partner With The Care Audit</h1>
        <p className="mt-3 text-xl text-gray-600 leading-snug">
          Earn lifetime recurring commissions for every ALF client you refer.
        </p>

        <div className="mt-10 space-y-10 text-gray-700 leading-relaxed">

          {/* Section 1: What we do */}
          <section>
            <h2 className="text-xl font-semibold text-navy mb-3">What is The Care Audit?</h2>
            <p>
              The Care Audit is a public directory of US government inspection reports for assisted
              living facilities, AI-summarized so families can actually understand them when choosing
              a place for a parent. Facilities subscribe to manage how their profile appears and to
              respond to inspection findings. We help families make more informed decisions and help
              facilities demonstrate their track record.
            </p>
          </section>

          {/* Section 2: What you do */}
          <section>
            <h2 className="text-xl font-semibold text-navy mb-3">What you do as a partner</h2>
            <p>
              Refer your existing ALF clients to a TCA subscription. Share your unique referral link.
              Earn commissions every month as long as your referrals stay subscribed. TCA handles all
              onboarding, billing, and support. Your team makes one intro.
            </p>
          </section>

          {/* Section 3: Commission tiers */}
          <section>
            <h2 className="text-xl font-semibold text-navy mb-4">Commission tiers</h2>
            <div className="overflow-x-auto rounded-lg border border-warm-200">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-warm-100 text-left">
                    <th className="px-4 py-3 font-semibold text-navy">Partner type</th>
                    <th className="px-4 py-3 font-semibold text-navy">Commission rate</th>
                    <th className="px-4 py-3 font-semibold text-navy">Minimum referrals</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-warm-200">
                  <tr className="bg-white">
                    <td className="px-4 py-3 font-medium text-navy">
                      Founding Partner
                      <span className="ml-2 inline-block rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-white">
                        First 10 agencies
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-accent">30% recurring MRR</td>
                    <td className="px-4 py-3 text-gray-600">None, from referral 1</td>
                  </tr>
                  <tr className="bg-warm-50">
                    <td className="px-4 py-3 font-medium text-navy">Standard Partner</td>
                    <td className="px-4 py-3">25% recurring MRR</td>
                    <td className="px-4 py-3 text-gray-600">None</td>
                  </tr>
                  <tr className="bg-white">
                    <td className="px-4 py-3 font-medium text-navy">
                      Escalation
                      <span className="ml-2 text-xs text-gray-500">(all partners)</span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-accent">30% permanently</td>
                    <td className="px-4 py-3 text-gray-600">After 10 active referrals</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-sm text-gray-500">
              Commissions are lifetime and recurring. You earn every month the client stays
              subscribed, with no cap and no expiration.
            </p>
          </section>

          {/* Commission math example */}
          <section className="rounded-lg border border-warm-200 bg-white px-6 py-5">
            <h3 className="text-base font-semibold text-navy mb-3">What it adds up to</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-warm-200">
                    <th className="pb-2 font-normal">Tier</th>
                    <th className="pb-2 font-normal">Price/mo</th>
                    <th className="pb-2 font-normal">Per referral/mo</th>
                    <th className="pb-2 font-normal">5 referrals/yr (at 30%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-warm-100 text-gray-700">
                  <tr>
                    <td className="py-2 font-medium text-navy">FR (Facility Response)</td>
                    <td className="py-2">$79</td>
                    <td className="py-2">$23.70</td>
                    <td className="py-2 font-semibold">$1,422</td>
                  </tr>
                  <tr>
                    <td className="py-2 font-medium text-navy">VP (Verified Profile)</td>
                    <td className="py-2">$129</td>
                    <td className="py-2">$38.70</td>
                    <td className="py-2 font-semibold">$2,322</td>
                  </tr>
                  <tr>
                    <td className="py-2 font-medium text-navy">FV (Full Visibility)</td>
                    <td className="py-2">$199</td>
                    <td className="py-2">$59.70</td>
                    <td className="py-2 font-semibold text-accent">$3,582</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-gray-400">
              Based on Founding Partner 30% rate, 5 active referrals. Commissions are lifetime and recurring.
            </p>
          </section>

          {/* Section 4: Payment terms */}
          <section>
            <h2 className="text-xl font-semibold text-navy mb-3">Payment terms</h2>
            <ul className="list-disc list-inside space-y-1 text-gray-700">
              <li>Net 30 monthly via PayPal or Wise</li>
              <li>$50 minimum payout threshold (rolls over if not met)</li>
              <li>180-day cookie window on your referral link</li>
              <li>Manual deal-registration available for guaranteed attribution</li>
              <li>No exclusivity required. You can recommend competing tools without restriction.</li>
            </ul>
          </section>

          {/* Section 5: CTA */}
          <section className="rounded-lg border-2 border-navy bg-navy px-6 py-8 text-center">
            <h2 className="text-2xl font-bold text-white mb-2">Apply to Partner</h2>
            <p className="text-warm-100 mb-6 text-sm">
              Founding Partner spots are capped at 10. We review applications within 2 business days.
            </p>
            <a
              href={APPLY_FORM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block rounded-lg bg-accent px-8 py-3 font-semibold text-white hover:bg-accent-light transition-colors"
            >
              Apply to Partner &rarr;
            </a>
          </section>

          {/* Footer note */}
          <p className="text-sm text-gray-500 text-center">
            Questions?{' '}
            <a
              href="mailto:info@thecareaudit.com"
              className="text-navy underline hover:text-navy-light"
            >
              Email us at info@thecareaudit.com
            </a>
          </p>

        </div>
      </main>
      <Footer />
    </div>
  );
}
