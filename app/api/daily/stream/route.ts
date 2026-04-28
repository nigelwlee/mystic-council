import { generateObject } from "ai";
import { z } from "zod";
import { createOpenAI } from "@ai-sdk/openai";
import { experts } from "@/lib/experts/registry";
import { judgeConfig } from "@/lib/experts/judge";
import { runSingleExpert } from "@/lib/api/run-expert";
import { EXPERT_ID_TO_TRADITION } from "@/lib/constants/traditions";
import { ContextInputSchema } from "@/lib/api/schemas";

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
  const { birthData, date } = parsed.data;
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
          const result = await runSingleExpert(expert, userMessage, birthData);
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
        const judgeSystemPrompt = judgeConfig.systemPromptTemplate.replace("{expertOutputs}", expertOutputs);
        emit({ type: "oracle-start" });
        const judgeStart = Date.now();
        const judgeSchema = z.object({
          summary: z.string().describe("2-3 sentence synthesized daily reading"),
          oneLiner: z.string().describe("One sentence: the unified daily insight"),
        });
        try {
          const judgeResult = await generateObject({
            model: openrouter(judgeConfig.model),
            system: judgeSystemPrompt,
            messages: [{ role: "user", content: `Synthesize a daily reading for ${date} in 2-3 sentences.` }],
            schema: judgeSchema,
          });
          const obj = judgeResult.object as z.infer<typeof judgeSchema>;
          oracle = {
            summary: obj.summary,
            oneLiner: obj.oneLiner,
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
          emit({ type: "oracle-error", error: err instanceof Error ? err.message : String(err) });
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
