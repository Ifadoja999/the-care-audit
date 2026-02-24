const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://uhgooncaygpajfalazeb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVoZ29vbmNheWdwYWpmYWxhemViIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTM4NTkzOSwiZXhwIjoyMDg2OTYxOTM5fQ.S_U_o-fSXQk7PZuEbkEnMV9z7mrbsE4TNUEHnWAFTzI'
);

async function audit() {
  const { data: withViolations } = await supabase
    .from('facilities')
    .select('id')
    .eq('state', 'FL')
    .gt('total_violations', 0);

  const { data: violationFacIds } = await supabase
    .from('violations')
    .select('facility_id');

  const violatedSet = new Set((violationFacIds || []).map(v => v.facility_id));
  const allWithV = withViolations || [];
  const needsExtraction = allWithV.filter(f => {
    return violatedSet.has(f.id) === false;
  });

  console.log('Facilities with total_violations > 0:', allWithV.length);
  console.log('Facilities WITH violation detail rows:', violatedSet.size);
  console.log('Facilities NEEDING violation extraction:', needsExtraction.length);

  const { count: withPhone } = await supabase
    .from('facilities')
    .select('*', { count: 'exact', head: true })
    .eq('state', 'FL')
    .not('phone', 'is', null)
    .neq('phone', '');
  console.log('With phone:', withPhone);
}

audit().catch(console.error);
