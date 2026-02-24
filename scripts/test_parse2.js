// Check what the Legal Actions section looks like
const FIRECRAWL_API_KEY = 'fc-f5a8e856d7574becb968ce7679782142';

async function test() {
  const url = 'https://quality.healthfinder.fl.gov/Facility-Provider/Profile/?&LID=724';
  console.log('Scraping full page to analyze date context...');

  const res = await fetch('https://api.firecrawl.dev/v1/scrape', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url, formats: ['markdown'] }),
  });

  const data = await res.json();
  if (data.success && data.data && data.data.markdown) {
    const md = data.data.markdown;
    // Print the full markdown so we can see all date contexts
    console.log(md);
  }
}

test().catch(console.error);
