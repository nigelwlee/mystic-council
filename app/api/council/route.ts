import { generateObject } from "ai";
import { z } from "zod";
import { createOpenAI } from "@ai-sdk/openai";
import { experts } from "@/lib/experts/registry";
import { judgeConfig } from "@/lib/experts/judge";
import { runSingleExpert } from "@/lib/api/run-expert";
import { mockExpertResponses, mockJudgeVerdict } from "@/lib/mock-data";
import { EXPERT_ID_TO_TRADITION } from "@/lib/constants/traditions";
import { QuestionInputSchema } from "@/lib/api/schemas";
import { chartContextForTradition, dailyPriorFrame } from "@/lib/api/chart-context";
import { VOICE_RULES } from "@/lib/voice";
import { FORMAT_RULES } from "@/lib/format";
import type { CouncilReading, Digest, ExpertReading } from "@/lib/api/schemas";

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
  const { birthData, date, question, dailyDigest, chart, dailyReading } = parsed.data;

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
      digest: dailyDigest
        ? {
            oneLiner: "A day of reflection and quiet momentum.",
            summary: "The stars align for internal work today. Trust your instincts and proceed with care.",
            expertExcerpts: { western: "Sun trines your natal Moon.", chinese: "The Wood Rooster favors steady progress.", vedic: "Moon in 4th brings domestic harmony.", tarot: "The Hermit counsels reflection.", numerology: "Life path 7 — a day for inner wisdom." },
            durationMs: 200,
          }
        : undefined,
      totalDurationMs: Date.now() - start,
    };
    return Response.json(reading);
  }

  const userMessage = `${question}\n\nToday's date: ${date}`;

  const settled = await Promise.allSettled(
    experts.map((e) => {
      const tid = EXPERT_ID_TO_TRADITION[e.id];
      const ctx = tid ? chartContextForTradition(chart, tid) : null;
      return runSingleExpert(e, userMessage, birthData, ctx);
    })
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

  const priorFrame = dailyPriorFrame(dailyReading);
  const judgeSystemPrompt =
    judgeConfig.systemPromptTemplate.replace("{expertOutputs}", expertOutputs) +
    (priorFrame ?? "") +
    "\n\n" + VOICE_RULES +
    "\n\n" + FORMAT_RULES;
  const judgeStart = Date.now();
  let oracle: CouncilReading["oracle"];

  const JudgeCouncilSchema = z.object({
    summary: z.string(),
    oneLiner: z.string(),
  });
  try {
    const judgeResult = await generateObject({
      model: openrouter(judgeConfig.model),
      system: judgeSystemPrompt,
      messages: [{ role: "user", content: question }],
      schema: JudgeCouncilSchema,
    });
    oracle = {
      summary: judgeResult.object.summary,
      oneLiner: judgeResult.object.oneLiner,
      durationMs: Date.now() - judgeStart,
      usage: judgeResult.usage
        ? {
            promptTokens: judgeResult.usage.promptTokens,
            completionTokens: judgeResult.usage.completionTokens,
            totalTokens: judgeResult.usage.totalTokens,
          }
        : undefined,
      systemPrompt: judgeSystemPrompt,
      model: judgeConfig.model,
      userMessage: question,
    };
  } catch (err) {
    oracle = {
      summary: "The council was unable to synthesize a verdict.",
      oneLiner: err instanceof Error ? err.message : String(err),
      durationMs: Date.now() - judgeStart,
      systemPrompt: judgeSystemPrompt,
      model: judgeConfig.model,
      userMessage: question,
    };
  }

  let digest: Digest | undefined;
  if (dailyDigest) {
    const oneLinerOutputs = successful
      .map((r) => `${r.expertName}: ${r.content.oneLiner}`)
      .join("\n");
    const digestSchema = z.object({
      oneLiner: z.string().describe("One sentence daily reading"),
      summary: z.string().describe("2-3 sentence daily overview"),
      expertExcerpts: z.object({
        western: z.string().optional(),
        chinese: z.string().optional(),
        vedic: z.string().optional(),
        tarot: z.string().optional(),
        numerology: z.string().optional(),
      }).describe("One short sentence per tradition capturing their key daily insight"),
    });
    const digestStart = Date.now();
    try {
      const digestResult = await generateObject({
        model: openrouter(judgeConfig.model),
        system: judgeSystemPrompt,
        messages: [
          {
            role: "user",
            content: `Based on these expert one-liners, produce a daily reading digest for ${date}:\n\n${oneLinerOutputs}`,
          },
        ],
        schema: digestSchema,
      });
      const d = digestResult.object as z.infer<typeof digestSchema>;
      digest = {
        oneLiner: d.oneLiner,
        summary: d.summary,
        expertExcerpts: d.expertExcerpts,
        durationMs: Date.now() - digestStart,
        usage: digestResult.usage
          ? {
              promptTokens: digestResult.usage.promptTokens,
              completionTokens: digestResult.usage.completionTokens,
              totalTokens: digestResult.usage.totalTokens,
            }
          : undefined,
      };
    } catch {
      // digest is optional — don't fail the whole request
    }
  }

  const reading: CouncilReading = {
    id: crypto.randomUUID(),
    generatedAt: new Date().toISOString(),
    input: { birthData, date, question },
    experts: expertReadings,
    oracle,
    digest,
    totalDurationMs: Date.now() - start,
  };

  return Response.json(reading);
}
