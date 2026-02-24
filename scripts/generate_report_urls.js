const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://uhgooncaygpajfalazeb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVoZ29vbmNheWdwYWpmYWxhemViIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTM4NTkzOSwiZXhwIjoyMDg2OTYxOTM5fQ.S_U_o-fSXQk7PZuEbkEnMV9z7mrbsE4TNUEHnWAFTzI'
);

const PROFILE_URL_BASE = 'https://quality.healthfinder.fl.gov/Facility-Provider/Profile/?&LID=';

async function generateReportUrls() {
  let totalUpdated = 0;
  let totalFailed = 0;
  let page = 0;
  const PAGE_SIZE = 1000;

  while (true) {
    const { data: facilities, error } = await supabase
      .from('facilities')
      .select('id, license_number')
      .eq('state', 'FL')
      .or('report_url.is.null,report_url.eq.')
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (error) {
      console.error('Fetch error:', error.message);
      return;
    }

    if (facilities.length === 0) break;

    console.log(`Page ${page + 1}: Found ${facilities.length} facilities to update`);

    for (const f of facilities) {
      const reportUrl = PROFILE_URL_BASE + f.license_number;
      const { error: updateError } = await supabase
        .from('facilities')
        .update({ report_url: reportUrl })
        .eq('id', f.id);

      if (updateError) {
        console.error(`Failed ${f.id}:`, updateError.message);
        totalFailed++;
      } else {
        totalUpdated++;
      }

      if (totalUpdated % 500 === 0) {
        console.log(`  Updated ${totalUpdated} so far...`);
      }
    }

    if (facilities.length < PAGE_SIZE) break;
    page++;
  }

  console.log(`\nDone. Updated: ${totalUpdated}, Failed: ${totalFailed}`);

  // Verify
  const { count } = await supabase
    .from('facilities')
    .select('*', { count: 'exact', head: true })
    .eq('state', 'FL')
    .not('report_url', 'is', null)
    .neq('report_url', '');
  console.log(`Verification: ${count} / 2983 FL facilities now have report_url`);
}

generateReportUrls().catch(console.error);
