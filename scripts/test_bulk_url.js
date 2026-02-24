// Test a profile URL using a bulk-loaded license_number (LIC_ID format)
const FIRECRAWL_API_KEY = 'fc-f5a8e856d7574becb968ce7679782142';

async function test() {
  // These are bulk-loaded license_numbers
  const testIds = ['11968002', '11970223', '11968637'];

  for (const id of testIds) {
    const url = `https://quality.healthfinder.fl.gov/Facility-Provider/Profile/?&LID=${id}`;
    console.log(`\nTesting LID=${id} -> ${url}`);

    const res = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${FIRECRAWL_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, formats: ['markdown'] }),
    });

    const data = await res.json();
    if (data.success && data.data && data.data.markdown) {
      const md = data.data.markdown;
      console.log('  Got markdown:', md.length, 'chars');
      console.log('  Has "Street Address":', md.includes('Street Address'));
      console.log('  First 500 chars:', md.substring(0, 500));
    } else {
      console.log('  FAILED:', JSON.stringify(data).substring(0, 300));
    }
  }
}
test().catch(console.error);
