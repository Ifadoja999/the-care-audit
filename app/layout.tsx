import type { Metadata } from 'next';
import Script from 'next/script';
import { DM_Serif_Display, Plus_Jakarta_Sans } from 'next/font/google';
import { GoogleAnalytics } from '@next/third-parties/google';
import './globals.css';

const heading = DM_Serif_Display({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-heading',
  display: 'swap',
});

const body = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.thecareaudit.com';

export const metadata: Metadata = {
  title: {
    template: '%s | The Care Audit',
    default: 'The Care Audit — Assisted Living Facility Inspection Reports In Plain English',
  },
  description:
    'Search inspection reports and violation histories for assisted living facilities in all 50 states. AI-generated summaries in plain English. Always free.',
  metadataBase: new URL(siteUrl),
  openGraph: {
    siteName: 'The Care Audit',
    type: 'website',
    images: [{ url: `${siteUrl}/opengraph-image`, width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
  },
};

export const viewport = {
  themeColor: '#1a2b4a',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Preconnect to Supabase storage for faster facility photo loads (LCP) */}
        {process.env.NEXT_PUBLIC_SUPABASE_URL && (
          <>
            <link rel="preconnect" href={new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin} />
            <link rel="dns-prefetch" href={new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin} />
          </>
        )}
      </head>
      <body className={`${heading.variable} ${body.variable} font-sans`}>
        {children}
        <Script
          src="https://cdn.promotekit.com/pk.js"
          strategy="afterInteractive"
          data-promotekit="4452fa54-9654-4659-8272-6171daf2a24a"
        />
        {process.env.NEXT_PUBLIC_GA_ID && (
          <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID} />
        )}
      </body>
    </html>
  );
}
