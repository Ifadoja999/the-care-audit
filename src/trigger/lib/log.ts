import { supabase } from "./supabase";

export async function logAutomation(params: {
  taskId: string;
  taskName: string;
  stateCode?: string;
  status: "started" | "completed" | "failed" | "skipped";
  payload?: any;
  result?: any;
  errorMessage?: string;
  startedAt?: Date;
}) {
  const now = new Date();
  const duration = params.startedAt
    ? now.getTime() - params.startedAt.getTime()
    : null;

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
    duration_ms: duration,
  });
}
