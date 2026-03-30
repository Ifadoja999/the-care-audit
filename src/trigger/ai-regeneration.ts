import { task, logger, retry } from "@trigger.dev/sdk";
import { supabase } from "./lib/supabase";
import { aiQueue } from "./lib/queues";
import { logAutomation } from "./lib/log";

export const regenerateChangedSummaries = task({
  id: "regenerate-changed-summaries",
  queue: aiQueue,
  maxDuration: 3600, // 1 hour max
  run: async (payload: { stateCode: string }) => {
    const startedAt = new Date();

    // Find facilities with violation changes that haven't been re-summarized
    const { data: changed } = await supabase
      .from("facility_change_log")
      .select("facility_id, previous_data, new_data")
      .eq("state_code", payload.stateCode)
      .eq("change_type", "violation_change")
      .eq("processed", false);

    if (!changed || changed.length === 0) {
      return { regenerated: 0 };
    }

    logger.info(
      `Regenerating summaries for ${changed.length} facilities in ${payload.stateCode}`
    );

    let regenerated = 0;
    let failed = 0;

    for (const change of changed) {
      try {
        // Get full facility data
        const { data: facility } = await supabase
          .from("facilities")
          .select("*")
          .eq("id", change.facility_id)
          .single();

        if (!facility) continue;

        // Skip zero-violation facilities (they use static summary)
        if (facility.total_violations === 0) {
          await supabase
            .from("facilities")
            .update({
              ai_summary:
                "No violations were cited in available state inspection records.",
            })
            .eq("id", facility.id);

          await supabase
            .from("facility_change_log")
            .update({ processed: true, processed_at: new Date().toISOString() })
            .eq("facility_id", change.facility_id)
            .eq("change_type", "violation_change")
            .eq("processed", false);

          regenerated++;
          continue;
        }

        // Call Claude API to regenerate summary
        const aiResponse = await retry.onThrow(
          async () => {
            const response = await fetch(
              "https://api.anthropic.com/v1/messages",
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "x-api-key": process.env.CLAUDE_API_KEY!,
                  "anthropic-version": "2023-06-01",
                },
                body: JSON.stringify({
                  model: "claude-sonnet-4-6",
                  max_tokens: 4096,
                  system: `You are a healthcare compliance data auditor specializing in Assisted Living Facilities (ALFs). Write a plain English summary (3-5 sentences) that a family member can read and immediately understand what happened at this facility. Describe the ACTUAL ISSUES found — medication errors, staffing problems, safety hazards, etc. Frame as what state inspectors found. Include fine amounts as supporting detail, not main point. Under 800 characters. Return ONLY a JSON object: {"summary": "..."}`,
                  messages: [
                    {
                      role: "user",
                      content: `Facility: ${facility.facility_name}, ${facility.city}, ${facility.state}. Total violations: ${facility.total_violations}. Previous summary: ${facility.ai_summary}. Generate an updated summary reflecting the current violation count.`,
                    },
                  ],
                }),
              }
            );

            if (!response.ok) {
              throw new Error(`Claude API error: ${response.status}`);
            }

            return response.json();
          },
          { maxAttempts: 3 }
        );

        const text =
          aiResponse.content?.[0]?.text || "";
        let newSummary: string;

        try {
          const parsed = JSON.parse(
            text.replace(/```json|```/g, "").trim()
          );
          newSummary = parsed.summary;
        } catch {
          newSummary = text;
        }

        // Update facility summary
        await supabase
          .from("facilities")
          .update({
            ai_summary: newSummary,
            last_updated: new Date().toISOString(),
          })
          .eq("id", facility.id);

        // Mark change as processed
        await supabase
          .from("facility_change_log")
          .update({ processed: true, processed_at: new Date().toISOString() })
          .eq("facility_id", change.facility_id)
          .eq("change_type", "violation_change")
          .eq("processed", false);

        regenerated++;

        // Rate limit: 500ms between Claude API calls
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (err: any) {
        logger.error(`Failed to regenerate summary`, {
          facilityId: change.facility_id,
          error: err.message,
        });
        failed++;
      }
    }

    await logAutomation({
      taskId: `ai-regen-${payload.stateCode}`,
      taskName: "regenerate-changed-summaries",
      stateCode: payload.stateCode,
      status: "completed",
      result: { regenerated, failed, total: changed.length },
      startedAt,
    });

    return { regenerated, failed, total: changed.length };
  },
});
