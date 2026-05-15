import { Globe, Mail, Phone, MapPin, Calendar, ExternalLink } from 'lucide-react';
import Header from '@/components/Header';
import Breadcrumb from '@/components/Breadcrumb';
import Footer from '@/components/Footer';

export const metadata = {
  title: 'Demo: Featured Verified | The Care Audit',
  description: 'See what a Featured Verified profile looks like on The Care Audit: gold badge, photos, facility description, and more.',
  robots: { index: false, follow: false },
};

export default function DemoFeaturedVerifiedPage() {
  return (
    <div className="flex min-h-screen flex-col bg-warm-50">
      <Header />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">

        <Breadcrumb
          items={[
            { label: 'Home', href: '/' },
            { label: 'Georgia', href: '/georgia' },
            { label: 'Atlanta', href: '/georgia/atlanta' },
            { label: 'The Pines at Buckhead' },
          ]}
        />

        {/* Facility Header: Featured Verified uses gold border/bg */}
        <div className="mt-6 rounded-2xl border-2 border-amber-300 bg-amber-50/30 p-6">
          <div className="flex flex-wrap items-start gap-3">
            <h1 className="text-3xl font-bold text-gray-900">
              The Pines at Buckhead
            </h1>
            {/* Featured Verified gold badge */}
            <span className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-gradient-to-r from-amber-50 to-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-navy">
              <svg className="h-3.5 w-3.5 text-amber-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.403 12.652a3 3 0 010-5.304 3 3 0 00-3.75-3.751 3 3 0 00-5.305 0 3 3 0 00-3.751 3.75 3 3 0 000 5.305 3 3 0 003.75 3.751 3 3 0 005.305 0 3 3 0 003.751-3.75zm-2.546-4.46a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
              </svg>
              Featured Verified
            </span>
          </div>
          <p className="mt-2 flex items-center gap-1.5 text-gray-500">
            <MapPin className="h-4 w-4 shrink-0" />
            3240 Peachtree Road NE, Atlanta, Georgia 30305
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-500">
            <Phone className="h-4 w-4 shrink-0" />
            (404) 555-0192
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-sm">
            <Globe className="h-4 w-4 shrink-0 text-gray-400" />
            <a href="https://pinesatbuckhead.example.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
              pinesatbuckhead.example.com
            </a>
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-sm">
            <Mail className="h-4 w-4 shrink-0 text-gray-400" />
            <a href="mailto:info@pinesatbuckhead.example.com" className="text-blue-600 hover:underline">
              info@pinesatbuckhead.example.com
            </a>
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
            <span>Assisted Living Facility</span>
            <span className="text-gray-300">|</span>
            <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />Last inspected February 21, 2025</span>
          </div>
          <p className="mt-2 text-xs text-gray-400">
            Inspection data is sourced from official state health department portals and refreshed on a rolling schedule.
          </p>
        </div>

        {/* Photo Gallery: Featured Verified only */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4">
          <div className="relative aspect-[4/3] overflow-hidden rounded-xl">
            <img
              src="/demo/pines-photo-1.png"
              alt="The Pines at Buckhead common area"
              className="h-full w-full object-cover"
            />
          </div>
          <div className="relative aspect-[4/3] overflow-hidden rounded-xl">
            <img
              src="/demo/pines-photo-2.png"
              alt="The Pines at Buckhead outdoor garden"
              className="h-full w-full object-cover"
            />
          </div>
        </div>

        {/* CTA: TOP */}
        <div className="mt-6 rounded-2xl border border-warm-200 bg-white p-6 shadow-sm text-center">
          <p className="text-sm text-gray-500 mb-4">
            This is a demo of the <strong>Featured Verified</strong> tier ($149/mo). Get a gold badge, photo gallery, tour scheduling, and top placement where families are searching.
          </p>
          <a
            href="/for-facilities"
            className="inline-flex items-center gap-2 rounded-xl bg-navy px-6 py-3.5 font-semibold text-white shadow-sm transition-all hover:bg-navy-light hover:shadow-md"
          >
            Start your 7-day free trial
          </a>
        </div>

        {/* Facility Description */}
        <div className="mt-6 rounded-2xl border border-warm-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900" style={{ fontFamily: 'var(--font-heading)' }}>
            About This Facility
          </h2>
          <p className="mt-0.5 text-xs text-gray-400">Provided by the facility</p>
          <p className="mt-3 leading-relaxed text-gray-700">
            The Pines at Buckhead has provided premier assisted living and memory care in Atlanta&apos;s Buckhead neighborhood for over 20 years. Our person-centered care model ensures each resident receives a customized care plan developed with their family and physician. We offer resort-style amenities including chef-prepared meals, daily fitness classes, art and music therapy, and a full calendar of social events. Our staff maintains a high caregiver-to-resident ratio and is available 24 hours a day, 7 days a week.
          </p>
        </div>

        {/* Schedule a Tour: Featured Verified only */}
        <div className="mt-6">
          <a
            href="https://pinesatbuckhead.example.com/tour"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-6 py-3.5 font-semibold text-white shadow-sm transition-all hover:bg-amber-600 hover:shadow-md"
          >
            <Calendar className="h-5 w-5" />
            Schedule a Tour
          </a>
        </div>

        {/* Violation Summary */}
        <div className="mt-8 rounded-2xl border border-warm-200 bg-white p-8 shadow-sm">
          <div className="flex flex-col items-center text-center">
            <p className="text-xl font-semibold text-gray-800">1 violation cited</p>
            <p className="mt-1 text-sm text-green-700 font-medium">Well below the Georgia state average of 5.2</p>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm text-gray-500">
              <span>Last inspected: February 21, 2025</span>
              <span className="text-gray-300">|</span>
              <span>Licensed for 56 beds</span>
            </div>
          </div>
        </div>

        {/* AI Summary */}
        <div className="mt-8 rounded-2xl border border-warm-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900" style={{ fontFamily: 'var(--font-heading)' }}>
            AI-Generated Summary
          </h2>
          <p className="mt-2 leading-relaxed text-gray-700">
            The Pines at Buckhead has 1 violation cited on its most recent state inspection, well below the Georgia state average of 5.2. The facility has been continuously licensed and operating in Atlanta for over 20 years. It is licensed for up to 56 residents. The single violation cited was an administrative documentation deficiency with no impact on resident care.
          </p>
          <p className="mt-2 text-xs text-gray-400">
            AI-generated summary &copy; {new Date().getFullYear()} ConvoLogic LLC / The Care Audit. Unauthorized reproduction prohibited.
          </p>
          <p className="mt-4 rounded-lg bg-amber-50 p-3 text-xs leading-relaxed text-amber-800">
            ⚠️ This summary was generated by artificial intelligence based on official state inspection reports. It may contain errors or omissions. It is not a professional assessment and should not be the sole basis for any decision. Always refer to the official inspection report for complete and authoritative information.
          </p>
        </div>

        {/* Official Report */}
        <div className="mt-8">
          <a
            href="/for-facilities"
            className="inline-flex items-center gap-2 rounded-xl bg-navy px-6 py-3.5 font-semibold text-white shadow-sm transition-all duration-200 hover:bg-navy-light hover:shadow-md"
          >
            <ExternalLink className="h-5 w-5" />
            View Official State Inspection Report
          </a>
          <p className="mt-2 text-xs text-gray-400">Opens original document on the state government website</p>
        </div>

        {/* CTA: BOTTOM */}
        <div className="mt-8 rounded-2xl border border-warm-200 bg-white p-6 shadow-sm text-center">
          <p className="text-sm text-gray-500 mb-4">
            Ready to stand out with a gold badge, photos, and tour scheduling on your profile?
          </p>
          <a
            href="/for-facilities"
            className="inline-flex items-center gap-2 rounded-xl bg-navy px-6 py-3.5 font-semibold text-white shadow-sm transition-all hover:bg-navy-light hover:shadow-md"
          >
            Start your 7-day free trial
          </a>
          <p className="mt-3 text-xs text-gray-400">7-day free trial. Card required. Cancel anytime.</p>
        </div>

      </main>
      <Footer />
    </div>
  );
}
