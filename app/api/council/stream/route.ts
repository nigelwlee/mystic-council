import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { parseJudgeOutput } from "@/lib/orchestrator";
import { experts } from "@/lib/experts/registry";
import { judgeConfig } from "@/lib/experts/judge";
import { runSingleExpert } from "@/lib/api/run-expert";
import { EXPERT_ID_TO_TRADITION } from "@/lib/constants/traditions";
import { QuestionInputSchema } from "@/lib/api/schemas";
import { chartContextForTradition, dailyPriorFrame } from "@/lib/api/chart-context";
import { VOICE_RULES } from "@/lib/voice";
import { FORMAT_RULES } from "@/lib/format";
import { tarotTools } from "@/lib/tools/tarot";

// Seeded PRNG — same question on same day always draws the same cards
function seededRng(seed: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  }
  let state = h >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let z = state;
    z = Math.imul(z ^ (z >>> 15), z | 1);
    z ^= z + Math.imul(z ^ (z >>> 7), z | 61);
    return ((z ^ (z >>> 14)) >>> 0) / 4294967296;
  };
}

async function drawQuestionCards(date: string, question: string) {
  const seed = `${date}:${question}`;
  const rng = seededRng(seed);
  const original = Math.random;
  Math.random = rng;
  try {
    return await tarotTools.drawCards.execute!({ spread: "three-card", question }, {} as never);
  } finally {
    Math.random = original;
  }
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
  const { birthData, date, question, chart, dailyReading } = parsed.data;
  const userMessage = `${question}\n\nToday's date: ${date}`;

  // Pre-draw question-seeded tarot cards for Madame Crow
  const questionCards = await drawQuestionCards(date, question);

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
          emit({ type: "expert-complete", ...result });
          return result;
        } catch (err) {
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
          .map((r) => `### ${r.expertName}\n${r.content.analysis}`)
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

      emit({
        type: "run-complete",
        id: crypto.randomUUID(),
        generatedAt: new Date().toISOString(),
        input: parsed.data,
        experts: expertReadings,
        oracle,
        totalDurationMs: Date.now() - runStart,
      });
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
