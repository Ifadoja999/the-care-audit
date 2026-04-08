'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, CheckCircle2, Shield, MessageSquare, ChevronRight, AlertTriangle, Eye, FileText, MapPin, Phone } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

interface FacilityResult {
  id: string;
  facility_name: string;
  city: string;
  state: string;
  total_violations: number | null;
  slug: string;
  last_inspection_date?: string;
  licensed_capacity?: number;
  ai_summary?: string;
  address?: string;
  phone?: string;
  report_url?: string;
}

function toTitleCase(str: string): string {
  return str
    .toLowerCase()
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

export default function ForFacilitiesPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FacilityResult[]>([]);
  const [selected, setSelected] = useState<FacilityResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [autoLoading, setAutoLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [emailModal, setEmailModal] = useState<'portal' | 'magic-link' | null>(null);
  const [email, setEmail] = useState('');
  const [emailStatus, setEmailStatus] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState(false);
  const [cancelBanner, setCancelBanner] = useState(false);
  const [isDeepLink, setIsDeepLink] = useState(false);

  // On mount: read URL params for success/cancel banners and facility deep-link
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('success') === 'true') setSuccessBanner(true);
    if (params.get('canceled') === 'true') setCancelBanner(true);

    const facilityId = params.get('facility_id');
    const facilitySlug = params.get('facility_slug');

    if (facilityId || facilitySlug) {
      setAutoLoading(true);
      setIsDeepLink(true);
      const qs = facilityId ? `id=${encodeURIComponent(facilityId)}` : `slug=${encodeURIComponent(facilitySlug!)}`;
      fetch(`/api/facility/lookup?${qs}`)
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data && data.id) {
            setSelected(data);
            setQuery(data.facility_name);
          }
        })
        .catch(() => {})
        .finally(() => setAutoLoading(false));
    }
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
  const showTierCards = !selected || hasInspectionData;
  const showPremiumTiers = !selected || (hasInspectionData && violations <= 3);

  // --- PERSONALIZED VIEW (deep-link OR after search selection) ---
  // Show the full personalized experience once a facility is selected
  if (selected && !autoLoading) {
    return (
      <div className="flex min-h-screen flex-col bg-warm-50">
        <Header />

        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
          {/* Success/Cancel banners */}
          {successBanner && (
            <div className="mb-6 rounded-xl border border-green-200 bg-green-50 p-4 text-green-800">
              Your free 7-day trial is active! Check your email for next steps.
            </div>
          )}
          {cancelBanner && (
            <div className="mb-6 rounded-xl border border-gray-200 bg-gray-50 p-4 text-gray-600">
              Checkout was canceled. You can try again anytime.
            </div>
          )}

          {/* Personalized header */}
          <div className="text-center">
            <p className="text-sm font-medium uppercase tracking-wider text-gray-500">Your listing on The Care Audit</p>
            <h1 className="mt-2 text-3xl font-bold text-gray-900 sm:text-4xl" style={{ fontFamily: 'var(--font-heading)' }}>
              {toTitleCase(selected.facility_name)}
            </h1>
            <p className="mt-2 text-gray-500">
              {selected.address && <span>{toTitleCase(selected.address)}, </span>}
              {toTitleCase(selected.city)}, {selected.state}
              {selected.phone && <span> &middot; {selected.phone}</span>}
            </p>
          </div>

          {/* What families see - the "oh no" section */}
          <div className="mx-auto mt-8 max-w-3xl">
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <div className="border-b border-gray-100 bg-gray-50 px-6 py-4">
                <div className="flex items-center gap-2">
                  <Eye className="h-5 w-5 text-gray-600" />
                  <h2 className="text-lg font-semibold text-gray-900">
                    What families see when they look up your facility
                  </h2>
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  This is publicly visible to anyone searching for assisted living in {toTitleCase(selected.city)}, {selected.state}.
                </p>
              </div>

              <div className="p-6 space-y-5">
                {/* Inspection summary */}
                {hasInspectionData ? (
                  <div className={`rounded-xl p-4 ${violations > 0 ? 'bg-red-50 border border-red-100' : 'bg-green-50 border border-green-100'}`}>
                    <div className="flex items-start gap-3">
                      {violations > 0 ? (
                        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
                      ) : (
                        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-500" />
                      )}
                      <div>
                        <p className={`font-semibold ${violations > 0 ? 'text-red-800' : 'text-green-800'}`}>
                          {violations === 0
                            ? 'No violations found'
                            : `${violations} violation${violations === 1 ? '' : 's'} found`}
                        </p>
                        {selected.last_inspection_date && (
                          <p className={`mt-0.5 text-sm ${violations > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            Most recent inspection: {formatDate(selected.last_inspection_date)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
                      <div>
                        <p className="font-semibold text-amber-800">Inspection data not yet available</p>
                        <p className="mt-0.5 text-sm text-amber-600">
                          We are actively working to add inspection records for facilities in {selected.state}.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* AI Summary - this is the most impactful part */}
                {selected.ai_summary && violations && violations > 0 && (
                  <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                    <div className="flex items-start gap-3">
                      <FileText className="mt-0.5 h-5 w-5 shrink-0 text-gray-500" />
                      <div>
                        <p className="text-sm font-semibold text-gray-700">AI-Generated Summary (visible to families)</p>
                        <p className="mt-2 text-sm leading-relaxed text-gray-600">{selected.ai_summary}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Link to official report */}
                {selected.report_url && (
                  <div className="flex items-center gap-2 px-1">
                    <FileText className="h-4 w-4 shrink-0 text-blue-500" />
                    <a
                      href={selected.report_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-blue-600 underline hover:text-blue-700"
                    >
                      View the official state inspection report
                    </a>
                  </div>
                )}

                {/* What's missing - different messaging based on violation count */}
                {violations !== undefined && violations !== null && violations > 3 ? (
                  /* 4+ violations: urgency around families reading without context */
                  <div className="rounded-xl border border-red-200 bg-red-50/50 p-4">
                    <p className="text-sm font-semibold text-red-800">
                      Right now, families are reading your inspection data without knowing how you&rsquo;ve resolved these issues.
                    </p>
                    <p className="mt-2 text-sm text-red-700">
                      With a Facility Response, you can post an official statement directly on your profile so families see your side of the story.
                    </p>
                  </div>
                ) : (
                  /* 0-3 violations: angle about standing out */
                  <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4">
                    <p className="text-sm font-semibold text-blue-800">
                      Your facility is one of 44,000+ listed on The Care Audit. How will families find you?
                    </p>
                    <p className="mt-2 text-sm text-blue-700">
                      Stand out with a Featured Verified badge, priority placement in search results, facility photos, and a &ldquo;Schedule a Tour&rdquo; button that makes it easy for families to take the next step.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Trust bar */}
          <div className="mx-auto mt-6 max-w-3xl">
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-gray-400">
              <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />44,000+ facilities tracked</span>
              <span className="flex items-center gap-1"><FileText className="h-3.5 w-3.5" />Data from 51 state agencies</span>
              <span className="flex items-center gap-1"><Eye className="h-3.5 w-3.5" />Used by families nationwide</span>
            </div>
          </div>

          {/* Pricing section - now AFTER the listing preview */}
          {showTierCards && (
            <div className="mx-auto mt-10 max-w-3xl">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'var(--font-heading)' }}>
                  {violations && violations > 3
                    ? 'Respond to your inspection findings'
                    : 'Take control of your listing'}
                </h2>
                <p className="mt-2 text-gray-600">
                  {violations && violations > 3
                    ? 'Let families hear your side of the story.'
                    : 'Show families the best version of your facility.'}
                </p>
                <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-green-50 border border-green-200 px-4 py-1.5 text-sm font-medium text-green-800">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  Start free — no charge for 7 days
                </div>
              </div>

              {showPremiumTiers ? (
                <div className="grid gap-6 sm:grid-cols-2">
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
                      {checkoutLoading === 'featured_verified' ? 'Loading...' : 'Start Free 7-Day Trial'}
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
                      {checkoutLoading === 'verified_profile' ? 'Loading...' : 'Start Free 7-Day Trial'}
                    </button>
                  </div>
                </div>
              ) : (
                /* Facility Response only (4+ violations) */
                <div className="mx-auto max-w-md">
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
                      {checkoutLoading === 'facility_response' ? 'Loading...' : 'Start Free 7-Day Trial'}
                    </button>
                  </div>
                </div>
              )}

              {showPremiumTiers && (
                <p className="mt-4 text-center text-sm text-gray-500">
                  Featured Verified and Verified Profile are available to facilities with 3 or fewer violations in their most recent state inspection.
                </p>
              )}
            </div>
          )}

          {/* No inspection data message */}
          {!hasInspectionData && (
            <div className="mx-auto mt-6 max-w-2xl rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center">
              <p className="text-sm leading-relaxed text-amber-800">
                Sponsorship tiers are not yet available for facilities in {selected.state === 'TX' ? 'Texas' : selected.state}. Tier eligibility requires state inspection data, which is not yet available for this state. We are actively working to add inspection records.
              </p>
            </div>
          )}

          {/* Not your facility? */}
          <div className="mx-auto mt-10 max-w-xl text-center">
            <button
              onClick={() => { setSelected(null); setQuery(''); setIsDeepLink(false); setResults([]); }}
              className="text-sm text-blue-600 hover:text-blue-700 underline"
            >
              Not your facility? Search for a different one
            </button>
          </div>

          {/* Already a subscriber */}
          <div className="mx-auto mt-12 max-w-xl rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
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

  // --- GENERIC VIEW (no facility selected yet) ---
  // Clean landing: hero, trust bar, search. No pricing until they find their facility.
  return (
    <div className="flex min-h-screen flex-col bg-warm-50">
      <Header />

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        {/* Success/Cancel banners */}
        {successBanner && (
          <div className="mb-6 rounded-xl border border-green-200 bg-green-50 p-4 text-green-800">
            Your free 7-day trial is active! Check your email for next steps.
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

        {/* Trust bar */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm font-medium text-gray-900">
          <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />44,000+ facilities tracked</span>
          <span className="flex items-center gap-1"><FileText className="h-3.5 w-3.5" />Data from 51 state agencies</span>
          <span className="flex items-center gap-1"><Eye className="h-3.5 w-3.5" />Used by families nationwide</span>
        </div>

        {/* Search */}
        <div className="mx-auto mt-10 max-w-xl">
          <h2 className="mb-3 text-center text-xl font-semibold text-gray-900">
            Find Your Facility to Get Started
          </h2>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setSelected(null); }}
              placeholder="Search by facility name..."
              className="w-full rounded-xl border border-gray-300 bg-white py-3 pl-10 pr-4 text-gray-900 placeholder-gray-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
            {loading && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">Searching&hellip;</div>
            )}
            {results.length > 0 && !selected && (
              <div className="absolute left-0 right-0 top-full z-10 mt-1 rounded-xl border border-gray-200 bg-white shadow-lg">
                {results.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => {
                      setQuery(f.facility_name);
                      setResults([]);
                      // Fetch full facility data (ai_summary, report_url, etc.)
                      fetch(`/api/facility/lookup?id=${encodeURIComponent(f.id)}`)
                        .then(r => r.ok ? r.json() : null)
                        .then(data => { if (data && data.id) setSelected(data); else setSelected(f); })
                        .catch(() => setSelected(f));
                    }}
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
