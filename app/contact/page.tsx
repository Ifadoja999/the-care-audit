import type { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Breadcrumb from '@/components/Breadcrumb';
import ContactForm from '@/components/ContactForm';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.thecareaudit.com';

export const metadata: Metadata = {
  title: 'Contact',
  description:
    'Have a question or need to report a data issue? Contact The Care Audit team for questions, corrections, sponsorship, or partnership inquiries. We respond quickly.',
  alternates: { canonical: `${SITE_URL}/contact` },
};

export default function ContactPage() {
  return (
    <div className="flex min-h-screen flex-col bg-warm-50">
      <Header />

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
        <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Contact' }]} />

        <h1 className="mt-6 text-3xl font-bold text-navy">Contact Us</h1>
        <p className="mt-3 text-gray-600">
          Have a question, data correction, or partnership inquiry? Fill out the form
          below and we&apos;ll get back to you.
        </p>

        <div className="mt-8 rounded-xl border border-warm-200 bg-white p-6 shadow-sm sm:p-8">
          <ContactForm />
        </div>
      </main>

      <Footer />
    </div>
  );
}
