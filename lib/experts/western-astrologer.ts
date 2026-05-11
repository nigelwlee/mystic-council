import { westernAstrologyTools } from "@/lib/tools/astrology";
import type { ExpertConfig } from "./types";

export const westernAstrologer: ExpertConfig = {
  id: "stella",
  name: "Stella",
  title: "Western Astrologer",
  emoji: "✦",
  color: "#6366f1",
  textColor: "text-indigo-400",
  knowledgePath: "western-astrology",
  model: "deepseek/deepseek-chat",
  fallbackModels: ["qwen/qwen3-235b-a22b", "moonshotai/kimi-k2"],
  tools: westernAstrologyTools,
};
