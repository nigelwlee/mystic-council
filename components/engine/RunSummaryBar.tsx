"use client";

import { useState, useEffect } from "react";
import type { ExpertPanelState } from "./ExpertPanel";
import type { JudgePanelState } from "./JudgePanel";
import type { BirthData } from "@/lib/experts/types";

interface RunSummaryBarProps {
  lastPrompt: string;
  expertStates: Map<string, ExpertPanelState>;
  judgeState: JudgePanelState;
  totalDurationMs: number | null;
  isLoading: boolean;
  runStartTime: number | null;
  birthData: BirthData;
}

function serializeState(props: RunSummaryBarProps): string {
  const lines: string[] = [];
  lines.push("## Engine Dashboard State");
  lines.push("");

  const bd = props.birthData;
  lines.push("### Birth Data");
  lines.push(`- Name: ${bd.name ?? "—"}`);
  lines.push(`- Date: ${bd.date ?? "—"}`);
  lines.push(`- Time: ${bd.time ?? "—"}`);
  lines.push(`- Location: ${bd.location ?? "—"}`);
  lines.push("");

  lines.push("### Prompt");
  lines.push(props.lastPrompt || "(none)");
  lines.push("");

  lines.push("### Timing");
  if (props.totalDurationMs != null) {
    lines.push(`- Total: ${(props.totalDurationMs / 1000).toFixed(1)}s`);
  } else if (props.isLoading) {
    lines.push("- Status: running...");
  } else {
    lines.push("- Status: idle");
  }
  lines.push("");

  let totalPromptTokens = 0;
  let totalCompletionTokens = 0;

  lines.push("### Experts");
  for (const [, s] of props.expertStates) {
    const dur = s.durationMs != null ? `${(s.durationMs / 1000).toFixed(1)}s` : "—";
    const contentStr = typeof s.content === "string" ? s.content : JSON.stringify(s.content);
    const contentLen = contentStr ? `${contentStr.length} chars` : "empty";
    const tok = s.usage ? `${s.usage.promptTokens}in/${s.usage.completionTokens}out` : "—";
    lines.push(`- ${s.expertEmoji} ${s.expertName}: ${s.status} | ${s.model} | ${dur} | ${contentLen} | ${tok}`);
    if (s.error) lines.push(`  ERROR: ${s.error}`);
    if (s.usage) {
      totalPromptTokens += s.usage.promptTokens;
      totalCompletionTokens += s.usage.completionTokens;
    }
  }
  lines.push("");

  lines.push("### Judge (Oracle)");
  const js = props.judgeState;
  const judgeTok = js.usage ? `${js.usage.promptTokens}in/${js.usage.completionTokens}out` : "—";
  const judgeDur = js.durationMs != null ? `${(js.durationMs / 1000).toFixed(1)}s` : "—";
  const judgeContentStr = js.content
    ? (typeof js.content === "string" ? js.content : JSON.stringify(js.content))
    : "";
  lines.push(`- Status: ${js.status} | Model: ${js.model || "—"} | ${judgeDur} | Content: ${judgeContentStr ? `${judgeContentStr.length} chars` : "empty"} | ${judgeTok}`);
  if (js.usage) {
    totalPromptTokens += js.usage.promptTokens;
    totalCompletionTokens += js.usage.completionTokens;
  }
  lines.push("");

  lines.push("### Token Totals");
  lines.push(`- Input: ${totalPromptTokens} tokens`);
  lines.push(`- Output: ${totalCompletionTokens} tokens`);
  lines.push(`- Total: ${totalPromptTokens + totalCompletionTokens} tokens`);

  const errors = Array.from(props.expertStates.values()).filter((s) => s.error);
  if (errors.length > 0) {
    lines.push("");
    lines.push("### Errors");
    for (const e of errors) {
      lines.push(`- ${e.expertName}: ${e.error}`);
    }
  }

  return lines.join("\n");
}

export function RunSummaryBar(props: RunSummaryBarProps) {
  const { lastPrompt, expertStates, isLoading, runStartTime, totalDurationMs } = props;
  const [copied, setCopied] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [showFullPrompt, setShowFullPrompt] = useState(false);

  useEffect(() => {
    if (!isLoading || !runStartTime) {
      setElapsed(0);
      return;
    }
    const interval = setInterval(() => {
      setElapsed(Date.now() - runStartTime);
    }, 100);
    return () => clearInterval(interval);
  }, [isLoading, runStartTime]);

  const errors = Array.from(expertStates.values()).filter((s) => s.status === "error");

  // Compute total tokens across all experts + judge
  let totalTokens = 0;
  for (const [, s] of expertStates) {
    if (s.usage) totalTokens += s.usage.totalTokens;
  }
  if (props.judgeState.usage) totalTokens += props.judgeState.usage.totalTokens;

  const needsTruncation = lastPrompt.length > 200;
  const displayPrompt = showFullPrompt || !needsTruncation ? lastPrompt : lastPrompt.slice(0, 200) + "…";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(serializeState(props));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard unavailable
    }
  };

  return (
    <div className="border-b border-neutral-800/50 px-3 py-2 space-y-1.5">
      {/* Last prompt */}
      {lastPrompt && (
        <div className="flex items-start gap-1.5">
          <span className="text-[10px] font-mono text-neutral-700 mt-0.5 shrink-0">›</span>
          <div className="flex-1 min-w-0">
            <span className="text-[11px] font-mono text-neutral-500 break-words leading-relaxed">
              {displayPrompt}
            </span>
            {needsTruncation && (
              <button
                onClick={() => setShowFullPrompt(!showFullPrompt)}
                className="ml-1 text-[10px] font-mono text-neutral-700 hover:text-neutral-500 transition-colors"
              >
                {showFullPrompt ? "less" : "more"}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Status row */}
      <div className="flex items-center gap-3 flex-wrap">
        {errors.length > 0 && (
          <span className="text-[10px] font-mono text-red-400">
            ✕ {errors.length} failed: {errors.map((e) => e.expertName).join(", ")}
          </span>
        )}

        {(isLoading && runStartTime) || totalDurationMs != null ? (
          <span className="text-[10px] font-mono text-neutral-700">
            {isLoading && runStartTime
              ? `${(elapsed / 1000).toFixed(1)}s…`
              : `${(totalDurationMs! / 1000).toFixed(1)}s`}
          </span>
        ) : null}

        {totalTokens > 0 && (
          <span className="text-[10px] font-mono text-neutral-700">
            {totalTokens.toLocaleString()} tok
          </span>
        )}

        <div className="flex-1" />

        <button
          onClick={handleCopy}
          className="text-[10px] font-mono text-neutral-700 hover:text-neutral-400 transition-colors"
        >
          {copied ? "copied!" : "copy state"}
        </button>
      </div>
    </div>
  );
}
