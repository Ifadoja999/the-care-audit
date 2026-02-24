#!/usr/bin/env node
/**
 * enrich-facility-contacts.mjs
 * Google Places enrichment — captures email and website for outreach.
 * Usage: node scripts/enrich-facility-contacts.mjs --state FL
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Parse --state flag
const stateIdx = process.argv.indexOf('--state');
const stateCode = stateIdx !== -1 ? process.argv[stateIdx + 1] : null;

if (!stateCode) {
  console.error('Usage: node scripts/enrich-facility-contacts.mjs --state FL');
  process.exit(1);
}

if (!GOOGLE_API_KEY || GOOGLE_API_KEY === 'placeholder') {
  console.error('GOOGLE_PLACES_API_KEY not configured. Set it in .env.local');
  process.exit(1);
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function searchPlace(facilityName, city, state) {
  const query = encodeURIComponent(`${facilityName} ${city} ${state}`);
  const url = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${query}&inputtype=textquery&fields=place_id&key=${GOOGLE_API_KEY}`;

  const resp = await fetch(url);
  const data = await resp.json();

  if (data.candidates && data.candidates.length > 0) {
    return data.candidates[0].place_id;
  }
  return null;
}

async function getPlaceDetails(placeId) {
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=website,formatted_phone_number&key=${GOOGLE_API_KEY}`;

  const resp = await fetch(url);
  const data = await resp.json();

  if (data.result) {
    return {
      website: data.result.website || null,
      // Note: Google Places doesn't directly return email.
      // Email extraction would require scraping the website, which is beyond scope.
      // We capture the website URL and can extract email later.
    };
  }
  return null;
}

async function main() {
  console.log(`\n=== GOOGLE PLACES ENRICHMENT — ${stateCode} ===`);

  // Fetch all facilities in the state
  const allFacilities = [];
  let from = 0;
  const PAGE_SIZE = 1000;

  while (true) {
    const { data, error } = await supabase
      .from('facilities')
      .select('id, facility_name, city, state, outreach_email, outreach_website')
      .eq('state', stateCode.toUpperCase())
      .range(from, from + PAGE_SIZE - 1);

    if (error) { console.error('Query error:', error.message); break; }
    if (!data || data.length === 0) break;
    allFacilities.push(...data);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  console.log(`Total facilities: ${allFacilities.length}`);

  let emailsFound = 0;
  let websitesFound = 0;
  let notFound = 0;

  for (let i = 0; i < allFacilities.length; i++) {
    const f = allFacilities[i];

    // Skip if already enriched
    if (f.outreach_website) {
      websitesFound++;
      continue;
    }

    if ((i + 1) % 50 === 0) {
      console.log(`Progress: ${i + 1}/${allFacilities.length}`);
    }

    try {
      const placeId = await searchPlace(f.facility_name, f.city, f.state);

      if (!placeId) {
        notFound++;
        await sleep(200);
        continue;
      }

      const details = await getPlaceDetails(placeId);

      if (details && details.website) {
        websitesFound++;
        await supabase
          .from('facilities')
          .update({ outreach_website: details.website })
          .eq('id', f.id);
      } else {
        notFound++;
      }
    } catch (err) {
      console.error(`Error for ${f.facility_name}: ${err.message}`);
    }

    await sleep(1000); // Rate limit: 1 second between API calls
  }

  console.log(`\n--- SUMMARY ---`);
  console.log(`Total facilities: ${allFacilities.length}`);
  console.log(`Emails found: ${emailsFound}`);
  console.log(`Websites found: ${websitesFound}`);
  console.log(`Not found: ${notFound}`);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
