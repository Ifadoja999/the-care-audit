import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  async redirects() {
    // Old Google-cached URLs → correct current URLs
    const cityRedirects = [
      // Michigan: Township abbreviations → full word
      ['michigan/waterford-twp', 'michigan/waterford-township'],
      ['michigan/clinton-twp', 'michigan/clinton-township'],
      ['michigan/washington-twp', 'michigan/washington-township'],
      ['michigan/west-bloomfield-twp', 'michigan/west-bloomfield-township'],
      ['michigan/w-bloomfield-twp', 'michigan/west-bloomfield-township'],
      ['michigan/delta-twp', 'michigan/delta-township'],
      ['michigan/redford-twp', 'michigan/redford-township'],
      ['michigan/orion-charter-twp', 'michigan/orion-charter-township'],
      ['michigan/lenox-twp', 'michigan/lenox-township'],
      ['michigan/independence-twp', 'michigan/independence-township'],
      ['michigan/brighton-twp', 'michigan/brighton-township'],
      // Michigan: Heights abbreviations → full word
      ['michigan/madison-hts', 'michigan/madison-heights'],
      ['michigan/dearborn-hts', 'michigan/dearborn-heights'],
      ['michigan/muskegon-hts', 'michigan/muskegon-heights'],
      // Michigan: Concatenated St. / other
      ['michigan/stignace', 'michigan/st-ignace'],
      ['michigan/flatrock', 'michigan/flat-rock'],
      ['michigan/l39anse', 'michigan/lanse'],
      // Illinois: Concatenated
      ['illinois/stcharles', 'illinois/st-charles'],
      // Idaho: State suffix in city
      ['idaho/nampa-id', 'idaho/nampa'],
      ['idaho/twin-falls-id', 'idaho/twin-falls'],
      // Mississippi: Corrupted prefixes (redirect to fixed cities)
      ['mississippi/tx-brandon', 'mississippi/brandon'],
      ['mississippi/tx-ridgeland', 'mississippi/ridgeland'],
      ['mississippi/ton-houston', 'mississippi/houston'],
      // Pennsylvania: Concatenated
      ['pennsylvania/wilkesbarre', 'pennsylvania/wilkes-barre'],
      ['pennsylvania/wilkesbarre-towns', 'pennsylvania/wilkes-barre-towns'],
      // North Carolina: Concatenated or typo
      ['north-carolina/winstonsalem', 'north-carolina/winston-salem'],
      ['north-carolina/fuquayvarina', 'north-carolina/fuquay-varina'],
      ['north-carolina/fuquayvarnia', 'north-carolina/fuquay-varina'],
      // New York: Concatenated or abbreviated
      ['new-york/crotononhudson', 'new-york/croton-on-hudson'],
      ['new-york/port-jefferson-sta', 'new-york/port-jefferson-station'],
      // Michigan: facility pages with char code apostrophe (39 = ')
      ['michigan/west-bloomfield-twp/charlene39s-senior-legacy', 'michigan/west-bloomfield-township/charlenes-senior-legacy'],
      ['michigan/riverview/carolyn39s-corner-senior-living', 'michigan/riverview/carolyns-corner-senior-living'],
      ['michigan/lincoln-park/charlotte39s-care-ii', 'michigan/lincoln-park/charlottes-care-ii'],
      ['michigan/saginaw/lewis39s-afc-home', 'michigan/saginaw/lewiss-afc-home'],
      ['michigan/wyandotte/charlotte39s-care', 'michigan/wyandotte/charlottes-care'],
      // Michigan: facility pages with "amp" encoding (& → amp)
      ['michigan/sterling-heights/love-amp-harmony-senior-living-llc', 'michigan/sterling-heights/love-harmony-senior-living-llc'],
      ['michigan/clio/a-amp-m-inc', 'michigan/clio/a-m-inc'],
      // Idaho: facility page with "amp" encoding
      ['idaho/idaho-falls/gables-of-idaho-falls-assisted-living-amp-memory-care', 'idaho/idaho-falls/gables-of-idaho-falls-assisted-living-memory-care'],
      // Michigan: facility page with concatenated city
      ['michigan/flatrock/marybrook-residence', 'michigan/flat-rock/marybrook-residence'],
      // Michigan: facility pages under twp-abbreviated cities
      ['michigan/delta-twp/the-courtyard-at-delta', 'michigan/delta-township/the-courtyard-at-delta'],
      ['michigan/clinton-twp/caring-professionals-afc-home', 'michigan/clinton-township/caring-professionals-afc-home'],
      ['michigan/oakland-twp/flourish-collection-at-oakland-charter-twp', 'michigan/oakland-township/flourish-collection-at-oakland-charter-twp'],
      // Ohio: Township abbreviation → full word
      ['ohio/olmsted-twp', 'ohio/olmsted-township'],
      // Michigan: Oakland Township abbreviation
      ['michigan/oakland-twp', 'michigan/oakland-township'],
      // Michigan: Sterling Heights abbreviation/typo
      ['michigan/sterling-hgts', 'michigan/sterling-heights'],
      ['michigan/sterling-heighnts', 'michigan/sterling-heights'],
      // Florida: Port St Lucie → Port Saint Lucie (normalized to majority)
      ['florida/port-st-lucie', 'florida/port-saint-lucie'],
      // Florida: Ft Lauderdale → Fort Lauderdale
      ['florida/ft-lauderdale', 'florida/fort-lauderdale'],
      // Illinois: O'Fallon slug variants
      ['illinois/ofallon', 'illinois/o-fallon'],
      // Florida: saint-johns → st-johns (after merge)
      ['florida/saint-johns', 'florida/st-johns'],
      // Minnesota: saint-anthony → st-anthony (after merge)
      ['minnesota/saint-anthony', 'minnesota/st-anthony'],
    ];

    // 2-letter state abbreviation → full state slug redirects
    // Safety net: any link using /tx, /fl, /ca etc. redirects to /texas, /florida, /california
    // This prevents future content from causing 404s if state abbreviations are accidentally used.
    const stateAbbrevRedirects = [
      ['al', 'alabama'], ['ak', 'alaska'], ['az', 'arizona'], ['ar', 'arkansas'],
      ['ca', 'california'], ['co', 'colorado'], ['ct', 'connecticut'], ['dc', 'district-of-columbia'],
      ['de', 'delaware'], ['fl', 'florida'], ['ga', 'georgia'], ['hi', 'hawaii'],
      ['id', 'idaho'], ['il', 'illinois'], ['in', 'indiana'], ['ia', 'iowa'],
      ['ks', 'kansas'], ['ky', 'kentucky'], ['la', 'louisiana'], ['me', 'maine'],
      ['md', 'maryland'], ['ma', 'massachusetts'], ['mi', 'michigan'], ['mn', 'minnesota'],
      ['ms', 'mississippi'], ['mo', 'missouri'], ['mt', 'montana'], ['ne', 'nebraska'],
      ['nv', 'nevada'], ['nh', 'new-hampshire'], ['nj', 'new-jersey'], ['nm', 'new-mexico'],
      ['ny', 'new-york'], ['nc', 'north-carolina'], ['nd', 'north-dakota'], ['oh', 'ohio'],
      ['ok', 'oklahoma'], ['or', 'oregon'], ['pa', 'pennsylvania'], ['ri', 'rhode-island'],
      ['sc', 'south-carolina'], ['sd', 'south-dakota'], ['tn', 'tennessee'], ['tx', 'texas'],
      ['ut', 'utah'], ['vt', 'vermont'], ['va', 'virginia'], ['wa', 'washington'],
      ['wv', 'west-virginia'], ['wi', 'wisconsin'], ['wy', 'wyoming'],
    ];

    return [
      // Non-www → www redirect
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'thecareaudit.com' }],
        destination: 'https://www.thecareaudit.com/:path*',
        permanent: true,
      },
      // State abbreviation → full state name redirects (e.g. /tx → /texas)
      ...stateAbbrevRedirects.flatMap(([abbrev, fullSlug]) => [
        {
          source: `/${abbrev}`,
          destination: `/${fullSlug}`,
          permanent: true,
        },
        {
          source: `/${abbrev}/:rest*`,
          destination: `/${fullSlug}/:rest*`,
          permanent: true,
        },
      ]),
      // Sitemap XML → sitemap index (fixes GSC 404 on /sitemap.xml)
      {
        source: '/sitemap.xml',
        destination: '/sitemap-index.xml',
        permanent: true,
      },
      // Specific facility redirects FIRST (before city wildcards catch them)
      ...cityRedirects
        .filter(([oldPath]) => oldPath.split('/').length === 3)
        .map(([oldPath, newPath]) => ({
          source: `/${oldPath}`,
          destination: `/${newPath}`,
          permanent: true,
        })),
      // City page redirects (with wildcard for facility subpages)
      ...cityRedirects
        .filter(([oldPath]) => oldPath.split('/').length === 2)
        .flatMap(([oldPath, newPath]) => [
          {
            source: `/${oldPath}`,
            destination: `/${newPath}`,
            permanent: true,
          },
          {
            source: `/${oldPath}/:facility*`,
            destination: `/${newPath}/:facility*`,
            permanent: true,
          },
        ]),
    ];
  },
};

export default nextConfig;
