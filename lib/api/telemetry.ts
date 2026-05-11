import { adminClient } from "@/lib/supabase/admin";

export interface EngineRun {
  userId?: string | null;
  route: "daily" | "profile" | "council" | "chart";
  phase: "expert" | "judge" | "route";
  expertId?: string;
  traditionId?: string;
  attempt?: number;
  ok: boolean;
  durationMs?: number;
  model?: string;
  error?: string;
  meta?: Record<string, unknown>;
}

/**
 * Log an engine run to both stdout (Vercel logs) and the engine_runs Supabase
 * table. The DB insert is fire-and-forget — it never blocks the request.
 */
export function logRun(r: EngineRun): void {
  console.log(JSON.stringify({ tag: "[engine-run]", ...r }));
  adminClient.from("engine_runs").insert({
    user_id: r.userId ?? null,
    route: r.route,
    phase: r.phase,
    expert_id: r.expertId,
    tradition_id: r.traditionId,
    attempt: r.attempt ?? 1,
    ok: r.ok,
    duration_ms: r.durationMs,
    model: r.model,
    error: r.error ? r.error.slice(0, 500) : null,
    meta: r.meta ?? null,
  }).then(({ error }: { error: { message: string } | null }) => {
    if (error) console.error("[engine-run] insert failed:", error.message, JSON.stringify({ route: r.route, expertId: r.expertId, phase: r.phase }));
  });
}
