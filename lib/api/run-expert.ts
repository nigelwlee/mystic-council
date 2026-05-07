import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { loadKnowledge } from "@/lib/knowledge/loader";
import { formatBirthData, patchToolsWithBirthData } from "@/lib/orchestrator";
import { EXPERT_ID_TO_TRADITION } from "@/lib/constants/traditions";
import { voiceRulesForTradition } from "@/lib/voice";
import { FORMAT_RULES, sanitizeField } from "@/lib/format";
import { ExpertContentSchema } from "@/lib/api/schemas";
import type { BirthData, ExpertConfig } from "@/lib/experts/types";
import type { ExpertReading } from "@/lib/api/schemas";

const openrouter = createOpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
});

export const EXPERT_OUTPUT_RULES = `

OUTPUT FORMAT — STRICT JSON ONLY. All four values MUST be plain text strings — never nested objects or arrays.
{
  "facts": "Write a prose paragraph of specific raw observations: positions, degrees, card names, pillar elements, life path number, etc. Example: 'Your Moon is in Sagittarius at 10.6°. Mercury is in Pisces at 26.1°. Saturn is in Aquarius.' Do NOT use nested objects.",
  "analysis": "3-5 sentences interpreting what these facts mean for this specific person and question.",
  "summary": "2-3 sentence reading capturing the essence.",
  "oneLiner": "START with the exact artifact from your tradition — the card name, the transit name, the dasha name, the pillar, the number. Then 4-8 words on what it means right now. Max 15 words total. No intro, no formula. Examples: Tarot → 'Tower reversed. A crisis dissolves before it lands.' Western → 'Mars trines your natal Jupiter. Effort pays off today.' Vedic → 'Mercury antardasha in Saturn mahadasha. Write it down, commit nothing yet.' Chinese → 'Bing Wu day clashes your Geng Metal. Tension at midday, resolve by evening.' Numerology → 'Personal Day 8. Money or power moves are in play.'"
}`;

function parseExpertJson(text: string, expertId: string): typeof ExpertContentSchema._type {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error(`Expert ${expertId}: no JSON object in response`);
  let raw: unknown;
  try {
    raw = JSON.parse(jsonMatch[0]);
  } catch {
    throw new Error(`Expert ${expertId}: response is not valid JSON`);
  }
  return ExpertContentSchema.parse(raw);
}

export async function runSingleExpert(
  expert: ExpertConfig,
  userMessage: string,
  birthData: BirthData | null,
  chartContext?: string | null,
): Promise<ExpertReading & { durationMs: number }> {
  const knowledge = await loadKnowledge(expert.knowledgePath);
  const birthDataStr = formatBirthData(birthData);

  const traditionId = EXPERT_ID_TO_TRADITION[expert.id];
  if (!traditionId) throw new Error(`Unknown expertId: ${expert.id}`);

  const systemPrompt =
    expert.systemPromptTemplate
      .replace("{knowledge}", knowledge)
      .replace("{birthData}", birthDataStr) +
    "\n\n" + voiceRulesForTradition(traditionId) +
    "\n\n" + FORMAT_RULES +
    EXPERT_OUTPUT_RULES;

  const finalUserMessage = chartContext ? `${chartContext}${userMessage}` : userMessage;

  const start = Date.now();
  const EXPERT_TIMEOUT_MS = 60_000;
  try {
    const result = await Promise.race([
      generateText({
        model: openrouter(expert.model),
        system: systemPrompt,
        messages: [{ role: "user", content: finalUserMessage }],
        tools: patchToolsWithBirthData(expert.tools, birthData),
        maxSteps: 2,
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Expert ${expert.id} timed out after ${EXPERT_TIMEOUT_MS}ms`)), EXPERT_TIMEOUT_MS),
      ),
    ]);

    const content = parseExpertJson(result.text, expert.id);
    return {
      traditionId: traditionId as ExpertReading["traditionId"],
      expertId: expert.id,
      expertName: expert.name,
      expertEmoji: expert.emoji,
      color: expert.color,
      textColor: expert.textColor,
      content: {
        facts: sanitizeField(content.facts),
        analysis: sanitizeField(content.analysis),
        summary: sanitizeField(content.summary),
        oneLiner: sanitizeField(content.oneLiner),
      },
      durationMs: Date.now() - start,
      usage: result.usage
        ? {
            promptTokens: result.usage.promptTokens,
            completionTokens: result.usage.completionTokens,
            totalTokens: result.usage.totalTokens,
          }
        : undefined,
      rawText: result.text,
      systemPrompt,
      model: expert.model,
      userMessage: finalUserMessage,
    };
  } catch (err) {
    return {
      traditionId: traditionId as ExpertReading["traditionId"],
      expertId: expert.id,
      expertName: expert.name,
      expertEmoji: expert.emoji,
      color: expert.color,
      textColor: expert.textColor,
      content: { facts: "", analysis: "", summary: "", oneLiner: "" },
      durationMs: Date.now() - start,
      error: err instanceof Error ? err.message : String(err),
      systemPrompt,
      model: expert.model,
      userMessage: finalUserMessage,
    };
  }
}
