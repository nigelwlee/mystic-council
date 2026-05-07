import { createClient } from "@supabase/supabase-js";

// Service-role client — bypasses RLS. Server-side only, never expose to client.
export const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);
