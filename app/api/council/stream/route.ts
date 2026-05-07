import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { parseJudgeOutput } from "@/lib/orchestrator";
import { experts } from "@/lib/experts/registry";
import { judgeChatConfig as judgeConfig } from "@/lib/experts/judge";
import { runSingleExpert } from "@/lib/api/run-expert";
import { EXPERT_ID_TO_TRADITION } from "@/lib/constants/traditions";
import { QuestionInputSchema, CouncilReadingSchema } from "@/lib/api/schemas";
import { chartContextForTradition, dailyPriorFrame } from "@/lib/api/chart-context";
import { VOICE_RULES } from "@/lib/voice";
import { FORMAT_RULES } from "@/lib/format";
import { makeSeededRng, makeDrawCardsTool } from "@/lib/tools/tarot";

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

      // Oracle synthesis
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
        const judgeSystemPrompt =
          judgeConfig.systemPromptTemplate.replace("{expertOutputs}", expertOutputs) +
          (priorFrame ?? "") +
          "\n\n" + VOICE_RULES +
          "\n\n" + FORMAT_RULES;
        emit({ type: "oracle-start" });
        const judgeStart = Date.now();
        try {
          const judgeResult = await generateText({
            model: openrouter(judgeConfig.model),
            system: judgeSystemPrompt,
            messages: [{ role: "user", content: question }],
          });
          const parsed = parseJudgeOutput(judgeResult.text);
          oracle = {
            summary: parsed.summary,
            oneLiner: parsed.oneLiner,
            chimers: parsed.chimers,
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
          oracle = {
            summary: "The council was unable to synthesize a verdict.",
            oneLiner: err instanceof Error ? err.message : String(err),
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
