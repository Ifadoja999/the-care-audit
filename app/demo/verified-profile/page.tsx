export const metadata = {
  title: 'Demo: Verified Profile | The Care Audit',
  description:
    'See what a Verified Profile looks like on The Care Audit — claimed, clean record, full facility description.',
  robots: { index: false, follow: false },
};

import { CheckCircle2, Globe, Mail, Phone, MapPin, Calendar } from 'lucide-react';
import Header from '@/components/Header';
import Breadcrumb from '@/components/Breadcrumb';
import Footer from '@/components/Footer';

export default function DemoVerifiedProfilePage() {
  return (
    <div className="flex min-h-screen flex-col bg-warm-50">
      <Header />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
        <Breadcrumb
          items={[
            { label: 'Home', href: '/' },
            { label: 'Colorado', href: '/colorado' },
            { label: 'Boulder', href: '/colorado/boulder' },
            { label: 'Maplewood Gardens Assisted Living' },
          ]}
        />

        {/* Facility Header card */}
        <div className="mt-6 rounded-2xl border border-warm-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start gap-3">
            <h1
              className="text-3xl font-bold text-gray-900"
            >
              Maplewood Gardens Assisted Living
            </h1>
            {/* Claimed badge — gray */}
            <span className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Claimed
            </span>
          </div>
          <p className="mt-2 flex items-center gap-1.5 text-gray-500">
            <MapPin className="h-4 w-4 shrink-0" />
            1842 Oakwood Drive, Boulder, Colorado 80301
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-500">
            <Phone className="h-4 w-4 shrink-0" />
            (720) 555-0183
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-sm">
            <Globe className="h-4 w-4 shrink-0 text-gray-400" />
            <a
              href="https://maplewoodgardens.example.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              maplewoodgardens.example.com
            </a>
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-sm">
            <Mail className="h-4 w-4 shrink-0 text-gray-400" />
            <a
              href="mailto:info@maplewoodgardens.example.com"
              className="text-blue-600 hover:underline"
            >
              info@maplewoodgardens.example.com
            </a>
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
            <span>Assisted Living Facility</span>
            <span className="text-gray-300">|</span>
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              Last inspected March 14, 2025
            </span>
          </div>
          <p className="mt-2 text-xs text-gray-400">
            Inspection data is sourced from official state health department portals and refreshed on
            a rolling schedule.
          </p>
        </div>

        {/* CTA button — TOP */}
        <div className="mt-6 rounded-2xl border border-warm-200 bg-white p-6 shadow-sm text-center">
          <p className="text-sm text-gray-500 mb-4">
            This is a demo of the <strong>Verified Profile</strong> tier ($79/mo). Claim your
            facility profile and show families your story.
          </p>
          <a
            href="/for-facilities"
            className="inline-flex items-center gap-2 rounded-xl bg-navy px-6 py-3.5 font-semibold text-white shadow-sm transition-all hover:bg-navy-light hover:shadow-md"
          >
            Start your 7-day free trial
          </a>
        </div>

        {/* Facility Description block */}
        <div className="mt-6 rounded-2xl border border-warm-200 bg-white p-6 shadow-sm">
          <h2
            className="text-lg font-semibold text-gray-900"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            About This Facility
          </h2>
          <p className="mt-0.5 text-xs text-gray-400">Provided by the facility</p>
          <p className="mt-3 leading-relaxed text-gray-700">
            Maplewood Gardens has served Boulder families since 1998, providing personalized memory
            care and assisted living services in a warm, home-like environment. Our dedicated staff
            maintains a 4:1 resident-to-caregiver ratio during all waking hours. We offer daily
            wellness activities, chef-prepared meals tailored to resident preferences, and a secure
            outdoor garden. Our team works closely with each resident&apos;s care team to ensure
            seamless transitions and ongoing health monitoring.
          </p>
        </div>

        {/* Violation Summary card */}
        <div className="mt-8 rounded-2xl border border-warm-200 bg-white p-8 shadow-sm">
          <div className="flex flex-col items-center text-center">
            <p className="text-xl font-semibold text-gray-800">2 violations cited</p>
            <p className="mt-1 text-sm text-green-700 font-medium">
              Below the Colorado state average of 4.7
            </p>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm text-gray-500">
              <span>Last inspected: March 14, 2025</span>
              <span className="text-gray-300">|</span>
              <span>Licensed for 48 beds</span>
            </div>
          </div>
        </div>

        {/* AI Summary block */}
        <div className="mt-8 rounded-2xl border border-warm-200 bg-white p-6 shadow-sm">
          <h2
            className="text-lg font-semibold text-gray-900"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            AI-Generated Summary
          </h2>
          <p className="mt-2 leading-relaxed text-gray-700">
            Maplewood Gardens Assisted Living has 2 violations cited on its most recent state
            inspection, below the Colorado state average of 4.7. The facility has been licensed and
            operating continuously since 1998. It is licensed for up to 48 residents. The violations
            cited were minor administrative deficiencies and did not involve direct resident harm.
          </p>
          <p className="mt-2 text-xs text-gray-400">
            AI-generated summary &copy; {new Date().getFullYear()} ConvoLogic LLC / The Care Audit.
            Unauthorized reproduction prohibited.
          </p>
          <p className="mt-4 rounded-lg bg-amber-50 p-3 text-xs leading-relaxed text-amber-800">
            ⚠️ This summary was generated by artificial intelligence based on official state
            inspection reports. It may contain errors or omissions. It is not a professional
            assessment and should not be the sole basis for any decision.
          </p>
        </div>

        {/* Official Report placeholder */}
        <div className="mt-8">
          <a
            href="/for-facilities"
            className="inline-flex items-center gap-2 rounded-xl bg-navy px-6 py-3.5 font-semibold text-white shadow-sm transition-all duration-200 hover:bg-navy-light hover:shadow-md"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
            View Official State Inspection Report
          </a>
          <p className="mt-2 text-xs text-gray-400">Opens original document on the state government website</p>
        </div>

        {/* CTA button — BOTTOM */}
        <div className="mt-8 rounded-2xl border border-warm-200 bg-white p-6 shadow-sm text-center">
          <p className="text-sm text-gray-500 mb-4">
            Ready to claim your profile and reach families researching care options?
          </p>
          <a
            href="/for-facilities"
            className="inline-flex items-center gap-2 rounded-xl bg-navy px-6 py-3.5 font-semibold text-white shadow-sm transition-all hover:bg-navy-light hover:shadow-md"
          >
            Start your 7-day free trial
          </a>
          <p className="mt-3 text-xs text-gray-400">
            7-day free trial. Card required. Cancel anytime.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
