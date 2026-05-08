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
  model: "deepseek/deepseek-chat-v3-0324",
  tools: westernAstrologyTools,
};
