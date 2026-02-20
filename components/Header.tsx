import Link from 'next/link';
import SearchBar from './SearchBar';

export default function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white shadow-sm">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
        <Link href="/" className="shrink-0">
          <span className="text-lg font-bold text-navy">The Care Audit</span>
        </Link>
        <div className="flex-1">
          <SearchBar placeholder="Search facilities or cities..." />
        </div>
      </div>
    </header>
  );
}
