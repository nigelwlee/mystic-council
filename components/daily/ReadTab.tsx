"use client";

import { useState, useEffect, useCallback } from "react";
import {
  useProtoStore,
  type ProtoExpertReading,
  type ProtoOracle,
  type ProtoDailyCache,
} from "@/lib/hooks/use-proto-store";
import { runSse } from "@/lib/api/sse";
import { BreathingDots } from "@/components/daily/BreathingDots";
import { ReadingPreview } from "@/components/daily/ReadingPreview";
import { OracleSection } from "@/components/daily/OracleSection";
import { ExpertCard } from "@/components/daily/ExpertCard";

const MUTED = "rgba(245,240,232,0.35)";
const ACCENT = "rgba(191,168,130,1)";
const BORDER = "rgba(245,240,232,0.08)";

const TRADITION_ORDER = ["stella", "priya", "master-wei", "madame-crow", "pythia"];

const IS_MOCK = process.env.NEXT_PUBLIC_MOCK_MODE === "true";

function today(): string {
  return new Date().toLocaleDateString("en-CA");
}

type Phase = "idle" | "loading" | "done" | "error";

interface ReadTabProps {
  /** Called when data finishes loading so the parent can respond (e.g. analytics, show CTA). */
  onLoad?: (date: string, cache: ProtoDailyCache) => void;
}

export function ReadTab({ onLoad }: ReadTabProps) {
  const { store, ready, saveCache } = useProtoStore();
  const date = today();
  const [phase, setPhase] = useState<Phase>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [oracle, setOracle] = useState<ProtoOracle | null>(null);
  const [experts, setExperts] = useState<ProtoExpertReading[]>([]);
  const [expanded, setExpanded] = useState(false);

  const sortExperts = useCallback(
    (arr: ProtoExpertReading[]) =>
      [...arr].sort(
        (a, b) =>
          (TRADITION_ORDER.indexOf(a.expertId) === -1 ? 99 : TRADITION_ORDER.indexOf(a.expertId)) -
          (TRADITION_ORDER.indexOf(b.expertId) === -1 ? 99 : TRADITION_ORDER.indexOf(b.expertId))
      ),
    []
  );

  const loadData = useCallback(async () => {
    // Check cache first — don't re-fetch if already loaded today
    if (store.cache[date]) {
      const cached = store.cache[date];
      setOracle(cached.daily.oracle);
      setExperts(sortExperts(cached.daily.experts));
      setPhase("done");
      return;
    }

    setPhase("loading");
    setOracle(null);
    setExperts([]);

    // Mock mode: load from mock-daily immediately, no API call
    if (IS_MOCK) {
      const { mockDailyExperts, mockDailyOracle } = await import("@/lib/mock-daily");
      await new Promise<void>((r) => setTimeout(r, 600));
      setOracle(mockDailyOracle);
      setExperts(sortExperts(mockDailyExperts));
      setPhase("done");
      const cacheEntry: ProtoDailyCache = {
        chart: {},
        daily: { oracle: mockDailyOracle, experts: mockDailyExperts, full: {} },
      };
      saveCache(date, cacheEntry);
      onLoad?.(date, cacheEntry);
      return;
    }

    const bd = store.birthData;
    if (!bd) {
      setErrorMsg("No birth data found.");
      setPhase("error");
      return;
    }

    // Step 1: fetch chart
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

    // Step 2: stream expert readings + oracle
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
          setExperts(sortExperts([...liveExperts]));
        },
        (o) => {
          liveOracle = {
            oneLiner: String((o as { oneLiner?: string }).oneLiner ?? ""),
            summary: String((o as { summary?: string }).summary ?? ""),
          };
          setOracle(liveOracle);
        }
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
    onLoad?.(date, cacheEntry);
    setPhase("done");
  }, [date, store.cache, store.birthData, saveCache, sortExperts, onLoad]);

  useEffect(() => {
    if (!ready) return;
    if (phase === "idle") {
      void loadData();
    }
  }, [ready, phase, loadData]);

  // Loading state
  if (phase === "idle" || phase === "loading") {
    return (
      <div
        style={{
          paddingTop: 40,
          paddingBottom: 40,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 16,
        }}
      >
        <BreathingDots />
        <span
          style={{
            fontSize: 12,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: ACCENT,
            fontFamily: "var(--font-geist-mono), monospace",
          }}
        >
          Generating your daily reading...
        </span>
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div
        style={{
          paddingTop: 20,
          color: "#f87171",
          fontSize: 14,
          fontFamily: "var(--font-geist-mono), monospace",
        }}
      >
        {errorMsg || "Something went wrong. Please try again."}
      </div>
    );
  }

  // Done — show preview or expanded reading
  return (
    <div>
      {!expanded && oracle && experts.length > 0 && (
        <ReadingPreview
          oracle={oracle}
          experts={experts}
          onExpand={() => setExpanded(true)}
        />
      )}

      {expanded && (
        <div>
          {/* Collapse */}
          <button
            onClick={() => setExpanded(false)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: 11,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: MUTED,
              fontFamily: "var(--font-geist-mono), monospace",
              padding: 0,
              marginBottom: 24,
            }}
          >
            ▲ Collapse
          </button>

          {oracle && <OracleSection oracle={oracle} />}

          <div style={{ borderTop: `1px solid ${BORDER}` }}>
            {experts.map((expert) => (
              <ExpertCard key={expert.expertId} expert={expert} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default ReadTab;
