"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useProtoStore, type ProtoExpertReading, type ProtoOracle, type ProtoDailyCache } from "@/lib/hooks/use-proto-store";
import { runSse } from "@/lib/api/sse";

const BG = "#0A0B14";
const TEXT = "#F5F0E8";
const MUTED = "rgba(245,240,232,0.35)";
const BORDER = "rgba(245,240,232,0.08)";
const ACCENT = "rgba(191,168,130,1)";
const ACCENT_DIM = "rgba(191,168,130,0.75)";

const TRADITION_LABEL: Record<string, { label: string; symbol: string }> = {
  "stella":       { label: "Astrology (Stella)",      symbol: "✦" },
  "priya":        { label: "Vedic (Priya)",            symbol: "ॐ" },
  "master-wei":   { label: "Chinese (Master Wei)",    symbol: "☯" },
  "madame-crow":  { label: "Tarot (Madame Crow)",     symbol: "🜂" },
  "pythia":       { label: "Numerology (Pythia)",     symbol: "∞" },
};

const TRADITION_ORDER = ["stella", "priya", "master-wei", "madame-crow", "pythia"];

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

function ExpertRow({ expert }: { expert: ProtoExpertReading }) {
  const [open, setOpen] = useState(false);
  const meta = TRADITION_LABEL[expert.expertId] ?? { label: expert.expertName, symbol: expert.expertEmoji };
  const content = typeof expert.content === "object" && expert.content !== null ? expert.content : null;
  const oneLiner = content?.oneLiner ?? (expert.error ?? "");
  const summary = content?.summary ?? "";

  return (
    <div
      style={{
        borderTop: `1px solid ${BORDER}`,
        paddingTop: 16,
        paddingBottom: 16,
      }}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 12,
          width: "100%",
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: 0,
          textAlign: "left",
        }}
      >
        <span
          style={{
            fontSize: 14,
            flexShrink: 0,
            marginTop: 2,
            color: MUTED,
            fontFamily: "var(--font-geist-mono), monospace",
            width: 16,
            textAlign: "center",
          }}
        >
          {meta.symbol}
        </span>
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: 11,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: MUTED,
              fontFamily: "var(--font-geist-mono), monospace",
              marginBottom: 4,
            }}
          >
            {meta.label}
          </div>
          <div style={{ fontSize: 16, color: TEXT, lineHeight: 1.5 }}>{oneLiner}</div>
        </div>
        {summary && (
          <span
            style={{
              fontSize: 12,
              color: MUTED,
              flexShrink: 0,
              marginTop: 4,
              fontFamily: "var(--font-geist-mono), monospace",
            }}
          >
            {open ? "▲" : "▼"}
          </span>
        )}
      </button>
      {open && summary && (
        <div
          style={{
            marginTop: 12,
            paddingLeft: 28,
            fontSize: 15,
            color: MUTED,
            lineHeight: 1.7,
          }}
        >
          {summary}
        </div>
      )}
    </div>
  );
}

function Skeleton() {
  return (
    <div style={{ paddingTop: 40 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 16, paddingBottom: 16 }}>
          <div
            style={{
              height: 14,
              background: "rgba(245,240,232,0.06)",
              borderRadius: 2,
              width: `${50 + i * 8}%`,
              marginBottom: 8,
            }}
          />
          <div style={{ height: 16, background: "rgba(245,240,232,0.04)", borderRadius: 2, width: "85%" }} />
        </div>
      ))}
    </div>
  );
}

export default function DailyPage() {
  const router = useRouter();
  const { store, ready, saveCache, clearCache } = useProtoStore();
  const streak = store.streak;

  const date = today();
  const [phase, setPhase] = useState<"idle" | "chart" | "daily" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [oracle, setOracle] = useState<ProtoOracle | null>(null);
  const [experts, setExperts] = useState<ProtoExpertReading[]>([]);

  const runFetch = useCallback(async (bd: typeof store.birthData, refresh = false) => {
    if (!bd) return;
    if (!refresh && store.cache[date]) {
      const cached = store.cache[date];
      setOracle(cached.daily.oracle);
      setExperts(
        [...cached.daily.experts].sort(
          (a, b) => (TRADITION_ORDER.indexOf(a.expertId) ?? 99) - (TRADITION_ORDER.indexOf(b.expertId) ?? 99)
        )
      );
      setPhase("done");
      return;
    }

    setPhase("chart");
    setOracle(null);
    setExperts([]);

    let chartResult: Record<string, unknown>;
    try {
      const res = await fetch("/api/chart", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          birthData: {
            name: bd.name,
            date: bd.date,
            time: bd.time,
            latitude: bd.latitude,
            longitude: bd.longitude,
            location: bd.location,
          },
          date,
        }),
      });
      if (!res.ok) throw new Error(`Chart error ${res.status}`);
      chartResult = (await res.json()) as Record<string, unknown>;
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : String(e));
      setPhase("error");
      return;
    }

    setPhase("daily");
    const liveExperts: ProtoExpertReading[] = [];
    let liveOracle: ProtoOracle | null = null;
    let fullResult: Record<string, unknown> = {};
    try {
      fullResult = await runSse(
        "/api/daily/stream",
        {
          birthData: {
            name: bd.name,
            date: bd.date,
            time: bd.time,
            latitude: bd.latitude,
            longitude: bd.longitude,
            location: bd.location,
          },
          date,
          chart: chartResult,
        },
        (e) => {
          const expert: ProtoExpertReading = {
            expertId: String(e.expertId ?? ""),
            expertName: String(e.expertName ?? ""),
            expertEmoji: String(e.expertEmoji ?? ""),
            color: String(e.color ?? ""),
            content: e.content as ProtoExpertReading["content"],
            error: e.error as string | undefined,
          };
          liveExperts.push(expert);
          const sorted = [...liveExperts].sort(
            (a, b) => (TRADITION_ORDER.indexOf(a.expertId) ?? 99) - (TRADITION_ORDER.indexOf(b.expertId) ?? 99)
          );
          setExperts(sorted);
        },
        (o) => {
          liveOracle = {
            oneLiner: String((o as { oneLiner?: string }).oneLiner ?? ""),
            summary: String((o as { summary?: string }).summary ?? ""),
          };
          setOracle(liveOracle);
        },
      );
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : String(e));
      setPhase("error");
      return;
    }

    const cacheEntry: ProtoDailyCache = {
      chart: chartResult,
      daily: {
        oracle: liveOracle ?? { oneLiner: "", summary: "" },
        experts: liveExperts,
        full: fullResult,
      },
    };
    saveCache(date, cacheEntry);
    setPhase("done");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, store.cache, saveCache]);

  useEffect(() => {
    if (!ready) return;
    if (!store.birthData) {
      router.replace("/");
      return;
    }
    if (phase === "idle") {
      void runFetch(store.birthData, false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  const handleRefresh = () => {
    clearCache(date);
    setPhase("idle");
    void runFetch(store.birthData, true);
  };

  const loading = phase === "chart" || phase === "daily";

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
          disabled={loading}
          style={{
            background: "none",
            border: "none",
            cursor: loading ? "not-allowed" : "pointer",
            fontSize: 14,
            color: loading ? "rgba(245,240,232,0.15)" : MUTED,
            fontFamily: "var(--font-geist-mono), monospace",
            letterSpacing: "0.06em",
            padding: 0,
          }}
        >
          Refresh
        </button>
      </div>

      {/* Status line */}
      {loading && (
        <div
          style={{
            fontSize: 12,
            color: ACCENT,
            fontFamily: "var(--font-geist-mono), monospace",
            letterSpacing: "0.08em",
            paddingBottom: 8,
            animation: "pulse 1.5s ease-in-out infinite",
          }}
        >
          {phase === "chart" ? "Reading your chart…" : "Consulting the council…"}
        </div>
      )}

      {phase === "error" && (
        <div style={{ color: "#f87171", fontSize: 14, paddingTop: 20 }}>{errorMsg}</div>
      )}

      {/* Oracle verdict */}
      {oracle && (
        <div style={{ paddingTop: 24, paddingBottom: 32 }}>
          <p
            style={{
              fontFamily: "var(--font-cormorant), Georgia, serif",
              fontSize: 26,
              fontStyle: "italic",
              fontWeight: 400,
              color: ACCENT_DIM,
              lineHeight: 1.4,
              margin: 0,
              marginBottom: 16,
            }}
          >
            {oracle.oneLiner}
          </p>
          <p style={{ fontSize: 16, color: TEXT, lineHeight: 1.7, margin: 0 }}>{oracle.summary}</p>
        </div>
      )}

      {/* Expert rows */}
      {(experts.length > 0 || loading) && (
        <div style={{ flex: 1 }}>
          {loading && experts.length === 0 ? (
            <Skeleton />
          ) : (
            experts.map((e) => <ExpertRow key={e.expertId} expert={e} />)
          )}
        </div>
      )}

      {/* Sticky CTA */}
      {phase === "done" && (
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

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
