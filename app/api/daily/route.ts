import { generateObject } from "ai";
import { z } from "zod";
import { createOpenAI } from "@ai-sdk/openai";
import { experts } from "@/lib/experts/registry";
import { judgeConfig } from "@/lib/experts/judge";
import { runSingleExpert } from "@/lib/api/run-expert";
import { EXPERT_ID_TO_TRADITION } from "@/lib/constants/traditions";
import { ContextInputSchema } from "@/lib/api/schemas";
import { chartContextForTradition } from "@/lib/api/chart-context";
import { VOICE_RULES } from "@/lib/voice";
import { FORMAT_RULES } from "@/lib/format";
import type { DailyReadingResponse, ExpertReading } from "@/lib/api/schemas";
import { createClient } from "@/lib/supabase/server";
import { makeSeededTarotTools } from "@/lib/tools/tarot";
import { IS_MOCK_MODE, mockDelay, mockDailyReading } from "@/lib/mock";

export const maxDuration = 60;

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
  const start = Date.now();

  // Geocode birth location if lat/lng missing (mobile sends null from DB when not yet geocoded)
  if (birthData && !birthData.latitude && !birthData.longitude && birthData.location) {
    try {
      const geoRes = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(birthData.location)}`,
        { headers: { "Accept-Language": "en", "User-Agent": "mystic-council/1.0" } }
      );
      const geoData = await geoRes.json() as { lat: string; lon: string }[];
      if (geoData[0]) {
        birthData.latitude = parseFloat(parseFloat(geoData[0].lat).toFixed(4));
        birthData.longitude = parseFloat(parseFloat(geoData[0].lon).toFixed(4));
      }
    } catch { /* non-fatal: experts degrade gracefully without coordinates */ }
  }

  // Resolve authenticated user (if any) via Supabase session cookie
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Cache check: if authenticated and not in mock mode, return cached daily reading
  if (user && !IS_MOCK_MODE) {
    const { data: cached } = await supabase
      .from("readings")
      .select("output")
      .eq("user_id", user.id)
      .eq("reading_date", date)
      .eq("kind", "daily")
      .maybeSingle();

    if (cached?.output) {
      return Response.json(cached.output as DailyReadingResponse);
    }
  }

  if (IS_MOCK_MODE) {
    await mockDelay(300, 800);
    return Response.json(mockDailyReading(date));
  }

  const dailyMessage = `Give me my daily reading for ${date}. What do the stars, cards, and numbers say about today?`;

  const settled = await Promise.allSettled(
    experts.map((e) => {
      const tid = EXPERT_ID_TO_TRADITION[e.id];
      const ctx = tid ? chartContextForTradition(chart, tid) : null;
      // For the tarot expert, inject date-seeded tools so the same date always yields the same cards
      const expertWithSeed =
        e.id === "madame-crow"
          ? { ...e, tools: makeSeededTarotTools(date) }
          : e;
      return runSingleExpert(expertWithSeed, dailyMessage, birthData, ctx);
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
  if (successful.length === 0) {
    return Response.json({ error: "All experts failed" }, { status: 502 });
  }

  const expertOutputs = successful
    .map((r) => `### ${r.expertName}\n${r.content.summary}`)
    .join("\n\n---\n\n");

  const judgeSystemPrompt = judgeConfig.systemPromptTemplate.replace("{expertOutputs}", expertOutputs) + "\n\n" + VOICE_RULES + "\n\n" + FORMAT_RULES;
  const judgeStart = Date.now();

  const judgeUserMessage = `Synthesize a daily reading for ${date} in 2-3 sentences.`;
  const JudgeDailySchema = z.object({
    summary: z.string(),
    oneLiner: z.string(),
  });
  let oracle: DailyReadingResponse["oracle"];
  try {
    const judgeResult = await generateObject({
      model: openrouter(judgeConfig.model),
      system: judgeSystemPrompt,
      messages: [{ role: "user", content: judgeUserMessage }],
      schema: JudgeDailySchema,
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

  // Persist to Supabase if user is authenticated
  if (user) {
    const { error: dbError } = await supabase
      .from("readings")
      .upsert(
        {
          user_id: user.id,
          kind: "daily",
          reading_date: date,
          input: { birthData, date },
          output: reading,
          total_duration_ms: reading.totalDurationMs,
        },
        { onConflict: "user_id,reading_date" }
      );
    if (dbError) {
      console.error("[daily] Supabase upsert error:", dbError.message);
    }
  }

  return Response.json(reading);
}
