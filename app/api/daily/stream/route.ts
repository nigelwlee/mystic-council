import { generateObject } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createHash } from "crypto";
import { z } from "zod";
import { experts } from "@/lib/experts/registry";
import { judgeConfig, loadJudgeDailyPrompt } from "@/lib/experts/judge";
import { runSingleExpert } from "@/lib/api/run-expert";
import { EXPERT_ID_TO_TRADITION } from "@/lib/constants/traditions";
import { ContextInputSchema, DailyReadingResponseSchema } from "@/lib/api/schemas";
import type { DailyReadingResponse } from "@/lib/api/schemas";
import { chartContextForTradition } from "@/lib/api/chart-context";
import { VOICE_RULES } from "@/lib/voice";
import { FORMAT_RULES } from "@/lib/format";
import { getPostHogClient } from "@/lib/posthog-server";
import { adminClient } from "@/lib/supabase/admin";
import { getUserFromRequest } from "@/lib/api/auth";

export const maxDuration = 90;

const openrouter = createOpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
});

const JudgeDailySchema = z.object({
  oneLiner: z.string().describe("One sentence, max 12 words. The clearest signal from today's readings."),
  summary: z.string().describe("2-3 sentences expanding on the one-liner. Plain language."),
  chimers: z.array(z.enum(["western", "vedic", "chinese", "tarot", "numerology"])).describe("0-2 tradition IDs whose reading is most prominent in today's patterns."),
});

function dailyCacheKey(birthData: Record<string, unknown> | null, date: string, userId: string): string {
  const canonical = JSON.stringify({
    userId,
    name: birthData?.name ?? "",
    birthdate: birthData?.date ?? "",
    time: birthData?.time ?? "",
    latitude: birthData?.latitude ?? null,
    longitude: birthData?.longitude ?? null,
  });
  return "v3:" + createHash("sha256").update(canonical + "|" + date).digest("hex").slice(0, 28);
}

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = ContextInputSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { birthData, date, chart } = parsed.data;

  const authResult = await getUserFromRequest(req);
  const streamUserId: string | null = authResult?.user.id ?? null;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const emit = (data: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      const runStart = Date.now();
      emit({ type: "run-start", endpoint: "daily", input: parsed.data });

      // ── Cache check ──────────────────────────────────────────────────────────
      const cacheKey = streamUserId ? dailyCacheKey(birthData as Record<string, unknown> | null, date, streamUserId) : null;
      if (streamUserId && cacheKey) {
        const { data: cached } = await adminClient
          .from("daily_reading_cache")
          .select("content")
          .eq("cache_key", cacheKey)
          .single() as { data: { content: unknown } | null };

        if (cached) {
          const hit = cached.content as DailyReadingResponse & { experts: Array<Record<string, unknown>>; oracle: Record<string, unknown> };
          console.log(JSON.stringify({ event: "cache_hit", endpoint: "daily", cacheKey }));
          for (const expert of hit.experts) {
            emit({ type: "expert-start", expertId: expert.expertId, expertName: expert.expertName, expertEmoji: expert.expertEmoji, color: expert.color, textColor: expert.textColor });
            emit({ type: "expert-complete", ...expert });
          }
          emit({ type: "oracle-start" });
          emit({ type: "oracle-complete", oracle: hit.oracle });
          emit({ type: "run-complete", ...hit, cached: true, totalDurationMs: Date.now() - runStart });
          controller.close();
          return;
        }
        console.log(JSON.stringify({ event: "cache_miss", endpoint: "daily", cacheKey }));
      }
      const expertPromises = experts.map(async (expert) => {
        emit({ type: "expert-start", expertId: expert.id, expertName: expert.name, expertEmoji: expert.emoji, color: expert.color, textColor: expert.textColor });
        try {
          const tid = EXPERT_ID_TO_TRADITION[expert.id];
          const ctx = tid ? chartContextForTradition(chart, tid) : null;
          const result = await runSingleExpert(expert, `Give me my daily reading for ${date}. What do the stars, cards, and numbers say about today?`, birthData, ctx);
          console.log(JSON.stringify({ event: "expert_complete", endpoint: "daily", expertId: expert.id, model: result.model, durationMs: result.durationMs, success: true }));
          emit({ type: "expert-complete", ...result });
          return result;
        } catch (err) {
          console.log(JSON.stringify({ event: "expert_complete", endpoint: "daily", expertId: expert.id, success: false, errorType: err instanceof Error ? err.constructor.name : "unknown" }));
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
        const judgePrompt = await loadJudgeDailyPrompt();
        const judgeSystemPrompt = judgePrompt.replace("{expertOutputs}", expertOutputs) + "\n\n" + VOICE_RULES + "\n\n" + FORMAT_RULES;
        emit({ type: "oracle-start" });
        const judgeStart = Date.now();
        try {
          const judgeResult = await generateObject({
            model: openrouter(judgeConfig.model),
            system: judgeSystemPrompt,
            messages: [{ role: "user", content: `Synthesize a daily reading for ${date} in 2-3 sentences.` }],
            schema: JudgeDailySchema,
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
            userMessage: `Synthesize a daily reading for ${date}.`,
          };
          emit({ type: "oracle-complete", oracle });
        } catch (err) {
          console.log(JSON.stringify({ event: "oracle_fail", endpoint: "daily/stream", err: err instanceof Error ? err.message : String(err) }));
          oracle = {
            summary: "The council was unable to synthesize a verdict.",
            oneLiner: "Py fell silent — please try again.",
            chimers: [],
            durationMs: Date.now() - judgeStart,
            systemPrompt: judgeSystemPrompt,
            model: judgeConfig.model,
            userMessage: `Synthesize a daily reading for ${date}.`,
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

      const schemaCheck = DailyReadingResponseSchema.safeParse(runComplete);
      if (!schemaCheck.success) {
        console.error("[daily/stream] Response schema mismatch:", JSON.stringify(schemaCheck.error.flatten()));
      }

      // ── Store to cache ────────────────────────────────────────────────────────
      if (streamUserId && cacheKey) {
        await adminClient.from("daily_reading_cache").upsert({
          cache_key: cacheKey,
          reading_date: date,
          content: runComplete,
        });
      }

      const posthog = getPostHogClient();
      posthog.capture({
        distinctId: streamUserId ?? "anonymous",
        event: "daily_request_completed",
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
