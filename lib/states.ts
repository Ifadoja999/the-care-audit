export const STATE_INFO: Record<string, { name: string; slug: string }> = {
  AL: { name: 'Alabama',        slug: 'alabama' },
  AK: { name: 'Alaska',         slug: 'alaska' },
  AZ: { name: 'Arizona',        slug: 'arizona' },
  AR: { name: 'Arkansas',       slug: 'arkansas' },
  CA: { name: 'California',     slug: 'california' },
  CO: { name: 'Colorado',       slug: 'colorado' },
  CT: { name: 'Connecticut',    slug: 'connecticut' },
  DE: { name: 'Delaware',       slug: 'delaware' },
  FL: { name: 'Florida',        slug: 'florida' },
  GA: { name: 'Georgia',        slug: 'georgia' },
  HI: { name: 'Hawaii',         slug: 'hawaii' },
  ID: { name: 'Idaho',          slug: 'idaho' },
  IL: { name: 'Illinois',       slug: 'illinois' },
  IN: { name: 'Indiana',        slug: 'indiana' },
  IA: { name: 'Iowa',           slug: 'iowa' },
  KS: { name: 'Kansas',         slug: 'kansas' },
  KY: { name: 'Kentucky',       slug: 'kentucky' },
  LA: { name: 'Louisiana',      slug: 'louisiana' },
  ME: { name: 'Maine',          slug: 'maine' },
  MD: { name: 'Maryland',       slug: 'maryland' },
  MA: { name: 'Massachusetts',  slug: 'massachusetts' },
  MI: { name: 'Michigan',       slug: 'michigan' },
  MN: { name: 'Minnesota',      slug: 'minnesota' },
  MS: { name: 'Mississippi',    slug: 'mississippi' },
  MO: { name: 'Missouri',       slug: 'missouri' },
  MT: { name: 'Montana',        slug: 'montana' },
  NE: { name: 'Nebraska',       slug: 'nebraska' },
  NV: { name: 'Nevada',         slug: 'nevada' },
  NH: { name: 'New Hampshire',  slug: 'new-hampshire' },
  NJ: { name: 'New Jersey',     slug: 'new-jersey' },
  NM: { name: 'New Mexico',     slug: 'new-mexico' },
  NY: { name: 'New York',       slug: 'new-york' },
  NC: { name: 'North Carolina', slug: 'north-carolina' },
  ND: { name: 'North Dakota',   slug: 'north-dakota' },
  OH: { name: 'Ohio',           slug: 'ohio' },
  OK: { name: 'Oklahoma',       slug: 'oklahoma' },
  OR: { name: 'Oregon',         slug: 'oregon' },
  PA: { name: 'Pennsylvania',   slug: 'pennsylvania' },
  RI: { name: 'Rhode Island',   slug: 'rhode-island' },
  SC: { name: 'South Carolina', slug: 'south-carolina' },
  SD: { name: 'South Dakota',   slug: 'south-dakota' },
  TN: { name: 'Tennessee',      slug: 'tennessee' },
  TX: { name: 'Texas',          slug: 'texas' },
  UT: { name: 'Utah',           slug: 'utah' },
  VT: { name: 'Vermont',        slug: 'vermont' },
  VA: { name: 'Virginia',       slug: 'virginia' },
  WA: { name: 'Washington',     slug: 'washington' },
  WV: { name: 'West Virginia',  slug: 'west-virginia' },
  WI: { name: 'Wisconsin',      slug: 'wisconsin' },
  WY: { name: 'Wyoming',        slug: 'wyoming' },
};

export const ALL_STATE_CODES = Object.keys(STATE_INFO);

export function stateCodeToSlug(code: string): string {
  return STATE_INFO[code.toUpperCase()]?.slug ?? code.toLowerCase();
}

export function slugToStateCode(slug: string): string | null {
  const entry = Object.entries(STATE_INFO).find(([, v]) => v.slug === slug);
  return entry?.[0] ?? null;
}

export function stateCodeToName(code: string): string {
  return STATE_INFO[code.toUpperCase()]?.name ?? code;
}

/** "PLANT CITY" or "Tampa" → "plant-city" or "tampa" */
export function cityToSlug(city: string): string {
  return city
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

/** "plant-city" → "Plant City" */
export function slugToCity(slug: string): string {
  return slug
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/** "PLANT CITY" or "TAMPA" → "Plant City" / "Tampa" for display */
export function displayCity(city: string): string {
  return city
    .toLowerCase()
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}
