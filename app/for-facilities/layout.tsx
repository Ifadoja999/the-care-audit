import type { Metadata } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.thecareaudit.com';

export const metadata: Metadata = {
  title: 'For Facilities — Enhance Your Listing',
  description:
    "Assisted living facility owners: enhance your listing on The Care Audit with verified badges, featured placement, facility photos, and more. Thousands of families research facilities on our site every month.",
  alternates: {
    canonical: `${SITE_URL}/for-facilities`,
  },
  openGraph: {
    title: 'For Facilities — Enhance Your Listing | The Care Audit',
    description:
      "Assisted living facility owners: enhance your listing on The Care Audit with verified badges, featured placement, facility photos, and more.",
    url: `${SITE_URL}/for-facilities`,
    siteName: 'The Care Audit',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'For Facilities — Enhance Your Listing | The Care Audit',
    description:
      "Enhance your assisted living facility's listing with verified badges, featured placement, and more.",
  },
};

export default function ForFacilitiesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
