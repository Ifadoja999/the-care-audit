import {
  queue
} from "./chunk-MMQGKQDQ.mjs";
import {
  init_esm
} from "./chunk-6ULOIQV4.mjs";

// src/trigger/lib/queues.ts
init_esm();
var emailQueue = queue({
  name: "email-sending",
  concurrencyLimit: 5
});
var pipelineQueue = queue({
  name: "state-pipeline",
  concurrencyLimit: 1
});
var healthCheckQueue = queue({
  name: "portal-health",
  concurrencyLimit: 10
});
var aiQueue = queue({
  name: "ai-processing",
  concurrencyLimit: 3
});

export {
  emailQueue,
  pipelineQueue,
  healthCheckQueue,
  aiQueue
};
//# sourceMappingURL=chunk-MAUVSJ26.mjs.map
