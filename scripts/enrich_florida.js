/**
 * Florida Data Re-Enrichment Script (Prompt 15)
 *
 * Phases 1-1b already completed in prior run (report_urls fixed with correct LIC_IDs).
 * This run extracts LIC_IDs from existing report_urls and scrapes profile pages.
 *
 * Phase 2: Fetch facilities needing enrichment (null address), extract LIC_ID from report_url
 * Phase 3: Scrape profile pages, extract address + inspection date, update Supabase
 *          Phone data saved to local JSON file (phone column pending in Supabase)
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabase = createClient(
  'https://uhgooncaygpajfalazeb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVoZ29vbmNheWdwYWpmYWxhemViIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTM4NTkzOSwiZXhwIjoyMDg2OTYxOTM5fQ.S_U_o-fSXQk7PZuEbkEnMV9z7mrbsE4TNUEHnWAFTzI'
);

const FIRECRAWL_API_KEY = 'fc-f5a8e856d7574becb968ce7679782142';
const PROFILE_URL_BASE = 'https://quality.healthfinder.fl.gov/Facility-Provider/Profile/?&LID=';

const DELAY_MS = 1500;
const PHONE_DATA_FILE = path.join(__dirname, 'phone_data.json');

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function extractAddress(md) {
  const streetMatch = md.match(/Street Address\s*\n+[-*]?\s*(.+?)\n+([A-Z\s]+,\s*FL\s*[\d-]+)/i);
  if (streetMatch) return `${streetMatch[1].trim()}, ${streetMatch[2].trim()}`;
  return null;
}

function extractPhone(md) {
  const streetSection = md.split(/Mailing Address/i)[0] || md;
  const phoneMatch = streetSection.match(/Phone:\s*\[?\((\d{3})\)\s*(\d{3})-(\d{4})/);
  if (phoneMatch) return `(${phoneMatch[1]}) ${phoneMatch[2]}-${phoneMatch[3]}`;
  return null;
}

function extractInspectionDate(md) {
  const legalSplit = md.split(/#+\s*Legal Actions/i);
  if (legalSplit.length < 2) return null;
  const legalSection = legalSplit[1].split(/\n#+\s/)[0] || '';
  const lines = legalSection.split('\n');
  let mostRecent = null;
  let mostRecentStr = null;

  for (const line of lines) {
    if (line.includes('Change of ownership')) continue;
    if (!line.includes('|')) continue;
    const dateMatches = [...line.matchAll(/(\d{1,2})\/(\d{1,2})\/(\d{4})/g)];
    for (const m of dateMatches) {
      const month = parseInt(m[1]);
      const day = parseInt(m[2]);
      const year = parseInt(m[3]);
      if (year < 2015 || month < 1 || month > 12 || day < 1 || day > 31) continue;
      const d = new Date(year, month - 1, day);
      if (d > new Date()) continue;
      if (mostRecent === null || d > mostRecent) {
        mostRecent = d;
        const yy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        mostRecentStr = `${yy}-${mm}-${dd}`;
      }
    }
  }
  return mostRecentStr;
}

async function scrapeProfile(licId) {
  const url = PROFILE_URL_BASE + licId;

  try {
    const res = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url, formats: ['markdown'] }),
    });

    if (res.status === 429) {
      console.log('    Rate limited, waiting 10s...');
      await sleep(10000);
      return scrapeProfile(licId);
    }

    const data = await res.json();
    if (data.success && data.data && data.data.markdown && data.data.markdown.length > 200) {
      const md = data.data.markdown;
      return {
        address: extractAddress(md),
        phone: extractPhone(md),
        last_inspection_date: extractInspectionDate(md),
      };
    } else {
      return { address: null, phone: null, last_inspection_date: null, error: 'Empty or short response' };
    }
  } catch (err) {
    return { address: null, phone: null, last_inspection_date: null, error: err.message };
  }
}

async function main() {
  console.log('=== Florida Data Re-Enrichment ===\n');
  console.log('Phases 1-1b already complete (report_urls fixed with correct LIC_IDs).');
  console.log('Skipping to Phase 2...\n');

  // ─── PHASE 2: Fetch facilities needing enrichment ───────────────────
  console.log('PHASE 2: Fetching facilities needing enrichment...');

  let allFacilities = [];
  let page = 0;
  while (true) {
    const { data, error } = await supabase
      .from('facilities')
      .select('id, license_number, facility_name, report_url')
      .eq('state', 'FL')
      .or('address.is.null,address.eq.')
      .order('facility_name')
      .range(page * 1000, (page + 1) * 1000 - 1);

    if (error) { console.error('Fetch error:', error.message); return; }
    allFacilities = allFacilities.concat(data);
    if (data.length < 1000) break;
    page++;
  }

  console.log(`  ${allFacilities.length} facilities need enrichment\n`);

  // ─── PHASE 3: Scrape and update ─────────────────────────────────────
  console.log('PHASE 3: Scraping profile pages...');
  console.log('  NOTE: phone column not yet in Supabase — saving phone data to local file\n');

  let enriched = 0;
  let addressFound = 0;
  let phoneFound = 0;
  let dateFound = 0;
  let failed = 0;
  let skipped = 0;
  const phoneData = {};  // { facility_id: phone_number }
  const startTime = Date.now();

  for (let i = 0; i < allFacilities.length; i++) {
    const f = allFacilities[i];

    // Extract LIC_ID from the already-corrected report_url
    let licId = null;
    if (f.report_url) {
      const lidMatch = f.report_url.match(/LID=(\d+)/);
      if (lidMatch) licId = lidMatch[1];
    }

    if (!licId) {
      skipped++;
      if (skipped <= 5) console.log(`  SKIP: No LIC_ID in report_url for ${f.facility_name}`);
      continue;
    }

    const result = await scrapeProfile(licId);

    // Save phone data locally (can't write to Supabase yet)
    if (result.phone) {
      phoneData[f.id] = result.phone;
      phoneFound++;
    }

    // Build Supabase update (address + inspection date only, NO phone)
    const update = {};
    if (result.address) { update.address = result.address; addressFound++; }
    if (result.last_inspection_date) { update.last_inspection_date = result.last_inspection_date; dateFound++; }

    if (Object.keys(update).length > 0) {
      const { error } = await supabase
        .from('facilities')
        .update(update)
        .eq('id', f.id);
      if (error) {
        failed++;
        if (failed <= 3) console.log(`  UPDATE ERROR: ${error.message} (facility: ${f.facility_name})`);
      } else {
        enriched++;
      }
    } else {
      if (result.error) failed++;
    }

    // Save phone data periodically
    if ((i + 1) % 100 === 0) {
      fs.writeFileSync(PHONE_DATA_FILE, JSON.stringify(phoneData, null, 2));
    }

    if ((i + 1) % 50 === 0 || i === allFacilities.length - 1) {
      const elapsed = (Date.now() - startTime) / 1000;
      const processed = i + 1 - skipped;
      const rate = processed > 0 ? (processed / (elapsed / 60)).toFixed(1) : '0';
      const remaining = allFacilities.length - i - 1;
      const etaMin = parseFloat(rate) > 0 ? (remaining / parseFloat(rate)).toFixed(1) : '?';
      console.log(
        `[${i + 1}/${allFacilities.length}] ` +
        `addr=${addressFound} phone=${phoneFound} date=${dateFound} ` +
        `enriched=${enriched} skip=${skipped} fail=${failed} ` +
        `(${rate}/min, ~${etaMin}min left)`
      );
    }

    await sleep(DELAY_MS);
  }

  // Final save of phone data
  fs.writeFileSync(PHONE_DATA_FILE, JSON.stringify(phoneData, null, 2));

  console.log('\n=== ENRICHMENT COMPLETE ===');
  console.log(`Total: ${allFacilities.length}`);
  console.log(`Skipped (no LIC_ID): ${skipped}`);
  console.log(`Addresses: ${addressFound}`);
  console.log(`Phones: ${phoneFound} (saved to ${PHONE_DATA_FILE})`);
  console.log(`Dates: ${dateFound}`);
  console.log(`Enriched (Supabase): ${enriched}`);
  console.log(`Failed: ${failed}`);
  console.log('\nNEXT: Add phone column to Supabase, then run scripts/update_phones.js');
}

main().catch(console.error);
