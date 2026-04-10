"use client";

import { useEffect, useRef, useState } from "react";
import { useChat } from "ai/react";
import { useBirthData } from "@/lib/context/birth-data-context";
import { ExpertResponseCard } from "@/components/chat/ExpertResponse";
import { JudgeVerdict } from "@/components/chat/JudgeVerdict";
import { TypingIndicator } from "@/components/chat/TypingIndicator";
import { ExpertSelector } from "@/components/chat/ExpertSelector";
import { QuickPrompts } from "@/components/chat/QuickPrompts";
import type { CouncilStreamData, JudgeVerdictData, ExpertResponse } from "@/lib/experts/types";
import type { JSONValue } from "ai";
import Link from "next/link";

export default function ChatPage() {
  const { birthData } = useBirthData();
  const [selectedExperts, setSelectedExperts] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const { messages, isLoading, data, handleSubmit, setInput } = useChat({
    api: "/api/chat",
    body: { birthData, selectedExperts },
  });

  // Extract expert responses from data stream
  const [expertResponses, setExpertResponses] = useState<ExpertResponse[]>([]);
  const [mockJudgeVerdict, setMockJudgeVerdict] = useState<string | null>(null);

  useEffect(() => {
    if (!data) return;
    for (const item of data as JSONValue[]) {
      const d = item as unknown as CouncilStreamData | JudgeVerdictData;
      if (!d || typeof d !== "object" || !("type" in d)) continue;
      if (d.type === "expert-responses") {
        // Merge incoming responses — server streams one expert at a time
        setExpertResponses((prev) => {
          const updated = [...prev];
          for (const incoming of (d as CouncilStreamData).responses) {
            const idx = updated.findIndex((r) => r.expertId === incoming.expertId);
            if (idx >= 0) updated[idx] = incoming;
            else updated.push(incoming);
          }
          return updated;
        });
      } else if (d.type === "judge-verdict") {
        setMockJudgeVerdict((d as JudgeVerdictData).content);
      }
    }
  }, [data]);

  // Clear state when a new request starts
  useEffect(() => {
    if (isLoading) {
      setExpertResponses([]);
      setMockJudgeVerdict(null);
    }
  }, [isLoading]);

  // Auto scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, expertResponses, isLoading]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    setInput(inputValue);
    setTimeout(() => {
      handleSubmit(e);
      setInputValue("");
    }, 0);
  };

  const lastAssistantMessage = messages.filter((m) => m.role === "assistant").at(-1);
  const isWaitingForExperts = isLoading && expertResponses.length === 0;
  // Mock mode: show verdict from data stream when no real assistant message arrived
  const showMockVerdict = !isLoading && mockJudgeVerdict && !lastAssistantMessage;

  return (
    <div className="flex flex-col h-[100dvh] bg-neutral-950">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-neutral-900">
        <Link href="/" className="text-xs text-neutral-600 hover:text-neutral-500 transition-colors">
          ← back
        </Link>
        <span className="text-xs text-neutral-500 tracking-widest uppercase">Mystic Council</span>
        {birthData?.name ? (
          <span className="text-xs text-neutral-700">{birthData.name}</span>
        ) : (
          <span className="w-8" />
        )}
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
        {messages.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center h-full gap-3 py-16">
            <div className="text-2xl opacity-30">◈</div>
            <p className="text-xs text-neutral-600 text-center max-w-xs">
              Ask the council anything — about your path, your year, a decision, or a situation.
            </p>
          </div>
        )}

        {messages.map((message) => {
          if (message.role === "user") {
            return (
              <div key={message.id} className="flex justify-end">
                <p className="text-sm text-neutral-200 bg-neutral-900 rounded-lg px-3 py-2 max-w-[80%]">
                  {typeof message.content === "string" ? message.content : ""}
                </p>
              </div>
            );
          }

          // Assistant = judge verdict
          const content = typeof message.content === "string" ? message.content : "";
          const isLatest = message.id === lastAssistantMessage?.id;

          return (
            <div key={message.id} className="space-y-4">
              {/* Show expert responses alongside the latest judge verdict */}
              {isLatest && expertResponses.length > 0 && (
                <div className="space-y-4">
                  {expertResponses.map((r) => (
                    <ExpertResponseCard key={r.expertId} response={r} />
                  ))}
                </div>
              )}

              {content && (
                <JudgeVerdict
                  content={content}
                  isStreaming={isLatest && isLoading}
                />
              )}
            </div>
          );
        })}

        {/* Mock mode: show expert cards + verdict from data stream */}
        {showMockVerdict && (
          <div className="space-y-4">
            {expertResponses.map((r) => (
              <ExpertResponseCard key={r.expertId} response={r} />
            ))}
            <JudgeVerdict content={mockJudgeVerdict!} isStreaming={false} />
          </div>
        )}

        {/* Loading: waiting for experts */}
        {isWaitingForExperts && (
          <TypingIndicator selectedExpertIds={selectedExperts} />
        )}

        {/* Loading: experts arriving, judge not yet streaming */}
        {isLoading && expertResponses.length > 0 && messages.filter((m) => m.role === "assistant").length === 0 && (
          <div className="space-y-4">
            {expertResponses.map((r) => (
              <ExpertResponseCard key={r.expertId} response={r} />
            ))}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-neutral-900 pb-[env(safe-area-inset-bottom)]">
        <div className="px-4 pt-2 pb-1">
          <ExpertSelector selected={selectedExperts} onChange={setSelectedExperts} />
        </div>

        {messages.length === 0 && (
          <div className="px-4 pb-2">
            <QuickPrompts onSelect={(p) => setInputValue(p)} />
          </div>
        )}

        <form onSubmit={onSubmit} className="flex items-end gap-2 px-4 pt-1 pb-3">
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onSubmit(e as unknown as React.FormEvent);
              }
            }}
            placeholder="Ask the council…"
            rows={1}
            disabled={isLoading}
            className="flex-1 resize-none bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:border-neutral-700 disabled:opacity-40 leading-snug max-h-32 overflow-y-auto"
            style={{ fontSize: "16px" }}
          />
          <button
            type="submit"
            disabled={isLoading || !inputValue.trim()}
            className="shrink-0 text-neutral-500 hover:text-neutral-300 disabled:text-neutral-800 disabled:cursor-not-allowed transition-colors pb-2 text-lg"
          >
            ↑
          </button>
        </form>
      </div>
    </div>
  );
}
