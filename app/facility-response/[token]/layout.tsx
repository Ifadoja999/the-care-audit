import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Post Your Facility Response',
  robots: { index: false, follow: false },
};

export default function FacilityResponseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
