import { adminClient } from "@/lib/supabase/admin";

export async function bumpStreak(userId: string, date: string): Promise<void> {
  const d = new Date(date);
  d.setDate(d.getDate() - 1);
  const yesterday = d.toLocaleDateString("en-CA");

  const { data: existing } = await adminClient
    .from("daily_streaks")
    .select("current_streak, longest_streak, last_completed_date")
    .eq("user_id", userId)
    .maybeSingle();

  // Already counted today — idempotent
  if (existing?.last_completed_date === date) return;

  const current =
    existing?.last_completed_date === yesterday
      ? (existing.current_streak ?? 0) + 1
      : 1;
  const longest = Math.max(existing?.longest_streak ?? 0, current);

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
