import { generateObject } from "ai";
import { z } from "zod";
import { createOpenAI } from "@ai-sdk/openai";
import { experts } from "@/lib/experts/registry";
import { judgeConfig } from "@/lib/experts/judge";
import { runSingleExpert } from "@/lib/api/run-expert";
import { mockExpertResponses, mockJudgeVerdict } from "@/lib/mock-data";
import { EXPERT_ID_TO_TRADITION } from "@/lib/constants/traditions";
import { QuestionInputSchema } from "@/lib/api/schemas";
import type { CouncilReading, ExpertReading } from "@/lib/api/schemas";

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
  const parsed = QuestionInputSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { birthData, date, question } = parsed.data;

  const start = Date.now();

  if (process.env.MOCK_MODE === "true") {
    await sleep(800 + Math.random() * 400);
    const expertReadings: ExpertReading[] = mockExpertResponses.map((r) => {
      const traditionId = EXPERT_ID_TO_TRADITION[r.expertId];
      return {
        traditionId: (traditionId ?? "western") as ExpertReading["traditionId"],
        expertId: r.expertId,
        expertName: r.expertName,
        expertEmoji: r.expertEmoji,
        color: r.color,
        textColor: r.textColor,
        content: typeof r.content === "string"
          ? { facts: "", analysis: "", summary: r.content, oneLiner: r.content }
          : r.content,
        durationMs: 600 + Math.floor(Math.random() * 400),
      };
    });
    const reading: CouncilReading = {
      id: crypto.randomUUID(),
      generatedAt: new Date().toISOString(),
      input: { birthData, date, question },
      experts: expertReadings,
      oracle: {
        summary: mockJudgeVerdict.summary,
        oneLiner: mockJudgeVerdict.oneLiner,
        durationMs: 500,
      },
      totalDurationMs: Date.now() - start,
    };
    return Response.json(reading);
  }

  const userMessage = `${question}\n\nToday's date: ${date}`;

  const settled = await Promise.allSettled(
    experts.map((e) => runSingleExpert(e, userMessage, birthData))
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
  const expertOutputs = successful
    .map((r) => `### ${r.expertName}\n${r.content.analysis}`)
    .join("\n\n---\n\n");

  const judgeSystemPrompt = judgeConfig.systemPromptTemplate.replace("{expertOutputs}", expertOutputs);
  const judgeStart = Date.now();
  let oracle: CouncilReading["oracle"];

  const judgeSchema = z.object({
    summary: z.string().describe("3-5 sentence synthesized reading across all traditions"),
    oneLiner: z.string().describe("One sentence: the unified insight"),
  });

  try {
    const judgeResult = await generateObject({
      model: openrouter(judgeConfig.model),
      system: judgeSystemPrompt,
      messages: [{ role: "user", content: question }],
      schema: judgeSchema,
    });
    const obj = judgeResult.object as z.infer<typeof judgeSchema>;
    oracle = {
      summary: obj.summary,
      oneLiner: obj.oneLiner,
      durationMs: Date.now() - judgeStart,
    };
  } catch (err) {
    oracle = {
      summary: "The council was unable to synthesize a verdict.",
      oneLiner: err instanceof Error ? err.message : String(err),
      durationMs: Date.now() - judgeStart,
    };
  }

  const reading: CouncilReading = {
    id: crypto.randomUUID(),
    generatedAt: new Date().toISOString(),
    input: { birthData, date, question },
    experts: expertReadings,
    oracle,
    totalDurationMs: Date.now() - start,
  };

  return Response.json(reading);
}
