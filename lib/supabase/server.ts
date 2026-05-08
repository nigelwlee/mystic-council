import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // ignore — called from Server Component where cookies are read-only
          }
        },
      },
    }
  );

  // Bearer-token fallback for Expo / non-browser clients.
  // Cookie session takes priority — only inject the token when no cookie
  // session is present, so existing web auth is completely unaffected.
  const { data: { session: cookieSession } } = await supabase.auth.getSession();
  if (!cookieSession) {
    const headerStore = await headers();
    const authHeader = headerStore.get("authorization");
    if (authHeader?.toLowerCase().startsWith("bearer ")) {
      const token = authHeader.slice(7).trim();
      // setSession validates the JWT against Supabase; an invalid token will
      // leave the client in an unauthenticated state, which is the desired
      // behaviour — downstream getUser() calls will then return null.
      await supabase.auth.setSession({ access_token: token, refresh_token: "" });
    }
  }

  return supabase;
}
