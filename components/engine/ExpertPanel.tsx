"use client";

import { useState } from "react";
import { StatusBadge, type Status } from "./StatusBadge";
import type { StructuredExpertContent, ToolCallRecord, TokenUsage } from "@/lib/experts/types";

export interface ExpertPanelState {
  expertId: string;
  expertName: string;
  expertEmoji: string;
  expertTitle: string;
  color: string;
  model: string;
  status: Status;
  resolvedSystemPrompt: string;
  content: StructuredExpertContent | string;
  toolCalls: ToolCallRecord[];
  usage?: TokenUsage;
  error?: string;
  durationMs?: number;
}

export function ExpertPanel({ state }: { state: ExpertPanelState }) {
  const [showPrompt, setShowPrompt] = useState(false);
  const [showTools, setShowTools] = useState(false);

  return (
    <div
      className="border rounded bg-neutral-950 overflow-hidden flex flex-col"
      style={{ borderColor: state.color + "40" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-2.5 py-1.5 bg-neutral-900/50 border-b border-neutral-800">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-sm">{state.expertEmoji}</span>
          <span className="text-xs font-mono font-medium text-neutral-300 truncate">
            {state.expertName}
          </span>
        </div>
        <StatusBadge status={state.status} />
      </div>

      {/* Model */}
      <div className="px-2.5 py-1 border-b border-neutral-900">
        <code className="text-[10px] text-neutral-600 break-all">{state.model}</code>
      </div>

      {/* Collapsible sections */}
      <div className="flex-1 overflow-y-auto">
        {/* System prompt */}
        <Collapsible
          label="system prompt"
          open={showPrompt}
          onToggle={() => setShowPrompt(!showPrompt)}
          count={state.resolvedSystemPrompt ? `${(state.resolvedSystemPrompt.length / 1024).toFixed(1)}kb` : undefined}
        >
          <pre className="text-[10px] text-neutral-600 whitespace-pre-wrap break-words leading-relaxed max-h-48 overflow-y-auto p-2">
            {state.resolvedSystemPrompt || "—"}
          </pre>
        </Collapsible>

        {/* Tool calls */}
        {state.toolCalls.length > 0 && (
          <Collapsible
            label="tool calls"
            open={showTools}
            onToggle={() => setShowTools(!showTools)}
            count={String(state.toolCalls.length)}
          >
            <div className="space-y-1 p-2">
              {state.toolCalls.map((tc, i) => (
                <div key={i} className="border border-neutral-800 rounded p-1.5">
                  <div className="text-[10px] font-mono text-emerald-500">{tc.toolName}</div>
                  <pre className="text-[10px] text-neutral-600 whitespace-pre-wrap break-words mt-0.5">
                    {JSON.stringify(tc.args, null, 2)}
                  </pre>
                  {tc.result != null && (
                    <pre className="text-[10px] text-neutral-500 whitespace-pre-wrap break-words mt-1 pt-1 border-t border-neutral-800">
                      {typeof tc.result === "string" ? tc.result : JSON.stringify(tc.result, null, 2)}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          </Collapsible>
        )}

        {/* Output */}
        <div className="p-2.5">
          {state.error ? (
            <div className="text-xs font-mono text-red-400">{state.error}</div>
          ) : state.content ? (
            <div className="text-xs font-mono text-neutral-400 whitespace-pre-wrap leading-relaxed">
              {typeof state.content === "string"
                ? state.content
                : JSON.stringify(state.content, null, 2)}
            </div>
          ) : state.status === "running" ? (
            <div className="text-xs font-mono text-neutral-700 animate-pulse">generating...</div>
          ) : (
            <div className="text-xs font-mono text-neutral-800">idle</div>
          )}
        </div>
      </div>

      {/* Footer */}
      {(state.durationMs != null || state.usage) && (
        <div className="px-2.5 py-1 border-t border-neutral-900 text-[10px] font-mono text-neutral-700 flex items-center gap-2 flex-wrap">
          {state.durationMs != null && <span>{(state.durationMs / 1000).toFixed(1)}s</span>}
          {state.usage && (
            <span className="text-neutral-800">
              {state.usage.promptTokens}in · {state.usage.completionTokens}out · {state.usage.totalTokens}tok
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function Collapsible({
  label,
  open,
  onToggle,
  count,
  children,
}: {
  label: string;
  open: boolean;
  onToggle: () => void;
  count?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-neutral-900">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-2.5 py-1 text-[10px] font-mono text-neutral-600 hover:text-neutral-500 transition-colors"
      >
        <span>
          {open ? "v" : ">"} {label}
        </span>
        {count && <span className="text-neutral-700">{count}</span>}
      </button>
      {open && <div className="border-t border-neutral-900">{children}</div>}
    </div>
  );
}
