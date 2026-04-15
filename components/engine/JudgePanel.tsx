"use client";

import { useState } from "react";
import { StatusBadge, type Status } from "./StatusBadge";
import type { TokenUsage } from "@/lib/experts/types";

export interface JudgePanelState {
  model: string;
  status: Status;
  resolvedSystemPrompt: string;
  content: { summary: string; oneLiner: string } | string;
  usage?: TokenUsage;
  durationMs?: number;
}

export function JudgePanel({ state }: { state: JudgePanelState }) {
  const [showPrompt, setShowPrompt] = useState(false);

  return (
    <div className="border border-yellow-700/30 rounded bg-neutral-950 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-neutral-900/50 border-b border-neutral-800">
        <div className="flex items-center gap-2">
          <span className="text-sm text-yellow-600">&#9670;</span>
          <span className="text-xs font-mono font-medium text-neutral-300">The Oracle</span>
          <code className="text-[10px] text-neutral-600">{state.model}</code>
        </div>
        <StatusBadge status={state.status} />
      </div>

      {/* Collapsible prompt */}
      <div className="border-b border-neutral-900">
        <button
          onClick={() => setShowPrompt(!showPrompt)}
          className="w-full flex items-center justify-between px-3 py-1 text-[10px] font-mono text-neutral-600 hover:text-neutral-500 transition-colors"
        >
          <span>
            {showPrompt ? "v" : ">"} synthesizer prompt
          </span>
          {state.resolvedSystemPrompt && (
            <span className="text-neutral-700">
              {(state.resolvedSystemPrompt.length / 1024).toFixed(1)}kb
            </span>
          )}
        </button>
        {showPrompt && (
          <div className="border-t border-neutral-900">
            <pre className="text-[10px] text-neutral-600 whitespace-pre-wrap break-words leading-relaxed max-h-64 overflow-y-auto p-3">
              {state.resolvedSystemPrompt || "—"}
            </pre>
          </div>
        )}
      </div>

      {/* Output */}
      <div className="p-3">
        {state.content ? (
          <div className="text-xs font-mono text-yellow-200/70 whitespace-pre-wrap leading-relaxed">
            {typeof state.content === "string"
              ? state.content
              : JSON.stringify(state.content, null, 2)}
            {state.status === "running" && (
              <span className="inline-block w-1.5 h-3 bg-yellow-600/60 ml-0.5 animate-pulse" />
            )}
          </div>
        ) : state.status === "running" ? (
          <div className="text-xs font-mono text-neutral-700 animate-pulse">synthesizing...</div>
        ) : (
          <div className="text-xs font-mono text-neutral-800">waiting for expert readings</div>
        )}
      </div>

      {/* Footer */}
      {(state.durationMs != null || state.usage) && (
        <div className="px-3 py-1 border-t border-neutral-900 text-[10px] font-mono text-neutral-700 flex items-center gap-2">
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
