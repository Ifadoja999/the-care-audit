import Link from 'next/link';
import Image from 'next/image';
import SearchBar from './SearchBar';

export default function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-warm-200 bg-white/95 shadow-sm backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
        <Link href="/" className="shrink-0 flex items-center gap-2.5 transition-opacity duration-200 hover:opacity-80">
          <Image
            src="/images/logo.png"
            alt="The Care Audit logo"
            width={36}
            height={36}
            className="h-9 w-auto"
          />
          <span className="hidden text-lg font-bold text-navy sm:inline" style={{ fontFamily: 'var(--font-heading)' }}>The Care Audit</span>
        </Link>
        <div className="flex-1">
          <SearchBar placeholder="Search facilities or cities..." />
        </div>
      </div>
    </header>
  );
}
