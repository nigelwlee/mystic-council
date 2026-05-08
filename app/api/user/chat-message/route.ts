import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const body = await req.json() as { role: "user" | "assistant"; content: string };

  const chatDate = new Date().toISOString().slice(0, 10);

  const { data, error } = await supabase.from("chat_messages").insert({
    user_id: user.id,
    chat_date: chatDate,
    role: body.role,
    content: body.content,
  }).select("id, created_at").single();

  if (error) {
    console.error("[API] chat_messages insert error:", error);
    return new NextResponse(error.message, { status: 400 });
  }

  return NextResponse.json({ id: data.id, createdAt: data.created_at });
}
