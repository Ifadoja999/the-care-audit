import type { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Privacy Policy | The Care Audit',
  description: 'Privacy Policy for The Care Audit, operated by ConvoLogic LLC.',
  robots: { index: false },
};

export default function PrivacyPolicyPage() {
  const effectiveDate = 'April 23, 2026';

  return (
    <div className="flex min-h-screen flex-col bg-warm-50">
      <Header />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12">
        <h1 className="text-3xl font-bold text-gray-900">Privacy Policy</h1>
        <p className="mt-2 text-sm text-gray-500">Effective date: {effectiveDate}</p>

        <div className="mt-8 space-y-8">

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-gray-900">1. Who We Are</h2>
            <p className="text-sm leading-relaxed text-gray-700">
              The Care Audit (thecareaudit.com) is operated by ConvoLogic LLC. We provide a
              searchable directory of assisted living facility inspection data. Contact us at{' '}
              <a href="mailto:info@thecareaudit.com" className="text-navy underline hover:text-blue-700">
                info@thecareaudit.com
              </a>.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-gray-900">2. Information We Collect</h2>
            <p className="text-sm font-medium text-gray-700">Information you provide:</p>
            <ul className="list-disc pl-5 space-y-1 text-sm leading-relaxed text-gray-700">
              <li>Contact form submissions (name, email, message)</li>
              <li>Facility account information (if you claim a facility profile)</li>
              <li>Payment information (processed by Stripe &mdash; we do not store card numbers)</li>
            </ul>
            <p className="text-sm font-medium text-gray-700">Information collected automatically:</p>
            <ul className="list-disc pl-5 space-y-1 text-sm leading-relaxed text-gray-700">
              <li>IP address and browser/device type (via Vercel hosting infrastructure)</li>
              <li>Pages visited, search queries, and session data (via Google Analytics 4)</li>
              <li>Email delivery and open data (via Resend transactional email)</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-gray-900">3. How We Use Your Information</h2>
            <ul className="list-disc pl-5 space-y-1 text-sm leading-relaxed text-gray-700">
              <li>To respond to contact form inquiries</li>
              <li>To process facility account subscriptions and payments</li>
              <li>To improve the site based on usage analytics</li>
              <li>To send transactional emails related to your account (if applicable)</li>
              <li>To detect and prevent abuse, scraping, or unauthorized access</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-gray-900">4. Third-Party Services</h2>
            <p className="text-sm leading-relaxed text-gray-700">We use the following third-party services that may process your data:</p>
            <ul className="list-disc pl-5 space-y-1 text-sm leading-relaxed text-gray-700">
              <li><strong>Google Analytics 4</strong> &mdash; Usage analytics (anonymized IP)</li>
              <li><strong>Stripe</strong> &mdash; Payment processing (PCI-compliant)</li>
              <li><strong>Vercel</strong> &mdash; Hosting and edge infrastructure</li>
              <li><strong>Resend</strong> &mdash; Transactional email delivery</li>
              <li><strong>Supabase</strong> &mdash; Database infrastructure</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-gray-900">5. Cookies</h2>
            <p className="text-sm leading-relaxed text-gray-700">
              We use minimal cookies: session cookies for functionality and analytics cookies
              from Google Analytics. We do not use advertising cookies or sell your data to
              advertisers.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-gray-900">6. Data Retention</h2>
            <p className="text-sm leading-relaxed text-gray-700">
              Contact form submissions are retained for up to 12 months. Payment records are
              retained as required by law. Analytics data is retained per Google Analytics
              default settings (14 months).
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-gray-900">7. Your Rights</h2>
            <p className="text-sm leading-relaxed text-gray-700">
              You may request access to, correction of, or deletion of your personal data by
              emailing info@thecareaudit.com. We will respond within 30 days.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-gray-900">8. Children&apos;s Privacy</h2>
            <p className="text-sm leading-relaxed text-gray-700">
              This site is not directed at children under 13. We do not knowingly collect
              personal information from children.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-gray-900">9. Changes to This Policy</h2>
            <p className="text-sm leading-relaxed text-gray-700">
              We may update this policy at any time. The effective date above reflects the
              most recent update.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-gray-900">10. Contact</h2>
            <p className="text-sm leading-relaxed text-gray-700">
              Privacy questions? Email us at{' '}
              <a href="mailto:info@thecareaudit.com" className="text-navy underline hover:text-blue-700">
                info@thecareaudit.com
              </a>.
            </p>
          </section>

        </div>
      </main>
      <Footer />
    </div>
  );
}
