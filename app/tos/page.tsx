import type { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Terms of Service | The Care Audit',
  description: 'Terms of Service for The Care Audit, operated by ConvoLogic LLC.',
  robots: { index: false },
};

export default function TermsOfServicePage() {
  const effectiveDate = 'April 23, 2026';

  return (
    <div className="flex min-h-screen flex-col bg-warm-50">
      <Header />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12">
        <h1 className="text-3xl font-bold text-gray-900">Terms of Service</h1>
        <p className="mt-2 text-sm text-gray-500">Effective date: {effectiveDate}</p>

        <div className="mt-8 space-y-8">

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-gray-900">1. Acceptance of Terms</h2>
            <p className="text-sm leading-relaxed text-gray-700">
              By accessing or using The Care Audit (thecareaudit.com), operated by ConvoLogic LLC
              (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;), you agree to be bound by these Terms of Service. If you do
              not agree to all terms, you may not use this site.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-gray-900">2. Permitted Use</h2>
            <p className="text-sm leading-relaxed text-gray-700">
              The Care Audit is provided for personal, non-commercial, informational use only. You
              may browse, search, and read facility information for the purpose of researching
              assisted living options for yourself or your family.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-gray-900">3. Prohibited Uses</h2>
            <p className="text-sm leading-relaxed text-gray-700">The following uses are strictly prohibited:</p>
            <ul className="list-disc pl-5 space-y-1 text-sm leading-relaxed text-gray-700">
              <li>Scraping, crawling, or automated data collection of any kind from this site</li>
              <li>Reproducing, republishing, licensing, selling, or commercially exploiting
                  AI-generated summaries or any other original content from this site</li>
              <li>Using The Care Audit data, structure, or methodology to build a competing
                  directory, product, or service</li>
              <li>Copying our facility tier system, monetization model, or URL architecture
                  for use in any other product</li>
              <li>Framing, mirroring, or deep-linking this site without written permission</li>
              <li>Using this site in any way that violates applicable laws or regulations</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-gray-900">4. Intellectual Property</h2>
            <p className="text-sm leading-relaxed text-gray-700">
              All AI-generated summaries, original content, UI components, data compilations,
              software code, and brand assets on this site are the exclusive property of
              ConvoLogic LLC and are protected by U.S. copyright law. The mark &ldquo;The Care Audit&rdquo;
              is a trademark of ConvoLogic LLC.
            </p>
            <p className="text-sm leading-relaxed text-gray-700">
              Government-sourced data (facility names, addresses, inspection dates, license
              numbers, and verbatim violation records) is public domain. Our presentation,
              curation, summaries, and organization of that data are not.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-gray-900">5. DMCA Policy</h2>
            <p className="text-sm leading-relaxed text-gray-700">
              If you believe content on this site infringes your copyright, or if you wish to
              report unauthorized use of our copyrighted content, contact us at:
            </p>
            <p className="text-sm leading-relaxed text-gray-700">
              <strong>DMCA Agent:</strong> ConvoLogic LLC<br />
              <strong>Email:</strong> info@thecareaudit.com<br />
              <strong>Subject line:</strong> DMCA Notice
            </p>
            <p className="text-sm leading-relaxed text-gray-700">
              Include: identification of the work claimed to be infringed, identification of the
              infringing material and its location, your contact information, and a statement that
              the information in your notice is accurate and that you are the copyright owner or
              authorized to act on their behalf.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-gray-900">6. Disclaimer of Warranties</h2>
            <p className="text-sm leading-relaxed text-gray-700">
              This site is provided &ldquo;as is&rdquo; without warranty of any kind. Facility information is
              sourced from official state health department records but may contain errors,
              omissions, or outdated data. AI-generated summaries may contain inaccuracies.
              Nothing on this site constitutes professional healthcare, legal, or financial advice.
              The Care Audit does not conduct inspections, assign ratings, or make facility
              recommendations.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-gray-900">7. Limitation of Liability</h2>
            <p className="text-sm leading-relaxed text-gray-700">
              To the maximum extent permitted by law, ConvoLogic LLC shall not be liable for any
              indirect, incidental, special, or consequential damages arising from your use of
              this site or reliance on its content.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-gray-900">8. Governing Law</h2>
            <p className="text-sm leading-relaxed text-gray-700">
              These Terms are governed by the laws of the State of Louisiana, without regard to
              conflict of law principles. Any disputes shall be resolved in the courts of Louisiana.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-gray-900">9. Changes to Terms</h2>
            <p className="text-sm leading-relaxed text-gray-700">
              We may update these Terms at any time. Continued use of the site after changes
              constitutes acceptance of the revised Terms. The effective date above reflects
              the most recent update.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-gray-900">10. Contact</h2>
            <p className="text-sm leading-relaxed text-gray-700">
              Questions about these Terms? Email us at{' '}
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
