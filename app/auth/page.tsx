"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePostHog } from "posthog-js/react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Mode = "signin" | "signup" | "forgot" | "reset";

const inputStyle = {
  backgroundColor: "rgba(191,168,130,0.05)",
  borderColor: "rgba(191,168,130,0.2)",
  color: "#F5F0E8",
  borderRadius: 0,
};

const labelStyle = { color: "rgba(191,168,130,0.9)" };

export default function AuthPage() {
  const router = useRouter();
  const posthog = usePostHog();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const [loading, setLoading] = useState(false);

  // Detect Supabase PASSWORD_RECOVERY event (fires when reset link is clicked)
  useEffect(() => {
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setMode("reset");
        setMessage(null);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setLoading(true);
    const supabase = createClient();

    try {
      if (mode === "forgot") {
        const redirectTo = `${window.location.origin}/auth`;
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
        if (error) throw error;
        setMessage({ text: "Check your email for a password reset link.", isError: false });
        setLoading(false);
        return;
      }

      if (mode === "reset") {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        posthog?.capture("user_password_reset");
        setMessage({ text: "Password updated. Signing you in…", isError: false });
        setTimeout(() => router.push("/daily"), 1200);
        setLoading(false);
        return;
      }

      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        posthog?.capture("user_signed_up", { email });
        setMessage({ text: "Check your email to confirm your account, then sign in.", isError: false });
        setLoading(false);
        return;
      }

      // signin
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      posthog?.identify(data.user?.id ?? email, { email });
      posthog?.capture("user_signed_in", { email });
      router.push("/daily");
      router.refresh();
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : "An error occurred", isError: true });
      setLoading(false);
    }
  };

  const subtitle = {
    signin: "Welcome back.",
    signup: "Begin your journey.",
    forgot: "We'll send you a reset link.",
    reset: "Choose a new password.",
  }[mode];

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
          Starbly
        </h1>
        <p className="text-sm text-center mb-8" style={{ color: "rgba(191,168,130,0.7)" }}>
          {subtitle}
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {mode !== "reset" && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email" style={labelStyle}>Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                style={inputStyle}
              />
            </div>
          )}

          {(mode === "signin" || mode === "signup" || mode === "reset") && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password" style={labelStyle}>
                {mode === "reset" ? "New password" : "Password"}
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete={mode === "signup" || mode === "reset" ? "new-password" : "current-password"}
                style={inputStyle}
              />
            </div>
          )}

          {message && (
            <p className="text-sm" style={{ color: message.isError ? "#f87171" : "rgba(191,168,130,0.8)" }}>
              {message.text}
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
            {loading ? "…" : {
              signin: "Sign In",
              signup: "Create Account",
              forgot: "Send Reset Link",
              reset: "Set New Password",
            }[mode]}
          </Button>
        </form>

        <div className="flex flex-col gap-2 mt-6">
          {mode === "signin" && (
            <>
              <p className="text-sm text-center" style={{ color: "rgba(191,168,130,0.5)" }}>
                No account?{" "}
                <button type="button" onClick={() => { setMode("signup"); setMessage(null); }} className="underline" style={{ color: "rgba(191,168,130,0.8)" }}>
                  Sign up
                </button>
              </p>
              <p className="text-sm text-center" style={{ color: "rgba(191,168,130,0.5)" }}>
                Forgot your password?{" "}
                <button type="button" onClick={() => { setMode("forgot"); setMessage(null); }} className="underline" style={{ color: "rgba(191,168,130,0.8)" }}>
                  Reset it
                </button>
              </p>
            </>
          )}
          {(mode === "signup" || mode === "forgot") && (
            <p className="text-sm text-center" style={{ color: "rgba(191,168,130,0.5)" }}>
              <button type="button" onClick={() => { setMode("signin"); setMessage(null); }} className="underline" style={{ color: "rgba(191,168,130,0.8)" }}>
                Back to sign in
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
