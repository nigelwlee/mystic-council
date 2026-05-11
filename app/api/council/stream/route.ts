import { generateObject } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { z } from "zod";
import { experts } from "@/lib/experts/registry";
import { judgeConfig, loadJudgeChatPrompt } from "@/lib/experts/judge";
import { runSingleExpert } from "@/lib/api/run-expert";
import { EXPERT_ID_TO_TRADITION } from "@/lib/constants/traditions";
import { QuestionInputSchema, CouncilReadingSchema } from "@/lib/api/schemas";
import { chartContextForTradition, dailyPriorFrame } from "@/lib/api/chart-context";
import { VOICE_RULES } from "@/lib/voice";
import { FORMAT_RULES } from "@/lib/format";
import { makeSeededRng, makeDrawCardsTool } from "@/lib/tools/tarot";
import { getPostHogClient } from "@/lib/posthog-server";

// Daily tarot: seeded by date+question so the daily reading is stable.
// Council (chat): seeded by date+question+userId so each user gets unique cards
// but the same user asking the same question on the same day gets the same draw
// (safe to cache), while two users never share a seed.
async function drawQuestionCards(date: string, question: string, userId?: string) {
  const seed = userId ? `${userId}:${date}:${question}` : `${date}:${question}`;
  const rng = makeSeededRng(seed);
  const drawTool = makeDrawCardsTool(rng);
  return drawTool.execute!({ spread: "three-card", question }, {} as never);
}

export const maxDuration = 90;

const openrouter = createOpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
});

const JudgeChatSchema = z.object({
  oneLiner: z.string().describe("1-2 sentences, conversational, under 30 words. The Oracle's direct answer."),
  summary: z.string().describe("Plain-spoken reply, 2-3 sentences max."),
  chimers: z.array(z.enum(["western", "vedic", "chinese", "tarot", "numerology"])).describe("0-2 tradition IDs whose reading most directly addresses the question."),
});

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = QuestionInputSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { birthData, date, question, chart, dailyReading, userId } = parsed.data;
  const userMessage = `${question}\n\nToday's date: ${date}`;

  // Pre-draw tarot cards: seeded per (userId, date, question) — concurrency-safe,
  // same user/day/question always draws the same cards, different users don't share seeds.
  const questionCards = await drawQuestionCards(date, question, userId);

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const emit = (data: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      const runStart = Date.now();
      emit({ type: "run-start", endpoint: "council", input: parsed.data });

      // All experts run in parallel; each emits its own complete event as it finishes
      const expertPromises = experts.map(async (expert) => {
        emit({ type: "expert-start", expertId: expert.id, expertName: expert.name, expertEmoji: expert.emoji, color: expert.color, textColor: expert.textColor });
        try {
          const tid = EXPERT_ID_TO_TRADITION[expert.id];
          let ctx = tid ? chartContextForTradition(chart, tid) : null;
          // Inject question-specific seeded cards for Madame Crow
          if (expert.id === "madame-crow") {
            const cardCtx = `Pre-drawn tarot cards for this specific question (use these directly — do not call drawCards):\n\`\`\`json\n${JSON.stringify(questionCards, null, 2)}\n\`\`\`\n\n`;
            ctx = (ctx ?? "") + cardCtx;
          }
          const result = await runSingleExpert(expert, userMessage, birthData, ctx);
          console.log(JSON.stringify({ event: "expert_complete", endpoint: "council", expertId: expert.id, model: result.model, durationMs: result.durationMs, success: true }));
          emit({ type: "expert-complete", ...result });
          return result;
        } catch (err) {
          console.log(JSON.stringify({ event: "expert_complete", endpoint: "council", expertId: expert.id, success: false, errorType: err instanceof Error ? err.constructor.name : "unknown" }));
          const tid = EXPERT_ID_TO_TRADITION[expert.id];
          const errResult = {
            traditionId: (tid ?? "western") as "western" | "chinese" | "vedic" | "tarot" | "numerology",
            expertId: expert.id,
            expertName: expert.name,
            expertEmoji: expert.emoji,
            color: expert.color,
            textColor: expert.textColor,
            content: { facts: "", analysis: "", summary: "", oneLiner: "" },
            error: err instanceof Error ? err.message : String(err),
          };
          emit({ type: "expert-complete", ...errResult });
          return errResult;
        }
      });

      const expertReadings = await Promise.all(expertPromises);

      // ── Oracle synthesis with generateObject ─────────────────────────────────
      const successful = expertReadings.filter((r) => !r.error);
      let oracle: unknown = undefined;
      if (successful.length > 0) {
        const expertOutputs = successful
          .map((r) => {
            const parts = [`### ${r.expertName}`];
            if (r.content.facts) parts.push(`**Facts:** ${r.content.facts}`);
            parts.push(r.content.analysis);
            return parts.join("\n");
          })
          .join("\n\n---\n\n");
        const priorFrame = dailyPriorFrame(dailyReading);
        const judgePrompt = await loadJudgeChatPrompt();
        const judgeSystemPrompt =
          judgePrompt.replace("{expertOutputs}", expertOutputs) +
          (priorFrame ?? "") +
          "\n\n" + VOICE_RULES +
          "\n\n" + FORMAT_RULES;
        emit({ type: "oracle-start" });
        const judgeStart = Date.now();
        try {
          const judgeResult = await generateObject({
            model: openrouter(judgeConfig.model),
            system: judgeSystemPrompt,
            messages: [{ role: "user", content: question }],
            schema: JudgeChatSchema,
          });
          oracle = {
            summary: judgeResult.object.summary,
            oneLiner: judgeResult.object.oneLiner,
            chimers: judgeResult.object.chimers,
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
          emit({ type: "oracle-complete", oracle });
        } catch (err) {
          console.log(JSON.stringify({ event: "oracle_fail", endpoint: "council/stream", err: err instanceof Error ? err.message : String(err) }));
          oracle = {
            summary: "The council was unable to synthesize a verdict.",
            oneLiner: "Py fell silent — please try again.",
            chimers: [],
            durationMs: Date.now() - judgeStart,
            systemPrompt: judgeSystemPrompt,
            model: judgeConfig.model,
            userMessage: question,
          };
          emit({ type: "oracle-complete", oracle });
        }
      }

      const runComplete = {
        type: "run-complete",
        id: crypto.randomUUID(),
        generatedAt: new Date().toISOString(),
        input: parsed.data,
        experts: expertReadings,
        oracle,
        totalDurationMs: Date.now() - runStart,
      };

      const schemaCheck = CouncilReadingSchema.safeParse(runComplete);
      if (!schemaCheck.success) {
        console.error("[council/stream] Response schema mismatch:", JSON.stringify(schemaCheck.error.flatten()));
      }

      const posthog = getPostHogClient();
      const distinctId = userId ?? parsed.data.birthData?.name ?? "anonymous";
      posthog.capture({
        distinctId,
        event: "council_request_completed",
        properties: {
          expertCount: expertReadings.length,
          failedExperts: expertReadings.filter((r) => r.error).length,
          oracleSuccess: !!oracle,
          totalDurationMs: runComplete.totalDurationMs,
          date,
        },
      });

      emit(runComplete);
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
