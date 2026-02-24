/**
 * Update phone numbers in Supabase from locally-saved phone_data.json
 *
 * PREREQUISITE: Run this SQL in Supabase SQL Editor first:
 *   ALTER TABLE facilities ADD COLUMN IF NOT EXISTS phone TEXT;
 *
 * Then run: node scripts/update_phones.js
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabase = createClient(
  'https://uhgooncaygpajfalazeb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVoZ29vbmNheWdwYWpmYWxhemViIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTM4NTkzOSwiZXhwIjoyMDg2OTYxOTM5fQ.S_U_o-fSXQk7PZuEbkEnMV9z7mrbsE4TNUEHnWAFTzI'
);

const PHONE_DATA_FILE = path.join(__dirname, 'phone_data.json');

async function main() {
  if (!fs.existsSync(PHONE_DATA_FILE)) {
    console.error('phone_data.json not found. Run enrich_florida.js first.');
    process.exit(1);
  }

  const phoneData = JSON.parse(fs.readFileSync(PHONE_DATA_FILE, 'utf8'));
  const entries = Object.entries(phoneData);
  console.log(`Loaded ${entries.length} phone numbers from phone_data.json`);

  // Test that phone column exists
  const { error: testErr } = await supabase
    .from('facilities')
    .update({ phone: 'test' })
    .eq('id', '00000000-0000-0000-0000-000000000000');

  if (testErr && testErr.message.includes("'phone' column")) {
    console.error('\nERROR: phone column does not exist yet!');
    console.error('Run this SQL in Supabase SQL Editor:');
    console.error('  ALTER TABLE facilities ADD COLUMN IF NOT EXISTS phone TEXT;');
    process.exit(1);
  }

  let updated = 0;
  let failed = 0;

  for (const [facilityId, phone] of entries) {
    const { error } = await supabase
      .from('facilities')
      .update({ phone })
      .eq('id', facilityId);

    if (error) {
      failed++;
      if (failed <= 3) console.error(`  Failed ${facilityId}: ${error.message}`);
    } else {
      updated++;
    }

    if (updated % 500 === 0 && updated > 0) {
      console.log(`  Updated ${updated}/${entries.length}...`);
    }
  }

  console.log(`\nDone. Updated: ${updated}, Failed: ${failed}`);

  // Verify
  const { count } = await supabase
    .from('facilities')
    .select('*', { count: 'exact', head: true })
    .eq('state', 'FL')
    .not('phone', 'is', null)
    .neq('phone', '');
  console.log(`Verification: ${count} FL facilities now have phone numbers`);
}

main().catch(console.error);
