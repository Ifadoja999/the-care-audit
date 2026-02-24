'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toTitleCase } from '@/lib/utils';
import type { Facility } from '@/lib/types';

type SortOption = 'az' | 'violations-asc' | 'violations-desc';

interface Props {
  facilities: Facility[];
  stateSlug: string;
  citySlug: string;
}

export default function CityFacilitiesTable({ facilities, stateSlug, citySlug }: Props) {
  const [sortBy, setSortBy] = useState<SortOption>('az');

  const sorted = [...facilities].sort((a, b) => {
    // Sponsored always first
    const aSponsored = a.is_sponsored ? 0 : 1;
    const bSponsored = b.is_sponsored ? 0 : 1;
    if (aSponsored !== bSponsored) return aSponsored - bSponsored;

    switch (sortBy) {
      case 'violations-asc': {
        // NULL violations sort to end
        const aV = a.total_violations ?? Infinity;
        const bV = b.total_violations ?? Infinity;
        return aV - bV || a.facility_name.localeCompare(b.facility_name);
      }
      case 'violations-desc': {
        // NULL violations sort to end
        const aV = a.total_violations ?? -1;
        const bV = b.total_violations ?? -1;
        return bV - aV || a.facility_name.localeCompare(b.facility_name);
      }
      default:
        return a.facility_name.localeCompare(b.facility_name);
    }
  });

  return (
    <>
      {/* Sort dropdown */}
      <div className="mt-6 flex items-center justify-end gap-2">
        <label htmlFor="sort-select" className="text-sm text-gray-500">Sort by:</label>
        <select
          id="sort-select"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortOption)}
          className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 shadow-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy/20"
        >
          <option value="az">A–Z</option>
          <option value="violations-asc">Violations (fewest first)</option>
          <option value="violations-desc">Violations (most first)</option>
        </select>
      </div>

      {/* Facilities table */}
      <div className="mt-3 overflow-hidden rounded-2xl border border-warm-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b border-warm-200 bg-warm-50">
            <tr>
              <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                Facility Name
              </th>
              <th className="px-5 py-3.5 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">
                Violations
              </th>
              <th className="hidden px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 sm:table-cell">
                Last Inspection
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((facility, i) => {
              const facilitySlug = facility.slug.split('/').pop() ?? facility.slug;
              const inspDate = facility.last_inspection_date
                ? new Date(facility.last_inspection_date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : '\u2014';

              return (
                <tr
                  key={facility.id}
                  className={
                    facility.is_sponsored
                      ? 'border-b border-warm-100 bg-amber-50/50 transition-colors duration-150 hover:bg-amber-50'
                      : `border-b border-warm-100 transition-colors duration-150 hover:bg-warm-50 ${i % 2 === 1 ? 'bg-warm-50/40' : ''}`
                  }
                >
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/${stateSlug}/${citySlug}/${facilitySlug}`}
                        className="font-medium text-navy transition-colors duration-200 hover:text-navy-light hover:underline"
                      >
                        {toTitleCase(facility.facility_name)}
                      </Link>
                      {facility.is_sponsored && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-gradient-to-r from-amber-50 to-amber-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-navy">
                          <svg className="h-3 w-3 text-amber-500" viewBox="0 0 20 20" fill="currentColor">
                            <path
                              fillRule="evenodd"
                              d="M16.403 12.652a3 3 0 010-5.304 3 3 0 00-3.75-3.751 3 3 0 00-5.305 0 3 3 0 00-3.751 3.75 3 3 0 000 5.305 3 3 0 003.75 3.751 3 3 0 005.305 0 3 3 0 003.751-3.75zm-2.546-4.46a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                              clipRule="evenodd"
                            />
                          </svg>
                          Verified
                        </span>
                      )}
                    </div>
                    {facility.address && (
                      <p className="mt-0.5 text-xs text-gray-400">{facility.address}</p>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-center font-medium text-gray-700">
                    {facility.total_violations === null ? (
                      <span className="text-gray-400">—</span>
                    ) : (
                      facility.total_violations
                    )}
                  </td>
                  <td className="hidden px-5 py-3.5 text-gray-500 sm:table-cell">
                    {inspDate}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
