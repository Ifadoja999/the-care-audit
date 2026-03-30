import {
  logger,
  retry
} from "./chunk-QXSSDGE5.mjs";
import {
  __name,
  init_esm
} from "./chunk-23OQHB7B.mjs";

// src/trigger/enrichment/lib/ai-analyzer.ts
init_esm();
var SYSTEM_PROMPT = `You are a healthcare compliance data auditor specializing in Assisted Living Facilities (ALFs). These are private-pay residential care homes for seniors — NOT skilled nursing facilities or nursing homes.

Your PRIMARY task is to write a plain English summary that a family member can read and immediately understand what happened at this facility. This summary is the most important output.

Analyze the inspection report and return ONLY a valid JSON object with NO commentary:
{
  "total_violations": <integer — count of distinct violations cited>,
  "summary": <3-5 sentences in plain English describing what state inspectors found. REQUIREMENTS:
    1. Describe the ACTUAL ISSUES found — medication errors, staffing problems, safety hazards, sanitation issues, resident rights violations, record-keeping failures, etc. Do NOT just state fine amounts.
    2. Frame everything as what state inspectors found — NOT as your own assessment. Use phrases like 'State inspectors found...' or 'The inspection revealed...'
    3. Mention the type of violation in plain language (e.g., 'medication management failures' not 'Class II deficiency under statute 429.28')
    4. Include whether issues were corrected if that information is available
    5. Include fine amounts as supporting detail, not as the main point
    6. If the report only contains fine/legal action data without specific violation descriptions, say so: 'The available records show financial penalties totaling $X were imposed, but specific violation details are not available in the provided report. View the official inspection report for complete findings.'
    EXAMPLE OF A GOOD SUMMARY: 'State inspectors found that staff failed to properly administer medications to multiple residents, with records showing missed doses over several days. The facility was also cited for inadequate staffing during overnight hours, falling below the state minimum ratio. A $1,500 fine was imposed in February 2025. Both issues have since been marked as corrected by the state.'
    EXAMPLE OF A BAD SUMMARY: 'The facility was fined $1,500 in 2025 following a survey inspection, indicating regulatory violations serious enough to warrant a financial penalty.'
    The bad example only mentions money. The good example explains what actually happened.>,
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
  "inspection_date": <YYYY-MM-DD or null>
}

CRITICAL RULES:
- Use null for unknown fields. Do not fabricate data.
- Do not assign grades or ratings.
- Do not invent specific violation details that are not in the source document.
- If the source only contains legal/fine records without inspection details, acknowledge the limitation in the summary.
- ALF data only — no nursing home terminology.
- If the document states "No deficiencies were cited" or similar, set total_violations to 0 and summary to describe that inspectors investigated but found no violations.`;
async function analyzeInspectionReport(extractedText, facilityName, city, state) {
  const result = await retry.onThrow(
    async () => {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.CLAUDE_API_KEY,
          "anthropic-version": "2023-06-01"
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 4096,
          system: SYSTEM_PROMPT,
          messages: [
            {
              role: "user",
              content: `Inspection Report — ${facilityName}, ${city}, ${state}:

${extractedText}`
            }
          ]
        })
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Claude API error: ${response.status} — ${errorText}`
        );
      }
      return response.json();
    },
    { maxAttempts: 3 }
  );
  const rawText = result.content?.[0]?.text || "";
  let parsed;
  try {
    const cleaned = rawText.replace(/```json\s*|```\s*/g, "").trim();
    parsed = JSON.parse(cleaned);
  } catch {
    logger.error("Failed to parse Claude analysis response", {
      facilityName,
      rawText: rawText.substring(0, 500)
    });
    throw new Error(`Failed to parse AI analysis JSON for ${facilityName}`);
  }
  if (typeof parsed.total_violations !== "number") {
    parsed.total_violations = 0;
  }
  if (!parsed.summary || typeof parsed.summary !== "string") {
    throw new Error(`AI analysis returned no summary for ${facilityName}`);
  }
  if (!Array.isArray(parsed.full_violations)) {
    parsed.full_violations = [];
  }
  const qualityIssues = checkSummaryQuality(parsed.summary);
  if (qualityIssues.length > 0 && parsed.total_violations > 0) {
    logger.warn("Summary quality check issues", {
      facilityName,
      issues: qualityIssues
    });
    const retryResult = await retrySummaryWithFeedback(
      extractedText,
      facilityName,
      city,
      state,
      qualityIssues
    );
    if (retryResult) {
      parsed.summary = retryResult;
    }
  }
  return parsed;
}
__name(analyzeInspectionReport, "analyzeInspectionReport");
function checkSummaryQuality(summary) {
  const issues = [];
  const sentences = summary.split(/\.\s+/).filter((s) => s.trim().length > 0);
  if (sentences.length < 2) {
    issues.push("Summary must be at least 2 sentences long");
  }
  const nonFinancialTerms = [
    "medication",
    "staffing",
    "safety",
    "resident",
    "inspection",
    "sanitation",
    "training",
    "records",
    "supervision",
    "maintenance",
    "emergency",
    "fire",
    "health",
    "care",
    "compliance",
    "specific violation details are not available",
    "no deficiencies",
    "no violations"
  ];
  const hasNonFinancial = nonFinancialTerms.some(
    (term) => summary.toLowerCase().includes(term)
  );
  if (!hasNonFinancial) {
    issues.push(
      "Summary must contain at least one non-financial descriptor (medication, staffing, safety, etc.)"
    );
  }
  if (summary.toLowerCase().startsWith("this facility")) {
    issues.push(
      'Summary should not start with "This facility" — use "State inspectors found" or similar'
    );
  }
  if (summary.length > 800) {
    issues.push("Summary must be under 800 characters");
  }
  return issues;
}
__name(checkSummaryQuality, "checkSummaryQuality");
async function retrySummaryWithFeedback(extractedText, facilityName, city, state, qualityIssues) {
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.CLAUDE_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 2048,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: `Inspection Report — ${facilityName}, ${city}, ${state}:

${extractedText}`
          },
          {
            role: "assistant",
            content: "I need to rewrite my summary because it failed quality checks."
          },
          {
            role: "user",
            content: `Your previous summary was rejected because: ${qualityIssues.join("; ")}. Please rewrite the summary following the requirements more carefully. Return ONLY a JSON object: {"summary": "..."}`
          }
        ]
      })
    });
    if (!response.ok) return null;
    const data = await response.json();
    const text = data.content?.[0]?.text || "";
    const cleaned = text.replace(/```json\s*|```\s*/g, "").trim();
    const parsed = JSON.parse(cleaned);
    return parsed.summary || null;
  } catch {
    return null;
  }
}
__name(retrySummaryWithFeedback, "retrySummaryWithFeedback");

export {
  analyzeInspectionReport
};
//# sourceMappingURL=chunk-WZCL4N2S.mjs.map
