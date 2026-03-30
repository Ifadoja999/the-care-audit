import {
  queue
} from "./chunk-QXSSDGE5.mjs";
import {
  init_esm
} from "./chunk-23OQHB7B.mjs";

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
//# sourceMappingURL=chunk-O7YGMB64.mjs.map
