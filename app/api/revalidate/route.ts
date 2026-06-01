import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * On-demand ISR revalidation.
 *
 * Usage:
 *   GET /api/revalidate?secret=...&path=/ohio/wooster/avenue-at-wooster-assisted-living
 *
 * The facility page uses `revalidate = 604800` (7-day ISR). When the underlying
 * Supabase data changes (for example, total_violations is backfilled), the
 * cached page (including any cached 404 from notFound()) stays in the Vercel
 * edge cache until the next revalidation cycle. This route purges a specific
 * path so the next request regenerates from fresh DB data.
 */
export async function GET(request: NextRequest) {
  const path = request.nextUrl.searchParams.get('path');
  const secret = request.nextUrl.searchParams.get('secret');

  if (!process.env.REVALIDATE_SECRET) {
    return NextResponse.json(
      { error: 'REVALIDATE_SECRET not configured' },
      { status: 500 }
    );
  }

  if (secret !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json({ error: 'Invalid secret' }, { status: 401 });
  }

  if (!path) {
    return NextResponse.json({ error: 'Missing path' }, { status: 400 });
  }

  revalidatePath(path);

  return NextResponse.json({
    revalidated: true,
    path,
    now: Date.now(),
  });
}
