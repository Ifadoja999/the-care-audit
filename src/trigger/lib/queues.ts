import { queue } from "@trigger.dev/sdk";

// Email sending — limit to prevent Resend rate limits (10/sec on Pro)
export const emailQueue = queue({
  name: "email-sending",
  concurrencyLimit: 5,
});

// State pipeline orchestration — one state at a time
export const pipelineQueue = queue({
  name: "state-pipeline",
  concurrencyLimit: 1,
});

// Portal health checks — parallel but bounded
export const healthCheckQueue = queue({
  name: "portal-health",
  concurrencyLimit: 10,
});

// AI regeneration — bounded by Claude API rate limits
export const aiQueue = queue({
  name: "ai-processing",
  concurrencyLimit: 3,
});
