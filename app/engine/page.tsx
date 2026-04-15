"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useChat } from "ai/react";
import { notFound } from "next/navigation";
import { useBirthData } from "@/lib/context/birth-data-context";
import { experts } from "@/lib/experts/registry";
import { BaseDataPanel } from "@/components/engine/BaseDataPanel";
import { PromptBar } from "@/components/engine/PromptBar";
import { ExpertPanel, type ExpertPanelState } from "@/components/engine/ExpertPanel";
import { JudgePanel, type JudgePanelState } from "@/components/engine/JudgePanel";
import { RunSummaryBar } from "@/components/engine/RunSummaryBar";
import { RunHistory } from "@/components/engine/RunHistory";
import { BenchmarkResults, type ModelRunState } from "@/components/engine/BenchmarkResults";
import type {
  ExpertStartEvent,
  ExpertCompleteEvent,
  JudgeStartEvent,
  JudgeCompleteEvent,
  JudgeVerdictEvent,
  RunRecord,
} from "@/lib/experts/types";
import type { Status } from "@/components/engine/StatusBadge";
import type { JSONValue } from "ai";

function makeIdleExpert(e: (typeof experts)[number]): ExpertPanelState {
  return {
    expertId: e.id,
    expertName: e.name,
    expertEmoji: e.emoji,
    expertTitle: e.title,
    color: e.color,
    model: e.model,
    status: "idle",
    resolvedSystemPrompt: "",
    content: "",
    toolCalls: [],
  };
}

function makeIdleExpertWithModel(e: (typeof experts)[number], modelId: string): ExpertPanelState {
  return { ...makeIdleExpert(e), model: modelId };
}

export default function EngineDashboard() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  const { birthData } = useBirthData();
  const [selectedExperts, setSelectedExperts] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [expertStates, setExpertStates] = useState<Map<string, ExpertPanelState>>(new Map());
  const [judgeState, setJudgeState] = useState<JudgePanelState>({
    model: "",
    status: "idle",
    resolvedSystemPrompt: "",
    content: "",
  });
  const [lastPrompt, setLastPrompt] = useState("");
  const [runStartTime, setRunStartTime] = useState<number | null>(null);
  const [runEndTime, setRunEndTime] = useState<number | null>(null);
  const [runHistory, setRunHistory] = useState<RunRecord[]>([]);

  // Benchmark mode
  const [benchmarkMode, setBenchmarkMode] = useState(false);
  const [benchmarkModels, setBenchmarkModels] = useState<string[]>([
    "qwen/qwen3.6-plus",
    "qwen/qwen3.5-flash-02-23",
  ]);
  const [benchmarkRuns, setBenchmarkRuns] = useState<Map<string, ModelRunState>>(new Map());

  const prevDataLenRef = useRef(0);
  const prevIsLoadingRef = useRef(false);
  const runIdRef = useRef(0);
  const expertStatesRef = useRef(expertStates);
  const judgeStateRef = useRef(judgeState);
  const lastPromptRef = useRef(lastPrompt);
  const runStartTimeRef = useRef(runStartTime);

  useEffect(() => { expertStatesRef.current = expertStates; }, [expertStates]);
  useEffect(() => { judgeStateRef.current = judgeState; }, [judgeState]);
  useEffect(() => { lastPromptRef.current = lastPrompt; }, [lastPrompt]);
  useEffect(() => { runStartTimeRef.current = runStartTime; }, [runStartTime]);

  const { messages, isLoading, data, append } = useChat({
    api: "/api/chat",
    body: benchmarkMode
      ? { birthData, selectedExperts, benchmarkModels }
      : { birthData, selectedExperts },
  });

  const toggleExpert = useCallback((id: string) => {
    setSelectedExperts((prev) => {
      if (prev.length === 0) return experts.filter((e) => e.id !== id).map((e) => e.id);
      if (prev.includes(id)) {
        const next = prev.filter((x) => x !== id);
        return next.length === 0 ? [] : next;
      }
      const next = [...prev, id];
      return next.length === experts.length ? [] : next;
    });
  }, []);

  // Initialize panels when loading starts
  useEffect(() => {
    if (isLoading) {
      const active =
        selectedExperts.length === 0
          ? experts
          : experts.filter((e) => selectedExperts.includes(e.id));

      if (benchmarkMode && benchmarkModels.length >= 2) {
        // Initialize one run per model
        const initial = new Map<string, ModelRunState>();
        for (const modelId of benchmarkModels) {
          const expertMap = new Map<string, ExpertPanelState>();
          for (const e of active) expertMap.set(e.id, makeIdleExpertWithModel(e, modelId));
          initial.set(modelId, {
            modelId,
            experts: expertMap,
            judgeState: { model: modelId, status: "idle", resolvedSystemPrompt: "", content: "" },
            startTime: Date.now(),
          });
        }
        setBenchmarkRuns(initial);
      } else {
        // Normal mode
        const initial = new Map<string, ExpertPanelState>();
        for (const e of active) initial.set(e.id, makeIdleExpert(e));
        setExpertStates(initial);
        setJudgeState({ model: "", status: "idle", resolvedSystemPrompt: "", content: "" });
      }
      prevDataLenRef.current = 0;
    }
  }, [isLoading, selectedExperts, benchmarkMode, benchmarkModels]);

  // Detect isLoading true→false: stamp end time + record run history
  useEffect(() => {
    if (prevIsLoadingRef.current && !isLoading) {
      const start = runStartTimeRef.current;
      if (start && !benchmarkMode) {
        const endTime = Date.now();
        setRunEndTime(endTime);
        const duration = endTime - start;
        runIdRef.current += 1;
        const id = runIdRef.current;
        const states = expertStatesRef.current;
        const judge = judgeStateRef.current;
        const prompt = lastPromptRef.current;
        setRunHistory((prev) => [
          {
            id,
            prompt,
            timestamp: start,
            durationMs: duration,
            expertResults: Array.from(states.values()).map((s) => ({
              expertId: s.expertId,
              expertName: s.expertName,
              expertEmoji: s.expertEmoji,
              status: s.status,
              error: s.error,
            })),
            judgeStatus: judge.status,
          },
          ...prev,
        ]);
      }
      if (benchmarkMode) {
        // Stamp end times for all runs
        const endTime = Date.now();
        setBenchmarkRuns((prev) => {
          const next = new Map(prev);
          for (const [id, run] of next) {
            next.set(id, { ...run, endTime: run.endTime ?? endTime });
          }
          return next;
        });
      }
    }
    prevIsLoadingRef.current = isLoading;
  }, [isLoading, benchmarkMode]);

  // Process stream data events
  useEffect(() => {
    if (!data) return;
    const items = data as JSONValue[];
    const start = prevDataLenRef.current;
    if (items.length <= start) return;
    prevDataLenRef.current = items.length;

    for (let i = start; i < items.length; i++) {
      const d = items[i] as Record<string, unknown>;
      if (!d || typeof d !== "object" || !("type" in d)) continue;

      const modelRunId = d.modelRunId as string | undefined;

      if (d.type === "expert-start") {
        const e = d as unknown as ExpertStartEvent;
        const update = (prev: Map<string, ExpertPanelState>) => {
          const next = new Map(prev);
          const existing = next.get(e.expertId);
          next.set(e.expertId, {
            ...(existing ?? makeIdleExpert(experts.find((x) => x.id === e.expertId)!)),
            status: "running",
            model: e.model,
            resolvedSystemPrompt: e.resolvedSystemPrompt,
          });
          return next;
        };
        if (modelRunId) {
          setBenchmarkRuns((prev) => {
            const next = new Map(prev);
            const run = next.get(modelRunId);
            if (run) next.set(modelRunId, { ...run, experts: update(run.experts) });
            return next;
          });
        } else {
          setExpertStates(update);
        }
      } else if (d.type === "expert-complete") {
        const e = d as unknown as ExpertCompleteEvent;
        const update = (prev: Map<string, ExpertPanelState>) => {
          const next = new Map(prev);
          const existing = next.get(e.expertId);
          next.set(e.expertId, {
            ...(existing ?? makeIdleExpert(experts.find((x) => x.id === e.expertId)!)),
            status: e.error ? "error" : "done",
            model: e.model,
            resolvedSystemPrompt: e.resolvedSystemPrompt,
            content: e.content,
            toolCalls: e.toolCalls ?? [],
            usage: e.usage,
            error: e.error,
            durationMs: e.durationMs,
          });
          return next;
        };
        if (modelRunId) {
          setBenchmarkRuns((prev) => {
            const next = new Map(prev);
            const run = next.get(modelRunId);
            if (run) next.set(modelRunId, { ...run, experts: update(run.experts) });
            return next;
          });
        } else {
          setExpertStates(update);
        }
      } else if (d.type === "judge-start") {
        const j = d as unknown as JudgeStartEvent;
        if (modelRunId) {
          setBenchmarkRuns((prev) => {
            const next = new Map(prev);
            const run = next.get(modelRunId);
            if (run) {
              next.set(modelRunId, {
                ...run,
                judgeState: { ...run.judgeState, model: j.model, status: "running", resolvedSystemPrompt: j.resolvedSystemPrompt },
              });
            }
            return next;
          });
        } else {
          setJudgeState((prev) => ({ ...prev, model: j.model, status: "running", resolvedSystemPrompt: j.resolvedSystemPrompt }));
        }
      } else if (d.type === "judge-verdict") {
        const j = d as unknown as JudgeVerdictEvent;
        if (modelRunId) {
          setBenchmarkRuns((prev) => {
            const next = new Map(prev);
            const run = next.get(modelRunId);
            if (run) {
              next.set(modelRunId, {
                ...run,
                judgeState: { ...run.judgeState, content: j.content, status: "done" },
              });
            }
            return next;
          });
        }
      } else if (d.type === "judge-complete") {
        const j = d as unknown as JudgeCompleteEvent;
        if (modelRunId) {
          setBenchmarkRuns((prev) => {
            const next = new Map(prev);
            const run = next.get(modelRunId);
            if (run) {
              next.set(modelRunId, {
                ...run,
                judgeState: { ...run.judgeState, usage: j.usage, durationMs: j.durationMs },
                endTime: run.endTime ?? Date.now(),
              });
            }
            return next;
          });
        } else {
          setJudgeState((prev) => ({ ...prev, usage: j.usage, durationMs: j.durationMs }));
        }
      }
    }
  }, [data]);

  // Track judge content from streamed assistant messages (normal mode only)
  const lastAssistant = messages.filter((m) => m.role === "assistant").at(-1);
  const judgeContent =
    typeof lastAssistant?.content === "string" ? lastAssistant.content : "";

  useEffect(() => {
    if (benchmarkMode) return;
    if (judgeContent) {
      setJudgeState((prev) => ({
        ...prev,
        content: judgeContent,
        status: isLoading ? "running" : "done",
      }));
    } else if (!isLoading && judgeState.status === "running") {
      setJudgeState((prev) => ({ ...prev, status: "done" }));
    }
  }, [judgeContent, isLoading, benchmarkMode]); // eslint-disable-line react-hooks/exhaustive-deps

  const onSubmit = () => {
    if (!inputValue.trim() || isLoading) return;
    if (benchmarkMode && benchmarkModels.length < 2) return;
    const prompt = inputValue.trim();
    setLastPrompt(prompt);
    setRunStartTime(Date.now());
    setRunEndTime(null);
    if (benchmarkMode) setBenchmarkRuns(new Map());
    append({ role: "user", content: prompt });
    setInputValue("");
  };

  const expertLastStatus = new Map<string, Status>();
  for (const [id, state] of expertStates) expertLastStatus.set(id, state.status);

  const totalDurationMs = runStartTime && runEndTime ? runEndTime - runStartTime : null;

  const activeExperts =
    selectedExperts.length === 0 ? experts : experts.filter((e) => selectedExperts.includes(e.id));
  const panels = activeExperts.map((e) => expertStates.get(e.id) ?? makeIdleExpert(e));

  return (
    <div className="h-[100dvh] grid grid-cols-[260px_1fr] bg-neutral-950 text-neutral-100">
      <BaseDataPanel />

      <div className="flex flex-col min-h-0 overflow-hidden">
        <PromptBar
          value={inputValue}
          onChange={setInputValue}
          onSubmit={onSubmit}
          selectedExperts={selectedExperts}
          onToggleExpert={toggleExpert}
          disabled={isLoading}
          expertLastStatus={expertLastStatus}
          benchmarkMode={benchmarkMode}
          onToggleBenchmark={() => setBenchmarkMode((v) => !v)}
          benchmarkModels={benchmarkModels}
          onBenchmarkModelsChange={setBenchmarkModels}
        />

        {!benchmarkMode && (lastPrompt || isLoading) && (
          <RunSummaryBar
            lastPrompt={lastPrompt}
            expertStates={expertStates}
            judgeState={judgeState}
            totalDurationMs={totalDurationMs}
            isLoading={isLoading}
            runStartTime={runStartTime}
            birthData={birthData ?? {}}
          />
        )}

        <div className="flex-1 overflow-y-auto p-3">
          {benchmarkMode && benchmarkRuns.size > 0 ? (
            <>
              <div className="text-[10px] font-mono uppercase tracking-widest text-neutral-700 mb-2">
                Benchmark
              </div>
              <BenchmarkResults runs={benchmarkRuns} lastPrompt={lastPrompt} />
            </>
          ) : (
            <>
              <div className="text-[10px] font-mono uppercase tracking-widest text-neutral-700 mb-2">
                Expert Panels
              </div>
              <div
                className="grid gap-3 mb-4"
                style={{ gridTemplateColumns: `repeat(${Math.min(panels.length, 3)}, 1fr)` }}
              >
                {panels.map((p) => (
                  <ExpertPanel key={p.expertId} state={p} />
                ))}
              </div>

              <div className="text-[10px] font-mono uppercase tracking-widest text-neutral-700 mb-2">
                Synthesizer
              </div>
              <JudgePanel state={judgeState} />

              {runHistory.length > 0 && (
                <div className="mt-4">
                  <RunHistory runHistory={runHistory} />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
