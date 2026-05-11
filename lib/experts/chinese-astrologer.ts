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
  model: "deepseek/deepseek-chat",
  fallbackModels: ["qwen/qwen3-235b-a22b", "moonshotai/kimi-k2"],
  tools: chineseAstrologyTools,
};
