"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { usePostHog } from "posthog-js/react";
import { useProtoStore } from "@/lib/hooks/use-proto-store";
import { ReadTab } from "@/components/daily/ReadTab";

const BG = "#0A0B14";
const MUTED = "rgba(245,240,232,0.35)";
const ACCENT = "rgba(191,168,130,1)";
const ACCENT_DIM = "rgba(191,168,130,0.75)";

function today(): string {
  return new Date().toLocaleDateString("en-CA");
}

function formatDate(d: string): string {
  return new Date(d + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export default function DailyPage() {
  const router = useRouter();
  const { store, ready, clearCache } = useProtoStore();
  const streak = store.streak;
  const posthog = usePostHog();
  const date = today();
  const [readingDone, setReadingDone] = useState(false);
  // Key used to force ReadTab to re-mount when the user refreshes
  const [tabKey, setTabKey] = useState(0);

  useEffect(() => {
    if (!ready) return;
    if (!store.birthData) {
      router.replace("/");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  const handleRefresh = () => {
    posthog?.capture("daily_reading_refreshed", { date });
    clearCache(date);
    setReadingDone(false);
    setTabKey((k) => k + 1);
  };

  const handleLoad = () => {
    posthog?.capture("daily_reading_loaded", { date });
    setReadingDone(true);
  };

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        maxWidth: 480,
        margin: "0 auto",
        padding: "0 20px",
        backgroundColor: BG,
      }}
    >
      {/* Top bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          paddingTop: 20,
          paddingBottom: 20,
        }}
      >
        <button
          onClick={() => router.push("/")}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: 14,
            color: MUTED,
            fontFamily: "var(--font-geist-mono), monospace",
            letterSpacing: "0.06em",
            padding: 0,
          }}
        >
          ← Edit
        </button>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
          <span
            style={{
              fontSize: 11,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: MUTED,
              fontFamily: "var(--font-geist-mono), monospace",
            }}
          >
            {formatDate(date)}
          </span>
          {streak && streak.current > 0 && (
            <span
              style={{
                fontSize: 10,
                color: ACCENT_DIM,
                fontFamily: "var(--font-geist-mono), monospace",
                letterSpacing: "0.08em",
              }}
            >
              {streak.current} day streak
            </span>
          )}
        </div>
        <button
          onClick={handleRefresh}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: 14,
            color: MUTED,
            fontFamily: "var(--font-geist-mono), monospace",
            letterSpacing: "0.06em",
            padding: 0,
          }}
        >
          Refresh
        </button>
      </div>

      {/* Read tab — daily reading preview + expand */}
      <div style={{ flex: 1 }}>
        <ReadTab key={tabKey} onLoad={handleLoad} />
      </div>

      {/* Sticky CTA — shown after reading loads */}
      {readingDone && (
        <div
          style={{
            position: "sticky",
            bottom: 0,
            paddingTop: 24,
            paddingBottom: 40,
            backgroundColor: BG,
          }}
        >
          <button
            onClick={() => router.push("/chat")}
            style={{
              width: "100%",
              padding: "16px 20px",
              background: ACCENT,
              color: "#0A0B14",
              fontSize: 14,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              fontFamily: "var(--font-geist-mono), monospace",
              border: "none",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Ask the council →
          </button>
        </div>
      )}
    </div>
  );
}
