"use client";

import { useState } from "react";
import { StatusBadge } from "./StatusBadge";
import type { ExpertPanelState } from "./ExpertPanel";
import type { JudgePanelState } from "./JudgePanel";
import { getModelName, estimateCost } from "@/lib/models";
import { experts } from "@/lib/experts/registry";

export interface ModelRunState {
  modelId: string;
  experts: Map<string, ExpertPanelState>;
  judgeState: JudgePanelState;
  startTime: number;
  endTime?: number;
}

const dotStyles: Record<string, string> = {
  idle: "bg-neutral-700",
  running: "bg-yellow-400 animate-pulse",
  done: "bg-green-400",
  error: "bg-red-400",
};

function BenchmarkColumn({ run }: { run: ModelRunState }) {
  const durationMs = run.endTime ? run.endTime - run.startTime : null;

  let totalIn = 0;
  let totalOut = 0;
  for (const [, s] of run.experts) {
    if (s.usage) { totalIn += s.usage.promptTokens; totalOut += s.usage.completionTokens; }
  }
  if (run.judgeState.usage) {
    totalIn += run.judgeState.usage.promptTokens;
    totalOut += run.judgeState.usage.completionTokens;
  }
  const cost = estimateCost(totalIn, totalOut, run.modelId);

  // Overall status: running if any expert/judge is running, error if any errored, done if all done
  const statuses = [...Array.from(run.experts.values()).map((e) => e.status), run.judgeState.status];
  const overallStatus = statuses.some((s) => s === "running")
    ? "running"
    : statuses.some((s) => s === "error")
    ? "error"
    : statuses.every((s) => s === "done")
    ? "done"
    : "idle";

  const orderedExperts = experts
    .map((e) => run.experts.get(e.id))
    .filter(Boolean) as ExpertPanelState[];

  return (
    <div className="border border-neutral-800 rounded bg-neutral-950 flex flex-col min-w-[300px] max-w-[340px] flex-shrink-0">
      {/* Header */}
      <div className="px-3 py-2 bg-neutral-900/50 border-b border-neutral-800 space-y-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-mono font-medium text-neutral-300 truncate">
            {getModelName(run.modelId)}
          </span>
          <StatusBadge status={overallStatus} />
        </div>
        <div className="flex items-center gap-3 text-[10px] font-mono text-neutral-600">
          {durationMs != null && <span>{(durationMs / 1000).toFixed(1)}s</span>}
          {(totalIn + totalOut) > 0 && <span>{(totalIn + totalOut).toLocaleString()} tok</span>}
          {cost > 0 && <span>${cost.toFixed(4)}</span>}
        </div>
      </div>

      {/* Experts */}
      <div className="border-b border-neutral-900 px-3 py-1.5 space-y-1">
        {orderedExperts.map((s) => (
          <div key={s.expertId} className="flex items-center gap-2 text-[10px] font-mono">
            <span>{s.expertEmoji}</span>
            <span className="text-neutral-600 flex-1 truncate">{s.expertName}</span>
            <span className={`w-1.5 h-1.5 rounded-full inline-block ${dotStyles[s.status] ?? dotStyles.idle}`} />
            {s.durationMs != null && (
              <span className="text-neutral-700">{(s.durationMs / 1000).toFixed(1)}s</span>
            )}
            {s.usage && (
              <span className="text-neutral-800">{s.usage.totalTokens}tok</span>
            )}
          </div>
        ))}
      </div>

      {/* Judge output */}
      <div className="flex-1 p-3 overflow-y-auto max-h-[400px]">
        <div className="text-[10px] font-mono text-neutral-700 mb-1.5 flex items-center gap-2">
          <span>◈ oracle</span>
          <span className={`w-1.5 h-1.5 rounded-full inline-block ${dotStyles[run.judgeState.status] ?? dotStyles.idle}`} />
          {run.judgeState.durationMs != null && (
            <span className="text-neutral-800">{(run.judgeState.durationMs / 1000).toFixed(1)}s</span>
          )}
          {run.judgeState.usage && (
            <span className="text-neutral-800">{run.judgeState.usage.totalTokens}tok</span>
          )}
        </div>
        {run.judgeState.content ? (
          <div className="text-xs font-mono text-yellow-200/70 whitespace-pre-wrap leading-relaxed">
            {run.judgeState.content}
            {run.judgeState.status === "running" && (
              <span className="inline-block w-1.5 h-3 bg-yellow-600/60 ml-0.5 animate-pulse" />
            )}
          </div>
        ) : run.judgeState.status === "running" ? (
          <div className="text-[10px] font-mono text-neutral-700 animate-pulse">synthesizing...</div>
        ) : (
          <div className="text-[10px] font-mono text-neutral-800">waiting...</div>
        )}
      </div>
    </div>
  );
}

function serializeBenchmarkState(runs: Map<string, ModelRunState>, prompt: string): string {
  const lines: string[] = [];
  lines.push("## Benchmark Results" + (prompt ? ` — "${prompt}"` : ""));
  lines.push("");

  // Per-model sections
  for (const run of runs.values()) {
    const durationMs = run.endTime ? run.endTime - run.startTime : null;
    let totalIn = 0, totalOut = 0;
    for (const [, s] of run.experts) {
      if (s.usage) { totalIn += s.usage.promptTokens; totalOut += s.usage.completionTokens; }
    }
    if (run.judgeState.usage) {
      totalIn += run.judgeState.usage.promptTokens;
      totalOut += run.judgeState.usage.completionTokens;
    }
    const cost = estimateCost(totalIn, totalOut, run.modelId);
    const statuses = [...Array.from(run.experts.values()).map((e) => e.status), run.judgeState.status];
    const overallStatus = statuses.some((s) => s === "running") ? "running"
      : statuses.some((s) => s === "error") ? "error"
      : statuses.every((s) => s === "done") ? "done" : "idle";

    lines.push(`### ${getModelName(run.modelId)}`);
    lines.push(`- Status: ${overallStatus} | ${durationMs != null ? `${(durationMs / 1000).toFixed(1)}s` : "—"} | ${(totalIn + totalOut).toLocaleString()} tok | $${cost.toFixed(4)}`);
    lines.push("- Experts:");
    const orderedExperts = experts.map((e) => run.experts.get(e.id)).filter(Boolean) as ExpertPanelState[];
    for (const s of orderedExperts) {
      const dur = s.durationMs != null ? `${(s.durationMs / 1000).toFixed(1)}s` : "—";
      const tok = s.usage ? `${s.usage.totalTokens} tok` : "—";
      lines.push(`  - ${s.expertEmoji} ${s.expertName}: ${s.status} | ${dur} | ${tok}${s.error ? ` | ERROR: ${s.error}` : ""}`);
    }
    lines.push("- Judge Output:");
    lines.push(run.judgeState.content ? run.judgeState.content : "(none)");
    lines.push("");
  }

  // Comparison table
  lines.push("### Comparison");
  lines.push("| Model | Status | Time | Tokens | Cost |");
  lines.push("|-------|--------|------|--------|------|");
  for (const run of runs.values()) {
    const durationMs = run.endTime ? run.endTime - run.startTime : null;
    let totalIn = 0, totalOut = 0;
    for (const [, s] of run.experts) {
      if (s.usage) { totalIn += s.usage.promptTokens; totalOut += s.usage.completionTokens; }
    }
    if (run.judgeState.usage) {
      totalIn += run.judgeState.usage.promptTokens;
      totalOut += run.judgeState.usage.completionTokens;
    }
    const cost = estimateCost(totalIn, totalOut, run.modelId);
    const statuses = [...Array.from(run.experts.values()).map((e) => e.status), run.judgeState.status];
    const overallStatus = statuses.some((s) => s === "running") ? "running"
      : statuses.some((s) => s === "error") ? "error"
      : statuses.every((s) => s === "done") ? "done" : "idle";
    lines.push(`| ${getModelName(run.modelId)} | ${overallStatus} | ${durationMs != null ? `${(durationMs / 1000).toFixed(1)}s` : "—"} | ${(totalIn + totalOut).toLocaleString()} | $${cost.toFixed(4)} |`);
  }

  return lines.join("\n");
}

export function BenchmarkResults({ runs, lastPrompt }: { runs: Map<string, ModelRunState>; lastPrompt?: string }) {
  const [copied, setCopied] = useState(false);
  if (runs.size === 0) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(serializeBenchmarkState(runs, lastPrompt ?? ""));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard unavailable
    }
  };

  return (
    <>
      <div className="flex items-center justify-between mb-2">
        <div className="text-[10px] font-mono uppercase tracking-widest text-neutral-700">
          {lastPrompt && <span className="normal-case text-neutral-600">"{lastPrompt}"</span>}
        </div>
        <button
          onClick={handleCopy}
          className="text-[10px] font-mono text-neutral-700 hover:text-neutral-400 transition-colors"
        >
          {copied ? "copied!" : "copy state"}
        </button>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {Array.from(runs.values()).map((run) => (
          <BenchmarkColumn key={run.modelId} run={run} />
        ))}
      </div>
    </>
  );
}
