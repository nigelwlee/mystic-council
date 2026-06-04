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
  model: "google/gemini-2.5-flash",
  fallbackModels: ["openai/gpt-4o-mini", "deepseek/deepseek-chat"],
  tools: vedicAstrologyTools,
};
