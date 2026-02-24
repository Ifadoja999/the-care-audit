// Test scraping one FL facility profile page via Firecrawl
const FIRECRAWL_API_KEY = 'fc-f5a8e856d7574becb968ce7679782142';
const PROFILE_URL_BASE = 'https://quality.healthfinder.fl.gov/Facility-Provider/Profile/?&LID=';

// Use a known license number from the DB (first few from our audit had LIC_IDs)
const TEST_LICENSE = '724'; // BETHEDSA OAKS ALF, LLC

async function testScrape() {
  const url = PROFILE_URL_BASE + TEST_LICENSE;
  console.log('Scraping:', url);

  const res = await fetch('https://api.firecrawl.dev/v1/scrape', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url: url,
      formats: ['markdown'],
    }),
  });

  const data = await res.json();

  if (data.success && data.data && data.data.markdown) {
    const md = data.data.markdown;
    console.log('\n=== MARKDOWN (first 3000 chars) ===');
    console.log(md.substring(0, 3000));
    console.log('\n=== END ===');
    console.log('Total length:', md.length, 'chars');
  } else {
    console.log('Firecrawl response:', JSON.stringify(data, null, 2));
  }
}

testScrape().catch(console.error);
