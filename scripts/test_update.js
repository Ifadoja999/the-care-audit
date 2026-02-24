// Test a Supabase update to debug why enrichment updates fail
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://uhgooncaygpajfalazeb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVoZ29vbmNheWdwYWpmYWxhemViIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTM4NTkzOSwiZXhwIjoyMDg2OTYxOTM5fQ.S_U_o-fSXQk7PZuEbkEnMV9z7mrbsE4TNUEHnWAFTzI'
);

async function test() {
  // Get one facility without address
  const { data: [facility] } = await supabase
    .from('facilities')
    .select('id, facility_name, license_number')
    .eq('state', 'FL')
    .is('address', null)
    .limit(1);

  console.log('Test facility:', facility);

  // Try updating with address only
  const { data: d1, error: e1 } = await supabase
    .from('facilities')
    .update({ address: '123 Test St, Tampa, FL 33601' })
    .eq('id', facility.id)
    .select();

  console.log('Update address only:', e1 ? `ERROR: ${JSON.stringify(e1)}` : `OK (${d1.length} rows)`);

  // Try updating with phone
  const { data: d2, error: e2 } = await supabase
    .from('facilities')
    .update({ phone: '(555) 123-4567' })
    .eq('id', facility.id)
    .select();

  console.log('Update phone only:', e2 ? `ERROR: ${JSON.stringify(e2)}` : `OK (${d2.length} rows)`);

  // Try updating both
  const { data: d3, error: e3 } = await supabase
    .from('facilities')
    .update({ address: '123 Test St, Tampa, FL 33601', phone: '(555) 123-4567' })
    .eq('id', facility.id)
    .select();

  console.log('Update both:', e3 ? `ERROR: ${JSON.stringify(e3)}` : `OK (${d3.length} rows)`);

  // Try with inspection date
  const { data: d4, error: e4 } = await supabase
    .from('facilities')
    .update({ address: '123 Test St, Tampa, FL 33601', phone: '(555) 123-4567', last_inspection_date: '2024-01-15' })
    .eq('id', facility.id)
    .select();

  console.log('Update all three:', e4 ? `ERROR: ${JSON.stringify(e4)}` : `OK (${d4.length} rows)`);

  // Reset the test data
  await supabase.from('facilities').update({ address: null, phone: null, last_inspection_date: null }).eq('id', facility.id);
  console.log('Reset done');
}

test().catch(console.error);
