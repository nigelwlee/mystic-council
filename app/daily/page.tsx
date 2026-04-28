"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, Suspense } from "react";
import { DailyShell } from "@/components/daily/DailyShell";
import type { TabId } from "@/components/daily/BottomTabBar";

const TEXT = "#F5F0E8";

function TabPlaceholder({ label }: { label: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "60vh",
        color: "rgba(245,240,232,0.25)",
        fontFamily: "var(--font-cormorant)",
        fontSize: 18,
        fontStyle: "italic",
      }}
    >
      {label}
    </div>
  );
}

function DailyPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawTab = searchParams.get("tab");
  const activeTab: TabId =
    rawTab === "chat" || rawTab === "tapestry" ? rawTab : "read";

  const handleTabChange = useCallback(
    (tab: TabId) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", tab);
      router.replace(`/daily?${params.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  return (
    <DailyShell activeTab={activeTab} onTabChange={handleTabChange}>
      {/* Header */}
      <div
        style={{
          padding: "48px 24px 24px",
          maxWidth: 600,
          margin: "0 auto",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-geist-sans)",
            fontSize: 9,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: "rgba(245,240,232,0.3)",
          }}
        >
          Mystic Council
        </span>
        <h1
          style={{
            fontFamily: "var(--font-cormorant)",
            fontWeight: 700,
            fontSize: 32,
            color: TEXT,
            margin: "8px 0 0",
            lineHeight: 1.1,
          }}
        >
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </h1>
      </div>

      {/* Tab content — kept mounted with display toggle to preserve scroll position */}
      <div style={{ display: activeTab === "read"     ? "block" : "none" }}>
        <TabPlaceholder label="Your daily reading is being woven…" />
      </div>
      <div style={{ display: activeTab === "chat"     ? "block" : "none" }}>
        <TabPlaceholder label="Share something about your day." />
      </div>
      <div style={{ display: activeTab === "tapestry" ? "block" : "none" }}>
        <TabPlaceholder label="Your tapestry awaits embellishment." />
      </div>
    </DailyShell>
  );
}

export default function DailyPage() {
  return (
    <Suspense>
      <DailyPageInner />
    </Suspense>
  );
}
