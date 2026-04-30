import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { parseJudgeOutput } from "@/lib/orchestrator";
import { experts } from "@/lib/experts/registry";
import { judgeDailyConfig as judgeConfig } from "@/lib/experts/judge";
import { runSingleExpert } from "@/lib/api/run-expert";
import { EXPERT_ID_TO_TRADITION } from "@/lib/constants/traditions";
import { ContextInputSchema } from "@/lib/api/schemas";
import { chartContextForTradition } from "@/lib/api/chart-context";
import { VOICE_RULES } from "@/lib/voice";
import { FORMAT_RULES } from "@/lib/format";

export const maxDuration = 90;

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
  const { birthData, date, chart } = parsed.data;
  const userMessage = `Give me my daily reading for ${date}. What do the stars, cards, and numbers say about today?`;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const emit = (data: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      const runStart = Date.now();
      emit({ type: "run-start", endpoint: "daily", input: parsed.data });

      const expertPromises = experts.map(async (expert) => {
        emit({ type: "expert-start", expertId: expert.id, expertName: expert.name, expertEmoji: expert.emoji, color: expert.color, textColor: expert.textColor });
        try {
          const tid = EXPERT_ID_TO_TRADITION[expert.id];
          const ctx = tid ? chartContextForTradition(chart, tid) : null;
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

      const successful = expertReadings.filter((r) => !r.error);
      let oracle: unknown = undefined;
      if (successful.length > 0) {
        const expertOutputs = successful
          .map((r) => `### ${r.expertName}\n${r.content.summary}`)
          .join("\n\n---\n\n");
        const judgeSystemPrompt = judgeConfig.systemPromptTemplate.replace("{expertOutputs}", expertOutputs) + "\n\n" + VOICE_RULES + "\n\n" + FORMAT_RULES;
        emit({ type: "oracle-start" });
        const judgeStart = Date.now();
        try {
          const judgeResult = await generateText({
            model: openrouter(judgeConfig.model),
            system: judgeSystemPrompt,
            messages: [{ role: "user", content: `Synthesize a daily reading for ${date} in 2-3 sentences.` }],
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
            userMessage: `Synthesize a daily reading for ${date}.`,
          };
          emit({ type: "oracle-complete", oracle });
        } catch (err) {
          oracle = {
            summary: "The council was unable to synthesize a verdict.",
            oneLiner: err instanceof Error ? err.message : String(err),
            durationMs: Date.now() - judgeStart,
            systemPrompt: judgeSystemPrompt,
            model: judgeConfig.model,
            userMessage: `Synthesize a daily reading for ${date}.`,
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
