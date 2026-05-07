import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const body = await req.json() as {
    date: string;
    input: Record<string, unknown>;
    output: Record<string, unknown>;
  };

  const { error } = await adminClient.from("readings").upsert(
    {
      user_id: user.id,
      kind: "daily",
      reading_date: body.date,
      input: body.input,
      output: body.output,
    },
    { onConflict: "user_id,kind,reading_date" }
  );

  if (error) {
    console.error("[API] readings upsert error:", error);
    return new NextResponse(error.message, { status: 400 });
  }

  // Update streak — skip if we already counted today
  const today = body.date;
  const d = new Date(today);
  d.setDate(d.getDate() - 1);
  const yesterday = d.toLocaleDateString("en-CA");

  const { data: existing } = await adminClient
    .from("daily_streaks")
    .select("current_streak, longest_streak, last_completed_date")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!existing || existing.last_completed_date !== today) {
    const current = existing?.last_completed_date === yesterday
      ? (existing.current_streak ?? 0) + 1
      : 1;
    const longest = Math.max(existing?.longest_streak ?? 0, current);

    const { error: streakError } = await adminClient.from("daily_streaks").upsert(
      { user_id: user.id, current_streak: current, longest_streak: longest, last_completed_date: today, updated_at: new Date().toISOString() },
      { onConflict: "user_id" }
    );
    if (streakError) console.error("[API] streak upsert error:", streakError);
  }

  return new NextResponse("OK");
}
