import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

function todayStr() {
  return new Date().toLocaleDateString("en-CA");
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ user: null, birthData: null, todayReading: null });
  }

  const [bdResult, readingResult, streakResult] = await Promise.all([
    supabase
      .from("birth_data")
      .select("name, birthdate, birthtime, birthplace, latitude, longitude")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("readings")
      .select("output")
      .eq("user_id", user.id)
      .eq("kind", "daily")
      .eq("reading_date", todayStr())
      .maybeSingle(),
    supabase
      .from("daily_streaks")
      .select("current_streak, longest_streak")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  return NextResponse.json({
    user: { id: user.id, email: user.email },
    birthData: bdResult.data ?? null,
    todayReading: readingResult.data?.output ?? null,
    streak: streakResult.data
      ? { current: streakResult.data.current_streak, longest: streakResult.data.longest_streak }
      : null,
  });
}
