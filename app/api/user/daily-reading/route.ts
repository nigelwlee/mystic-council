import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { bumpStreak } from "@/lib/api/streak";
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

  await bumpStreak(user.id, body.date);

  return new NextResponse("OK");
}
