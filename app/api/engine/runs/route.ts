import { notFound } from "next/navigation";
import { adminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  const { data, error } = await adminClient
    .from("engine_runs")
    .select("id, created_at, route, phase, expert_id, tradition_id, attempt, ok, duration_ms, model, error, meta")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ runs: data ?? [] });
}
