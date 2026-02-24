import { notFound } from 'next/navigation';
import Image from 'next/image';
import type { Metadata } from 'next';
import { AlertTriangle, CheckCircle2, Globe, Info, Mail, Phone, MapPin, Calendar, ExternalLink, HelpCircle } from 'lucide-react';
import { getFacilityBySlug } from '@/lib/queries';
import { createServerClient } from '@/lib/supabase';
import {
  slugToStateCode,
  stateCodeToName,
  slugToCity,
} from '@/lib/states';
import {
  generateFacilityMetadata,
  localBusinessJsonLd,
  breadcrumbJsonLd,
} from '@/lib/seo';
import { toTitleCase } from '@/lib/utils';
import Header from '@/components/Header';
import Breadcrumb from '@/components/Breadcrumb';
import Footer from '@/components/Footer';

// ISR: pages generate on first visit, then revalidate every 24 hours
export const dynamicParams = true;
export const revalidate = 86400;

interface Props {
  params: Promise<{ state: string; city: string; facility: string }>;
}

/* -- Static generation ---------------------------------------------------- */

export async function generateStaticParams() {
  // Return empty array — all facility pages render on-demand via ISR
  // This keeps the build output under Vercel's size limit
  return [];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { state: stateSlug, city: citySlug, facility: facilitySlug } = await params;
  const slug = `${stateSlug}/${citySlug}/${facilitySlug}`;
  const data = await getFacilityBySlug(slug);
  if (!data) return {};
  return generateFacilityMetadata(data);
}

/* -- Helper to get facility photos from Supabase Storage ----------------- */

async function getFacilityPhotos(slug: string): Promise<string[]> {
  try {
    const supabase = createServerClient();
    const parts = slug.split('/');
    const folderPath = `${parts[0]}/${parts[1]}/${parts[2]}`;
    const { data: files } = await supabase.storage
      .from('facility-photos')
      .list(folderPath, { limit: 4, sortBy: { column: 'name', order: 'asc' } });

    if (!files || files.length === 0) return [];

    return files
      .filter(f => !f.name.startsWith('.'))
      .map(f => {
        const { data } = supabase.storage
          .from('facility-photos')
          .getPublicUrl(`${folderPath}/${f.name}`);
        return data.publicUrl;
      });
  } catch {
    return [];
  }
}

/* -- Page component ------------------------------------------------------- */

export default async function FacilityPage({ params }: Props) {
  const { state: stateSlug, city: citySlug, facility: facilitySlug } = await params;
  const slug = `${stateSlug}/${citySlug}/${facilitySlug}`;

  const facility = await getFacilityBySlug(slug);
  if (!facility) notFound();

  const stateCode = slugToStateCode(stateSlug);
  const stateName = stateCode ? stateCodeToName(stateCode) : stateSlug;
  const cityName = slugToCity(citySlug);

  const inspDate = facility.last_inspection_date
    ? new Date(facility.last_inspection_date).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  const tier = facility.sponsor_tier;
  const isTier1 = tier === 'featured_verified';
  const isTier2 = tier === 'verified_profile';
  const isTier3 = tier === 'facility_response';
  const showWebsiteEmail = isTier1 || isTier2;

  // Get photos for Tier 1 only
  const photos = isTier1 ? await getFacilityPhotos(slug) : [];

  const breadcrumbItems = [
    { name: 'Home', href: '/' },
    { name: stateName, href: `/${stateSlug}` },
    { name: cityName, href: `/${stateSlug}/${citySlug}` },
    { name: toTitleCase(facility.facility_name), href: `/${slug}` },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-warm-50">
      <Header />

      {/* Schema.org JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbJsonLd(breadcrumbItems)),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(localBusinessJsonLd(facility)),
        }}
      />

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 animate-fade-in">
        {/* 0. Status Banner — closed / expired / suspended */}
        {facility.facility_status === 'closed' && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
            <p className="text-sm leading-relaxed text-red-800">
              This facility appears to be permanently closed based on the most recent state licensing data. The information below was the last available record.
            </p>
          </div>
        )}
        {facility.facility_status === 'license_expired' && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <Info className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
            <p className="text-sm leading-relaxed text-amber-800">
              This facility&apos;s license is currently expired according to state records.
            </p>
          </div>
        )}
        {facility.facility_status === 'license_suspended' && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <Info className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
            <p className="text-sm leading-relaxed text-amber-800">
              This facility&apos;s license is currently suspended according to state records.
            </p>
          </div>
        )}

        {/* 1. Breadcrumb */}
        <Breadcrumb
          items={[
            { label: 'Home', href: '/' },
            { label: stateName, href: `/${stateSlug}` },
            { label: cityName, href: `/${stateSlug}/${citySlug}` },
            { label: toTitleCase(facility.facility_name) },
          ]}
        />

        {/* 2. Facility Header */}
        <div
          className={`mt-6 rounded-2xl p-6 ${
            isTier1
              ? 'border-2 border-amber-300 bg-amber-50/30'
              : 'border border-warm-200 bg-white shadow-sm'
          }`}
        >
          <div className="flex flex-wrap items-start gap-3">
            <h1 className="text-3xl font-bold text-gray-900">
              {toTitleCase(facility.facility_name)}
            </h1>
            {/* Badge: Tier 1 = Featured Verified (gold), Tier 2 = Claimed (gray) */}
            {isTier1 && (
              <span className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-gradient-to-r from-amber-50 to-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-navy">
                <svg className="h-3.5 w-3.5 text-amber-500" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M16.403 12.652a3 3 0 010-5.304 3 3 0 00-3.75-3.751 3 3 0 00-5.305 0 3 3 0 00-3.751 3.75 3 3 0 000 5.305 3 3 0 003.75 3.751 3 3 0 005.305 0 3 3 0 003.751-3.75zm-2.546-4.46a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                    clipRule="evenodd"
                  />
                </svg>
                Featured Verified
              </span>
            )}
            {isTier2 && (
              <span className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Claimed
              </span>
            )}
          </div>

          {facility.address && (
            <p className="mt-2 flex items-center gap-1.5 text-gray-500">
              <MapPin className="h-4 w-4 shrink-0" />
              {facility.address}
            </p>
          )}
          {facility.phone && (
            <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-500">
              <Phone className="h-4 w-4 shrink-0" />
              {facility.phone}
            </p>
          )}
          {/* Website and email — Tier 1 and Tier 2 only */}
          {showWebsiteEmail && facility.website_url && (
            <p className="mt-1 flex items-center gap-1.5 text-sm">
              <Globe className="h-4 w-4 shrink-0 text-gray-400" />
              <a href={facility.website_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                {facility.website_url.replace(/^https?:\/\//, '')}
              </a>
            </p>
          )}
          {showWebsiteEmail && facility.contact_email && (
            <p className="mt-1 flex items-center gap-1.5 text-sm">
              <Mail className="h-4 w-4 shrink-0 text-gray-400" />
              <a href={`mailto:${facility.contact_email}`} className="text-blue-600 hover:underline">
                {facility.contact_email}
              </a>
            </p>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
            <span>Assisted Living Facility</span>
            {inspDate && (
              <>
                <span className="text-gray-300">|</span>
                <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />Last inspected {inspDate}</span>
              </>
            )}
          </div>
        </div>

        {/* 3. Photo Gallery — Tier 1 only */}
        {isTier1 && photos.length > 0 && (
          <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4">
            {photos.map((url, i) => (
              <div key={i} className="relative aspect-[4/3] overflow-hidden rounded-xl">
                <Image
                  src={url}
                  alt={`${toTitleCase(facility.facility_name)} photo ${i + 1}`}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 50vw, 400px"
                />
              </div>
            ))}
          </div>
        )}

        {/* 4. Facility Description — Tier 1 and Tier 2 only */}
        {(isTier1 || isTier2) && facility.facility_description && (
          <div className="mt-6 rounded-2xl border border-warm-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900" style={{ fontFamily: 'var(--font-heading)' }}>
              About This Facility
            </h2>
            <p className="mt-0.5 text-xs text-gray-400">Provided by the facility</p>
            <p className="mt-3 leading-relaxed text-gray-700">{facility.facility_description}</p>
          </div>
        )}

        {/* 5. Schedule a Tour — Tier 1 only */}
        {isTier1 && (
          <div className="mt-6">
            <a
              href={facility.website_url || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-6 py-3.5 font-semibold text-white shadow-sm transition-all hover:bg-amber-600 hover:shadow-md"
            >
              <Calendar className="h-5 w-5" />
              Schedule a Tour
            </a>
          </div>
        )}

        {/* 6. Violation Summary Card */}
        <div className="mt-8 rounded-2xl border border-warm-200 bg-white p-8 shadow-sm">
          <div className="flex flex-col items-center text-center">
            {facility.total_violations === null ? (
              <>
                <HelpCircle className="h-10 w-10 text-gray-300" />
                <p className="mt-3 text-xl font-semibold text-gray-600">Inspection data not yet available</p>
              </>
            ) : facility.total_violations === 0 ? (
              <>
                <CheckCircle2 className="h-10 w-10 text-gray-400" />
                <p className="mt-3 text-xl font-semibold text-gray-800">No violations found</p>
              </>
            ) : (
              <p className="text-xl font-semibold text-gray-800">
                {facility.total_violations} violation{facility.total_violations === 1 ? '' : 's'} cited
              </p>
            )}
            <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm text-gray-500">
              {inspDate && <span>Last inspected: {inspDate}</span>}
              {facility.licensed_capacity != null && facility.licensed_capacity > 0 && (
                <>
                  {inspDate && <span className="text-gray-300">|</span>}
                  <span>Licensed for {facility.licensed_capacity} beds</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* 7. AI-Generated Summary */}
        {facility.ai_summary && (
          <div className="mt-8 rounded-2xl border border-warm-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900" style={{ fontFamily: 'var(--font-heading)' }}>
              AI-Generated Summary
            </h2>
            <p className="mt-2 leading-relaxed text-gray-700">
              {facility.ai_summary}
            </p>
            <p className="mt-4 rounded-lg bg-amber-50 p-3 text-xs leading-relaxed text-amber-800">
              &#9888;&#65039; This summary was generated by artificial intelligence based on official
              state inspection reports. It may contain errors or omissions. It is not a
              professional assessment and should not be the sole basis for any decision.
              Always refer to the official inspection report linked below for complete and
              authoritative information.
            </p>
          </div>
        )}

        {/* 8. Official Facility Response — Tier 3 only */}
        {isTier3 && facility.facility_response && (
          <div className="mt-8 rounded-2xl border border-blue-200 bg-blue-50/50 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900" style={{ fontFamily: 'var(--font-heading)' }}>
              Official Facility Response
            </h2>
            <p className="mt-2 leading-relaxed text-gray-700">
              {facility.facility_response}
            </p>
            <p className="mt-4 text-xs text-gray-500">
              This response was provided by the facility and does not represent the views of The Care Audit.
            </p>
          </div>
        )}

        {/* 9. Official Report Link */}
        {facility.report_url && (
          <div className="mt-8">
            {(() => {
              const isSearchPortal = facility.report_url.includes('ltc-provider-search');
              return (
                <>
                  <a
                    href={facility.report_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl bg-navy px-6 py-3.5 font-semibold text-white shadow-sm transition-all duration-200 hover:bg-navy-light hover:shadow-md"
                  >
                    <ExternalLink className="h-5 w-5" />
                    {isSearchPortal
                      ? 'Search Texas HHSC Provider Portal'
                      : 'View Official State Inspection Report'}
                  </a>
                  <p className="mt-2 text-xs text-gray-400">
                    {isSearchPortal
                      ? 'Search for this facility on the official Texas HHSC portal'
                      : 'Opens original document on the state government website'}
                  </p>
                </>
              );
            })()}
          </div>
        )}

      </main>

      <Footer />
    </div>
  );
}
