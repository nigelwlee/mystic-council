"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

export function AuthNav() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth");
    router.refresh();
  };

  if (loading) return null;

  return (
    <div
      className="fixed top-3 right-4 z-50 text-xs"
      style={{ color: "rgba(191,168,130,0.5)", fontFamily: "var(--font-geist-sans)" }}
    >
      {user ? (
        <button
          onClick={handleSignOut}
          className="hover:opacity-80 transition-opacity"
          style={{ color: "rgba(191,168,130,0.5)" }}
        >
          Sign out
        </button>
      ) : (
        <Link
          href="/auth"
          className="hover:opacity-80 transition-opacity"
          style={{ color: "rgba(191,168,130,0.5)" }}
        >
          Sign in
        </Link>
      )}
    </div>
  );
}
