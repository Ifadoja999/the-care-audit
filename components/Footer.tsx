import Link from 'next/link';
import Image from 'next/image';

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-warm-200 bg-navy-dark text-gray-300">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {/* Brand */}
          <div>
            <Link href="/" className="flex items-center gap-2.5">
              <Image
                src="/images/logo.png"
                alt="The Care Audit logo"
                width={32}
                height={32}
                className="h-8 w-auto brightness-200"
              />
              <span className="text-lg font-bold text-white" style={{ fontFamily: 'var(--font-heading)' }}>
                The Care Audit
              </span>
            </Link>
            <p className="mt-3 text-sm leading-relaxed text-gray-400">
              Free, transparent safety grades for Assisted Living Facilities
              across all 50 states. Helping families make informed decisions.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">
              Quick Links
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/" className="transition-colors duration-200 hover:text-white">Home</Link>
              </li>
              <li>
                <Link href="/florida" className="transition-colors duration-200 hover:text-white">Florida Facilities</Link>
              </li>
              <li>
                <Link href="/search" className="transition-colors duration-200 hover:text-white">Search</Link>
              </li>
            </ul>
          </div>

          {/* Disclaimer */}
          <div>
            <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">
              Disclaimer
            </h4>
            <p className="text-sm leading-relaxed text-gray-400">
              Data sourced from official state health department inspection records.
              This site is not affiliated with any government agency. Information is
              provided for educational purposes only.
            </p>
          </div>
        </div>

        <div className="mt-10 border-t border-gray-700 pt-6 text-center text-xs text-gray-500">
          &copy; {new Date().getFullYear()} The Care Audit. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
