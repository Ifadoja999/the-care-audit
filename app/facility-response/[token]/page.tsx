'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

interface FacilityData {
  id: string;
  facility_name: string;
  phone: string | null;
  address: string | null;
  facility_response: string | null;
  slug: string;
}

function toTitleCase(str: string): string {
  return str.toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

export default function FacilityResponsePage() {
  const { token } = useParams<{ token: string }>();
  const [facility, setFacility] = useState<FacilityData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const [response, setResponse] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/facility-response/${token}`);
        const data = await res.json();
        if (!res.ok) { setError(data.error || 'Invalid or expired link.'); return; }
        setFacility(data);
        setResponse(data.facility_response || '');
        setPhone(data.phone || '');
        setAddress(data.address || '');
      } catch { setError('Failed to load facility data.'); }
      finally { setLoading(false); }
    }
    load();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!facility) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/facility-response/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          facility_response: response || null,
          phone: phone || null,
          address: address || null,
        }),
      });
      if (res.ok) {
        setSuccess(true);
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to save. Please try again.');
      }
    } catch { alert('Something went wrong. Please try again.'); }
    finally { setSubmitting(false); }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-warm-50">
        <Header />
        <main className="flex flex-1 items-center justify-center"><p className="text-gray-500">Loading...</p></main>
        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col bg-warm-50">
        <Header />
        <main className="flex flex-1 items-center justify-center px-4">
          <div className="max-w-md rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">
            <h1 className="text-xl font-bold text-gray-900">Invalid Link</h1>
            <p className="mt-2 text-gray-600">{error}</p>
            <Link href="/for-facilities" className="mt-4 inline-block text-blue-600 hover:underline">
              Go to For Facilities
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex min-h-screen flex-col bg-warm-50">
        <Header />
        <main className="flex flex-1 items-center justify-center px-4">
          <div className="max-w-md rounded-2xl border border-green-200 bg-white p-8 text-center shadow-sm">
            <h1 className="text-xl font-bold text-gray-900">Response Published!</h1>
            <p className="mt-2 text-gray-600">Your response has been published on your facility&rsquo;s profile page.</p>
            {facility && (
              <Link href={`/${facility.slug}`} className="mt-4 inline-block rounded-xl bg-blue-600 px-6 py-2.5 font-semibold text-white hover:bg-blue-700">
                View Your Facility Page
              </Link>
            )}
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-warm-50">
      <Header />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'var(--font-heading)' }}>
          Post Your Official Response
        </h1>
        {facility && (
          <p className="mt-1 text-gray-500">{toTitleCase(facility.facility_name)}</p>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div>
            <label className="block text-sm font-medium text-gray-700">Official Response</label>
            <p className="mt-0.5 text-xs text-gray-500">
              Write your official response. This will appear on your facility&rsquo;s profile page below the inspection summary.
            </p>
            <textarea
              value={response}
              onChange={(e) => setResponse(e.target.value.slice(0, 1000))}
              rows={6}
              className="mt-1 w-full rounded-xl border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
            <p className="mt-1 text-right text-xs text-gray-400">{response.length}/1,000</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Preferred Phone Number</label>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
              className="mt-1 w-full rounded-xl border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Physical Address</label>
            <input type="text" value={address} onChange={(e) => setAddress(e.target.value)}
              className="mt-1 w-full rounded-xl border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200" />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-blue-600 py-3 font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? 'Saving...' : 'Publish Response'}
          </button>
        </form>
      </main>
      <Footer />
    </div>
  );
}
