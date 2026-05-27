import { adminClient } from "@/lib/supabase/admin";

export const maxDuration = 60;

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: tokens, error } = await adminClient
    .from("push_tokens")
    .select("token, user_id");

  if (error) {
    console.error("[push/daily] fetch tokens error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }

  if (!tokens?.length) {
    return Response.json({ sent: 0 });
  }

  const messages = tokens.map((row: { token: string; user_id: string }) => ({
    to: row.token,
    title: "Your daily reading is ready",
    body: "The council has gathered. See what today holds.",
    sound: "default",
  }));

  // Expo Push API accepts up to 100 messages per request
  const chunks: typeof messages[] = [];
  for (let i = 0; i < messages.length; i += 100) {
    chunks.push(messages.slice(i, i + 100));
  }

  let sent = 0;
  for (const chunk of chunks) {
    const res = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(chunk),
    });
    const data = (await res.json()) as { data?: { status: string }[] };
    const ok = data.data?.filter((r) => r.status === "ok").length ?? 0;
    sent += ok;
    console.log(JSON.stringify({ event: "push_batch", total: chunk.length, ok }));
  }

  return Response.json({ sent, total: tokens.length });
}
