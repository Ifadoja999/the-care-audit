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
      // Michigan: facility page with embedded ampersand (no hyphens) - "S&D" → "sampd" artifact
      ['michigan/caro/sampd-senior-living-home', 'michigan/caro/sd-senior-living-home'],
      // Michigan: Redford Charter Township slug → canonical city slug
      ['michigan/redford-charter-twp/the-orchards-at-redford-village', 'michigan/redford/the-orchards-at-redford-village'],
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
      // Michigan: missing township/abbreviation city variants
      ['michigan/sterling-hts', 'michigan/sterling-heights'],
      ['michigan/van-buren-twp', 'michigan/van-buren-township'],
      ['michigan/harperwoods', 'michigan/harper-woods'],
      ['michigan/harrison-twp', 'michigan/harrison-township'],
      ['michigan/macomb-twp', 'michigan/macomb-township'],
      ['michigan/bloomfield-twp', 'michigan/bloomfield-township'],
      ['michigan/chesterfield-twp', 'michigan/chesterfield-township'],
      // Idaho: state suffix in city
      ['idaho/emmett-id', 'idaho/emmett'],
      // Michigan: facility pages where city had bad slug + facility doesn't exist → send to city
      ['michigan/harrison-twp/angelic-homes', 'michigan/harrison-township'],
      ['michigan/bloomfield-twp/pitt', 'michigan/bloomfield-township'],
      ['michigan/macomb-twp/milestones', 'michigan/macomb-township'],
      ['michigan/chesterfield-twp/commonwealth-senior-living-at-new-baltimore', 'michigan/chesterfield-township'],
      ['michigan/sterling-hts/chesley-drive', 'michigan/sterling-heights'],
      // Michigan: 39-encoded (apostrophe artifact) facility slugs → city page (facility no longer in DB)
      ['michigan/grandville/david39s-house-all-pine', 'michigan/grandville'],
      ['michigan/caro/jamie39s-house', 'michigan/caro'],
      ['michigan/detroit/patterson39s-home', 'michigan/detroit'],
      ['michigan/redford/amen39s-care', 'michigan/redford'],
      ['michigan/ypsilanti/4-c39s-group-home', 'michigan/ypsilanti'],
      ['michigan/romulus/henry39s-inc-paradise-home', 'michigan/romulus'],
      ['michigan/grand-rapids/nano39s-care', 'michigan/grand-rapids'],
      ['michigan/grand-rapids/st-ann39s-home', 'michigan/grand-rapids'],
      ['michigan/muskegon/mary39s-house', 'michigan/muskegon'],
      ['michigan/niles/ammu39s', 'michigan/niles'],
      ['michigan/detroit/l-and-v39s-adult-foster-home', 'michigan/detroit'],
      ['michigan/holland/holland39s-hope', 'michigan/holland'],
      ['michigan/detroit/gabriel39s-nest-iii-inc', 'michigan/detroit'],
      ['michigan/farmington-hills/mom39s-house', 'michigan/farmington-hills'],
      ['michigan/berrien-springs/sara39s', 'michigan/berrien-springs'],
      ['michigan/detroit/mom39s-healing-hands-ii', 'michigan/detroit'],
      ['michigan/inkster/rose39s-place-ii', 'michigan/inkster'],
      ['michigan/edmore/mcbride-todd39s-place', 'michigan/edmore'],
      // Michigan: amp-encoded (ampersand artifact) facility slugs → city page
      ['michigan/northville/pomeroy-living-northville-assisted-amp-memory-care', 'michigan/northville'],
      ['michigan/alma/arbor-grove-assisted-living-amp-memory-care', 'michigan/alma'],
      ['michigan/detroit/g-amp-g-home', 'michigan/detroit'],
      ['michigan/portland/portland-assisted-living-amp-memory-center', 'michigan/portland'],
      ['michigan/portland/portland-assisted-living-amp-memory-manor', 'michigan/portland'],
      ['michigan/harper-woods/eampm-house-of-love-amp-peace', 'michigan/harper-woods'],
      ['michigan/sturgis/r-amp-r-adult-foster-care', 'michigan/sturgis'],
      ['michigan/galesburg/e-amp-f-douglas-group-living', 'michigan/galesburg'],
      ['michigan/saginaw/j-amp-m-family-group-llc', 'michigan/saginaw'],
      ['michigan/benton-harbor/hope-love-amp-grace-am110401946', 'michigan/benton-harbor'],
      ['michigan/midland/k-amp-k-quality-care-ii', 'michigan/midland'],
      ['michigan/kalamazoo/a-amp-l-afc', 'michigan/kalamazoo'],
      // Michigan: paulettes redirect (facility confirmed in DB with clean slug)
      ['michigan/southfield/paulette39s-assisted-living', 'michigan/southfield/paulettes-assisted-living'],
      // Idaho: amp-encoded facility slugs → correct slug (confirmed in DB)
      ['idaho/nampa/r-amp-v-assisted-living-inc', 'idaho/nampa/r-v-assisted-living-inc'],
      ['idaho/burley/home-amp-heart-assisted-living-llc', 'idaho/burley/home-heart-assisted-living-llc'],
      // Tennessee: facility no longer in DB → city page
      ['tennessee/mt-juliet/providence-place-of-mt-juliet', 'tennessee/mt-juliet'],
      // Alaska: facility not in DB → city page
      ['alaska/anchorage/brentwood-assisted-living', 'alaska/anchorage'],
      // Michigan: amp-encoded facility slug → correct slug (confirmed in DB)
      ['michigan/lansing/loving-care-amp-comfort-mjb-llc', 'michigan/lansing/loving-care-comfort-llc'],
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
      // Illinois: cities where all facilities are closed — redirect to state page
      ...['bensenville', 'bradford', 'buffalo', 'flora', 'green-valley', 'hinsdale', 'moweaqua', 'zion'].flatMap(city => [
        { source: `/illinois/${city}`, destination: '/illinois', permanent: true },
        { source: `/illinois/${city}/:facility*`, destination: '/illinois', permanent: true },
      ]),
      // Illinois/Idaho: facilities not in DB → state page
      { source: '/illinois/ringwood/shepherd-premier-senior-living', destination: '/illinois', permanent: true },
      // Minnesota: cities with no active facilities — redirect to state page
      ...['st-james', 'st-charles'].flatMap(city => [
        { source: `/minnesota/${city}`, destination: '/minnesota', permanent: true },
        { source: `/minnesota/${city}/:facility*`, destination: '/minnesota', permanent: true },
      ]),
      // Michigan: cities with no active facilities — redirect to state page
      ...['st-louis'].flatMap(city => [
        { source: `/michigan/${city}`, destination: '/michigan', permanent: true },
        { source: `/michigan/${city}/:facility*`, destination: '/michigan', permanent: true },
      ]),
      // Maryland: cities with no active facilities — redirect to state page
      ...['st-leonard', 'traceys-landing'].flatMap(city => [
        { source: `/maryland/${city}`, destination: '/maryland', permanent: true },
        { source: `/maryland/${city}/:facility*`, destination: '/maryland', permanent: true },
      ]),
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
