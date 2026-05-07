import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const body = await req.json() as {
    name: string; date: string; time: string;
    location: string; latitude: number; longitude: number;
  };

  // Ensure profile row exists (trigger may not have fired for older signups)
  await adminClient.from("profiles").upsert(
    { id: user.id, email: user.email ?? "" },
    { onConflict: "id", ignoreDuplicates: true }
  );

  const { error } = await adminClient.from("birth_data").upsert(
    {
      user_id: user.id,
      name: body.name,
      birthdate: body.date,
      birthtime: body.time || null,
      birthplace: body.location,
      latitude: body.latitude,
      longitude: body.longitude,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (error) {
    console.error("[API] birth_data upsert error:", error);
    return new NextResponse(error.message, { status: 400 });
  }

  return new NextResponse("OK");
}
