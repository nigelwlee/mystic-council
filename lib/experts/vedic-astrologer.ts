import { vedicAstrologyTools } from "@/lib/tools/vedic";
import type { ExpertConfig } from "./types";

export const vedicAstrologer: ExpertConfig = {
  id: "priya",
  name: "Priya",
  title: "Vedic Astrologer",
  emoji: "🪬",
  color: "#d97706",
  textColor: "text-amber-400",
  knowledgePath: "vedic-astrology",
  model: "google/gemini-2.0-flash-001",
  fallbackModels: ["moonshotai/kimi-k2", "deepseek/deepseek-chat"],
  tools: vedicAstrologyTools,
};
