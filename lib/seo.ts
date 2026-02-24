import type { Metadata } from 'next';
import type { Facility } from './types';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.thecareaudit.com';
const SITE_NAME = 'The Care Audit';
const OG_IMAGE = `${SITE_URL}/opengraph-image`;
const OG_IMAGE_ALT = 'The Care Audit — Assisted Living Facility Inspection Reports';

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toTitleCase(str: string): string {
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function ogImages(alt?: string) {
  return [{ url: OG_IMAGE, width: 1200, height: 630, alt: alt ?? OG_IMAGE_ALT }];
}

// ─── Metadata helpers ─────────────────────────────────────────────────────────

export function generateFacilityMetadata(facility: Facility): Metadata {
  const stateName = getStateName(facility.state);
  const city = toTitleCase(facility.city);
  const name = toTitleCase(facility.facility_name);
  const violations = facility.total_violations;
  const violationText = violations === null
    ? 'Inspection Data Pending'
    : `${violations} Violation${violations === 1 ? '' : 's'}`;
  const title = `${name} — ${violationText}`;
  const description = facility.ai_summary
    ? facility.ai_summary.slice(0, 155)
    : violations === null
      ? `View the listing for ${name} in ${city}, ${stateName}. Inspection data is being processed.`
      : `See the inspection report and violation history for ${name} in ${city}, ${stateName}. ${violations} violation${violations === 1 ? '' : 's'} found.`;
  const url = `${SITE_URL}/${facility.slug}`;
  const ogTitle = `${name} — ${violationText} | ${SITE_NAME}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: ogTitle,
      description: facility.ai_summary ?? description,
      url,
      siteName: SITE_NAME,
      type: 'website',
      images: ogImages(ogTitle),
    },
    twitter: {
      card: 'summary_large_image',
      title: ogTitle,
      description: facility.ai_summary ?? description,
      images: [OG_IMAGE],
    },
  };
}

export function generateStateMetadata(stateCode: string, facilityCount: number): Metadata {
  const stateName = getStateName(stateCode);
  const slug = stateName.toLowerCase().replace(/\s+/g, '-');
  const title = `Assisted Living Facility Inspection Reports in ${stateName}`;
  const description = `View inspection reports and violation data for ${facilityCount.toLocaleString()} assisted living facilities in ${stateName}.`;
  const url = `${SITE_URL}/${slug}`;
  const ogTitle = `Assisted Living Facility Inspection Reports in ${stateName} | ${SITE_NAME}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: ogTitle,
      description,
      url,
      siteName: SITE_NAME,
      type: 'website',
      images: ogImages(ogTitle),
    },
    twitter: {
      card: 'summary_large_image',
      title: ogTitle,
      description,
      images: [OG_IMAGE],
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
  const title = `Assisted Living Facilities in ${cityTitle}, ${stateCode}`;
  const description = `Inspection reports and violation data for ${facilityCount} assisted living facilities in ${cityTitle}, ${stateName}.`;
  const url = `${SITE_URL}/${stateSlug}/${citySlug}`;
  const ogTitle = `Assisted Living Facilities in ${cityTitle}, ${stateName} | ${SITE_NAME}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: ogTitle,
      description,
      url,
      siteName: SITE_NAME,
      type: 'website',
      images: ogImages(ogTitle),
    },
    twitter: {
      card: 'summary_large_image',
      title: ogTitle,
      description,
      images: [OG_IMAGE],
    },
  };
}

// ─── Schema.org JSON-LD ───────────────────────────────────────────────────────

export function localBusinessJsonLd(facility: Facility): object {
  const name = toTitleCase(facility.facility_name);

  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': ['LocalBusiness', 'LodgingBusiness'],
    name,
    description: facility.ai_summary ?? undefined,
    url: `${SITE_URL}/${facility.slug}`,
    address: {
      '@type': 'PostalAddress',
      streetAddress: facility.address ?? undefined,
      addressLocality: toTitleCase(facility.city),
      addressRegion: facility.state,
      addressCountry: 'US',
    },
  };

  if (facility.phone) {
    schema.telephone = facility.phone;
  }

  return schema;
}

export function collectionPageJsonLd(opts: {
  name: string;
  description: string;
  url: string;
  count: number;
}): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: opts.name,
    description: opts.description,
    url: opts.url,
    numberOfItems: opts.count,
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
    description:
      'Search inspection reports and violation histories for assisted living facilities in all 50 states. AI-generated summaries in plain English. Always free.',
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
