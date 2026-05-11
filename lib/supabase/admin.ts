import { createClient } from "@supabase/supabase-js";

// Service-role client — bypasses RLS. Server-side only, never expose to client.
// Lazy singleton: defers createClient() until first method call so module
// evaluation during Next.js static build doesn't throw when env vars are absent.
let _client: ReturnType<typeof createClient> | null = null;

function getClient() {
  if (!_client) {
    _client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SECRET_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
  }
  return _client;
}

// Typed as `any` intentionally: the service-role client bypasses RLS and is
// used with raw table names not covered by generated types. Callers are
// responsible for asserting result shapes.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const adminClient: any = new Proxy({} as any, {
  get(_target, prop) {
    const client = getClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const c = client as any;
    const value = c[prop];
    return typeof value === "function" ? value.bind(c) : value;
  },
});
