'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { X, Upload, Loader2 } from 'lucide-react';
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
  tour_url?: string | null;
}

interface PhotoSlot {
  url: string | null;
  uploading: boolean;
}

function toTitleCase(str: string): string {
  return str.toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

/**
 * Compress an image file client-side: resize to max 1200px width, output as 80% JPEG.
 * Returns a Blob ready for upload.
 */
async function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const MAX_WIDTH = 1200;
      const MAX_HEIGHT = 1200;
      let { width, height } = img;

      if (width > MAX_WIDTH || height > MAX_HEIGHT) {
        const ratio = Math.min(MAX_WIDTH / width, MAX_HEIGHT / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('Canvas not supported')); return; }
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Compression failed'));
        },
        'image/jpeg',
        0.8
      );
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
}

export default function OnboardPage() {
  const { token } = useParams<{ token: string }>();
  const [facility, setFacility] = useState<FacilityData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form fields
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [description, setDescription] = useState('');
  const [tourUrl, setTourUrl] = useState('');

  // Photo management — 4 slots
  const [photos, setPhotos] = useState<PhotoSlot[]>([
    { url: null, uploading: false },
    { url: null, uploading: false },
    { url: null, uploading: false },
    { url: null, uploading: false },
  ]);

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
        setTourUrl(data.tour_url || '');

        // Load existing photos from Supabase Storage
        if (data.sponsor_tier === 'featured_verified' && data.slug) {
          const existingPhotos: PhotoSlot[] = [];
          for (let i = 1; i <= 4; i++) {
            const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/facility-photos/${data.slug}/${i}.jpg`;
            try {
              const check = await fetch(url, { method: 'HEAD' });
              existingPhotos.push({
                url: check.ok ? `${url}?t=${Date.now()}` : null,
                uploading: false,
              });
            } catch {
              existingPhotos.push({ url: null, uploading: false });
            }
          }
          setPhotos(existingPhotos);
        }
      } catch { setError('Failed to load facility data.'); }
      finally { setLoading(false); }
    }
    loadFacility();
  }, [token]);

  const handlePhotoUpload = async (file: File, index: number) => {
    if (!facility) return;

    // Update slot to show uploading state
    setPhotos(prev => prev.map((p, i) => i === index ? { ...p, uploading: true } : p));

    try {
      // Compress image client-side (resize to 1200px, 80% JPEG quality)
      const compressed = await compressImage(file);

      const formData = new FormData();
      formData.append('file', compressed, `${index + 1}.jpg`);
      formData.append('index', String(index + 1));

      const res = await fetch(`/api/onboard/${token}/upload`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (res.ok && data.url) {
        setPhotos(prev => prev.map((p, i) =>
          i === index ? { url: `${data.url}?t=${Date.now()}`, uploading: false } : p
        ));
      } else {
        alert(data.error || 'Failed to upload photo.');
        setPhotos(prev => prev.map((p, i) => i === index ? { ...p, uploading: false } : p));
      }
    } catch {
      alert('Failed to upload photo. Please try again.');
      setPhotos(prev => prev.map((p, i) => i === index ? { ...p, uploading: false } : p));
    }
  };

  const handlePhotoDelete = async (index: number) => {
    if (!facility || !confirm('Remove this photo?')) return;

    try {
      const res = await fetch(`/api/onboard/${token}/upload?index=${index + 1}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setPhotos(prev => prev.map((p, i) =>
          i === index ? { url: null, uploading: false } : p
        ));
      }
    } catch {
      alert('Failed to remove photo.');
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    // Find first empty slot for each file
    const filesToUpload = Array.from(files);
    for (const file of filesToUpload) {
      const emptyIndex = photos.findIndex(p => !p.url && !p.uploading);
      if (emptyIndex === -1) {
        alert('All 4 photo slots are full. Remove a photo to add a new one.');
        break;
      }
      await handlePhotoUpload(file, emptyIndex);
    }

    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

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
  const hasEmptySlot = photos.some(p => !p.url && !p.uploading);

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

          {/* Photo upload — Tier 1 only */}
          {isTier1 && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Facility Photos (up to 4)</label>
              <p className="mt-0.5 text-xs text-gray-500">
                JPG, PNG, or WebP. Photos are automatically compressed and resized for optimal display.
              </p>

              {/* Photo grid showing existing and empty slots */}
              <div className="mt-3 grid grid-cols-2 gap-3">
                {photos.map((photo, i) => (
                  <div
                    key={i}
                    className="relative aspect-[4/3] overflow-hidden rounded-xl border-2 border-dashed border-gray-200 bg-gray-50"
                  >
                    {photo.uploading ? (
                      <div className="flex h-full items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                      </div>
                    ) : photo.url ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={photo.url}
                          alt={`Photo ${i + 1}`}
                          className="h-full w-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => handlePhotoDelete(i)}
                          className="absolute right-2 top-2 rounded-full bg-black/60 p-1.5 text-white transition-colors hover:bg-black/80"
                          title="Remove photo"
                        >
                          <X className="h-4 w-4" />
                        </button>
                        <span className="absolute bottom-2 left-2 rounded-md bg-black/50 px-2 py-0.5 text-xs text-white">
                          {i === 0 ? 'Primary' : `Photo ${i + 1}`}
                        </span>
                      </>
                    ) : (
                      <label className="flex h-full cursor-pointer flex-col items-center justify-center gap-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-500">
                        <Upload className="h-6 w-6" />
                        <span className="text-xs">{i === 0 ? 'Primary photo' : `Photo ${i + 1}`}</span>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handlePhotoUpload(file, i);
                            e.target.value = '';
                          }}
                        />
                      </label>
                    )}
                  </div>
                ))}
              </div>

              {/* Bulk upload button */}
              {hasEmptySlot && (
                <div className="mt-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-50"
                  >
                    <Upload className="h-4 w-4" />
                    Add photos
                  </button>
                </div>
              )}
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
