export const STATE_INFO: Record<string, { name: string; slug: string }> = {
  AL: { name: 'Alabama',        slug: 'alabama' },
  AK: { name: 'Alaska',         slug: 'alaska' },
  AZ: { name: 'Arizona',        slug: 'arizona' },
  AR: { name: 'Arkansas',       slug: 'arkansas' },
  CA: { name: 'California',     slug: 'california' },
  CO: { name: 'Colorado',       slug: 'colorado' },
  CT: { name: 'Connecticut',    slug: 'connecticut' },
  DC: { name: 'District of Columbia', slug: 'district-of-columbia' },
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

/** "PLANT CITY" → "plant-city", "KAILUA-KONA" → "kailua-kona", "L'ANSE" → "lanse" */
export function cityToSlug(city: string): string {
  return city
    .replace(/&#\d+;/g, '')   // strip HTML entities like &#39;
    .replace(/&\w+;/g, '')    // strip named HTML entities like &amp;
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
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

/** State agency responsible for ALF inspections, used in FAQ copy */
export const STATE_AGENCY: Record<string, string> = {
  AL: 'Alabama Department of Public Health',
  AK: 'Alaska Health Facilities Licensing and Certification',
  AZ: 'Arizona Department of Health Services',
  AR: 'Arkansas Department of Human Services',
  CA: 'California Department of Social Services (CDSS/CCLD)',
  CO: 'Colorado Department of Public Health and Environment',
  CT: 'Connecticut Department of Public Health',
  DC: 'DC Health',
  DE: 'Delaware Division of Long-Term Care Residents Protection',
  FL: 'Agency for Health Care Administration (AHCA)',
  GA: 'Georgia Department of Community Health',
  HI: 'Hawaii Department of Health',
  ID: 'Idaho Department of Health and Welfare',
  IL: 'Illinois Department of Public Health',
  IN: 'Indiana Department of Health (IDOH)',
  IA: 'Iowa Department of Inspections and Appeals',
  KS: 'Kansas Department for Aging and Disability Services',
  KY: 'Kentucky Cabinet for Health and Family Services',
  LA: 'Louisiana Department of Health',
  ME: 'Maine Department of Health and Human Services',
  MD: 'Maryland Department of Health',
  MA: 'Massachusetts Executive Office of Elder Affairs',
  MI: 'Michigan Department of Licensing and Regulatory Affairs',
  MN: 'Minnesota Department of Health',
  MS: 'Mississippi State Department of Health',
  MO: 'Missouri Department of Health and Senior Services',
  MT: 'Montana Department of Public Health and Human Services',
  NE: 'Nebraska Department of Health and Human Services',
  NV: 'Nevada Department of Health and Human Services',
  NH: 'New Hampshire Department of Health and Human Services',
  NJ: 'New Jersey Department of Health',
  NM: 'New Mexico Department of Health',
  NY: 'New York Department of Health (NY DOH)',
  NC: 'NC Division of Health Service Regulation (DHSR)',
  ND: 'North Dakota Department of Health and Human Services',
  OH: 'Ohio Department of Health',
  OK: 'Oklahoma State Department of Health',
  OR: 'Oregon Department of Human Services (ODHS)',
  PA: 'Pennsylvania Department of Human Services (PA DHS)',
  RI: 'Rhode Island Department of Health',
  SC: 'South Carolina Department of Health and Environmental Control',
  SD: 'South Dakota Department of Health',
  TN: 'Tennessee Department of Health',
  TX: 'Texas Health and Human Services Commission (HHSC)',
  UT: 'Utah Department of Health and Human Services',
  VT: 'Vermont Department of Disabilities, Aging, and Independent Living',
  VA: 'Virginia Department of Social Services (VDSS)',
  WA: 'Washington Department of Social and Health Services',
  WV: 'West Virginia Office of Health Facility Licensure and Certification (OHFLAC)',
  WI: 'Wisconsin Department of Health Services',
  WY: 'Wyoming Department of Health',
};
