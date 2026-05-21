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
  model: "google/gemini-2.0-flash-001",
  fallbackModels: ["moonshotai/kimi-k2", "deepseek/deepseek-chat"],
  tools: westernAstrologyTools,
};
