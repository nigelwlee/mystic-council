"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { usePostHog } from "posthog-js/react";
import { useProtoStore, type ProtoExpertReading, type ProtoOracle, type ProtoChatEntry } from "@/lib/hooks/use-proto-store";
import { runSse } from "@/lib/api/sse";

const BG = "#0A0B14";
const TEXT = "#F5F0E8";
const MUTED = "rgba(245,240,232,0.35)";
const BORDER = "rgba(245,240,232,0.08)";
const ACCENT = "rgba(191,168,130,1)";
const ACCENT_DIM = "rgba(191,168,130,0.12)";
const USER_BG = "rgba(245,240,232,0.06)";

const TRADITION_LABEL: Record<string, string> = {
  western:    "Astrology (Stella)",
  vedic:      "Vedic (Priya)",
  chinese:    "Chinese (Master Wei)",
  tarot:      "Tarot (Madame Crow)",
  numerology: "Numerology (Pythia)",
};

const SUGGESTED_PROMPTS = [
  // Decisions
  "Should I take the new job?",
  "Is now the right time to move?",
  "Should I reach out to them?",
  "Do I say yes to this opportunity?",
  "Should I end this relationship?",
  "Is this the right time to start my business?",
  "Should I speak up or stay quiet?",
  "Do I push forward or step back right now?",
  "Should I make the investment?",
  "Is it time to quit?",
  // Timing
  "When will things settle down?",
  "Is this week good for big moves?",
  "Am I moving too fast?",
  "How long until I see results?",
  "Is this the right season for change?",
  "Should I wait or act now?",
  "When is the right time to have that conversation?",
  "Are things about to shift for me?",
  // Love & relationships
  "Are we right for each other?",
  "Should I tell them how I feel?",
  "Why do I keep attracting the same kind of person?",
  "Will this relationship get better?",
  "Am I holding on too long?",
  "Is this the love I deserve?",
  "Why does it feel so hard right now?",
  "Should I give them another chance?",
  // Work & money
  "Will this project pay off?",
  "Should I push for the raise?",
  "Am I in the right career?",
  "Is this financial risk worth it?",
  "Why is work feeling so draining lately?",
  "Am I being overlooked or undervalued?",
  "Should I take the partnership deal?",
  "What does this week look like for business?",
  // Self & direction
  "What am I avoiding right now?",
  "What am I missing about this week?",
  "What is the real lesson this month?",
  "What is blocking me?",
  "Am I on the right path?",
  "What do I need to let go of?",
  "What is my energy like today?",
  "What should I focus on this week?",
  "Why do I keep sabotaging myself?",
  "What does the universe want me to notice right now?",
  // Family & friends
  "How do I handle this conversation with my mom?",
  "Should I set this boundary with my friend?",
  "Why is this family dynamic so hard?",
  "Am I being a good friend right now?",
  "How do I navigate this conflict at home?",
  "Is it time to reconnect with someone from my past?",
];

function pickThree(exclude: string[] = []): string[] {
  const pool = SUGGESTED_PROMPTS.filter((p) => !exclude.includes(p));
  const source = pool.length >= 3 ? pool : SUGGESTED_PROMPTS;
  const shuffled = [...source].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 3);
}

const EXPERT_TRADITION: Record<string, string> = {
  "stella":      "western",
  "priya":       "vedic",
  "master-wei":  "chinese",
  "madame-crow": "tarot",
  "pythia":      "numerology",
};

function today(): string {
  return new Date().toLocaleDateString("en-CA");
}

function elapsedStr(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function ChimerAside({ expert }: { expert: ProtoExpertReading }) {
  const [open, setOpen] = useState(false);
  const trad = EXPERT_TRADITION[expert.expertId] ?? "";
  const label = TRADITION_LABEL[trad] ?? expert.expertName;
  const content = expert.content;
  const oneLiner = content?.oneLiner ?? expert.error ?? "";
  const summary = content?.summary ?? "";

  return (
    <div
      style={{
        marginTop: 8,
        paddingLeft: 16,
        borderLeft: `2px solid rgba(245,240,232,0.1)`,
      }}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 8,
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
            fontSize: 11,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: MUTED,
            fontFamily: "var(--font-geist-mono), monospace",
            flexShrink: 0,
            paddingTop: 1,
            minWidth: 64,
          }}
        >
          {label}
        </span>
        <span style={{ fontSize: 14, color: MUTED, lineHeight: 1.5, flex: 1 }}>{oneLiner}</span>
        {summary && (
          <span
            style={{
              fontSize: 11,
              color: MUTED,
              flexShrink: 0,
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
            marginTop: 8,
            fontSize: 13,
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

function TypingDots() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 4,
        padding: "12px 16px",
      }}
    >
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            backgroundColor: ACCENT,
            display: "inline-block",
            animation: `typingDot 1.2s ease-in-out ${i * 0.2}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

interface MessageEntry {
  id: string;
  type: "user" | "oracle";
  q?: string;
  oracle?: ProtoOracle | null;
  experts?: ProtoExpertReading[];
  error?: string;
  ts: number;
  durationMs?: number;
}

function buildMessages(history: ProtoChatEntry[]): MessageEntry[] {
  return [...history].reverse().flatMap((entry) => [
    { id: `${entry.id}-q`, type: "user" as const, q: entry.q, ts: entry.ts },
    {
      id: entry.id,
      type: "oracle" as const,
      oracle: entry.oracle,
      experts: entry.experts,
      error: entry.error,
      ts: entry.ts,
      durationMs: entry.durationMs,
    },
  ]);
}

export default function ChatPage() {
  const router = useRouter();
  const { store, ready, addChatEntry } = useProtoStore();
  const posthog = usePostHog();
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef<number | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Streaming state
  const [streamingQ, setStreamingQ] = useState<string | null>(null);
  const [streamingOracle, setStreamingOracle] = useState<ProtoOracle | null>(null);
  const [streamingExperts, setStreamingExperts] = useState<ProtoExpertReading[]>([]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSuggestions(pickThree());
  }, []);

  useEffect(() => {
    if (!busy) return;
    const id = setInterval(() => {
      if (startRef.current) setElapsed(Date.now() - startRef.current);
    }, 100);
    return () => clearInterval(id);
  }, [busy]);

  // Scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [store.chatHistory, streamingOracle, streamingQ]);

  const send = useCallback(async () => {
    const q = question.trim();
    if (!q || busy || !store.birthData) return;
    setQuestion("");
    setBusy(true);
    setElapsed(0);
    startRef.current = Date.now();

    const cached = store.cache[today()];
    const bd = store.birthData;

    setStreamingQ(q);
    setStreamingOracle(null);
    setStreamingExperts([]);

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
          date: today(),
          question: q,
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
          setStreamingExperts([...liveExperts]);
        },
        (o) => {
          liveOracle = {
            oneLiner: String((o as { oneLiner?: string }).oneLiner ?? ""),
            summary: String((o as { summary?: string }).summary ?? ""),
            chimers: Array.isArray((o as { chimers?: unknown }).chimers)
              ? ((o as { chimers: unknown[] }).chimers as string[])
              : [],
          };
          setStreamingOracle(liveOracle);
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

      liveExperts.filter((e) => e.error).forEach((e) => {
        posthog?.capture("expert_failed", { expertId: e.expertId, error: e.error, endpoint: "council" });
      });
      posthog?.capture("chat_message_sent", {
        questionLength: q.length,
        durationMs,
        oracleSuccess: !!liveOracle,
        failedExperts: liveExperts.filter((e) => e.error).length,
      });
    } catch (e) {
      const durationMs = Date.now() - (startRef.current ?? Date.now());
      addChatEntry({
        id: crypto.randomUUID(),
        ts: startRef.current ?? Date.now(),
        durationMs,
        q,
        oracle: liveOracle,
        experts: liveExperts,
        error: e instanceof Error ? e.message : String(e),
      });
    }

    setStreamingQ(null);
    setStreamingOracle(null);
    setStreamingExperts([]);
    setBusy(false);
    startRef.current = null;
  }, [question, busy, store, addChatEntry]);

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  };

  if (!ready) return null;
  if (!store.birthData) {
    router.replace("/");
    return null;
  }

  const messages = buildMessages(store.chatHistory);

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        maxWidth: 480,
        margin: "0 auto",
        backgroundColor: BG,
      }}
    >
      {/* Top bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "18px 20px 14px",
          borderBottom: `1px solid ${BORDER}`,
          position: "sticky",
          top: 0,
          backgroundColor: BG,
          zIndex: 10,
        }}
      >
        <button
          onClick={() => router.push("/daily")}
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
          ← Daily
        </button>
        <span
          style={{
            fontSize: 12,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: MUTED,
            fontFamily: "var(--font-geist-mono), monospace",
          }}
        >
          The Oracle
        </span>
        <span style={{ width: 40 }} />
      </div>

      {/* Message list */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 20px 0" }}>
        {messages.length === 0 && !streamingQ && (
          <div
            style={{
              paddingTop: 60,
              textAlign: "center",
              color: MUTED,
              fontSize: 18,
              fontStyle: "italic",
              fontFamily: "var(--font-cormorant), Georgia, serif",
              lineHeight: 1.5,
            }}
          >
            Ask anything about today.
          </div>
        )}

        {/* History messages */}
        {messages.map((msg) => {
          if (msg.type === "user") {
            return (
              <div
                key={msg.id}
                style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}
              >
                <div
                  style={{
                    maxWidth: "78%",
                    background: USER_BG,
                    padding: "10px 14px",
                    fontSize: 16,
                    color: TEXT,
                    lineHeight: 1.5,
                  }}
                >
                  {msg.q}
                </div>
              </div>
            );
          }

          // Oracle bubble
          const chimers = msg.oracle?.chimers ?? [];
          const chimerExperts = (msg.experts ?? []).filter((e) => {
            const trad = EXPERT_TRADITION[e.expertId];
            return trad && chimers.includes(trad);
          });

          return (
            <div key={msg.id} style={{ marginBottom: 20 }}>
              <div
                style={{
                  maxWidth: "88%",
                  background: ACCENT_DIM,
                  padding: "14px 16px",
                  borderLeft: `2px solid ${ACCENT}`,
                }}
              >
                {msg.error ? (
                  <div style={{ fontSize: 14, color: "#f87171" }}>{msg.error}</div>
                ) : (
                  <p
                    style={{
                      margin: 0,
                      fontSize: 16,
                      color: TEXT,
                      lineHeight: 1.6,
                    }}
                  >
                    {msg.oracle?.summary || msg.oracle?.oneLiner || ""}
                  </p>
                )}
                {msg.durationMs !== undefined && (
                  <div
                    style={{
                      marginTop: 8,
                      fontSize: 11,
                      color: MUTED,
                      fontFamily: "var(--font-geist-mono), monospace",
                    }}
                  >
                    {elapsedStr(msg.durationMs)}
                  </div>
                )}
              </div>

              {/* Chimer asides */}
              {chimerExperts.length > 0 && (
                <div style={{ maxWidth: "88%", marginTop: 2 }}>
                  {chimerExperts.map((e) => (
                    <ChimerAside key={e.expertId} expert={e} />
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* Streaming message */}
        {streamingQ && (
          <>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
              <div
                style={{
                  maxWidth: "78%",
                  background: USER_BG,
                  padding: "10px 14px",
                  fontSize: 16,
                  color: TEXT,
                  lineHeight: 1.5,
                }}
              >
                {streamingQ}
              </div>
            </div>
            <div style={{ marginBottom: 20 }}>
              <div
                style={{
                  maxWidth: "88%",
                  background: ACCENT_DIM,
                  borderLeft: `2px solid ${ACCENT}`,
                }}
              >
                {streamingOracle ? (
                  <div style={{ padding: "14px 16px" }}>
                    <p style={{ margin: 0, fontSize: 16, color: TEXT, lineHeight: 1.6 }}>
                      {streamingOracle.summary || streamingOracle.oneLiner}
                    </p>
                    <div
                      style={{
                        marginTop: 8,
                        fontSize: 11,
                        color: ACCENT,
                        fontFamily: "var(--font-geist-mono), monospace",
                        animation: "pulse 1.5s ease-in-out infinite",
                      }}
                    >
                      {elapsedStr(elapsed)}
                    </div>
                  </div>
                ) : (
                  <TypingDots />
                )}
              </div>
              {/* Show chimers that streamed in during live session */}
              {streamingOracle && streamingOracle.chimers && streamingOracle.chimers.length > 0 && (
                <div style={{ maxWidth: "88%", marginTop: 2 }}>
                  {streamingExperts
                    .filter((e) => {
                      const trad = EXPERT_TRADITION[e.expertId];
                      return trad && streamingOracle.chimers!.includes(trad);
                    })
                    .map((e) => (
                      <ChimerAside key={e.expertId} expert={e} />
                    ))}
                </div>
              )}
            </div>
          </>
        )}

        <div ref={bottomRef} style={{ height: 16 }} />
      </div>

      {/* Input */}
      <div
        style={{
          borderTop: `1px solid ${BORDER}`,
          padding: "14px 20px",
          paddingBottom: "calc(14px + env(safe-area-inset-bottom, 0px))",
          backgroundColor: BG,
          position: "sticky",
          bottom: 0,
        }}
      >
        {/* Suggested prompts — only when textarea is empty */}
        {!busy && !question.trim() && suggestions.length > 0 && (
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 6,
              marginBottom: 10,
              flexWrap: "wrap",
            }}
          >
            {suggestions.map((p) => (
              <button
                key={p}
                onClick={() => setQuestion(p)}
                style={{
                  background: "none",
                  border: `1px solid ${BORDER}`,
                  color: MUTED,
                  fontSize: 12,
                  fontFamily: "var(--font-geist-mono), monospace",
                  padding: "6px 10px",
                  cursor: "pointer",
                  textAlign: "left",
                  lineHeight: 1.4,
                  flex: "1 1 0",
                  minWidth: 0,
                }}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => setSuggestions((prev) => pickThree(prev))}
              style={{
                background: "none",
                border: `1px solid ${BORDER}`,
                color: MUTED,
                fontSize: 14,
                fontFamily: "var(--font-geist-mono), monospace",
                padding: "6px 10px",
                cursor: "pointer",
                flexShrink: 0,
              }}
              title="Shuffle suggestions"
            >
              ↻
            </button>
          </div>
        )}

        <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
        <textarea
          ref={textareaRef}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Ask the Oracle…"
          rows={2}
          disabled={busy}
          style={{
            flex: 1,
            background: "rgba(245,240,232,0.04)",
            border: `1px solid ${BORDER}`,
            color: TEXT,
            fontSize: 16,
            padding: "12px 14px",
            resize: "none",
            outline: "none",
            borderRadius: 0,
            fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
            lineHeight: 1.5,
            boxSizing: "border-box",
          }}
        />
        <button
          onClick={() => void send()}
          disabled={busy || !question.trim()}
          style={{
            padding: "12px 18px",
            background: busy || !question.trim() ? "rgba(191,168,130,0.2)" : ACCENT,
            color: busy || !question.trim() ? "rgba(10,11,20,0.4)" : "#0A0B14",
            fontSize: 13,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            fontFamily: "var(--font-geist-mono), monospace",
            border: "none",
            cursor: busy || !question.trim() ? "not-allowed" : "pointer",
            fontWeight: 600,
            flexShrink: 0,
            alignSelf: "flex-end",
          }}
        >
          Send
        </button>
        </div>
      </div>

      <style>{`
        @keyframes typingDot {
          0%, 80%, 100% { opacity: 0.2; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        textarea::placeholder { color: rgba(245,240,232,0.2); }
      `}</style>
    </div>
  );
}
