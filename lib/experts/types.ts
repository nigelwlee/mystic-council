import type { CoreTool } from "ai";

export interface StructuredExpertContent {
  facts: string;
  analysis: string;
  summary: string;
  oneLiner: string;
}

export interface BirthData {
  name?: string;
  date?: string; // ISO date string YYYY-MM-DD
  time?: string; // HH:mm format
  latitude?: number;
  longitude?: number;
  location?: string; // city name for display
}

export interface ExpertConfig {
  id: string;
  name: string;
  title: string;
  emoji: string;
  color: string; // CSS color for left border accent
  textColor: string; // Tailwind text color class
  systemPromptTemplate: string; // {knowledge} and {birthData} placeholders
  knowledgePath: string; // subfolder under /knowledge/
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tools: Record<string, CoreTool<any, any>>;
  model: string;
}

export interface ExpertResponse {
  expertId: string;
  expertName: string;
  expertEmoji: string;
  expertTitle: string;
  color: string;
  textColor: string;
  content: StructuredExpertContent | string;
  error?: string;
}

export interface CouncilStreamData {
  type: "expert-responses";
  responses: ExpertResponse[];
}

export interface JudgeVerdictData {
  type: "judge-verdict";
  content: { summary: string; oneLiner: string };
}

export type SelectedExperts = Set<string>;

// --- Token usage for cost tracking ---

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

// --- Engine dashboard stream events ---

export interface ToolCallRecord {
  toolName: string;
  args: Record<string, unknown>;
  result: unknown;
}

export interface ExpertStartEvent {
  type: "expert-start";
  expertId: string;
  expertName: string;
  expertEmoji: string;
  model: string;
  resolvedSystemPrompt: string;
  modelRunId?: string;
}

export interface ExpertCompleteEvent {
  type: "expert-complete";
  expertId: string;
  expertName: string;
  expertEmoji: string;
  expertTitle: string;
  color: string;
  textColor: string;
  model: string;
  content: StructuredExpertContent | string;
  resolvedSystemPrompt: string;
  toolCalls: ToolCallRecord[];
  usage?: TokenUsage;
  error?: string;
  durationMs: number;
  modelRunId?: string;
}

export interface JudgeStartEvent {
  type: "judge-start";
  model: string;
  resolvedSystemPrompt: string;
  modelRunId?: string;
}

export interface JudgeVerdictEvent {
  type: "judge-verdict";
  content: { summary: string; oneLiner: string };
  modelRunId?: string;
}

export interface JudgeCompleteEvent {
  type: "judge-complete";
  usage?: TokenUsage;
  durationMs: number;
  modelRunId?: string;
}

export interface BenchmarkStartEvent {
  type: "benchmark-start";
  models: string[];
}

export interface RunRecord {
  id: number;
  prompt: string;
  timestamp: number;
  durationMs: number | null;
  expertResults: Array<{
    expertId: string;
    expertName: string;
    expertEmoji: string;
    status: "idle" | "running" | "done" | "error";
    error?: string;
  }>;
  judgeStatus: "idle" | "running" | "done" | "error";
}
