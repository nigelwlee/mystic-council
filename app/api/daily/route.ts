import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { experts } from "@/lib/experts/registry";
import { judgeConfig } from "@/lib/experts/judge";
import { loadKnowledge } from "@/lib/knowledge/loader";
import {
  formatBirthData,
  patchToolsWithBirthData,
  parseStructuredExpert,
  parseJudgeOutput,
} from "@/lib/orchestrator";
import { MOCK_DAILY_READING } from "@/lib/mock-daily";
import { EXPERT_ID_TO_TRADITION } from "@/lib/constants/traditions";
import type { BirthData } from "@/lib/experts/types";
import type { DailyReading } from "@/lib/types/daily";

export const maxDuration = 60;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const DAILY_OUTPUT_RULES = `\n\nOUTPUT FORMAT — RESPOND WITH VALID JSON ONLY:
{
  "facts": "Key data points from your tradition for today (positions, cards, numbers).",
  "analysis": "What these mean for this person today. 2-3 sentences.",
  "summary": "One focused sentence capturing the essence of today.",
  "oneLiner": "The single most important insight for today."
}`;

export async function POST(req: Request) {
  const { birthData, date } = (await req.json()) as {
    birthData: BirthData | null;
    date: string;
  };

  if (process.env.MOCK_MODE === "true") {
    await sleep(300 + Math.random() * 500);
    const reading: DailyReading = {
      ...MOCK_DAILY_READING,
      id: crypto.randomUUID(),
      generatedAt: new Date().toISOString(),
    };
    return Response.json(reading);
  }

  const openrouter = createOpenAI({
    apiKey: process.env.OPENROUTER_API_KEY,
    baseURL: "https://openrouter.ai/api/v1",
  });

  const birthDataStr = formatBirthData(birthData);
  const dailyMessage = `Give me my daily reading for ${date}. What do the stars, cards, and numbers say about today?`;

  try {
    // Run all 5 experts in parallel — partial failures are tolerated
    const settled = await Promise.allSettled(
      experts.map(async (expert) => {
        const knowledge = await loadKnowledge(expert.knowledgePath);
        const systemPrompt =
          expert.systemPromptTemplate
            .replace("{knowledge}", knowledge)
            .replace("{birthData}", birthDataStr) + DAILY_OUTPUT_RULES;

        const result = await generateText({
          model: openrouter(expert.model),
          system: systemPrompt,
          messages: [{ role: "user", content: dailyMessage }],
          tools: patchToolsWithBirthData(expert.tools, birthData),
          maxSteps: 2,
        });

        return { expertId: expert.id, content: parseStructuredExpert(result.text) };
      })
    );

    const expertHighlights: DailyReading["expertHighlights"] = [];
    const expertSummaries: string[] = [];

    for (const result of settled) {
      if (result.status !== "fulfilled") continue;
      const { expertId, content } = result.value;
      const traditionId = EXPERT_ID_TO_TRADITION[expertId];
      if (!traditionId || typeof content === "string") continue;
      expertHighlights.push({ traditionId, highlight: content.oneLiner });
      expertSummaries.push(
        `### ${expertId}\n${content.summary}`
      );
    }

    if (expertHighlights.length === 0) {
      return Response.json({ error: "All experts failed" }, { status: 502 });
    }

    const judgeSystemPrompt = judgeConfig.systemPromptTemplate.replace(
      "{expertOutputs}",
      expertSummaries.join("\n\n---\n\n")
    );

    const judgeResult = await generateText({
      model: openrouter(judgeConfig.model),
      system: judgeSystemPrompt,
      messages: [
        {
          role: "user",
          content: `Synthesize a daily reading for ${date} in 2-3 sentences.`,
        },
      ],
    });

    const judgeOutput = parseJudgeOutput(judgeResult.text);

    const reading: DailyReading = {
      id: crypto.randomUUID(),
      oracleSummary: judgeOutput.summary,
      expertHighlights,
      generatedAt: new Date().toISOString(),
    };

    return Response.json(reading);
  } catch (err) {
    console.error("Daily reading error:", err);
    return Response.json({ error: "Failed to generate daily reading" }, { status: 500 });
  }
}
