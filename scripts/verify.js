const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://uhgooncaygpajfalazeb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVoZ29vbmNheWdwYWpmYWxhemViIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTM4NTkzOSwiZXhwIjoyMDg2OTYxOTM5fQ.S_U_o-fSXQk7PZuEbkEnMV9z7mrbsE4TNUEHnWAFTzI'
);

async function verify() {
  console.log('=== POST-ENRICHMENT VERIFICATION ===\n');

  // 1. Total FL facilities
  const { count: total } = await supabase
    .from('facilities').select('*', { count: 'exact', head: true })
    .eq('state', 'FL');
  console.log(`1. Total FL facilities: ${total}`);

  // 2. With address
  const { count: withAddr } = await supabase
    .from('facilities').select('*', { count: 'exact', head: true })
    .eq('state', 'FL').not('address', 'is', null).neq('address', '');
  console.log(`2. With address: ${withAddr} (${(withAddr/total*100).toFixed(1)}%)`);

  // 3. With report_url
  const { count: withUrl } = await supabase
    .from('facilities').select('*', { count: 'exact', head: true })
    .eq('state', 'FL').not('report_url', 'is', null).neq('report_url', '');
  console.log(`3. With report_url: ${withUrl} (${(withUrl/total*100).toFixed(1)}%)`);

  // 4. With inspection date
  const { count: withDate } = await supabase
    .from('facilities').select('*', { count: 'exact', head: true })
    .eq('state', 'FL').not('last_inspection_date', 'is', null);
  console.log(`4. With last_inspection_date: ${withDate} (${(withDate/total*100).toFixed(1)}%)`);

  // 5. Violation rows
  const { count: violationRows } = await supabase
    .from('violations').select('*', { count: 'exact', head: true });
  console.log(`5. Total violation rows: ${violationRows}`);

  // 6. Distinct facilities with violations
  const { data: violFacs } = await supabase
    .from('violations').select('facility_id');
  const distinctViol = new Set((violFacs||[]).map(v => v.facility_id)).size;
  console.log(`6. Distinct facilities with violation details: ${distinctViol}`);

  // 7. Facilities with total_violations > 0 but no detail rows
  const { data: withViolations } = await supabase
    .from('facilities').select('id')
    .eq('state', 'FL').gt('total_violations', 0);
  const facIdsWithV = new Set((violFacs||[]).map(v => v.facility_id));
  const needsExtraction = (withViolations||[]).filter(f => !facIdsWithV.has(f.id));
  console.log(`7. Facilities needing violation extraction: ${needsExtraction.length}`);

  // 8. Sample enriched facility
  console.log('\n--- Sample Enriched Facility ---');
  const { data: [sample] } = await supabase
    .from('facilities')
    .select('facility_name, city, address, last_inspection_date, report_url, safety_grade, total_violations')
    .eq('state', 'FL')
    .not('address', 'is', null)
    .gt('total_violations', 0)
    .limit(1);
  if (sample) {
    console.log(`  Name: ${sample.facility_name}`);
    console.log(`  City: ${sample.city}`);
    console.log(`  Address: ${sample.address}`);
    console.log(`  Inspection: ${sample.last_inspection_date}`);
    console.log(`  Report URL: ${sample.report_url}`);
    console.log(`  Grade: ${sample.safety_grade}`);
    console.log(`  Violations: ${sample.total_violations}`);
  }

  // 9. Grade distribution
  console.log('\n--- Safety Grade Distribution ---');
  for (const grade of ['A', 'B', 'C', 'F']) {
    const { count } = await supabase
      .from('facilities').select('*', { count: 'exact', head: true })
      .eq('state', 'FL').eq('safety_grade', grade);
    console.log(`  ${grade}: ${count} (${(count/total*100).toFixed(1)}%)`);
  }

  const { count: noGrade } = await supabase
    .from('facilities').select('*', { count: 'exact', head: true })
    .eq('state', 'FL').is('safety_grade', null);
  console.log(`  No grade: ${noGrade} (${(noGrade/total*100).toFixed(1)}%)`);
}

verify().catch(console.error);
