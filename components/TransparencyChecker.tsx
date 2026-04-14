'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { Search, Loader2, Mail, ArrowRight, AlertTriangle, CheckCircle2, HelpCircle, Calendar, Building2, ExternalLink, X } from 'lucide-react';
import { toTitleCase } from '@/lib/utils';

interface SearchResult {
  type: 'facility';
  id: string;
  facility_name: string;
  city: string;
  state: string;
  total_violations: number | null;
  slug: string;
  ai_summary?: string;
}

interface SnapshotData {
  facility_name: string;
  city: string;
  state: string;
  total_violations: number | null;
  last_inspection_date: string | null;
  ai_summary: string | null;
  slug: string;
  facility_type: string | null;
  licensed_capacity: number | null;
}

type Step = 'search' | 'email' | 'snapshot';

const LS_KEY = 'tca_transparency_email';

function displayCity(city: string) {
  return city
    .toLowerCase()
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return 'Not available';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function ViolationContext({ count }: { count: number | null }) {
  if (count === null) {
    return (
      <div className="flex items-center gap-2 text-gray-500">
        <HelpCircle className="h-5 w-5 shrink-0" />
        <span>Inspection data pending for this state</span>
      </div>
    );
  }
  if (count === 0) {
    return (
      <div className="flex items-center gap-2 text-green-700">
        <CheckCircle2 className="h-5 w-5 shrink-0" />
        <span>No violations cited in available records</span>
      </div>
    );
  }
  const severity = count >= 10 ? 'high' : count >= 4 ? 'moderate' : 'low';
  const color =
    severity === 'high'
      ? 'text-red-700'
      : severity === 'moderate'
        ? 'text-amber-700'
        : 'text-gray-700';
  const icon =
    severity === 'high' ? (
      <AlertTriangle className="h-5 w-5 shrink-0 text-red-500" />
    ) : severity === 'moderate' ? (
      <AlertTriangle className="h-5 w-5 shrink-0 text-amber-500" />
    ) : (
      <CheckCircle2 className="h-5 w-5 shrink-0 text-gray-400" />
    );

  return (
    <div className={`flex items-center gap-2 ${color}`}>
      {icon}
      <span>
        {count} violation{count === 1 ? '' : 's'} cited —{' '}
        {severity === 'high'
          ? 'above average, review full report'
          : severity === 'moderate'
            ? 'moderate number, see details'
            : 'below average'}
      </span>
    </div>
  );
}

// ── Email Modal ────────────────────────────────────────────────────────────────
function EmailModal({
  facilityName,
  onSubmit,
  onClose,
  loading,
}: {
  facilityName: string;
  onSubmit: (email: string) => void;
  onClose: () => void;
  loading: boolean;
}) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError('Please enter a valid email address');
      return;
    }
    setError('');
    onSubmit(trimmed);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-navy/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal card */}
      <div className="relative w-full max-w-md animate-fade-in rounded-2xl bg-white p-8 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-navy/10">
          <Mail className="h-6 w-6 text-navy" />
        </div>

        <h2
          id="modal-title"
          className="mt-4 text-xl font-bold text-navy"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          View Transparency Report
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-gray-600">
          Enter your email to see the full inspection snapshot for{' '}
          <span className="font-medium text-gray-900">{facilityName}</span>. We&apos;ll
          never spam you.
        </p>

        <form onSubmit={handleSubmit} className="mt-6">
          <label htmlFor="tc-email" className="sr-only">
            Email address
          </label>
          <input
            ref={inputRef}
            id="tc-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-lg border border-warm-200 bg-warm-50 px-4 py-3 text-sm focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/20"
            autoComplete="email"
            disabled={loading}
          />
          {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading || email.trim().length < 5}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-navy px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-navy-light disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading report…
              </>
            ) : (
              <>
                View Snapshot
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-gray-400">
          No spam. Unsubscribe anytime.
        </p>
      </div>
    </div>
  );
}

// ── Snapshot Card ──────────────────────────────────────────────────────────────
function SnapshotCard({
  data,
  onReset,
}: {
  data: SnapshotData;
  onReset: () => void;
}) {
  return (
    <div className="animate-fade-in w-full max-w-xl">
      {/* Header */}
      <div className="rounded-t-2xl bg-navy px-6 py-5">
        <p className="text-xs font-medium uppercase tracking-wider text-blue-300">
          Transparency Report
        </p>
        <h2
          className="mt-1 text-xl font-bold text-white"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          {toTitleCase(data.facility_name)}
        </h2>
        <p className="mt-0.5 text-sm text-blue-200">
          {displayCity(data.city)}, {data.state}
          {data.facility_type ? ` · ${data.facility_type}` : ''}
        </p>
      </div>

      {/* Body */}
      <div className="rounded-b-2xl border border-t-0 border-warm-200 bg-white px-6 py-5 shadow-md">
        {/* Violations */}
        <div className="border-b border-warm-100 pb-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
            Violations
          </p>
          <ViolationContext count={data.total_violations} />
        </div>

        {/* Last inspection */}
        <div className="flex items-start gap-3 border-b border-warm-100 py-4">
          <Calendar className="mt-0.5 h-5 w-5 shrink-0 text-navy/50" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Last Inspection
            </p>
            <p className="mt-0.5 text-sm font-medium text-gray-900">
              {formatDate(data.last_inspection_date)}
            </p>
          </div>
        </div>

        {/* AI Summary */}
        {data.ai_summary && (
          <div className="flex items-start gap-3 border-b border-warm-100 py-4">
            <Building2 className="mt-0.5 h-5 w-5 shrink-0 text-navy/50" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Summary
              </p>
              <p className="mt-0.5 text-sm leading-relaxed text-gray-700">
                {data.ai_summary}
              </p>
            </div>
          </div>
        )}

        {/* CTAs */}
        <div className="flex flex-col gap-3 pt-4 sm:flex-row">
          <Link
            href={`/${data.slug}`}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-navy px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-navy-light"
          >
            View Full Report
            <ExternalLink className="h-4 w-4" />
          </Link>
          <button
            onClick={onReset}
            className="flex-1 rounded-lg border border-warm-200 px-5 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-warm-50"
          >
            Search Another
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function TransparencyChecker() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [step, setStep] = useState<Step>('search');
  const [selectedFacility, setSelectedFacility] = useState<SearchResult | null>(null);
  const [snapshotData, setSnapshotData] = useState<SnapshotData | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Debounced search
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setIsDropdownOpen(false);
      return;
    }

    setIsSearching(true);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        const json = await res.json();
        const all: { type: string }[] = json.results || json;
        const facilities = all.filter((r) => r.type === 'facility') as SearchResult[];
        setResults(facilities.slice(0, 8));
        setIsDropdownOpen(facilities.length > 0);
      } catch {
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(debounceRef.current);
  }, [query]);

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  function selectFacility(facility: SearchResult) {
    setSelectedFacility(facility);
    setIsDropdownOpen(false);
    setQuery(toTitleCase(facility.facility_name));

    // Check if email already captured
    const savedEmail = typeof window !== 'undefined' ? localStorage.getItem(LS_KEY) : null;
    if (savedEmail) {
      fetchSnapshot(facility.slug, savedEmail);
    } else {
      setStep('email');
    }
  }

  const fetchSnapshot = useCallback(async (slug: string, email: string) => {
    setModalLoading(true);
    setModalError('');
    try {
      const res = await fetch('/api/transparency-checker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, facilitySlug: slug }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load');
      setSnapshotData(data as SnapshotData);
      setStep('snapshot');
      if (typeof window !== 'undefined') {
        localStorage.setItem(LS_KEY, email);
      }
    } catch (err) {
      setModalError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setModalLoading(false);
    }
  }, []);

  function handleEmailSubmit(email: string) {
    if (!selectedFacility) return;
    fetchSnapshot(selectedFacility.slug, email);
  }

  function handleReset() {
    setStep('search');
    setQuery('');
    setResults([]);
    setSelectedFacility(null);
    setSnapshotData(null);
    setModalError('');
  }

  return (
    <div className="flex flex-col items-center">
      {/* Search step */}
      {step !== 'snapshot' && (
        <div ref={wrapperRef} className="relative w-full max-w-xl">
          <div className="relative flex items-center">
            {isSearching ? (
              <Loader2 className="pointer-events-none absolute left-4 h-5 w-5 animate-spin text-gray-400" />
            ) : (
              <Search className="pointer-events-none absolute left-4 h-5 w-5 text-gray-400" />
            )}
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => results.length > 0 && setIsDropdownOpen(true)}
              placeholder="Search by facility name or city…"
              className="w-full rounded-full border border-warm-200 bg-white py-3.5 pl-12 pr-5 text-base shadow-sm focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/20"
              aria-label="Search facilities"
              aria-expanded={isDropdownOpen}
              aria-autocomplete="list"
              role="combobox"
              autoComplete="off"
            />
          </div>

          {/* Dropdown */}
          {isDropdownOpen && results.length > 0 && (
            <ul
              role="listbox"
              className="absolute z-50 mt-2 w-full overflow-hidden rounded-xl border border-warm-200 bg-white shadow-lg"
            >
              {results.map((facility) => (
                <li
                  key={facility.id}
                  role="option"
                  aria-selected={false}
                  onClick={() => selectFacility(facility)}
                  className="flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors hover:bg-warm-50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900">
                      {toTitleCase(facility.facility_name)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {displayCity(facility.city)}, {facility.state}
                      {' · '}
                      {facility.total_violations === null
                        ? 'Data pending'
                        : facility.total_violations === 0
                          ? 'No violations'
                          : `${facility.total_violations} violation${facility.total_violations === 1 ? '' : 's'}`}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-gray-300" />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Snapshot */}
      {step === 'snapshot' && snapshotData && (
        <SnapshotCard data={snapshotData} onReset={handleReset} />
      )}

      {/* Email modal */}
      {step === 'email' && selectedFacility && (
        <EmailModal
          facilityName={toTitleCase(selectedFacility.facility_name)}
          onSubmit={handleEmailSubmit}
          onClose={() => setStep('search')}
          loading={modalLoading}
        />
      )}

      {/* Modal-level error */}
      {modalError && step === 'email' && (
        <p className="mt-3 text-sm text-red-600">{modalError}</p>
      )}
    </div>
  );
}
