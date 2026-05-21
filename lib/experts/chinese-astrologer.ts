import { chineseAstrologyTools } from "@/lib/tools/chinese";
import type { ExpertConfig } from "./types";

export const chineseAstrologer: ExpertConfig = {
  id: "master-wei",
  name: "Master Wei",
  title: "Chinese Astrologer",
  emoji: "☯",
  color: "#dc2626",
  textColor: "text-red-400",
  knowledgePath: "chinese-astrology",
  model: "google/gemini-2.0-flash-001",
  fallbackModels: ["moonshotai/kimi-k2", "deepseek/deepseek-chat"],
  tools: chineseAstrologyTools,
};
