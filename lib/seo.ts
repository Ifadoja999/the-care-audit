import type { Metadata } from 'next';
import type { Facility } from './types';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.thecareaudit.com';
const SITE_NAME = 'The Care Audit';

// ─── State name lookup ────────────────────────────────────────────────────────

const STATE_NAMES: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia',
  HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa',
  KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
  MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi',
  MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire',
  NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York', NC: 'North Carolina',
  ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania',
  RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota', TN: 'Tennessee',
  TX: 'Texas', UT: 'Utah', VT: 'Vermont', VA: 'Virginia', WA: 'Washington',
  WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming', DC: 'Washington D.C.',
};

export function getStateName(stateCode: string): string {
  return STATE_NAMES[stateCode.toUpperCase()] ?? stateCode;
}

// ─── Metadata helpers ─────────────────────────────────────────────────────────

export function generateFacilityMetadata(facility: Facility): Metadata {
  const stateName = getStateName(facility.state);
  const city = toTitleCase(facility.city);
  const title = `${facility.facility_name} Safety Grade & Violations`;
  const description = `See the safety grade and violation history for ${facility.facility_name} in ${city}, ${stateName}. Grade: ${facility.safety_grade ?? 'N/A'}. ${facility.total_violations ?? 0} violations cited.`;
  const url = `${SITE_URL}/${facility.slug}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: SITE_NAME,
      type: 'website',
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
  };
}

export function generateStateMetadata(stateCode: string, facilityCount: number): Metadata {
  const stateName = getStateName(stateCode);
  const slug = stateName.toLowerCase().replace(/\s+/g, '-');
  const title = `Assisted Living Facility Safety Grades in ${stateName}`;
  const description = `Browse safety grades and inspection records for ${facilityCount.toLocaleString()} assisted living facilities in ${stateName}. Find violations, grades, and official state reports.`;
  const url = `${SITE_URL}/${slug}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: SITE_NAME,
      type: 'website',
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
  };
}

export function generateCityMetadata(
  stateCode: string,
  city: string,
  facilityCount: number
): Metadata {
  const stateName = getStateName(stateCode);
  const stateSlug = stateName.toLowerCase().replace(/\s+/g, '-');
  const citySlug = city.toLowerCase().replace(/\s+/g, '-');
  const cityTitle = toTitleCase(city);
  const title = `Assisted Living Facilities in ${cityTitle}, ${stateCode} — Safety Grades`;
  const description = `Compare safety grades and violations for ${facilityCount} assisted living facilities in ${cityTitle}, ${stateName}. Find the best care options with official inspection data.`;
  const url = `${SITE_URL}/${stateSlug}/${citySlug}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: SITE_NAME,
      type: 'website',
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
  };
}

// ─── Schema.org JSON-LD ───────────────────────────────────────────────────────

export function localBusinessJsonLd(facility: Facility): object {
  const stateName = getStateName(facility.state);
  return {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: facility.facility_name,
    description: facility.ai_summary ?? undefined,
    address: {
      '@type': 'PostalAddress',
      streetAddress: facility.address,
      addressLocality: toTitleCase(facility.city),
      addressRegion: facility.state,
      addressCountry: 'US',
    },
    url: `${SITE_URL}/${facility.slug}`,
  };
}

export function breadcrumbJsonLd(items: { name: string; href: string }[]): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.href.startsWith('http') ? item.href : `${SITE_URL}${item.href}`,
    })),
  };
}

export function websiteSearchJsonLd(): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_URL,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_URL}/search?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

// ─── Utility ──────────────────────────────────────────────────────────────────

function toTitleCase(str: string): string {
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
