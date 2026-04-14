import {
  supabase
} from "./chunk-7DCWVU2K.mjs";
import {
  __name,
  init_esm
} from "./chunk-6ULOIQV4.mjs";

// src/trigger/lib/log.ts
init_esm();
async function logAutomation(params) {
  const now = /* @__PURE__ */ new Date();
  const duration = params.startedAt ? now.getTime() - params.startedAt.getTime() : null;
  await supabase.from("automation_log").insert({
    task_id: params.taskId,
    task_name: params.taskName,
    state_code: params.stateCode || null,
    status: params.status,
    payload: params.payload || null,
    result: params.result || null,
    error_message: params.errorMessage || null,
    started_at: params.startedAt?.toISOString() || now.toISOString(),
    completed_at: params.status !== "started" ? now.toISOString() : null,
    duration_ms: duration
  });
}
__name(logAutomation, "logAutomation");

export {
  logAutomation
};
//# sourceMappingURL=chunk-OQTFKTYY.mjs.map
