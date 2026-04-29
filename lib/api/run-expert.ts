import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { loadKnowledge } from "@/lib/knowledge/loader";
import { formatBirthData, patchToolsWithBirthData, parseStructuredExpert } from "@/lib/orchestrator";
import { EXPERT_ID_TO_TRADITION } from "@/lib/constants/traditions";
import { VOICE_RULES } from "@/lib/voice";
import { FORMAT_RULES, sanitizeField } from "@/lib/format";
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
  "oneLiner": "FORMULA: '{punchy fact}. {short interpretation}. {recommended action}.' — three short sentences, each under 12 words. Modern and direct, like a smart friend texting. No flowery language, no 'the universe', no 'embrace your truth'. Lead with the most concrete fact from your tradition: tarot → the lead card drawn; western → the dominant transit or natal aspect; vedic → current dasha or moon nakshatra; chinese → the day pillar or active element; numerology → life path or current personal year/day number. Then one plain sentence on what it means right now. Then one concrete action for today. Examples — Tarot: 'You drew the High Priestess. Your gut already knows the answer. Stop polling everyone else.' Western: 'Mars squares your natal Saturn this week. Effort feels uphill. Pick one task and finish it before starting another.' Numerology: 'You're in a Personal Year 1. Reset energy is everywhere. Start the thing you've been postponing — today.'"
}`;

export async function runSingleExpert(
  expert: ExpertConfig,
  userMessage: string,
  birthData: BirthData | null,
  chartContext?: string | null,
): Promise<ExpertReading & { durationMs: number }> {
  const knowledge = await loadKnowledge(expert.knowledgePath);
  const birthDataStr = formatBirthData(birthData);
  const systemPrompt =
    expert.systemPromptTemplate
      .replace("{knowledge}", knowledge)
      .replace("{birthData}", birthDataStr) +
    "\n\n" + VOICE_RULES +
    "\n\n" + FORMAT_RULES +
    EXPERT_OUTPUT_RULES;

  const traditionId = EXPERT_ID_TO_TRADITION[expert.id];
  if (!traditionId) throw new Error(`Unknown expertId: ${expert.id}`);

  const finalUserMessage = chartContext ? `${chartContext}${userMessage}` : userMessage;

  const start = Date.now();
  try {
    const result = await generateText({
      model: openrouter(expert.model),
      system: systemPrompt,
      messages: [{ role: "user", content: finalUserMessage }],
      tools: patchToolsWithBirthData(expert.tools, birthData),
      maxSteps: 2,
    });

    const structured = parseStructuredExpert(result.text);
    return {
      traditionId: traditionId as ExpertReading["traditionId"],
      expertId: expert.id,
      expertName: expert.name,
      expertEmoji: expert.emoji,
      color: expert.color,
      textColor: expert.textColor,
      content: {
        facts: sanitizeField(structured.facts),
        analysis: sanitizeField(structured.analysis),
        summary: sanitizeField(structured.summary),
        oneLiner: sanitizeField(structured.oneLiner),
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
