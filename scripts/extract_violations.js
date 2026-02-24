/**
 * Violation Detail Extraction Script
 *
 * For ~995 FL facilities with total_violations > 0 but no violation detail rows.
 *
 * Strategy:
 *   1. Scrape facility profile page (report_url) via Firecrawl — Legal Actions section has violation info
 *   2. Send extracted markdown to Claude 3.5 Sonnet for structured violation parsing
 *   3. Insert violation rows into Supabase, update ai_summary
 *   4. Log failures to manual_review table
 *
 * Usage: node scripts/extract_violations.js
 */

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://uhgooncaygpajfalazeb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVoZ29vbmNheWdwYWpmYWxhemViIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTM4NTkzOSwiZXhwIjoyMDg2OTYxOTM5fQ.S_U_o-fSXQk7PZuEbkEnMV9z7mrbsE4TNUEHnWAFTzI'
);

const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY;
const ANTHROPIC_API_KEY = process.env.CLAUDE_API_KEY;

const BATCH_SIZE = 5;
const BATCH_DELAY_MS = 2000;
const FIRECRAWL_DELAY_MS = 1500;

const CLAUDE_SYSTEM_PROMPT = `You are a healthcare compliance data auditor specializing in Assisted Living Facilities (ALFs). These are private-pay residential care homes for seniors — NOT skilled nursing facilities or nursing homes.

Analyze the inspection report and return ONLY a valid JSON object with NO commentary:
{
  "total_violations": <integer>,
  "severity_level": <"High", "Medium", or "Low">,
  "summary": <one clear sentence describing the worst violation in plain language a family member would understand>,
  "full_violations": [
    {
      "violation_code": <string or null>,
      "description": <full violation text>,
      "severity": <"High", "Medium", or "Low">,
      "date_cited": <YYYY-MM-DD or null>,
      "correction_deadline": <YYYY-MM-DD or null>,
      "status": <"Open", "Corrected", "Pending", or "Unknown">
    }
  ],
  "safety_grade": <"A" for 0 violations, "B" for 1-2, "C" for 3-5, "F" for 6+>,
  "inspection_date": <YYYY-MM-DD or null>
}
Use null for unknown fields. Do not fabricate data. ALF data only — no nursing home terminology.`;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ── Firecrawl scrape ──────────────────────────────────────────────────────────

async function scrapeWithFirecrawl(url, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch('https://api.firecrawl.dev/v1/scrape', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url, formats: ['markdown'] }),
      });

      if (res.status === 429) {
        const waitTime = attempt === 1 ? 10000 : attempt === 2 ? 30000 : 60000;
        console.log(`    Rate limited (attempt ${attempt}), waiting ${waitTime / 1000}s...`);
        await sleep(waitTime);
        continue;
      }

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status}: ${text.substring(0, 200)}`);
      }

      const data = await res.json();
      if (data.success && data.data && data.data.markdown && data.data.markdown.length > 100) {
        return { success: true, markdown: data.data.markdown };
      } else {
        if (attempt < retries) {
          console.log(`    Short/empty response (attempt ${attempt}), retrying...`);
          await sleep(attempt * 5000);
          continue;
        }
        return { success: false, error: 'Empty or short response from Firecrawl' };
      }
    } catch (err) {
      if (attempt < retries) {
        console.log(`    Scrape error (attempt ${attempt}): ${err.message}, retrying...`);
        await sleep(attempt * 5000);
        continue;
      }
      return { success: false, error: err.message };
    }
  }
  return { success: false, error: 'Max retries exceeded' };
}

// ── Claude API analysis ───────────────────────────────────────────────────────

async function analyzeWithClaude(facilityName, city, state, markdown) {
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 4096,
        system: CLAUDE_SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: `Inspection Report — ${facilityName}, ${city}, ${state}:\n\n${markdown}`,
          },
        ],
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Claude API HTTP ${res.status}: ${text.substring(0, 300)}`);
    }

    const data = await res.json();
    const text = data.content?.[0]?.text;
    if (!text) throw new Error('Empty response from Claude');

    // Extract JSON from response (handle markdown code blocks)
    let jsonStr = text;
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) jsonStr = jsonMatch[1];

    const parsed = JSON.parse(jsonStr.trim());

    // Validate required fields
    if (typeof parsed.total_violations !== 'number') throw new Error('Missing total_violations');
    if (!parsed.severity_level) throw new Error('Missing severity_level');
    if (!parsed.summary) throw new Error('Missing summary');
    if (!parsed.safety_grade) throw new Error('Missing safety_grade');
    if (!Array.isArray(parsed.full_violations)) throw new Error('Missing full_violations array');

    return { success: true, data: parsed };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ── Process one facility ──────────────────────────────────────────────────────

async function processFacility(facility) {
  const { id, facility_name, license_number, city, state, report_url, total_violations } = facility;

  // Step 1: Scrape the profile page
  const scrapeUrl = report_url || `https://quality.healthfinder.fl.gov/Facility-Provider/Profile/?&LID=${license_number}`;
  const scrapeResult = await scrapeWithFirecrawl(scrapeUrl);

  if (!scrapeResult.success) {
    return { success: false, error: `Scrape failed: ${scrapeResult.error}` };
  }

  // Step 2: Send to Claude for analysis
  const analysisResult = await analyzeWithClaude(facility_name, city, state, scrapeResult.markdown);

  if (!analysisResult.success) {
    return { success: false, error: `Analysis failed: ${analysisResult.error}` };
  }

  const analysis = analysisResult.data;

  // Step 3: Clear existing violation rows (if any)
  const { error: deleteErr } = await supabase
    .from('violations')
    .delete()
    .eq('facility_id', id);

  if (deleteErr) {
    console.log(`    Warning: could not clear old violations for ${facility_name}: ${deleteErr.message}`);
  }

  // Step 4: Insert new violation rows
  let violationsInserted = 0;
  if (analysis.full_violations && analysis.full_violations.length > 0) {
    const violationRows = analysis.full_violations.map(v => ({
      facility_id: id,
      violation_code: v.violation_code || null,
      violation_description: v.description || 'No description provided',
      severity_level: ['High', 'Medium', 'Low'].includes(v.severity) ? v.severity : 'Low',
      date_cited: v.date_cited || null,
      correction_deadline: v.correction_deadline || null,
      status: ['Open', 'Corrected', 'Pending', 'Unknown'].includes(v.status) ? v.status : 'Unknown',
    }));

    const { error: insertErr, data: insertData } = await supabase
      .from('violations')
      .insert(violationRows)
      .select('id');

    if (insertErr) {
      return { success: false, error: `Violation insert failed: ${insertErr.message}` };
    }
    violationsInserted = insertData?.length || 0;
  }

  // Step 5: Update facility ai_summary and safety_grade if Claude returned better data
  const facilityUpdate = {};
  if (analysis.summary) facilityUpdate.ai_summary = analysis.summary;
  if (analysis.safety_grade) facilityUpdate.safety_grade = analysis.safety_grade;
  if (analysis.total_violations !== undefined) facilityUpdate.total_violations = analysis.total_violations;
  if (analysis.severity_level) facilityUpdate.severity_level = analysis.severity_level;
  if (analysis.inspection_date) facilityUpdate.last_inspection_date = analysis.inspection_date;

  if (Object.keys(facilityUpdate).length > 0) {
    const { error: updateErr } = await supabase
      .from('facilities')
      .update(facilityUpdate)
      .eq('id', id);

    if (updateErr) {
      console.log(`    Warning: facility update failed for ${facility_name}: ${updateErr.message}`);
    }
  }

  return {
    success: true,
    violationsInserted,
    claudeViolations: analysis.total_violations,
    grade: analysis.safety_grade,
  };
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== VIOLATION DETAIL EXTRACTION ===\n');

  // Fetch facilities needing extraction
  console.log('Fetching facilities with violations but no detail rows...');

  let allFacilities = [];
  let page = 0;
  while (true) {
    const { data, error } = await supabase
      .from('facilities')
      .select('id, facility_name, license_number, city, state, county, address, slug, report_url, total_violations, safety_grade, ai_summary')
      .eq('state', 'FL')
      .gt('total_violations', 0)
      .order('total_violations', { ascending: false })
      .range(page * 1000, (page + 1) * 1000 - 1);

    if (error) { console.error('Fetch error:', error.message); return; }
    allFacilities = allFacilities.concat(data);
    if (data.length < 1000) break;
    page++;
  }

  // Now filter out facilities that already have violation rows
  const { data: existingViolFacilities } = await supabase
    .from('violations')
    .select('facility_id');

  const facIdsWithViolations = new Set((existingViolFacilities || []).map(v => v.facility_id));
  const needsExtraction = allFacilities.filter(f => !facIdsWithViolations.has(f.id));

  console.log(`  Total FL facilities with violations: ${allFacilities.length}`);
  console.log(`  Already have violation rows: ${allFacilities.length - needsExtraction.length}`);
  console.log(`  Need extraction: ${needsExtraction.length}\n`);

  if (needsExtraction.length === 0) {
    console.log('Nothing to extract. All facilities already have violation rows.');
    return;
  }

  // Process in batches
  let totalProcessed = 0;
  let successCount = 0;
  let failCount = 0;
  let totalViolationsInserted = 0;
  let manualReviewLogged = 0;
  const startTime = Date.now();

  for (let i = 0; i < needsExtraction.length; i += BATCH_SIZE) {
    const batch = needsExtraction.slice(i, i + BATCH_SIZE);

    for (const facility of batch) {
      totalProcessed++;
      const shortName = facility.facility_name.substring(0, 40);

      const result = await processFacility(facility);

      if (result.success) {
        successCount++;
        totalViolationsInserted += result.violationsInserted;
        if (totalProcessed <= 10 || totalProcessed % 50 === 0) {
          console.log(`  [${totalProcessed}/${needsExtraction.length}] OK: ${shortName} — ${result.violationsInserted} violations, grade ${result.grade}`);
        }
      } else {
        failCount++;
        console.log(`  [${totalProcessed}/${needsExtraction.length}] FAIL: ${shortName} — ${result.error}`);

        // Log to manual_review
        const { error: mrErr } = await supabase
          .from('manual_review')
          .insert({
            facility_name: facility.facility_name,
            state: facility.state,
            failed_url: facility.report_url || `LIC_ID=${facility.license_number}`,
            error_message: result.error,
            retry_count: 3,
            resolved: false,
          });

        if (!mrErr) manualReviewLogged++;
      }

      // Delay between individual requests within a batch
      if (batch.indexOf(facility) < batch.length - 1) {
        await sleep(FIRECRAWL_DELAY_MS);
      }
    }

    // Progress report every 50 facilities
    if (totalProcessed % 50 === 0 || i + BATCH_SIZE >= needsExtraction.length) {
      const elapsed = (Date.now() - startTime) / 1000;
      const rate = totalProcessed > 0 ? (totalProcessed / (elapsed / 60)).toFixed(1) : '0';
      const remaining = needsExtraction.length - totalProcessed;
      const etaMin = parseFloat(rate) > 0 ? (remaining / parseFloat(rate)).toFixed(1) : '?';
      console.log(
        `\n--- Progress: ${totalProcessed}/${needsExtraction.length} | ` +
        `success=${successCount} fail=${failCount} violations=${totalViolationsInserted} | ` +
        `${rate}/min, ~${etaMin}min left ---\n`
      );
    }

    // Delay between batches
    if (i + BATCH_SIZE < needsExtraction.length) {
      await sleep(BATCH_DELAY_MS);
    }
  }

  // Final report
  console.log('\n=== EXTRACTION COMPLETE ===');
  console.log(`Total processed: ${totalProcessed}`);
  console.log(`Successful extractions: ${successCount}`);
  console.log(`Failed extractions: ${failCount}`);
  console.log(`Total violation rows inserted: ${totalViolationsInserted}`);
  console.log(`Logged to manual_review: ${manualReviewLogged}`);
  const totalElapsed = ((Date.now() - startTime) / 60000).toFixed(1);
  console.log(`Total time: ${totalElapsed} minutes`);

  // Verification
  console.log('\n--- Post-Extraction Verification ---');
  const { count: violRows } = await supabase
    .from('violations')
    .select('*', { count: 'exact', head: true });
  console.log(`Total violation rows in DB: ${violRows}`);

  const { data: violFacs } = await supabase
    .from('violations')
    .select('facility_id');
  const distinctFacs = new Set((violFacs || []).map(v => v.facility_id)).size;
  console.log(`Distinct facilities with violation rows: ${distinctFacs}`);

  const { count: stillMissing } = await supabase
    .from('facilities')
    .select('*', { count: 'exact', head: true })
    .eq('state', 'FL')
    .gt('total_violations', 0);

  // Re-check how many still have no rows
  const { data: allViolFacs2 } = await supabase
    .from('violations')
    .select('facility_id');
  const facIdsNow = new Set((allViolFacs2 || []).map(v => v.facility_id));

  const { data: withViol2 } = await supabase
    .from('facilities')
    .select('id')
    .eq('state', 'FL')
    .gt('total_violations', 0);

  const stillNeedsExtraction = (withViol2 || []).filter(f => !facIdsNow.has(f.id)).length;
  console.log(`Facilities still needing extraction: ${stillNeedsExtraction}`);
}

main().catch(console.error);
