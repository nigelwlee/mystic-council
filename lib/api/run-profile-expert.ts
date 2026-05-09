import { generateObject } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { z } from "zod";
import { loadKnowledge, loadSystemPrompt } from "@/lib/knowledge/loader";
import { EXPERT_ID_TO_TRADITION } from "@/lib/constants/traditions";
import { voiceRulesForTradition } from "@/lib/voice";
import { FORMAT_RULES } from "@/lib/format";
import { formatBirthData, patchToolsWithBirthData } from "@/lib/api/run-expert";
import type { BirthData, ExpertConfig } from "@/lib/experts/types";

const openrouter = createOpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
});

const PROFILE_OUTPUT_RULES = `

OUTPUT FORMAT — STRICT JSON ONLY.
{
  "atGlance": "Write a single 4–6 sentence paragraph spoken directly to this person. Cover who they are (personality), their life direction (path), how they connect with others (relationships), and where they thrive (work). Be warm, specific, and grounded in the placements — cite them when they sharpen a point. No bullets, no headings, no lists."
}`;

const ProfileSchema = z.object({
  atGlance: z.string(),
});

export interface ProfileExpertResult {
  traditionId: string;
  expertId: string;
  atGlance: string;
  error?: string;
}

export async function runProfileExpert(
  expert: ExpertConfig,
  birthData: BirthData | null,
  chartContext?: string | null,
): Promise<ProfileExpertResult> {
  const traditionId = EXPERT_ID_TO_TRADITION[expert.id];
  if (!traditionId) {
    return { traditionId: expert.id, expertId: expert.id, atGlance: "", error: `Unknown expertId: ${expert.id}` };
  }

  const [knowledge, promptTemplate] = await Promise.all([
    loadKnowledge(expert.knowledgePath),
    loadSystemPrompt(expert.knowledgePath),
  ]);

  const birthDataStr = formatBirthData(birthData);

  const systemPrompt =
    promptTemplate
      .replace("{knowledge}", knowledge)
      .replace("{birthData}", birthDataStr) +
    "\n\n" + voiceRulesForTradition(traditionId) +
    "\n\n" + FORMAT_RULES +
    PROFILE_OUTPUT_RULES;

  const userMessage = chartContext
    ? `${chartContext}Based on this person's birth chart and the facts above, write their "at a glance" profile reading.`
    : "Based on this person's birth data, write their \"at a glance\" profile reading.";

  const TIMEOUT_MS = 60_000;
  try {
    const result = await Promise.race([
      generateObject({
        model: openrouter(expert.model),
        system: systemPrompt,
        messages: [{ role: "user", content: userMessage }],
        schema: ProfileSchema,
        // Allow tool use for chart computation before generating the profile
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Expert ${expert.id} timed out`)), TIMEOUT_MS),
      ),
    ]);

    return {
      traditionId,
      expertId: expert.id,
      atGlance: result.object.atGlance,
    };
  } catch (err) {
    return {
      traditionId,
      expertId: expert.id,
      atGlance: "",
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
