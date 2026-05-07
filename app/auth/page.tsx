"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { usePostHog } from "posthog-js/react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AuthPage() {
  const router = useRouter();
  const posthog = usePostHog();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();

    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        posthog?.capture("user_signed_up", { email });
        // On sign up, show confirmation message or redirect
        setError("Check your email to confirm your account, then sign in.");
        setLoading(false);
        return;
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        const userId = data.user?.id;
        posthog?.identify(userId ?? email, { email });
        posthog?.capture("user_signed_in", { email });
      }

      router.push("/daily");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ backgroundColor: "#0A0B14", color: "#F5F0E8" }}
    >
      <div className="w-full max-w-sm">
        <h1
          className="text-3xl mb-2 text-center"
          style={{ fontFamily: "var(--font-cormorant)", color: "#F5F0E8" }}
        >
          Mystic Council
        </h1>
        <p
          className="text-sm text-center mb-8"
          style={{ color: "rgba(191,168,130,0.7)" }}
        >
          {mode === "signin" ? "Welcome back." : "Begin your journey."}
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email" style={{ color: "rgba(191,168,130,0.9)" }}>
              Email
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              style={{
                backgroundColor: "rgba(191,168,130,0.05)",
                borderColor: "rgba(191,168,130,0.2)",
                color: "#F5F0E8",
                borderRadius: 0,
              }}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password" style={{ color: "rgba(191,168,130,0.9)" }}>
              Password
            </Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              style={{
                backgroundColor: "rgba(191,168,130,0.05)",
                borderColor: "rgba(191,168,130,0.2)",
                color: "#F5F0E8",
                borderRadius: 0,
              }}
            />
          </div>

          {error && (
            <p className="text-sm" style={{ color: "rgba(191,168,130,0.8)" }}>
              {error}
            </p>
          )}

          <Button
            type="submit"
            disabled={loading}
            style={{
              backgroundColor: "rgba(191,168,130,0.15)",
              borderColor: "rgba(191,168,130,0.3)",
              color: "#F5F0E8",
              borderRadius: 0,
              border: "1px solid rgba(191,168,130,0.3)",
            }}
            className="mt-2"
          >
            {loading
              ? "..."
              : mode === "signin"
              ? "Sign In"
              : "Create Account"}
          </Button>
        </form>

        <p className="text-sm text-center mt-6" style={{ color: "rgba(191,168,130,0.5)" }}>
          {mode === "signin" ? "No account?" : "Already have an account?"}{" "}
          <button
            type="button"
            onClick={() => {
              setMode(mode === "signin" ? "signup" : "signin");
              setError(null);
            }}
            className="underline"
            style={{ color: "rgba(191,168,130,0.8)" }}
          >
            {mode === "signin" ? "Sign up" : "Sign in"}
          </button>
        </p>
      </div>
    </div>
  );
}
