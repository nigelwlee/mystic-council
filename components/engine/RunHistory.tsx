"use client";

import { useState } from "react";
import type { RunRecord } from "@/lib/experts/types";

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

const dotStyles: Record<string, string> = {
  idle: "bg-neutral-700",
  running: "bg-yellow-400 animate-pulse",
  done: "bg-green-400",
  error: "bg-red-400",
};

export function RunHistory({ runHistory }: { runHistory: RunRecord[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border border-neutral-800/50 rounded overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-1.5 bg-neutral-900/50 text-[10px] font-mono text-neutral-600 hover:text-neutral-500 transition-colors"
      >
        <span>{open ? "v" : ">"} run history ({runHistory.length})</span>
      </button>
      {open && (
        <div className="divide-y divide-neutral-900">
          {runHistory.map((run) => (
            <div key={run.id} className="px-3 py-2 hover:bg-neutral-900/20 transition-colors">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[10px] font-mono text-neutral-700">
                  {formatTime(run.timestamp)}
                </span>
                {run.durationMs != null && (
                  <span className="text-[10px] font-mono text-neutral-700">
                    {(run.durationMs / 1000).toFixed(1)}s
                  </span>
                )}
                <div className="flex items-center gap-0.5 ml-0.5">
                  {run.expertResults.map((r) => (
                    <span
                      key={r.expertId}
                      title={`${r.expertName}: ${r.status}${r.error ? ` — ${r.error}` : ""}`}
                      className={`inline-block w-1.5 h-1.5 rounded-full ${dotStyles[r.status] ?? dotStyles.idle}`}
                    />
                  ))}
                  <span
                    title={`Oracle: ${run.judgeStatus}`}
                    className={`inline-block w-1.5 h-1.5 rounded-full ml-0.5 ${dotStyles[run.judgeStatus] ?? dotStyles.idle}`}
                  />
                </div>
              </div>
              <div className="text-[10px] font-mono text-neutral-600 truncate">
                {run.prompt || "(no prompt)"}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
