"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useProtoStore, type ProtoChatEntry, type ProtoOracle, type ProtoExpertReading } from "@/lib/hooks/use-proto-store";
import { runSse } from "@/lib/api/sse";
import { ChatInput } from "@/components/daily/ChatInput";

const BG = "#0A0B14";
const TEXT = "#F5F0E8";
const MUTED = "rgba(245,240,232,0.35)";
const ACCENT = "rgba(191,168,130,1)";
const ACCENT_DIM = "rgba(191,168,130,0.12)";
const USER_BG = "rgba(245,240,232,0.05)";

const MOCK_RESPONSES = [
  "The threads of today weave an interesting pattern. The Oracle sees tension giving way to clarity — lean into stillness for now, and the answer you seek will surface on its own.",
  "The council convenes. Your day carries the signature of a turning point — not dramatic, but decisive. Small choices made with intention carry unusual weight right now.",
  "There is a quiet momentum building beneath the surface of your day. The stars counsel patience; what you're reaching for is closer than it appears. Trust the process.",
  "The council reads a day of contrasts — what feels like friction may be refinement. Stay close to what genuinely nourishes you and let the rest resolve itself.",
];

function today(): string {
  return new Date().toLocaleDateString("en-CA");
}

function getMockResponse(): string {
  return MOCK_RESPONSES[Math.floor(Math.random() * MOCK_RESPONSES.length)]!;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  ts: number;
  pending?: boolean;
}

function buildMessagesFromHistory(history: ProtoChatEntry[]): ChatMessage[] {
  // history is stored newest-first, so reverse for display
  return [...history].reverse().flatMap((entry) => [
    {
      id: `${entry.id}-user`,
      role: "user" as const,
      text: entry.q,
      ts: entry.ts,
    },
    {
      id: `${entry.id}-assistant`,
      role: "assistant" as const,
      text: entry.error
        ? entry.error
        : entry.oracle?.summary || entry.oracle?.oneLiner || "",
      ts: entry.ts,
      pending: false,
    },
  ]);
}

function UserBubble({ text }: { text: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
      <div
        style={{
          maxWidth: "78%",
          background: USER_BG,
          borderLeft: `2px solid ${ACCENT}`,
          padding: "10px 14px",
          fontSize: 15,
          color: TEXT,
          lineHeight: 1.55,
        }}
      >
        {text}
      </div>
    </div>
  );
}

function AssistantBubble({ text, pending }: { text: string; pending?: boolean }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div
        style={{
          maxWidth: "88%",
          background: ACCENT_DIM,
          borderLeft: `2px solid ${ACCENT}`,
          padding: pending && !text ? "14px 16px" : "14px 16px",
        }}
      >
        {pending && !text ? (
          <TypingDots />
        ) : (
          <p
            style={{
              margin: 0,
              fontSize: 15,
              color: TEXT,
              lineHeight: 1.65,
              fontFamily: "var(--font-cormorant), Georgia, serif",
              fontStyle: "italic",
            }}
          >
            {text}
          </p>
        )}
      </div>
    </div>
  );
}

function TypingDots() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "2px 0" }}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          style={{
            width: 5,
            height: 5,
            borderRadius: "50%",
            backgroundColor: ACCENT,
            display: "inline-block",
            animation: `chatTypingDot 1.2s ease-in-out ${i * 0.2}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        paddingTop: 48,
        paddingBottom: 48,
        textAlign: "center",
        gap: 12,
      }}
    >
      <p
        style={{
          fontFamily: "var(--font-cormorant), Georgia, serif",
          fontSize: 28,
          fontStyle: "italic",
          fontWeight: 400,
          color: MUTED,
          lineHeight: 1.4,
          margin: 0,
        }}
      >
        How are you today?
      </p>
      <p
        style={{
          fontSize: 13,
          color: "rgba(245,240,232,0.2)",
          fontFamily: "var(--font-geist-mono), monospace",
          letterSpacing: "0.06em",
          margin: 0,
        }}
      >
        Share anything — the council is listening.
      </p>
    </div>
  );
}

const MOCK_MODE = process.env.NEXT_PUBLIC_MOCK_MODE === "true";

export function ChatTab() {
  const { store, ready, addChatEntry } = useProtoStore();
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [streamingText, setStreamingText] = useState<string>("");
  const [streamingQ, setStreamingQ] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const startRef = useRef<number | null>(null);

  const todayStr = today();
  const messages = buildMessagesFromHistory(store.chatHistory);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, streamingQ, streamingText]);

  const send = useCallback(async () => {
    const q = input.trim();
    if (!q || busy || !store.birthData) return;

    setInput("");
    setBusy(true);
    setStreamingQ(q);
    setStreamingText("");
    startRef.current = Date.now();

    if (MOCK_MODE) {
      // Mock: short delay then canned response
      await new Promise((r) => setTimeout(r, 900 + Math.random() * 600));
      const text = getMockResponse();
      const entry: ProtoChatEntry = {
        id: crypto.randomUUID(),
        ts: startRef.current!,
        durationMs: Date.now() - startRef.current!,
        q,
        oracle: { oneLiner: text, summary: text },
        experts: [],
      };
      addChatEntry(entry);
      setStreamingQ(null);
      setStreamingText("");
      setBusy(false);
      startRef.current = null;
      return;
    }

    const bd = store.birthData;
    const cached = store.cache[todayStr];

    const liveExperts: ProtoExpertReading[] = [];
    let liveOracle: ProtoOracle | null = null;

    try {
      await runSse(
        "/api/council/stream",
        {
          birthData: {
            name: bd.name,
            date: bd.date,
            time: bd.time,
            latitude: bd.latitude,
            longitude: bd.longitude,
            location: bd.location,
          },
          date: todayStr,
          question: q,
          userId: store.userId,
          ...(cached?.chart ? { chart: cached.chart } : {}),
          ...(cached?.daily?.full ? { dailyReading: cached.daily.full } : {}),
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
        },
        (o) => {
          const oracle = o as { oneLiner?: string; summary?: string; chimers?: string[] };
          liveOracle = {
            oneLiner: String(oracle.oneLiner ?? ""),
            summary: String(oracle.summary ?? ""),
            chimers: Array.isArray(oracle.chimers) ? (oracle.chimers as string[]) : [],
          };
          setStreamingText(liveOracle.summary || liveOracle.oneLiner);
        },
      );

      const durationMs = Date.now() - startRef.current!;
      addChatEntry({
        id: crypto.randomUUID(),
        ts: startRef.current!,
        durationMs,
        q,
        oracle: liveOracle,
        experts: liveExperts,
      });
    } catch (err) {
      addChatEntry({
        id: crypto.randomUUID(),
        ts: startRef.current ?? Date.now(),
        durationMs: Date.now() - (startRef.current ?? Date.now()),
        q,
        oracle: null,
        experts: liveExperts,
        error: err instanceof Error ? err.message : String(err),
      });
    }

    setStreamingQ(null);
    setStreamingText("");
    setBusy(false);
    startRef.current = null;
  }, [input, busy, store, addChatEntry, todayStr]);

  if (!ready) return null;

  const hasMessages = messages.length > 0 || streamingQ !== null;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        minHeight: 0,
        position: "relative",
        backgroundColor: BG,
      }}
    >
      {/* Scroll area */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "20px 20px 0",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {!hasMessages ? (
          <EmptyState />
        ) : (
          <>
            {messages.map((msg) =>
              msg.role === "user" ? (
                <UserBubble key={msg.id} text={msg.text} />
              ) : (
                <AssistantBubble key={msg.id} text={msg.text} />
              )
            )}

            {/* Streaming in-progress */}
            {streamingQ !== null && (
              <>
                <UserBubble text={streamingQ} />
                <AssistantBubble text={streamingText} pending />
              </>
            )}
          </>
        )}

        <div ref={bottomRef} style={{ height: 12 }} />
      </div>

      {/* Input bar */}
      <ChatInput
        value={input}
        onChange={setInput}
        onSend={() => void send()}
        disabled={busy}
        placeholder="Share what's on your mind…"
      />

      <style>{`
        @keyframes chatTypingDot {
          0%, 80%, 100% { opacity: 0.2; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
