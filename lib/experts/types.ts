import type { CoreTool } from "ai";

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
  content: string;
  error?: string;
}

export interface CouncilStreamData {
  type: "expert-responses";
  responses: ExpertResponse[];
}

export interface JudgeVerdictData {
  type: "judge-verdict";
  content: string;
}

export type SelectedExperts = Set<string>;
