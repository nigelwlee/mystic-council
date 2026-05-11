// Prices in USD per 1M tokens (input / output).
// Source: OpenRouter model pages, last checked 2025-04.
const MODEL_PRICING: Record<string, { in: number; out: number }> = {
  "deepseek/deepseek-chat-v3-0324": { in: 0.27, out: 1.10 },
  "deepseek/deepseek-chat": { in: 0.27, out: 1.10 },
  "qwen/qwen3-235b-a22b": { in: 0.14, out: 0.60 },
  "moonshotai/kimi-k2": { in: 0.07, out: 0.30 },
  "openai/gpt-4o-mini": { in: 0.15, out: 0.60 },
  "openai/gpt-4o": { in: 2.50, out: 10.00 },
  "anthropic/claude-3-haiku": { in: 0.25, out: 1.25 },
  "anthropic/claude-3.5-sonnet": { in: 3.00, out: 15.00 },
};

export function estimateCost(
  model: string,
  usage: { promptTokens: number; completionTokens: number },
): number {
  const pricing = MODEL_PRICING[model];
  if (!pricing) return 0;
  return (
    (usage.promptTokens / 1_000_000) * pricing.in +
    (usage.completionTokens / 1_000_000) * pricing.out
  );
}

export function formatCost(usd: number): string {
  if (usd === 0) return "$0.0000";
  if (usd < 0.0001) return `$${usd.toExponential(2)}`;
  return `$${usd.toFixed(4)}`;
}
