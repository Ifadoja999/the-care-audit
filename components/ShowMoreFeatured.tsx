'use client';

import { useState } from 'react';

interface Props {
  children: React.ReactNode;
  extraCount: number;
}

export default function ShowMoreFeatured({ children, extraCount }: Props) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      {expanded && children}
      <button
        onClick={() => setExpanded(!expanded)}
        className="mt-3 text-sm font-medium text-navy hover:underline"
      >
        {expanded
          ? 'Show fewer'
          : `View all featured facilities (${extraCount} more)`}
      </button>
    </>
  );
}
