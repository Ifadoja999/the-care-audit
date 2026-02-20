'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Loader2 } from 'lucide-react';
import { toTitleCase } from '@/lib/utils';
import SafetyGradeBadge from './SafetyGradeBadge';

interface SearchResult {
  facility_name: string;
  city: string;
  state: string;
  safety_grade: 'A' | 'B' | 'C' | 'F';
  slug: string;
}

interface Props {
  placeholder?: string;
  initialValue?: string;
}

export default function SearchBar({
  placeholder = 'Search by facility name or city...',
  initialValue = '',
}: Props) {
  const [query, setQuery] = useState(initialValue);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const router = useRouter();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Debounced fetch
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        const data: SearchResult[] = await res.json();
        setResults(data.slice(0, 8));
        setIsOpen(data.length > 0);
        setActiveIndex(-1);
      } catch {
        setResults([]);
        setIsOpen(false);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(debounceRef.current);
  }, [query]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function navigateToResult(result: SearchResult) {
    setIsOpen(false);
    router.push(`/${result.slug}`);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (activeIndex >= 0 && activeIndex < results.length) {
      navigateToResult(results[activeIndex]);
      return;
    }
    const q = query.trim();
    if (q.length >= 2) {
      setIsOpen(false);
      router.push(`/search?q=${encodeURIComponent(q)}`);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!isOpen || results.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(prev => (prev < results.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(prev => (prev > 0 ? prev - 1 : results.length - 1));
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  }

  function displayCity(city: string) {
    return city
      .toLowerCase()
      .split(' ')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }

  return (
    <div ref={wrapperRef} className="relative w-full max-w-2xl">
      <form onSubmit={handleSubmit}>
        <div className="relative flex items-center">
          {isLoading ? (
            <Loader2 className="pointer-events-none absolute left-4 h-5 w-5 animate-spin text-gray-400" />
          ) : (
            <Search className="pointer-events-none absolute left-4 h-5 w-5 text-gray-400" />
          )}
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onFocus={() => results.length > 0 && setIsOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            aria-label="Search facilities"
            aria-expanded={isOpen}
            aria-autocomplete="list"
            role="combobox"
            className="w-full rounded-full border border-gray-200 bg-white py-3 pl-12 pr-28 text-base shadow-sm focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/20"
          />
          <button
            type="submit"
            className="absolute right-1.5 rounded-full bg-navy px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-navy-light disabled:opacity-50"
            disabled={query.trim().length < 2}
          >
            Search
          </button>
        </div>
      </form>

      {/* Dropdown results */}
      {isOpen && results.length > 0 && (
        <ul
          role="listbox"
          className="absolute z-50 mt-2 w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg"
        >
          {results.map((result, i) => (
            <li
              key={result.slug}
              role="option"
              aria-selected={i === activeIndex}
              onMouseEnter={() => setActiveIndex(i)}
              onClick={() => navigateToResult(result)}
              className={`flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors ${
                i === activeIndex ? 'bg-gray-50' : ''
              }`}
            >
              <SafetyGradeBadge grade={result.safety_grade} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-900">
                  {toTitleCase(result.facility_name)}
                </p>
                <p className="text-xs text-gray-500">
                  {displayCity(result.city)}, {result.state}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
