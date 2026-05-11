import { numerologyTools } from "@/lib/tools/numerology";
import type { ExpertConfig } from "./types";

export const numerologist: ExpertConfig = {
  id: "pythia",
  name: "Pythia",
  title: "Numerologist",
  emoji: "∞",
  color: "#059669",
  textColor: "text-emerald-400",
  knowledgePath: "numerology",
  model: "deepseek/deepseek-chat",
  fallbackModels: ["qwen/qwen3-235b-a22b", "moonshotai/kimi-k2"],
  tools: numerologyTools,
};
