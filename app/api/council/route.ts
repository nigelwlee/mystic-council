import { generateObject } from "ai";
import { z } from "zod";
import { createOpenAI } from "@ai-sdk/openai";
import { experts } from "@/lib/experts/registry";
import { judgeConfig, loadJudgePrompt } from "@/lib/experts/judge";
import { runSingleExpert, synthesize } from "@/lib/api/run-expert";
import { mockExpertResponses, mockJudgeVerdict } from "@/lib/mock-data";
import { EXPERT_ID_TO_TRADITION } from "@/lib/constants/traditions";
import { QuestionInputSchema } from "@/lib/api/schemas";
import { chartContextForTradition, dailyPriorFrame } from "@/lib/api/chart-context";
import type { CouncilReading, Digest, ExpertReading } from "@/lib/api/schemas";
import { IS_MOCK_MODE, mockDelay } from "@/lib/mock";
import { bumpStreak } from "@/lib/api/streak";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 90;

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

  // Resolve authenticated user for streak bump (non-blocking)
  const supabaseClient = await createClient();
  const { data: { user } } = await supabaseClient.auth.getUser();

  if (IS_MOCK_MODE) {
    await mockDelay(800, 1200);
    const expertReadings: ExpertReading[] = mockExpertResponses.map((r) => ({
      ...r,
      durationMs: 600 + Math.floor(Math.random() * 400),
    }));
    const reading: CouncilReading = {
      id: crypto.randomUUID(),
      generatedAt: new Date().toISOString(),
      input: { birthData, date, question },
      experts: expertReadings,
      oracle: { ...mockJudgeVerdict, durationMs: 500 },
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
      content: { facts: "", analysis: "", summary: "", oneLiner: "", aspectSignals: [] },
      error: r.reason instanceof Error ? r.reason.message : String(r.reason),
    };
  });

  const successful = expertReadings.filter((r) => !r.error);

  const priorFrame = dailyPriorFrame(dailyReading);
  const judgePrompt = await loadJudgePrompt();
  const oracle = await synthesize(expertReadings, {
    judgeConfig,
    systemPromptTemplate: judgePrompt,
    userMessage: question,
    priorFrame,
  });

  let digest: Digest | undefined;
  if (dailyDigest && successful.length > 0) {
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
    const digestSystemPrompt = judgePrompt.replace(
      "{expertOutputs}",
      oneLinerOutputs,
    );
    const digestStart = Date.now();
    try {
      const digestResult = await generateObject({
        model: openrouter(judgeConfig.model),
        system: digestSystemPrompt,
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

  if (user) await bumpStreak(user.id, date);

  return Response.json(reading);
}
