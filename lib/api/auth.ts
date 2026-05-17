import { adminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";

export async function getUserFromRequest(
  req: Request
// eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<{ user: User; dbClient: any } | null> {
  // Bearer first (mobile) — if header is present, don't fall through to cookie
  const authHeader = req.headers.get("authorization") ?? "";
  if (authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const { data } = await adminClient.auth.getUser(token);
    if (data.user) return { user: data.user, dbClient: adminClient };
    return null;
  }
  // Cookie fallback (web)
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (data.user) return { user: data.user, dbClient: supabase };
  return null;
}
