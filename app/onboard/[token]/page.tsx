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
  website_url: string | null;
  contact_email: string | null;
  facility_description: string | null;
  sponsor_tier: string | null;
  slug: string;
  city: string;
  state: string;
}

function toTitleCase(str: string): string {
  return str.toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

export default function OnboardPage() {
  const { token } = useParams<{ token: string }>();
  const [facility, setFacility] = useState<FacilityData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Form fields
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [description, setDescription] = useState('');
  const [tourUrl, setTourUrl] = useState('');

  useEffect(() => {
    async function loadFacility() {
      try {
        const res = await fetch(`/api/onboard/${token}`);
        const data = await res.json();
        if (!res.ok) { setError(data.error || 'Invalid or expired link.'); return; }
        setFacility(data);
        setPhone(data.phone || '');
        setAddress(data.address || '');
        setWebsiteUrl(data.website_url || '');
        setContactEmail(data.contact_email || '');
        setDescription(data.facility_description || '');
      } catch { setError('Failed to load facility data.'); }
      finally { setLoading(false); }
    }
    loadFacility();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!facility) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/onboard/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: phone || null,
          address: address || null,
          website_url: websiteUrl || null,
          contact_email: contactEmail || null,
          facility_description: description || null,
          tour_url: tourUrl || null,
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

  const isTier1 = facility?.sponsor_tier === 'featured_verified';

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
            <h1 className="text-xl font-bold text-gray-900">Profile Updated!</h1>
            <p className="mt-2 text-gray-600">Your profile has been updated! Changes are live on your facility page.</p>
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
          Complete Your {isTier1 ? 'Featured' : 'Verified'} Profile
        </h1>
        {facility && (
          <p className="mt-1 text-gray-500">{toTitleCase(facility.facility_name)}</p>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
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

          <div>
            <label className="block text-sm font-medium text-gray-700">Website URL</label>
            <input type="url" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)}
              placeholder="https://..."
              className="mt-1 w-full rounded-xl border border-gray-300 px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Email Address</label>
            <input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)}
              className="mt-1 w-full rounded-xl border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Facility Description</label>
            <p className="mt-0.5 text-xs text-gray-500">Describe your facility in a few sentences. This will appear on your profile page.</p>
            <textarea
              value={description} onChange={(e) => setDescription(e.target.value.slice(0, 500))}
              rows={4}
              className="mt-1 w-full rounded-xl border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
            <p className="mt-1 text-right text-xs text-gray-400">{description.length}/500</p>
          </div>

          {isTier1 && (
            <div>
              <label className="block text-sm font-medium text-gray-700">&ldquo;Schedule a Tour&rdquo; URL</label>
              <p className="mt-0.5 text-xs text-gray-500">Your booking page URL or phone number for tour scheduling.</p>
              <input type="text" value={tourUrl} onChange={(e) => setTourUrl(e.target.value)}
                placeholder="https://your-booking-page.com or (555) 123-4567"
                className="mt-1 w-full rounded-xl border border-gray-300 px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200" />
            </div>
          )}

          {/* Photo upload placeholder for Tier 1 */}
          {isTier1 && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Facility Photos (up to 4)</label>
              <p className="mt-0.5 text-xs text-gray-500">JPG, PNG, or WebP. Max 2MB each.</p>
              <div className="mt-2 rounded-xl border-2 border-dashed border-gray-300 p-8 text-center">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  onChange={async (e) => {
                    const files = e.target.files;
                    if (!files || !facility) return;
                    const maxFiles = 4;
                    const filesToUpload = Array.from(files).slice(0, maxFiles);
                    for (let i = 0; i < filesToUpload.length; i++) {
                      const file = filesToUpload[i];
                      if (file.size > 2 * 1024 * 1024) {
                        alert(`${file.name} exceeds 2MB limit.`);
                        continue;
                      }
                      const slugParts = facility.slug.split('/');
                      const path = `${slugParts[0]}/${slugParts[1]}/${slugParts[2]}/${i + 1}.jpg`;
                      try {
                        await fetch(`/api/onboard/${token}/upload`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ path, fileName: file.name }),
                        });
                      } catch { /* handled by form */ }
                    }
                  }}
                  className="text-sm text-gray-500"
                />
                <p className="mt-2 text-sm text-gray-400">Drag and drop or click to upload</p>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-blue-600 py-3 font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? 'Saving...' : 'Save Profile'}
          </button>
        </form>
      </main>
      <Footer />
    </div>
  );
}
