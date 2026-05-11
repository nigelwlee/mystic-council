import { loadSystemPrompt } from "@/lib/knowledge/loader";

const ORACLE_FOLDER = "oracle";

export const judgeConfig = {
  id: "oracle",
  name: "Py",
  title: "Mystic Judge",
  emoji: "◈",
  color: "#a16207",
  textColor: "text-yellow-600",
  model: "deepseek/deepseek-chat",
  fallbackModels: ["qwen/qwen3-235b-a22b"],
};

export async function loadJudgePrompt(): Promise<string> {
  return loadSystemPrompt(ORACLE_FOLDER);
}

export async function loadJudgeDailyPrompt(): Promise<string> {
  return loadSystemPrompt(ORACLE_FOLDER, "daily");
}

export async function loadJudgeChatPrompt(): Promise<string> {
  return loadSystemPrompt(ORACLE_FOLDER, "chat");
}

export async function loadJudgeFacetsPrompt(): Promise<string> {
  return loadSystemPrompt(ORACLE_FOLDER, "facets");
}
