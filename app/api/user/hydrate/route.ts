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

  const today = todayStr();

  const [bdResult, readingResult, streakResult, chatResult] = await Promise.all([
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
      .eq("reading_date", today)
      .maybeSingle(),
    supabase
      .from("daily_streaks")
      .select("current_streak, longest_streak")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("chat_messages")
      .select("role, content, created_at")
      .eq("user_id", user.id)
      .eq("chat_date", today)
      .order("created_at", { ascending: true }),
  ]);

  const chatHistory = (chatResult.data ?? []).map((row) => ({
    role: row.role as "user" | "assistant",
    content: row.content,
    createdAt: row.created_at,
  }));

  return NextResponse.json({
    user: { id: user.id, email: user.email },
    birthData: bdResult.data ?? null,
    todayReading: readingResult.data?.output ?? null,
    streak: streakResult.data
      ? { current: streakResult.data.current_streak, longest: streakResult.data.longest_streak }
      : null,
    chatHistory,
  });
}
