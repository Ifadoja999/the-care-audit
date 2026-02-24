const FIRECRAWL_API_KEY = 'fc-f5a8e856d7574becb968ce7679782142';

async function test() {
  const url = 'https://quality.healthfinder.fl.gov/Facility-Provider/Profile/?&LID=724';
  const res = await fetch('https://api.firecrawl.dev/v1/scrape', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${FIRECRAWL_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, formats: ['markdown'] }),
  });
  const data = await res.json();
  const md = data.data.markdown;

  // Debug: show what the split produces
  const legalSplit = md.split(/#+\s*Legal Actions/i);
  console.log('Number of splits:', legalSplit.length);

  if (legalSplit.length >= 2) {
    const legalSection = legalSplit[1].split(/#+\s/)[0] || '';
    console.log('\n=== LEGAL SECTION ===');
    console.log(legalSection.substring(0, 1000));
    console.log('=== END ===');

    // Show lines with pipes
    const lines = legalSection.split('\n');
    for (const line of lines) {
      if (line.includes('|')) {
        const hasDate = /\d{1,2}\/\d{1,2}\/\d{4}/.test(line);
        const isOwnership = line.includes('Change of ownership');
        console.log(`  [pipe${hasDate ? '+date' : ''}${isOwnership ? '+SKIP' : ''}] ${line.substring(0, 120)}`);
      }
    }
  } else {
    console.log('NO Legal Actions section found');
    // Check if "Legal Actions" appears in the text at all
    const idx = md.indexOf('Legal Actions');
    console.log('Index of "Legal Actions" in raw text:', idx);
    if (idx > 0) {
      console.log('Context:', md.substring(idx - 50, idx + 200));
    }
  }
}
test().catch(console.error);
