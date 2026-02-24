import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Complete Your Profile',
  robots: { index: false, follow: false },
};

export default function OnboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
