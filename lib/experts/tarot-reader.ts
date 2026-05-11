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
  model: "deepseek/deepseek-chat",
  fallbackModels: ["qwen/qwen3-235b-a22b", "moonshotai/kimi-k2"],
  tools: tarotTools,
};
