'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Search, CheckCircle2, Shield, MessageSquare, ChevronRight } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

interface FacilityResult {
  id: string;
  facility_name: string;
  city: string;
  state: string;
  total_violations: number | null;
  slug: string;
}

function toTitleCase(str: string): string {
  return str
    .toLowerCase()
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export default function ForFacilitiesPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FacilityResult[]>([]);
  const [selected, setSelected] = useState<FacilityResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [emailModal, setEmailModal] = useState<'portal' | 'magic-link' | null>(null);
  const [email, setEmail] = useState('');
  const [emailStatus, setEmailStatus] = useState<string | null>(null);

  // Read success/cancel from URL
  const [successBanner, setSuccessBanner] = useState(false);
  const [cancelBanner, setCancelBanner] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('success') === 'true') setSuccessBanner(true);
    if (params.get('canceled') === 'true') setCancelBanner(true);
  }, []);

  const searchFacilities = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      const facilities = (data.results || []).filter((r: { type?: string }) => r.type !== 'state');
      setResults(facilities.slice(0, 8));
    } catch { setResults([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => searchFacilities(query), 300);
    return () => clearTimeout(timer);
  }, [query, searchFacilities]);

  const handleCheckout = async (tier: string) => {
    if (!selected) return;
    setCheckoutLoading(tier);
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ facility_id: selected.id, tier }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || 'Failed to create checkout session');
      }
    } catch {
      alert('Something went wrong. Please try again.');
    } finally {
      setCheckoutLoading(null);
    }
  };

  const handleEmailSubmit = async (type: 'portal' | 'magic-link') => {
    if (!email) return;
    setEmailStatus('sending');
    try {
      const endpoint = type === 'portal'
        ? '/api/stripe/portal'
        : '/api/facility/send-magic-link';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (type === 'portal' && data.url) {
        window.location.href = data.url;
        return;
      }

      if (data.success || data.url) {
        setEmailStatus('success');
      } else {
        setEmailStatus(data.error || 'Not found');
      }
    } catch {
      setEmailStatus('Something went wrong. Please try again.');
    }
  };

  const violations = selected?.total_violations;
  const hasInspectionData = violations !== null && violations !== undefined;
  const showPremiumTiers = hasInspectionData && violations <= 3;

  return (
    <div className="flex min-h-screen flex-col bg-warm-50">
      <Header />

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        {/* Success/Cancel banners */}
        {successBanner && (
          <div className="mb-6 rounded-xl border border-green-200 bg-green-50 p-4 text-green-800">
            Your subscription is active! Check your email for next steps.
          </div>
        )}
        {cancelBanner && (
          <div className="mb-6 rounded-xl border border-gray-200 bg-gray-50 p-4 text-gray-600">
            Checkout was canceled. You can try again anytime.
          </div>
        )}

        {/* Hero */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl" style={{ fontFamily: 'var(--font-heading)' }}>
            Enhance Your Facility&rsquo;s Listing on The Care Audit
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-600">
            Thousands of families use The Care Audit every month to research assisted living facilities. Make sure they see the best version of yours.
          </p>
        </div>

        {/* Search */}
        <div className="mx-auto mt-10 max-w-xl">
          <h2 className="mb-3 text-center text-xl font-semibold text-gray-900">Find Your Facility</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setSelected(null); }}
              placeholder="Search by facility name..."
              className="w-full rounded-xl border border-gray-300 bg-white py-3 pl-10 pr-4 text-gray-900 placeholder-gray-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
            {results.length > 0 && !selected && (
              <div className="absolute left-0 right-0 top-full z-10 mt-1 rounded-xl border border-gray-200 bg-white shadow-lg">
                {results.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => { setSelected(f); setQuery(f.facility_name); setResults([]); }}
                    className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-gray-50 first:rounded-t-xl last:rounded-b-xl"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{toTitleCase(f.facility_name)}</p>
                      <p className="text-sm text-gray-500">{toTitleCase(f.city)}, {f.state}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Selected facility info */}
        {selected && (
          <div className="mx-auto mt-6 max-w-xl rounded-xl border border-gray-200 bg-white p-4 text-center shadow-sm">
            <p className="text-lg font-semibold text-gray-900">{toTitleCase(selected.facility_name)}</p>
            <p className="text-sm text-gray-500">{toTitleCase(selected.city)}, {selected.state}</p>
            <p className="mt-1 text-sm text-gray-600">
              {!hasInspectionData
                ? 'Inspection data not yet available'
                : violations === 0
                  ? 'No violations'
                  : `${violations} violation${violations === 1 ? '' : 's'}`}{hasInspectionData ? ' in most recent inspection' : ''}
            </p>
          </div>
        )}

        {/* No inspection data message */}
        {selected && !hasInspectionData && (
          <div className="mx-auto mt-8 max-w-2xl rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center">
            <p className="text-sm leading-relaxed text-amber-800">
              Sponsorship tiers are not yet available for facilities in {selected.state === 'TX' ? 'Texas' : selected.state}. Tier eligibility requires state inspection data, which is not yet available for this state. We are actively working to add inspection records.
            </p>
          </div>
        )}

        {/* Tier cards */}
        {selected && hasInspectionData && (
          <div className="mt-8">
            <div className={`mx-auto grid max-w-3xl gap-6 ${showPremiumTiers ? 'sm:grid-cols-2' : 'max-w-md'}`}>
              {showPremiumTiers && (
                <>
                  {/* Featured Verified */}
                  <div className="rounded-2xl border-2 border-amber-300 bg-white p-6 shadow-md">
                    <div className="mb-4 flex items-center gap-2">
                      <Shield className="h-6 w-6 text-amber-500" />
                      <h3 className="text-xl font-bold text-gray-900">Featured Verified</h3>
                    </div>
                    <p className="text-3xl font-bold text-gray-900">$149<span className="text-base font-normal text-gray-500">/month</span></p>
                    <ul className="mt-4 space-y-2 text-sm text-gray-700">
                      <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />Featured Verified badge on your profile</li>
                      <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />Priority placement on city and state pages</li>
                      <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />Up to 4 facility photos</li>
                      <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />&ldquo;Schedule a Tour&rdquo; button</li>
                      <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />Updated contact info (phone, address, website, email)</li>
                      <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />Facility description</li>
                    </ul>
                    <button
                      onClick={() => handleCheckout('featured_verified')}
                      disabled={checkoutLoading !== null}
                      className="mt-6 w-full rounded-xl bg-amber-500 py-3 font-semibold text-white transition-colors hover:bg-amber-600 disabled:opacity-50"
                    >
                      {checkoutLoading === 'featured_verified' ? 'Loading...' : 'Start Monthly Subscription'}
                    </button>
                  </div>

                  {/* Verified Profile */}
                  <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                    <div className="mb-4 flex items-center gap-2">
                      <CheckCircle2 className="h-6 w-6 text-slate-500" />
                      <h3 className="text-xl font-bold text-gray-900">Verified Profile</h3>
                    </div>
                    <p className="text-3xl font-bold text-gray-900">$79<span className="text-base font-normal text-gray-500">/month</span></p>
                    <ul className="mt-4 space-y-2 text-sm text-gray-700">
                      <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />&ldquo;Claimed&rdquo; badge on your profile</li>
                      <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />Updated contact info (phone, address, website, email)</li>
                      <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />Facility description</li>
                    </ul>
                    <button
                      onClick={() => handleCheckout('verified_profile')}
                      disabled={checkoutLoading !== null}
                      className="mt-6 w-full rounded-xl bg-gray-800 py-3 font-semibold text-white transition-colors hover:bg-gray-900 disabled:opacity-50"
                    >
                      {checkoutLoading === 'verified_profile' ? 'Loading...' : 'Start Monthly Subscription'}
                    </button>
                  </div>
                </>
              )}

              {!showPremiumTiers && (
                <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                  <div className="mb-4 flex items-center gap-2">
                    <MessageSquare className="h-6 w-6 text-gray-500" />
                    <h3 className="text-xl font-bold text-gray-900">Facility Response</h3>
                  </div>
                  <p className="text-3xl font-bold text-gray-900">$49<span className="text-base font-normal text-gray-500">/month</span></p>
                  <ul className="mt-4 space-y-2 text-sm text-gray-700">
                    <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-gray-500" />Post an official response on your profile page</li>
                    <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-gray-500" />Update your phone number and address</li>
                  </ul>
                  <p className="mt-3 text-xs text-gray-500">Your violation data will remain exactly as reported by state inspectors.</p>
                  <button
                    onClick={() => handleCheckout('facility_response')}
                    disabled={checkoutLoading !== null}
                    className="mt-6 w-full rounded-xl bg-gray-800 py-3 font-semibold text-white transition-colors hover:bg-gray-900 disabled:opacity-50"
                  >
                    {checkoutLoading === 'facility_response' ? 'Loading...' : 'Start Monthly Subscription'}
                  </button>
                </div>
              )}
            </div>

            <p className="mx-auto mt-6 max-w-2xl text-center text-sm text-gray-500">
              Featured Verified and Verified Profile are available to facilities with 3 or fewer violations in their most recent state inspection.
            </p>
          </div>
        )}

        {/* Already a subscriber */}
        <div className="mx-auto mt-16 max-w-xl rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900">Already a subscriber?</h3>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              onClick={() => { setEmailModal('portal'); setEmail(''); setEmailStatus(null); }}
              className="rounded-xl border border-gray-300 px-6 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              Manage your subscription
            </button>
            <button
              onClick={() => { setEmailModal('magic-link'); setEmail(''); setEmailStatus(null); }}
              className="rounded-xl border border-gray-300 px-6 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              Update your listing
            </button>
          </div>
        </div>
      </main>

      {/* Email modal */}
      {emailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">
              {emailModal === 'portal' ? 'Manage Your Subscription' : 'Update Your Listing'}
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              Enter your email and {emailModal === 'portal' ? "we'll open your subscription management page" : "we'll send you an update link"}.
            </p>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="mt-4 w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
            {emailStatus === 'success' && (
              <p className="mt-3 text-sm text-green-600">Check your email for the link!</p>
            )}
            {emailStatus && emailStatus !== 'success' && emailStatus !== 'sending' && (
              <p className="mt-3 text-sm text-red-600">{emailStatus}</p>
            )}
            <div className="mt-4 flex gap-3">
              <button
                onClick={() => setEmailModal(null)}
                className="flex-1 rounded-xl border border-gray-300 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleEmailSubmit(emailModal)}
                disabled={!email || emailStatus === 'sending'}
                className="flex-1 rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {emailStatus === 'sending' ? 'Sending...' : 'Continue'}
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
