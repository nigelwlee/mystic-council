import { adminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { User, SupabaseClient } from "@supabase/supabase-js";

export async function getUserFromRequest(
  req: Request
): Promise<{ user: User; dbClient: SupabaseClient } | null> {
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
