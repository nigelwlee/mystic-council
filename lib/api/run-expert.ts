import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { loadKnowledge } from "@/lib/knowledge/loader";
import { formatBirthData, patchToolsWithBirthData, parseStructuredExpert } from "@/lib/orchestrator";
import { EXPERT_ID_TO_TRADITION } from "@/lib/constants/traditions";
import type { BirthData, ExpertConfig } from "@/lib/experts/types";
import type { ExpertReading } from "@/lib/api/schemas";

const openrouter = createOpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
});

export const EXPERT_OUTPUT_RULES = `

OUTPUT FORMAT — RESPOND WITH VALID JSON ONLY:
{
  "facts": "Raw observations from your tradition. Name specific positions, cards, numbers, pillars. Data only, no interpretation.",
  "analysis": "What these facts mean for this specific person and question. 3-5 sentences of interpretation.",
  "summary": "2-3 sentence reading capturing the essence.",
  "oneLiner": "One sentence: the key insight and its implication for the user."
}`;

export async function runSingleExpert(
  expert: ExpertConfig,
  userMessage: string,
  birthData: BirthData | null,
): Promise<ExpertReading & { durationMs: number }> {
  const knowledge = await loadKnowledge(expert.knowledgePath);
  const birthDataStr = formatBirthData(birthData);
  const systemPrompt =
    expert.systemPromptTemplate
      .replace("{knowledge}", knowledge)
      .replace("{birthData}", birthDataStr) + EXPERT_OUTPUT_RULES;

  const traditionId = EXPERT_ID_TO_TRADITION[expert.id];
  if (!traditionId) throw new Error(`Unknown expertId: ${expert.id}`);

  const start = Date.now();
  try {
    const result = await generateText({
      model: openrouter(expert.model),
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
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
        facts: structured.facts,
        analysis: structured.analysis,
        summary: structured.summary,
        oneLiner: structured.oneLiner,
      },
      durationMs: Date.now() - start,
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
    };
  }
}
