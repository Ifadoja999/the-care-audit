const FIRECRAWL_API_KEY = 'fc-f5a8e856d7574becb968ce7679782142';

function extractAddress(md) {
  const streetMatch = md.match(/Street Address\s*\n+[-*]?\s*(.+?)\n+([A-Z\s]+,\s*FL\s*[\d-]+)/i);
  if (streetMatch) return `${streetMatch[1].trim()}, ${streetMatch[2].trim()}`;
  const fallback = md.match(/Street Address\s*\n+[-*]?\s*(.+?)(?:\n.*)*?([A-Z][A-Z\s]+,\s*FL\s*\d{5}(?:-\d{4})?)/i);
  if (fallback) return `${fallback[1].trim()}, ${fallback[2].trim()}`;
  return null;
}

function extractPhone(md) {
  const streetSection = md.split(/Mailing Address/i)[0] || md;
  const phoneMatch = streetSection.match(/Phone:\s*\[?\((\d{3})\)\s*(\d{3})-(\d{4})/);
  if (phoneMatch) return `(${phoneMatch[1]}) ${phoneMatch[2]}-${phoneMatch[3]}`;
  return null;
}

function extractInspectionDate(md) {
  const legalSplit = md.split(/#+\s*Legal Actions/i);
  if (legalSplit.length < 2) return null;
  const legalSection = legalSplit[1].split(/\n#+\s/)[0] || '';
  const lines = legalSection.split('\n');
  let mostRecent = null;
  let mostRecentStr = null;

  for (const line of lines) {
    if (line.includes('Change of ownership')) continue;
    if (!line.includes('|')) continue;
    const dateMatches = [...line.matchAll(/(\d{1,2})\/(\d{1,2})\/(\d{4})/g)];
    for (const m of dateMatches) {
      const month = parseInt(m[1]);
      const day = parseInt(m[2]);
      const year = parseInt(m[3]);
      if (year < 2015 || month < 1 || month > 12 || day < 1 || day > 31) continue;
      const d = new Date(year, month - 1, day);
      if (d > new Date()) continue;
      if (mostRecent === null || d > mostRecent) {
        mostRecent = d;
        const yy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        mostRecentStr = `${yy}-${mm}-${dd}`;
      }
    }
  }
  return mostRecentStr;
}

async function test() {
  const testIds = ['724', '729', '741'];
  for (const id of testIds) {
    const url = `https://quality.healthfinder.fl.gov/Facility-Provider/Profile/?&LID=${id}`;
    console.log(`\nScraping LID=${id}...`);
    const res = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${FIRECRAWL_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, formats: ['markdown'] }),
    });
    const data = await res.json();
    if (data.success && data.data && data.data.markdown) {
      const md = data.data.markdown;
      console.log('  Address:', extractAddress(md));
      console.log('  Phone:', extractPhone(md));
      console.log('  Date:', extractInspectionDate(md));
    } else {
      console.log('  FAILED');
    }
  }
}
test().catch(console.error);
