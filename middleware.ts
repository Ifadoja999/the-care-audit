import { NextRequest, NextResponse } from 'next/server';

/**
 * Middleware to catch and redirect bad URL patterns that cause 404s.
 *
 * Handles patterns that static redirects in next.config.ts can't cover
 * dynamically, including:
 *   - HTML entity artifacts in slugs (39 = apostrophe, amp = ampersand)
 *   - Township/Heights abbreviations in city slugs
 *   - State code suffixes in city slugs
 *   - Other known data-quality patterns
 *
 * This runs BEFORE the page renders, so Google gets a 301 redirect
 * instead of a 404 — which is what GSC validation needs to pass.
 */

// Only run on state/city/facility paths (skip _next, api, static files, etc.)
export const config = {
  matcher: [
    '/((?!_next|api|favicon|opengraph|sitemap|robots|manifest|search|about|contact|for-facilities|pricing|blog).*)',
  ],
};

/**
 * Clean a slug segment by removing HTML entity artifacts.
 * "st-ann39s-home" → "st-anns-home"
 * "a-amp-m-inc"    → "a-m-inc"
 * "love-amp-harmony" → "love-harmony"
 */
function cleanSlugSegment(segment: string): string {
  let cleaned = segment;

  // Remove apostrophe artifacts: "39s" → "s", "39" at end of word
  // Pattern: digits that are HTML char codes stuck in the slug
  // &#39; = apostrophe → "39" leaked into slug
  cleaned = cleaned.replace(/39s\b/g, 's');    // "ann39s" → "anns"
  cleaned = cleaned.replace(/39\b/g, '');       // trailing "39" → removed
  cleaned = cleaned.replace(/34/g, '');          // &#34; = quote

  // Remove ampersand artifacts: "-amp-" → "-"
  cleaned = cleaned.replace(/-amp-/g, '-');

  // Collapse multiple hyphens and trim
  cleaned = cleaned.replace(/-+/g, '-').replace(/^-|-$/g, '');

  return cleaned;
}

/**
 * City slug normalization for known abbreviation patterns.
 */
const CITY_ABBREVIATION_MAP: Record<string, Record<string, string>> = {
  // Michigan township abbreviations
  michigan: {
    'waterford-twp': 'waterford-township',
    'clinton-twp': 'clinton-township',
    'washington-twp': 'washington-township',
    'west-bloomfield-twp': 'west-bloomfield-township',
    'w-bloomfield-twp': 'west-bloomfield-township',
    'delta-twp': 'delta-township',
    'redford-twp': 'redford-township',
    'orion-charter-twp': 'orion-charter-township',
    'lenox-twp': 'lenox-township',
    'independence-twp': 'independence-township',
    'brighton-twp': 'brighton-township',
    'oakland-twp': 'oakland-township',
    'bloomfield-twp': 'bloomfield-township',
    'harrison-twp': 'harrison-township',
    'kimball-twp': 'kimball-township',
    'van-buren-twp': 'van-buren-township',
    'redford-charter-twp': 'redford',
    'chesterfield-twp': 'chesterfield-township',
    'macomb-twp': 'macomb-township',
    'madison-hts': 'madison-heights',
    'dearborn-hts': 'dearborn-heights',
    'muskegon-hts': 'muskegon-heights',
    'sterling-hgts': 'sterling-heights',
    'sterling-heighnts': 'sterling-heights',
    'stignace': 'st-ignace',
    'flatrock': 'flat-rock',
    'l39anse': 'lanse',
    'harperwoods': 'harper-woods',
  },
  // Ohio
  ohio: {
    'olmsted-twp': 'olmsted-township',
  },
  // Illinois
  illinois: {
    'stcharles': 'st-charles',
    'ofallon': 'o-fallon',
    'o-fallon': 'o-fallon', // canonical
  },
  // Idaho
  idaho: {
    'nampa-id': 'nampa',
    'twin-falls-id': 'twin-falls',
    'emmett-id': 'emmett',
    'burley-id': 'burley',
  },
  // Mississippi
  mississippi: {
    'tx-brandon': 'brandon',
    'tx-ridgeland': 'ridgeland',
    'ton-houston': 'houston',
  },
  // Pennsylvania
  pennsylvania: {
    'wilkesbarre': 'wilkes-barre',
    'wilkesbarre-towns': 'wilkes-barre-towns',
  },
  // North Carolina
  'north-carolina': {
    'winstonsalem': 'winston-salem',
    'fuquayvarina': 'fuquay-varina',
    'fuquayvarnia': 'fuquay-varina',
  },
  // New York
  'new-york': {
    'crotononhudson': 'croton-on-hudson',
    'port-jefferson-sta': 'port-jefferson-station',
  },
  // Florida
  florida: {
    'port-st-lucie': 'port-saint-lucie',
    'ft-lauderdale': 'fort-lauderdale',
    'saint-johns': 'st-johns',
  },
  // Minnesota
  minnesota: {
    'saint-anthony': 'st-anthony',
    // 'lake-st-croix-beach' REMOVED 2026-05-26: DB stores it as "LAKE ST CROIX BEACH"
    // so the natural lake-st-croix-beach slug resolves correctly via getFacilitiesByCity.
    // Redirecting to "lake-saint-croix-beach" sent visitors to a non-existent slug.
  },
};

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── Bot detection: block scraper User-Agents and empty UAs ──
  const ua = request.headers.get('user-agent') ?? '';
  const isVercelInternal = request.headers.get('x-vercel-internal') !== null;

  if (!isVercelInternal) {
    if (!ua) {
      return new NextResponse('Forbidden', { status: 403 });
    }
    const allowedCrawlers = /googlebot|bingbot|slurp|duckduckbot|baiduspider|yandexbot|facebot|ia_archiver/i;
    if (!allowedCrawlers.test(ua)) {
      const blockedPatterns = /python-requests|python-urllib|go-http-client|scrapy|wget|libwww-perl|java\/|ruby|perl|php|curl\/|axios\/[0-9]|node-fetch|puppeteer|playwright|selenium|phantomjs|headlesschrome|dataforseo|ahrefsbot|semrushbot|mj12bot|dotbot|petalbot|bytespider|ccbot|gptbot|anthropic-ai|google-extended/i;
      if (blockedPatterns.test(ua)) {
        return new NextResponse('Forbidden', { status: 403 });
      }
    }
  }

  // Skip non-path requests
  if (pathname === '/' || pathname.split('/').filter(Boolean).length === 0) {
    return NextResponse.next();
  }

  const segments = pathname.split('/').filter(Boolean);
  if (segments.length < 2 || segments.length > 3) {
    return NextResponse.next();
  }

  const [stateSlug, citySlug, facilitySlug] = segments;
  let newCity = citySlug;
  let newFacility = facilitySlug;
  let changed = false;

  // ── 1. Check for HTML entity artifacts in ANY segment ──
  // Apostrophe: "39s" in slug (from &#39; + s, like "ann39s")
  // Ampersand: "-amp-" in slug (from &amp;)
  if (/39s/i.test(citySlug) || /-amp-/.test(citySlug)) {
    newCity = cleanSlugSegment(citySlug);
    if (newCity !== citySlug) changed = true;
  }

  if (facilitySlug && (/39s/i.test(facilitySlug) || /-amp-/.test(facilitySlug))) {
    newFacility = cleanSlugSegment(facilitySlug);
    if (newFacility !== facilitySlug) changed = true;
  }

  // ── 2. Check city abbreviation map ──
  const stateMap = CITY_ABBREVIATION_MAP[stateSlug];
  if (stateMap && stateMap[newCity]) {
    newCity = stateMap[newCity];
    changed = true;
  }

  // ── 3. Dynamic pattern: any "-twp" suffix → "-township" ──
  if (newCity.endsWith('-twp') && !newCity.endsWith('-township')) {
    newCity = newCity.replace(/-twp$/, '-township');
    changed = true;
  }

  // ── 4. Dynamic pattern: any "-hts" suffix → "-heights" ──
  if (newCity.endsWith('-hts')) {
    newCity = newCity.replace(/-hts$/, '-heights');
    changed = true;
  }

  // ── 5. Dynamic pattern: state code suffix (e.g., "nampa-id") ──
  // Only for 2-letter suffixes that match known state codes
  const stateCodeSuffix = newCity.match(/-([a-z]{2})$/);
  if (stateCodeSuffix) {
    const suffix = stateCodeSuffix[1].toUpperCase();
    const knownStateCodes = ['ID', 'TX', 'MS', 'OH', 'IL', 'PA', 'NY', 'MI', 'MN', 'NC'];
    if (knownStateCodes.includes(suffix)) {
      const withoutSuffix = newCity.replace(/-[a-z]{2}$/, '');
      if (withoutSuffix.length > 2) { // sanity check
        newCity = withoutSuffix;
        changed = true;
      }
    }
  }

  if (!changed) {
    return NextResponse.next();
  }

  // Build redirect URL
  const newPath = newFacility
    ? `/${stateSlug}/${newCity}/${newFacility}`
    : `/${stateSlug}/${newCity}`;

  // Avoid redirect loops
  if (newPath === pathname) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = newPath;
  return NextResponse.redirect(url, 301);
}
