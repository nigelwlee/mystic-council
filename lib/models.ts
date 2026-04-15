export interface ModelOption {
  id: string;
  name: string;
  inputPricePerM: number; // $ per million input tokens
  outputPricePerM: number; // $ per million output tokens
}

export const availableModels: ModelOption[] = [
  { id: "qwen/qwen3.6-plus-04-02", name: "Qwen 3.6 Plus", inputPricePerM: 0.00033, outputPricePerM: 0.00195 },
  { id: "qwen/qwen3.5-flash-20260224", name: "Qwen 3.5 Flash", inputPricePerM: 0.065, outputPricePerM: 0.26 },
  { id: "deepseek/deepseek-chat-v3-0324", name: "DeepSeek V3", inputPricePerM: 0.14, outputPricePerM: 0.28 },
  { id: "google/gemini-2.5-flash", name: "Gemini 2.5 Flash", inputPricePerM: 0.15, outputPricePerM: 0.60 },
  { id: "moonshotai/kimi-k2.5", name: "Kimi K2.5", inputPricePerM: 0.38, outputPricePerM: 1.72 },
];

export function estimateCost(inputTokens: number, outputTokens: number, modelId: string): number {
  const model = availableModels.find((m) => m.id === modelId);
  if (!model) return 0;
  return (inputTokens * model.inputPricePerM + outputTokens * model.outputPricePerM) / 1_000_000;
}

export function getModelName(modelId: string): string {
  return availableModels.find((m) => m.id === modelId)?.name ?? modelId;
}
