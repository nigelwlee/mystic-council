import { createClient } from "@supabase/supabase-js";
import { serverEnv } from "@/lib/env";

// Service-role client — bypasses RLS. Server-side only, never expose to client.
// Lazy singleton: defers createClient() until first method call so module
// evaluation during Next.js static build doesn't throw when env vars are absent.
let _client: ReturnType<typeof createClient> | null = null;

function getClient() {
  if (!_client) {
    _client = createClient(
      serverEnv.NEXT_PUBLIC_SUPABASE_URL,
      serverEnv.SUPABASE_SECRET_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
  }
  return _client;
}

// Typed as `any`: the web project has no generated DB types, so callers are
// responsible for asserting result shapes. The proxy is safe — it delegates
// every property access to the real SupabaseClient singleton.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const adminClient: any = new Proxy({} as any, {
  get(_target, prop) {
    const client = getClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const value = (client as any)[prop];
    return typeof value === "function" ? value.bind(client) : value;
  },
});
