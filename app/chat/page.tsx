"use client";

import { useEffect, useRef, useState } from "react";
import { useChat } from "ai/react";
import { useRouter } from "next/navigation";
import { useBirthData } from "@/lib/context/birth-data-context";
import { LoomBar, type WeftThread } from "@/components/loom/LoomBar";
import { TapestryBackground } from "@/components/loom/TapestryBackground";
import { ExpertCard } from "@/components/council/ExpertCard";
import { OracleSection } from "@/components/council/OracleSection";
import { Nav } from "@/components/shared/Nav";
import { ContentColumn } from "@/components/shared/ContentColumn";
import { TRADITION_COLORS, EXPERT_ID_TO_TRADITION, TRADITIONS, type TraditionId } from "@/lib/constants/traditions";
import type { CouncilStreamData, JudgeVerdictData, ExpertResponse } from "@/lib/experts/types";
import type { JSONValue } from "ai";

const BG = "#0A0B14";
const TEXT = "#F5F0E8";

const QUESTION_PROMPTS = [
  "What is asking to be released?",
  "Where am I resisting my own pattern?",
  "What does this season want from me?",
  "What thread am I refusing to follow?",
];

export default function ChatPage() {
  const router = useRouter();
  const { birthData } = useBirthData();
  const [inputValue, setInputValue] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Expert responses + oracle
  const [expertResponses, setExpertResponses] = useState<ExpertResponse[]>([]);
  const [oracleContent, setOracleContent] = useState<string | null>(null);

  // LoomBar weft thread state
  const [weftThreads, setWeftThreads] = useState<WeftThread[]>([]);

  const { messages, isLoading, data, append } = useChat({
    api: "/api/chat",
    body: { birthData, selectedExperts: [] },
  });

  // Parse stream data events
  useEffect(() => {
    if (!data) return;
    for (const item of data as JSONValue[]) {
      const d = item as unknown as CouncilStreamData | JudgeVerdictData;
      if (!d || typeof d !== "object" || !("type" in d)) continue;

      if (d.type === "expert-responses") {
        setExpertResponses((prev) => {
          const updated = [...prev];
          for (const incoming of (d as CouncilStreamData).responses) {
            const idx = updated.findIndex((r) => r.expertId === incoming.expertId);
            if (idx >= 0) updated[idx] = incoming;
            else updated.push(incoming);
          }
          return updated;
        });

        // Update LoomBar weft threads
        for (const incoming of (d as CouncilStreamData).responses) {
          const tradId = EXPERT_ID_TO_TRADITION[incoming.expertId];
          if (tradId) {
            setWeftThreads((prev) => {
              const exists = prev.find((w) => w.id === tradId);
              if (exists) return prev.map((w) => w.id === tradId ? { ...w, progress: 1 } : w);
              return [...prev, {
                id: tradId,
                color: TRADITION_COLORS[tradId] + "99",
                progress: 1,
              }];
            });
          }
        }
      }

      if (d.type === "judge-verdict") {
        setOracleContent((d as JudgeVerdictData).content);
        // Add Oracle weft thread
        setWeftThreads((prev) => {
          if (prev.find((w) => w.id === "oracle")) return prev;
          return [...prev, {
            id: "oracle",
            color: TRADITION_COLORS.oracle + "CC",
            progress: 1,
            isOracle: true,
          }];
        });
      }
    }
  }, [data]);

  // Reset on new loading cycle
  useEffect(() => {
    if (isLoading) {
      setExpertResponses([]);
      setOracleContent(null);
      setWeftThreads([]);
    }
  }, [isLoading]);

  // Scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, expertResponses, oracleContent, isLoading]);

  const onSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = inputValue.trim();
    if (!trimmed || isLoading) return;
    append({ role: "user", content: trimmed });
    setInputValue("");
  };

  const lastAssistantMessage = messages.filter((m) => m.role === "assistant").at(-1);
  const isWaitingForExperts = isLoading && expertResponses.length === 0;
  const showOracleFromStream = !isLoading && oracleContent && !lastAssistantMessage;
  const showOracleFromMessage = lastAssistantMessage && typeof lastAssistantMessage.content === "string";
  const isEmpty = messages.length === 0 && !isLoading && expertResponses.length === 0;

  // Status label for LoomBar
  const totalTraditions = Object.keys(EXPERT_ID_TO_TRADITION).length;
  const loomStatus = (() => {
    if (weftThreads.length === 0) return `4 threads · ${/* row count */ 13} readings woven`;
    if (isLoading) return `The Council weaves your answer. · ${expertResponses.length} / ${totalTraditions} traditions`;
    if (weftThreads.some((w) => w.isOracle)) return `Row 14 complete. Your tapestry grows.`;
    return `${expertResponses.length} / ${totalTraditions} traditions`;
  })();

  const pendingTraditions: TraditionId[] = (() => {
    if (!isLoading) return [];
    const done = new Set(expertResponses.map((r) => EXPERT_ID_TO_TRADITION[r.expertId]).filter(Boolean));
    return (Object.values(EXPERT_ID_TO_TRADITION) as TraditionId[]).filter((t) => !done.has(t));
  })();

  return (
    <div style={{ position: "relative", minHeight: "100vh", backgroundColor: BG, color: TEXT, overflow: "hidden" }}>
      <TapestryBackground />

      <div style={{ position: "relative", zIndex: 1 }}>
        <ContentColumn style={{ backgroundColor: BG, minHeight: "100vh" }}>
          <Nav showTapestryLink />

          {/* LoomBar section */}
          <div
            style={{
              borderBottom: "1px solid rgba(245,240,232,0.06)",
              paddingTop: 12,
              paddingBottom: 8,
            }}
          >
            <LoomBar weftThreads={weftThreads} />
            <div style={{ marginTop: 6 }}>
              <span
                style={{
                  fontFamily: "var(--font-geist-sans)",
                  fontSize: 8,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: TEXT,
                  opacity: weftThreads.some((w) => w.isOracle) ? 0.35 : 0.3,
                  fontStyle: weftThreads.some((w) => w.isOracle) ? "italic" : "normal",
                  display: "block",
                }}
              >
                {loomStatus}
              </span>
            </div>
          </div>

          {/* Content area */}
          <div style={{ paddingTop: isEmpty ? 56 : 40, paddingBottom: 120 }}>

            {/* ── Empty state: question entry ───────────────────── */}
            {isEmpty && (
              <div>
                <h1
                  style={{
                    fontFamily: "var(--font-cormorant)",
                    fontStyle: "italic",
                    fontSize: "clamp(28px, 5vw, 38px)",
                    fontWeight: 300,
                    color: TEXT,
                    opacity: 0.45,
                    margin: "0 0 32px",
                    lineHeight: 1.3,
                  }}
                >
                  What do you seek to understand?
                </h1>

                <div style={{ position: "relative" }}>
                  <textarea
                    ref={inputRef}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        onSubmit();
                      }
                    }}
                    placeholder="Ask freely. The Council listens without judgment."
                    rows={4}
                    style={{
                      width: "100%",
                      background: "transparent",
                      border: "none",
                      borderBottom: "1px solid rgba(245,240,232,0.18)",
                      outline: "none",
                      resize: "none",
                      fontFamily: "var(--font-cormorant)",
                      fontSize: 22,
                      lineHeight: 1.6,
                      color: TEXT,
                      padding: "4px 0 12px",
                      boxSizing: "border-box",
                      caretColor: TEXT,
                    }}
                  />
                </div>

                {/* Quick prompts */}
                <div style={{ marginTop: 20, marginBottom: 36 }}>
                  <span
                    style={{
                      fontFamily: "var(--font-geist-sans)",
                      fontSize: 8,
                      letterSpacing: "0.14em",
                      textTransform: "uppercase",
                      color: TEXT,
                      opacity: 0.22,
                      display: "block",
                      marginBottom: 10,
                    }}
                  >
                    Or begin with
                  </span>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {QUESTION_PROMPTS.map((prompt) => (
                      <button
                        key={prompt}
                        onClick={() => setInputValue(prompt)}
                        style={{
                          background: "transparent",
                          border: "1px solid rgba(245,240,232,0.14)",
                          borderRadius: 0,
                          padding: "6px 12px",
                          fontFamily: "var(--font-cormorant)",
                          fontStyle: "italic",
                          fontSize: 14,
                          color: TEXT,
                          opacity: 0.5,
                          cursor: "pointer",
                          transition: "opacity 0.15s",
                        }}
                        onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.opacity = "0.8")}
                        onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.opacity = "0.5")}
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={onSubmit}
                  disabled={!inputValue.trim()}
                  style={{
                    border: "1px solid rgba(245,240,232,0.28)",
                    borderRadius: 0,
                    background: "transparent",
                    padding: "12px 28px",
                    fontFamily: "var(--font-geist-sans)",
                    fontSize: 10,
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    color: TEXT,
                    opacity: inputValue.trim() ? 0.7 : 0.3,
                    cursor: inputValue.trim() ? "pointer" : "default",
                    transition: "opacity 0.2s",
                  }}
                >
                  Weave this question into the Council
                </button>

                {/* The Council — who will respond */}
                <div
                  style={{
                    marginTop: 56,
                    paddingTop: 28,
                    borderTop: "1px solid rgba(245,240,232,0.06)",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-geist-sans)",
                      fontSize: 9,
                      letterSpacing: "0.22em",
                      textTransform: "uppercase",
                      color: "rgba(245,240,232,0.22)",
                      display: "block",
                      marginBottom: 20,
                    }}
                  >
                    The Council
                  </span>
                  <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                    {TRADITIONS.filter((t) => t.id !== "oracle").map((t, i) => (
                      <div
                        key={t.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 14,
                          padding: "11px 0",
                          borderBottom: "1px solid rgba(245,240,232,0.05)",
                        }}
                      >
                        <div style={{ width: 2, height: 18, background: t.hex, opacity: 0.75, flexShrink: 0 }} />
                        <span style={{ fontSize: 11, color: t.hex, opacity: 0.8, flexShrink: 0 }}>{t.symbol}</span>
                        <span
                          style={{
                            fontFamily: "var(--font-geist-sans)",
                            fontSize: 11,
                            color: "rgba(245,240,232,0.5)",
                            letterSpacing: "0.02em",
                          }}
                        >
                          {t.label}
                        </span>
                      </div>
                    ))}
                    {/* Oracle row */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 14,
                        padding: "11px 0",
                      }}
                    >
                      <div style={{ width: 2, height: 18, background: "#BFA882", opacity: 0.5, flexShrink: 0 }} />
                      <span style={{ fontSize: 11, color: "#BFA882", opacity: 0.6, flexShrink: 0 }}>◎</span>
                      <span
                        style={{
                          fontFamily: "var(--font-cormorant)",
                          fontStyle: "italic",
                          fontSize: 14,
                          color: "rgba(245,240,232,0.28)",
                          letterSpacing: "0.01em",
                        }}
                      >
                        synthesized by The Oracle
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── Reading in progress / complete ────────────────── */}
            {!isEmpty && (
              <div>
                {/* User's question — dimmed */}
                {messages.filter((m) => m.role === "user").slice(-1).map((m) => (
                  <p
                    key={m.id}
                    style={{
                      fontFamily: "var(--font-cormorant)",
                      fontStyle: "italic",
                      fontSize: 18,
                      lineHeight: 1.6,
                      color: TEXT,
                      opacity: 0.38,
                      margin: "0 0 32px",
                    }}
                  >
                    "{typeof m.content === "string" ? m.content : ""}"
                  </p>
                ))}

                <div style={{ height: 1, backgroundColor: TEXT, opacity: 0.07, width: "100%", marginBottom: 24 }} />

                {/* Expert cards */}
                <div style={{ display: "flex", flexDirection: "column", gap: 2, marginBottom: 48 }}>
                  {/* Completed expert responses */}
                  {expertResponses.map((r, i) => {
                    const tradId = EXPERT_ID_TO_TRADITION[r.expertId] ?? "western";
                    return (
                      <div
                        key={r.expertId}
                        style={{
                          animation: `fade-in-up 0.35s ease-out ${i * 80}ms both`,
                        }}
                      >
                        <ExpertCard
                          tradition={tradId as TraditionId}
                          text={r.content}
                          pending={false}
                        />
                      </div>
                    );
                  })}

                  {/* Pending traditions (while loading) */}
                  {isLoading && pendingTraditions.map((tradId) => (
                    <ExpertCard
                      key={tradId}
                      tradition={tradId}
                      pending
                    />
                  ))}

                  {/* Stream-in oracle judge verdict as expert card if it came as assistant message */}
                  {showOracleFromMessage && expertResponses.length > 0 && (
                    <ExpertCard
                      tradition="oracle"
                      text={typeof lastAssistantMessage.content === "string" ? lastAssistantMessage.content : ""}
                      pending={isLoading}
                    />
                  )}
                </div>

                {/* Oracle section — from stream data */}
                {showOracleFromStream && (
                  <OracleSection
                    content={oracleContent!}
                    onTapestryClick={() => router.push("/tapestry")}
                  />
                )}

                {/* Oracle from message if no stream data verdict */}
                {showOracleFromMessage && !showOracleFromStream && expertResponses.length === 0 && (
                  <OracleSection
                    content={typeof lastAssistantMessage.content === "string" ? lastAssistantMessage.content : ""}
                    isStreaming={isLoading}
                    onTapestryClick={() => router.push("/tapestry")}
                  />
                )}

                {/* Follow-up textarea */}
                {!isLoading && (oracleContent || lastAssistantMessage) && (
                  <div style={{ marginTop: 40 }}>
                    <form onSubmit={onSubmit}>
                      <textarea
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            onSubmit();
                          }
                        }}
                        placeholder="Continue the inquiry…"
                        rows={3}
                        style={{
                          width: "100%",
                          background: "transparent",
                          border: "none",
                          borderBottom: "1px solid rgba(245,240,232,0.14)",
                          outline: "none",
                          resize: "none",
                          fontFamily: "var(--font-cormorant)",
                          fontStyle: "italic",
                          fontSize: 18,
                          color: TEXT,
                          opacity: 0.45,
                          padding: "4px 0 10px",
                          lineHeight: 1.65,
                          boxSizing: "border-box",
                          caretColor: TEXT,
                        }}
                      />
                    </form>
                  </div>
                )}
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        </ContentColumn>
      </div>
    </div>
  );
}
