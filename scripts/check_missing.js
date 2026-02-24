const { createClient } = require('@supabase/supabase-js');
const sb = createClient(
  'https://uhgooncaygpajfalazeb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVoZ29vbmNheWdwYWpmYWxhemViIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTM4NTkzOSwiZXhwIjoyMDg2OTYxOTM5fQ.S_U_o-fSXQk7PZuEbkEnMV9z7mrbsE4TNUEHnWAFTzI'
);

async function main() {
  const { data: violFacs } = await sb.from('violations').select('facility_id');
  const facIdsWithRows = new Set((violFacs || []).map(v => v.facility_id));

  // Get all FL facilities with total_violations > 0
  let all = [];
  let page = 0;
  while (true) {
    const { data } = await sb
      .from('facilities')
      .select('id, facility_name, total_violations, safety_grade, ai_summary')
      .eq('state', 'FL')
      .gt('total_violations', 0)
      .order('total_violations', { ascending: false })
      .range(page * 1000, (page + 1) * 1000 - 1);
    all = all.concat(data || []);
    if (!data || data.length < 1000) break;
    page++;
  }

  const missing = all.filter(f => !facIdsWithRows.has(f.id));

  console.log('Facilities with total_violations > 0 but no violation rows:', missing.length);
  console.log('\nSample (top 8 by violation count):');
  for (const f of missing.slice(0, 8)) {
    console.log(`  ${f.facility_name} — grade ${f.safety_grade}, violations: ${f.total_violations}`);
    console.log(`    Summary: ${(f.ai_summary || 'none').substring(0, 140)}`);
  }

  // Distribution
  const violCounts = {};
  for (const f of missing) {
    const k = f.total_violations;
    violCounts[k] = (violCounts[k] || 0) + 1;
  }
  console.log('\nDistribution of total_violations for these facilities:');
  for (const [k, v] of Object.entries(violCounts).sort((a, b) => Number(a[0]) - Number(b[0]))) {
    console.log(`  ${k} violations: ${v} facilities`);
  }
}

main().catch(console.error);
