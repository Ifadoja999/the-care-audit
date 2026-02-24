#!/usr/bin/env node
/**
 * FL Summary Refresh — Standalone Script
 *
 * Re-processes all Florida facilities with violations through:
 *   1. Firecrawl scrape of report URL
 *   2. Claude analysis with the updated Analyst prompt
 *   3. Supabase upsert (ai_summary only — preserves all other fields)
 *
 * Usage:
 *   node scripts/fl-summary-refresh.mjs              # Full run (all 978 facilities)
 *   node scripts/fl-summary-refresh.mjs --limit 5    # Test with 5 facilities
 *   node scripts/fl-summary-refresh.mjs --offset 100 # Resume from facility #100
 */

import 'dotenv/config';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://uhgooncaygpajfalazeb.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const FIRECRAWL_KEY = process.env.FIRECRAWL_API_KEY;
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;

if (!SUPABASE_KEY || !FIRECRAWL_KEY || !ANTHROPIC_KEY) {
  console.error('Missing required env vars. Need: SUPABASE_SERVICE_ROLE_KEY, FIRECRAWL_API_KEY, ANTHROPIC_API_KEY');
  console.error('Create a .env file in the project root or set them in the environment.');
  process.exit(1);
}

// Parse CLI args
const args = process.argv.slice(2);
const limitIdx = args.indexOf('--limit');
const offsetIdx = args.indexOf('--offset');
const LIMIT = limitIdx !== -1 ? parseInt(args[limitIdx + 1], 10) : null;
const OFFSET = offsetIdx !== -1 ? parseInt(args[offsetIdx + 1], 10) : 0;
const DELAY_MS = 3000; // 3 seconds between facilities

// The updated Claude system prompt (from Analyst workflow)
const SYSTEM_PROMPT = `You are a healthcare compliance data auditor specializing in Assisted Living Facilities (ALFs). These are private-pay residential care homes for seniors — NOT skilled nursing facilities or nursing homes.

Your PRIMARY task is to write a plain English summary that a family member can read and immediately understand what happened at this facility. This summary is the most important output.

Analyze the inspection report and return ONLY a valid JSON object with NO commentary:
{
  "total_violations": <integer — count of distinct violations cited>,
  "summary": "<3-5 sentences in plain English describing what state inspectors found. REQUIREMENTS: 1. Describe the ACTUAL ISSUES found — medication errors, staffing problems, safety hazards, sanitation issues, resident rights violations, record-keeping failures, etc. Do NOT just state fine amounts. 2. Frame everything as what state inspectors found — NOT as your own assessment. Use phrases like 'State inspectors found' or 'The inspection revealed'. 3. Mention the type of violation in plain language. 4. Include whether issues were corrected if that information is available. 5. Include fine amounts as supporting detail, not as the main point. 6. If the report only contains fine/legal action data without specific violation descriptions, say so: 'The available records show financial penalties totaling $X were imposed, but specific violation details are not available in the provided report. View the official inspection report for complete findings.'>",
  "full_violations": [
    {
      "violation_code": "<string or null>",
      "description": "<full violation text>",
      "severity": "<High, Medium, or Low>",
      "date_cited": "<YYYY-MM-DD or null>",
      "correction_deadline": "<YYYY-MM-DD or null>",
      "status": "<Open, Corrected, Pending, or Unknown>"
    }
  ],
  "inspection_date": "<YYYY-MM-DD or null>"
}

CRITICAL RULES:
- Use null for unknown fields. Do not fabricate data.
- Do not assign grades or ratings.
- Do not invent specific violation details that are not in the source document.
- If the source only contains legal/fine records without inspection details, acknowledge the limitation in the summary.
- ALF data only — no nursing home terminology.`;

// --- Helper functions ---

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchAllFacilities() {
  console.log('Fetching FL facilities with violations from Supabase...');
  const allFacilities = [];
  let from = 0;
  const pageSize = 1000;

  while (true) {
    const url = `${SUPABASE_URL}/rest/v1/facilities?state=eq.FL&total_violations=gt.0&order=total_violations.desc&select=*`;
    const res = await fetch(url, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Range': `${from}-${from + pageSize - 1}`,
      },
    });

    if (!res.ok) {
      console.error(`Supabase fetch error: ${res.status} ${res.statusText}`);
      break;
    }

    const data = await res.json();
    if (!data || data.length === 0) break;
    allFacilities.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }

  console.log(`Found ${allFacilities.length} FL facilities with violations`);
  return allFacilities;
}

async function scrapeWithFirecrawl(reportUrl) {
  try {
    const res = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FIRECRAWL_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: reportUrl,
        formats: ['markdown'],
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      return { success: false, error: `Firecrawl ${res.status}: ${text.slice(0, 200)}` };
    }

    const data = await res.json();
    const markdown = data?.data?.markdown || data?.markdown || '';
    if (markdown.length < 100) {
      return { success: false, error: 'Firecrawl returned insufficient content' };
    }
    return { success: true, markdown };
  } catch (err) {
    return { success: false, error: `Firecrawl error: ${err.message}` };
  }
}

async function analyzeWithClaude(facility, markdown) {
  const userContent = markdown
    ? `Inspection Report — ${facility.facility_name}, ${facility.city}, ${facility.state}:\n\n${markdown}`
    : `Inspection Report — ${facility.facility_name}, ${facility.city}, ${facility.state}:\n\nNo inspection report content available. This facility has ${facility.total_violations} violations on record.`;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userContent }],
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      return { success: false, error: `Claude ${res.status}: ${text.slice(0, 200)}` };
    }

    const data = await res.json();
    const content = data?.content?.[0]?.text;
    if (!content) {
      return { success: false, error: 'Claude returned empty response' };
    }

    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { success: false, error: 'Could not parse JSON from Claude response' };
    }

    const analysis = JSON.parse(jsonMatch[0]);
    return { success: true, analysis };
  } catch (err) {
    return { success: false, error: `Claude error: ${err.message}` };
  }
}

function qualityCheck(summary) {
  const failures = [];

  // Check 1: At least 2 sentences
  const sentences = summary.split('. ').filter(s => s.trim().length > 0);
  if (sentences.length < 2) {
    failures.push('Less than 2 sentences');
  }

  // Check 2: Contains descriptor words OR limitation phrase
  const descriptorWords = ['medication', 'staffing', 'safety', 'resident', 'inspection',
    'sanitation', 'training', 'records', 'supervision', 'maintenance', 'emergency',
    'fire', 'health', 'care', 'compliance', 'survey', 'moratorium', 'reporting',
    'fine', 'penalty', 'deficiency', 'violation', 'admission'];
  const lowerSummary = summary.toLowerCase();
  const hasDescriptor = descriptorWords.some(w => lowerSummary.includes(w));
  const hasLimitation = lowerSummary.includes('specific violation details are not available');
  if (!hasDescriptor && !hasLimitation) {
    failures.push('No descriptor words or limitation phrase');
  }

  // Check 3: Does not start with "This facility"
  if (summary.trim().startsWith('This facility')) {
    failures.push('Starts with "This facility"');
  }

  // Check 4: Under 800 characters
  if (summary.length > 800) {
    failures.push(`Over 800 characters (${summary.length})`);
  }

  return { pass: failures.length === 0, failures };
}

async function upsertToSupabase(facility, analysis) {
  const summary = analysis?.summary || `This facility has ${facility.total_violations} violations on record. View the official inspection report for complete details.`;
  const inspDate = analysis?.inspection_date || facility.last_inspection_date;

  const body = {
    facility_name: facility.facility_name,
    license_number: facility.license_number,
    state: facility.state,
    city: facility.city,
    county: facility.county,
    address: facility.address,
    phone: facility.phone,
    licensed_capacity: facility.licensed_capacity,
    slug: facility.slug,
    report_url: facility.report_url,
    total_violations: facility.total_violations,  // Keep original — don't change
    ai_summary: summary,
    last_inspection_date: inspDate,
    last_updated: new Date().toISOString(),
    last_scraped: new Date().toISOString(),
  };

  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/facilities?on_conflict=license_number`,
      {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Prefer': 'resolution=merge-duplicates,return=representation',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    );

    if (!res.ok) {
      const text = await res.text();
      return { success: false, error: `Supabase ${res.status}: ${text.slice(0, 200)}` };
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: `Supabase error: ${err.message}` };
  }
}

// --- Main ---

async function main() {
  const startTime = Date.now();
  const facilities = await fetchAllFacilities();

  // Apply offset and limit
  let toProcess = facilities.slice(OFFSET);
  if (LIMIT) toProcess = toProcess.slice(0, LIMIT);

  console.log(`\nProcessing ${toProcess.length} facilities (offset: ${OFFSET}, limit: ${LIMIT || 'all'})`);
  console.log(`Estimated time: ~${Math.round(toProcess.length * (DELAY_MS + 12000) / 60000)} minutes\n`);

  let successCount = 0;
  let errorCount = 0;
  let scrapeFailCount = 0;
  let qualityFailCount = 0;
  const errors = [];

  for (let i = 0; i < toProcess.length; i++) {
    const facility = toProcess[i];
    const globalIdx = i + OFFSET;
    const prefix = `[${globalIdx + 1}/${facilities.length}]`;

    // Progress log every 25 facilities
    if (i > 0 && i % 25 === 0) {
      const elapsed = (Date.now() - startTime) / 1000;
      const rate = i / elapsed;
      const remaining = (toProcess.length - i) / rate;
      console.log(`\n--- PROGRESS: ${i}/${toProcess.length} done (${Math.round(i/toProcess.length*100)}%) | ${Math.round(elapsed/60)}m elapsed | ~${Math.round(remaining/60)}m remaining ---\n`);
    }

    // Step 1: Scrape with Firecrawl
    process.stdout.write(`${prefix} ${facility.facility_name} (${facility.city}) — scraping...`);
    const scrapeResult = await scrapeWithFirecrawl(facility.report_url);

    let markdown = '';
    if (scrapeResult.success) {
      markdown = scrapeResult.markdown;
      process.stdout.write(' analyzing...');
    } else {
      scrapeFailCount++;
      process.stdout.write(` scrape failed (${scrapeResult.error.slice(0, 50)}) — analyzing without markdown...`);
    }

    // Step 2: Analyze with Claude (even if scrape failed — Claude will note the limitation)
    let analysis = null;
    const claudeResult = await analyzeWithClaude(facility, markdown);

    if (claudeResult.success) {
      analysis = claudeResult.analysis;

      // Quality check
      const qc = qualityCheck(analysis.summary || '');
      if (!qc.pass) {
        qualityFailCount++;
        // Retry once with feedback
        const retryContent = `Inspection Report — ${facility.facility_name}, ${facility.city}, ${facility.state}:\n\n${markdown || 'No inspection report content available.'}\n\n---\nIMPORTANT REVISION REQUEST: Your previous summary was rejected because: ${qc.failures.join('; ')}. Please rewrite the summary following the requirements more carefully.`;

        const retryRes = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': ANTHROPIC_KEY,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-6',
            max_tokens: 4096,
            system: SYSTEM_PROMPT,
            messages: [{ role: 'user', content: retryContent }],
          }),
        });

        if (retryRes.ok) {
          const retryData = await retryRes.json();
          const retryText = retryData?.content?.[0]?.text;
          const retryJson = retryText?.match(/\{[\s\S]*\}/);
          if (retryJson) {
            try {
              analysis = JSON.parse(retryJson[0]);
            } catch { /* keep original */ }
          }
        }
      }
    } else {
      errorCount++;
      errors.push({ facility: facility.facility_name, error: claudeResult.error });
      console.log(` CLAUDE ERROR: ${claudeResult.error.slice(0, 80)}`);
      await sleep(DELAY_MS);
      continue;
    }

    // Step 3: Upsert to Supabase
    process.stdout.write(' saving...');
    const upsertResult = await upsertToSupabase(facility, analysis);

    if (upsertResult.success) {
      successCount++;
      console.log(' DONE');
    } else {
      errorCount++;
      errors.push({ facility: facility.facility_name, error: upsertResult.error });
      console.log(` UPSERT ERROR: ${upsertResult.error.slice(0, 80)}`);
    }

    // Rate limit delay
    await sleep(DELAY_MS);
  }

  // Final report
  const totalTime = Math.round((Date.now() - startTime) / 1000);
  console.log('\n' + '='.repeat(60));
  console.log('FL SUMMARY REFRESH — COMPLETE');
  console.log('='.repeat(60));
  console.log(`Total processed: ${toProcess.length}`);
  console.log(`Successful:      ${successCount}`);
  console.log(`Errors:          ${errorCount}`);
  console.log(`Scrape failures: ${scrapeFailCount} (still analyzed with limited data)`);
  console.log(`Quality retries: ${qualityFailCount}`);
  console.log(`Total time:      ${Math.round(totalTime / 60)} minutes`);
  console.log(`Avg per facility: ${Math.round(totalTime / toProcess.length)}s`);

  if (errors.length > 0) {
    console.log('\nErrors:');
    for (const e of errors.slice(0, 20)) {
      console.log(`  - ${e.facility}: ${e.error.slice(0, 100)}`);
    }
    if (errors.length > 20) {
      console.log(`  ... and ${errors.length - 20} more`);
    }
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
