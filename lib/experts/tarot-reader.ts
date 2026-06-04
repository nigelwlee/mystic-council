import { tarotTools } from "@/lib/tools/tarot";
import type { ExpertConfig } from "./types";

export const tarotReader: ExpertConfig = {
  id: "madame-crow",
  name: "Madame Crow",
  title: "Tarot Reader",
  emoji: "🃏",
  color: "#7c3aed",
  textColor: "text-violet-400",
  knowledgePath: "tarot",
  model: "google/gemini-2.5-flash",
  fallbackModels: ["openai/gpt-4o-mini", "deepseek/deepseek-chat"],
  tools: tarotTools,
};
