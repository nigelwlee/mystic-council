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
  model: "google/gemini-2.0-flash-001",
  fallbackModels: ["moonshotai/kimi-k2", "deepseek/deepseek-chat"],
  tools: numerologyTools,
};
