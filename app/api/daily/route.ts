import { generateObject } from "ai";
import { z } from "zod";
import { createOpenAI } from "@ai-sdk/openai";
import { experts } from "@/lib/experts/registry";
import { judgeConfig } from "@/lib/experts/judge";
import { runSingleExpert } from "@/lib/api/run-expert";
import { mockExpertResponses, mockJudgeVerdict } from "@/lib/mock-data";
import { MOCK_DAILY_READING } from "@/lib/mock-daily";
import { EXPERT_ID_TO_TRADITION } from "@/lib/constants/traditions";
import { ContextInputSchema } from "@/lib/api/schemas";
import type { DailyReadingResponse, ExpertReading } from "@/lib/api/schemas";

export const maxDuration = 60;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const openrouter = createOpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
});

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = ContextInputSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { birthData, date } = parsed.data;
  const start = Date.now();

  if (process.env.MOCK_MODE === "true") {
    await sleep(300 + Math.random() * 500);
    // Build a rich mock response from the existing mock data
    const expertReadings: ExpertReading[] = mockExpertResponses.map((r) => {
      const tid = EXPERT_ID_TO_TRADITION[r.expertId];
      return {
        traditionId: (tid ?? "western") as ExpertReading["traditionId"],
        expertId: r.expertId,
        expertName: r.expertName,
        expertEmoji: r.expertEmoji,
        color: r.color,
        textColor: r.textColor,
        content: typeof r.content === "string"
          ? { facts: "", analysis: "", summary: r.content, oneLiner: r.content }
          : r.content,
        durationMs: 400 + Math.floor(Math.random() * 300),
      };
    });
    // Cross-check against MOCK_DAILY_READING for oneLiners (daily highlights)
    for (const h of MOCK_DAILY_READING.expertHighlights) {
      const er = expertReadings.find((r) => r.traditionId === h.traditionId);
      if (er) er.content = { ...er.content, oneLiner: h.highlight };
    }
    const reading: DailyReadingResponse = {
      id: crypto.randomUUID(),
      generatedAt: new Date().toISOString(),
      input: { birthData, date },
      experts: expertReadings,
      oracle: {
        summary: mockJudgeVerdict.summary,
        oneLiner: MOCK_DAILY_READING.oracleSummary,
        durationMs: 300,
      },
      totalDurationMs: Date.now() - start,
    };
    return Response.json(reading);
  }

  const dailyMessage = `Give me my daily reading for ${date}. What do the stars, cards, and numbers say about today?`;

  const settled = await Promise.allSettled(
    experts.map((e) => runSingleExpert(e, dailyMessage, birthData))
  );

  const expertReadings: ExpertReading[] = settled.map((r, i) => {
    if (r.status === "fulfilled") return r.value;
    const e = experts[i]!;
    const tid = EXPERT_ID_TO_TRADITION[e.id];
    return {
      traditionId: (tid ?? "western") as ExpertReading["traditionId"],
      expertId: e.id,
      expertName: e.name,
      expertEmoji: e.emoji,
      color: e.color,
      textColor: e.textColor,
      content: { facts: "", analysis: "", summary: "", oneLiner: "" },
      error: r.reason instanceof Error ? r.reason.message : String(r.reason),
    };
  });

  const successful = expertReadings.filter((r) => !r.error);
  if (successful.length === 0) {
    return Response.json({ error: "All experts failed" }, { status: 502 });
  }

  const expertOutputs = successful
    .map((r) => `### ${r.expertName}\n${r.content.summary}`)
    .join("\n\n---\n\n");

  const judgeSystemPrompt = judgeConfig.systemPromptTemplate.replace("{expertOutputs}", expertOutputs);
  const judgeStart = Date.now();

  const judgeSchema = z.object({
    summary: z.string().describe("2-3 sentence synthesized daily reading across all traditions"),
    oneLiner: z.string().describe("One sentence: the unified daily insight"),
  });

  const judgeUserMessage = `Synthesize a daily reading for ${date} in 2-3 sentences.`;
  let oracle: DailyReadingResponse["oracle"];
  try {
    const judgeResult = await generateObject({
      model: openrouter(judgeConfig.model),
      system: judgeSystemPrompt,
      messages: [{ role: "user", content: judgeUserMessage }],
      schema: judgeSchema,
    });
    const obj = judgeResult.object as z.infer<typeof judgeSchema>;
    oracle = {
      summary: obj.summary,
      oneLiner: obj.oneLiner,
      durationMs: Date.now() - judgeStart,
      systemPrompt: judgeSystemPrompt,
      model: judgeConfig.model,
      userMessage: judgeUserMessage,
    };
  } catch (err) {
    oracle = {
      summary: "The oracle was unable to synthesize today's reading.",
      oneLiner: err instanceof Error ? err.message : String(err),
      durationMs: Date.now() - judgeStart,
      systemPrompt: judgeSystemPrompt,
      model: judgeConfig.model,
      userMessage: judgeUserMessage,
    };
  }

  const reading: DailyReadingResponse = {
    id: crypto.randomUUID(),
    generatedAt: new Date().toISOString(),
    input: { birthData, date },
    experts: expertReadings,
    oracle,
    totalDurationMs: Date.now() - start,
  };

  return Response.json(reading);
}
