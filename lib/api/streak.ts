import { adminClient } from "@/lib/supabase/admin";

function yesterdayOf(date: string): string {
  // Parse as UTC components to avoid server-TZ drift
  const [y, m, d] = date.split("-").map(Number);
  const prev = new Date(Date.UTC(y!, m! - 1, d! - 1));
  return prev.toISOString().slice(0, 10);
}

export async function bumpStreak(userId: string, date: string): Promise<void> {
  const yesterday = yesterdayOf(date);

  const { data: existing } = await adminClient
    .from("daily_streaks")
    .select("current_streak, longest_streak, last_completed_date")
    .eq("user_id", userId)
    .maybeSingle();

  // Already counted today — idempotent
  if (existing?.last_completed_date === date) {
    console.log(JSON.stringify({ event: "streak_bump", result: "idempotent", userId, date, last: existing.last_completed_date }));
    return;
  }

  const current =
    existing?.last_completed_date === yesterday
      ? (existing.current_streak ?? 0) + 1
      : 1;
  const longest = Math.max(existing?.longest_streak ?? 0, current);
  const action = existing?.last_completed_date === yesterday ? "increment" : "reset";
  console.log(JSON.stringify({ event: "streak_bump", result: action, userId, date, last: existing?.last_completed_date ?? null, current, longest }));

  const { error } = await adminClient.from("daily_streaks").upsert(
    {
      user_id: userId,
      current_streak: current,
      longest_streak: longest,
      last_completed_date: date,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );
  if (error) console.error("[streak] upsert error:", error.message);
}
