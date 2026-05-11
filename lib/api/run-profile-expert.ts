import { generateObject } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { z } from "zod";
import { loadKnowledge, loadSystemPrompt } from "@/lib/knowledge/loader";
import { EXPERT_ID_TO_TRADITION } from "@/lib/constants/traditions";
import { voiceRulesForTradition } from "@/lib/voice";
import { FORMAT_RULES } from "@/lib/format";
import { formatBirthData, runWithRetry } from "@/lib/api/run-expert";
import { logRun } from "@/lib/api/telemetry";
import type { BirthData, ExpertConfig } from "@/lib/experts/types";

const openrouter = createOpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
});

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
  userId?: string | null,
): Promise<ProfileExpertResult> {
  const traditionId = EXPERT_ID_TO_TRADITION[expert.id];
  if (!traditionId) {
    return { traditionId: expert.id, expertId: expert.id, atGlance: "", error: `Unknown expertId: ${expert.id}` };
  }

  const [knowledge, promptTemplate] = await Promise.all([
    loadKnowledge(expert.knowledgePath),
    loadSystemPrompt(expert.knowledgePath, "profile"),
  ]);

  const birthDataStr = formatBirthData(birthData);

  const systemPrompt =
    promptTemplate
      .replace("{knowledge}", knowledge)
      .replace("{birthData}", birthDataStr) +
    "\n\n" + voiceRulesForTradition(traditionId) +
    "\n\n" + FORMAT_RULES;

  const userMessage = chartContext
    ? `${chartContext}Based on this person's birth chart and the facts above, write their "at a glance" profile reading.`
    : "Based on this person's birth data, write their \"at a glance\" profile reading.";

  // 50s per attempt × 2 attempts = 100s max, fits within /api/profile maxDuration=120
  const TIMEOUT_MS = 50_000;

  try {
    const atGlance = await runWithRetry(async (attempt) => {
      const attemptStart = Date.now();
      try {
        const result = await Promise.race([
          generateObject({
            model: openrouter(expert.model),
            system: systemPrompt,
            messages: [{ role: "user", content: userMessage }],
            schema: ProfileSchema,
            mode: "json",
          }),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error(`Expert ${expert.id} timed out`)), TIMEOUT_MS),
          ),
        ]);
        const dm = Date.now() - attemptStart;
        logRun({ userId, route: "profile", phase: "expert", expertId: expert.id, traditionId, model: expert.model, attempt, ok: true, durationMs: dm });
        return result.object.atGlance;
      } catch (err) {
        const dm = Date.now() - attemptStart;
        logRun({ userId, route: "profile", phase: "expert", expertId: expert.id, traditionId, model: expert.model, attempt, ok: false, durationMs: dm, error: err instanceof Error ? err.message : String(err) });
        throw err;
      }
    });

    return { traditionId, expertId: expert.id, atGlance };
  } catch (err) {
    return {
      traditionId,
      expertId: expert.id,
      atGlance: "",
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
