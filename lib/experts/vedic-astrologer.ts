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
  model: "deepseek/deepseek-chat",
  fallbackModels: ["qwen/qwen3-235b-a22b", "moonshotai/kimi-k2"],
  tools: vedicAstrologyTools,
};
