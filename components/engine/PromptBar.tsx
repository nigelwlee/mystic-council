"use client";

import { experts } from "@/lib/experts/registry";
import { ModelSelector } from "./ModelSelector";
import type { Status } from "@/components/engine/StatusBadge";

export function PromptBar({
  value,
  onChange,
  onSubmit,
  selectedExperts,
  onToggleExpert,
  disabled,
  expertLastStatus,
  benchmarkMode,
  onToggleBenchmark,
  benchmarkModels,
  onBenchmarkModelsChange,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  selectedExperts: string[];
  onToggleExpert: (id: string) => void;
  disabled: boolean;
  expertLastStatus?: Map<string, Status>;
  benchmarkMode: boolean;
  onToggleBenchmark: () => void;
  benchmarkModels: string[];
  onBenchmarkModelsChange: (ids: string[]) => void;
}) {
  const allSelected = selectedExperts.length === 0 || selectedExperts.length === experts.length;

  const toggleAll = () => {
    if (allSelected) return;
    for (const e of experts) onToggleExpert(e.id);
  };

  return (
    <div className="border-b border-neutral-800 p-3 space-y-2">
      {/* Input row */}
      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && value.trim()) {
              e.preventDefault();
              onSubmit();
            }
          }}
          placeholder="Ask the council..."
          disabled={disabled}
          className="flex-1 bg-neutral-900 border border-neutral-800 rounded px-3 py-1.5 text-sm font-mono text-neutral-200 placeholder:text-neutral-700 focus:outline-none focus:border-neutral-700 disabled:opacity-40"
          style={{ fontSize: "14px" }}
        />
        <button
          onClick={onSubmit}
          disabled={disabled || !value.trim()}
          className="px-3 py-1.5 bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-neutral-200 rounded text-xs font-mono disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          run
        </button>
        <button
          onClick={onToggleBenchmark}
          disabled={disabled}
          className={`px-3 py-1.5 rounded text-xs font-mono transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
            benchmarkMode
              ? "bg-indigo-900/60 text-indigo-300 border border-indigo-700/50"
              : "bg-neutral-900 text-neutral-600 hover:text-neutral-400 border border-neutral-800"
          }`}
        >
          bench
        </button>
      </div>

      {/* Expert selector */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[10px] font-mono text-neutral-600 mr-1">experts:</span>
        <button
          onClick={toggleAll}
          className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors ${
            allSelected
              ? "bg-neutral-700 text-neutral-300"
              : "bg-neutral-900 text-neutral-600 hover:text-neutral-400"
          }`}
        >
          all
        </button>
        {experts.map((e) => {
          const active = selectedExperts.length === 0 || selectedExperts.includes(e.id);
          const lastStatus = expertLastStatus?.get(e.id);
          const dotColor =
            lastStatus === "done" ? "bg-green-400" :
            lastStatus === "error" ? "bg-red-400" :
            lastStatus === "running" ? "bg-yellow-400 animate-pulse" : null;
          return (
            <button
              key={e.id}
              onClick={() => onToggleExpert(e.id)}
              className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors inline-flex items-center gap-1 ${
                active
                  ? "bg-neutral-800 text-neutral-300"
                  : "bg-neutral-900/50 text-neutral-700 hover:text-neutral-500"
              }`}
            >
              {e.emoji} {e.name}
              {dotColor && (
                <span className={`inline-block w-1 h-1 rounded-full ${dotColor}`} />
              )}
            </button>
          );
        })}
      </div>

      {/* Benchmark model selector */}
      {benchmarkMode && (
        <div className="space-y-1">
          <span className="text-[10px] font-mono text-neutral-600">compare models:</span>
          <ModelSelector selected={benchmarkModels} onChange={onBenchmarkModelsChange} />
          {benchmarkModels.length < 2 && (
            <span className="text-[10px] font-mono text-neutral-700">select at least 2 models</span>
          )}
        </div>
      )}
    </div>
  );
}
