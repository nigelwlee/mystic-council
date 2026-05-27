import { generateObject } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { experts } from "@/lib/experts/registry";
import { judgeConfig, loadJudgePrompt } from "@/lib/experts/judge";
import { runSingleExpert, runWithFallback } from "@/lib/api/run-expert";
import { EXPERT_ID_TO_TRADITION } from "@/lib/constants/traditions";
import { ContextInputSchema, JudgeDailySchema } from "@/lib/api/schemas";
import { chartContextForTradition } from "@/lib/api/chart-context";
import { VOICE_RULES } from "@/lib/voice";
import { FORMAT_RULES } from "@/lib/format";
import type { DailyReadingResponse, ExpertReading } from "@/lib/api/schemas";
import { makeSeededTarotTools } from "@/lib/tools/tarot";
import { IS_MOCK_MODE, mockDelay, mockDailyReading } from "@/lib/mock";
import { bumpStreak } from "@/lib/api/streak";
import { getUserFromRequest } from "@/lib/api/auth";
import { buildChart } from "@/lib/api/build-chart";

export const maxDuration = 60;

const LUCK_HEADLINE: Record<string, string> = {
  Excellent: "A standout day — push forward",
  Strong: "Strong tailwinds across the council",
  Fair: "Mixed currents — pick your moments",
  Weak: "Hold steady — wait this one out",
};

function normStr(s: string) { return s.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim(); }

function fixedHeadline(headline: string | undefined | null, oneLiner: string, luck: string | undefined): string {
  const h = headline?.trim() ?? "";
  const ol = oneLiner.trim();
  const dup = !h || normStr(h) === normStr(ol) || normStr(ol).includes(normStr(h)) || normStr(h).includes(normStr(ol));
  return dup ? (LUCK_HEADLINE[luck ?? "Fair"] ?? LUCK_HEADLINE.Fair) : h;
}

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
  let chart = parsed.data.chart;
  const start = Date.now();
  const BUDGET_MS = 52_000;
  const deadline = start + BUDGET_MS;

  // Prefer Bearer token (mobile); fall back to cookie session (web)
  const authResult = await getUserFromRequest(req);
  const user: { id: string } | null = authResult?.user ?? null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dbClient: any = authResult?.dbClient ?? null;

  // Geocode birth location if lat/lng missing (mobile sends null from DB when not yet geocoded)
  if (birthData && !birthData.latitude && !birthData.longitude && birthData.location) {
    try {
      const geoAbort = new AbortController();
      const geoTimeout = setTimeout(() => geoAbort.abort(), 4_000);
      const geoRes = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(birthData.location)}`,
        { headers: { "Accept-Language": "en", "User-Agent": "mystic-council/1.0" }, signal: geoAbort.signal }
      );
      clearTimeout(geoTimeout);
      const geoData = await geoRes.json() as { lat: string; lon: string }[];
      if (geoData[0]) {
        birthData.latitude = parseFloat(parseFloat(geoData[0].lat).toFixed(4));
        birthData.longitude = parseFloat(parseFloat(geoData[0].lon).toFixed(4));
        // Persist back so the Me tab can display them
        if (user) {
          void dbClient
            .from("birth_data")
            .update({ latitude: birthData.latitude, longitude: birthData.longitude })
            .eq("user_id", user.id);
        }
      }
    } catch { /* non-fatal: experts degrade gracefully without coordinates */ }
  }

  const force = new URL(req.url).searchParams.get("force") === "1";

  // Cache check: if authenticated and not in mock mode, return cached daily reading
  if (user && !IS_MOCK_MODE && !force) {
    const { data: cached } = await dbClient
      .from("readings")
      .select("output")
      .eq("user_id", user.id)
      .eq("reading_date", date)
      .eq("kind", "daily")
      .maybeSingle();

    if (cached?.output) {
      const out = cached.output as DailyReadingResponse;
      const luck = out.oracle.commonThread?.luck;
      const healed = fixedHeadline(out.oracle.weaving?.headline, out.oracle.oneLiner, luck);
      if (healed !== (out.oracle.weaving?.headline ?? "")) {
        const patched: DailyReadingResponse = {
          ...out,
          oracle: { ...out.oracle, weaving: { ...(out.oracle.weaving ?? { subtitle: "", headline: "", checklist: [] }), headline: healed } },
        };
        // Write back so subsequent reads are clean
        void dbClient.from("readings").upsert(
          { user_id: user.id, kind: "daily", reading_date: date, input: out.input, output: patched, total_duration_ms: out.totalDurationMs },
          { onConflict: "user_id,kind,reading_date" }
        );
        return Response.json(patched);
      }
      return Response.json(out);
    }
  }

  if (IS_MOCK_MODE) {
    await mockDelay(300, 800);
    return Response.json(mockDailyReading(date));
  }

  // Pre-compute chart server-side so all experts receive deterministic, lat/lng-accurate
  // chart context and bypass the unreliable tool-calling path under gemini.
  if (!chart && birthData?.date) {
    try {
      chart = await buildChart(birthData, date, user?.id ?? undefined);
    } catch (err) {
      console.log(JSON.stringify({ event: "chart_prefetch_fail", err: err instanceof Error ? err.message : String(err) }));
      // fall back to per-expert tool-calling
    }
  }

  const dailyMessage = `Give me my daily reading for ${date}. What do the stars, cards, and numbers say about today?`;

  // Hard cap on the expert phase so the judge always has budget. Experts past the
  // window are treated as rejections — the existing settled.map builds error stubs.
  const EXPERT_PHASE_MS = 34_000;
  const settled = await Promise.race([
    Promise.allSettled(
      experts.map((e) => {
        const tid = EXPERT_ID_TO_TRADITION[e.id];
        const ctx = tid ? chartContextForTradition(chart, tid) : null;
        // For the tarot expert, inject date-seeded tools so the same date always yields the same cards
        const expertWithSeed =
          e.id === "madame-crow"
            ? { ...e, tools: makeSeededTarotTools(date) }
            : e;
        return runSingleExpert(expertWithSeed, dailyMessage, birthData, ctx, user?.id, deadline);
      })
    ),
    new Promise<PromiseSettledResult<ExpertReading & { durationMs: number }>[]>((resolve) =>
      setTimeout(() => {
        // Return all-rejected stubs so the map below still produces error entries
        resolve(
          experts.map(() => ({
            status: "rejected" as const,
            reason: new Error("Expert phase timed out"),
          }))
        );
      }, EXPERT_PHASE_MS)
    ),
  ]);

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
      content: { facts: "", analysis: "", summary: "", oneLiner: "", aspectSignals: [], status: "Fair" as const, action: "" },
      error: r.reason instanceof Error ? r.reason.message : String(r.reason),
    };
  });

  const successful = expertReadings.filter((r) => !r.error);
  console.log(JSON.stringify({
    tag: "[daily]",
    date,
    successCount: successful.length,
    failedExperts: expertReadings.filter((r) => r.error).map((r) => r.expertId),
  }));
  if (successful.length === 0) {
    return Response.json({ error: "All experts failed" }, { status: 502 });
  }

  const expertOutputs = successful
    .map((r) => {
      const signals = r.content.aspectSignals ?? [];
      const signalBlock = signals.length > 0
        ? `\nAspect signals:\n${signals.map((s) => `- ${s.aspect} (${s.strength}): ${s.note}`).join("\n")}`
        : "";
      const status = r.content.status ?? "Fair";
      const action = r.content.action ? `\nAction: ${r.content.action}` : "";
      return `### ${r.expertName} — Status: ${status}\n${r.content.summary}${action}${signalBlock}`;
    })
    .join("\n\n---\n\n");

  const judgePrompt = await loadJudgePrompt();
  const judgeSystemPrompt = judgePrompt.replace("{expertOutputs}", expertOutputs) + "\n\n" + VOICE_RULES + "\n\n" + FORMAT_RULES;
  const judgeStart = Date.now();

  const judgeUserMessage = `Synthesize a daily reading for ${date}. Compose weaving.headline as a short luck verdict (3-8 words) rolling up the council's statuses — it must differ from oneLiner.`;
  const judgeModels = [judgeConfig.model, ...(judgeConfig.fallbackModels ?? [])];
  let oracle: DailyReadingResponse["oracle"];
  // Cap judge to whatever budget remains, capped at 10s; skip entirely if out of budget.
  const judgeCap = Math.min(10_000, deadline - Date.now() - 4_000);
  try {
    if (judgeCap <= 0) throw new Error("Judge skipped — no budget remaining");
    const judgeResult = await runWithFallback(judgeModels, async (model) => {
      if (Date.now() >= deadline) throw new Error("Judge skipped — past global deadline");
      return Promise.race([
        generateObject({
          model: openrouter(model),
          system: judgeSystemPrompt,
          messages: [{ role: "user", content: judgeUserMessage }],
          schema: JudgeDailySchema,
          mode: "json",
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`Judge timed out after ${judgeCap}ms`)), judgeCap),
        ),
      ]);
    });

    // Guarantee weaving.headline is non-empty and distinct from oneLiner.
    {
      const luck = judgeResult.object.commonThread?.luck;
      const healed = fixedHeadline(judgeResult.object.weaving?.headline, judgeResult.object.oneLiner, luck);
      if (healed !== (judgeResult.object.weaving?.headline?.trim() ?? "")) {
        judgeResult.object.weaving = { ...(judgeResult.object.weaving ?? { subtitle: "", headline: "", checklist: [] }), headline: healed };
        console.log(JSON.stringify({ event: "weaving_headline_dedup", luck, healed }));
      }
    }

    oracle = {
      summary: judgeResult.object.summary,
      oneLiner: judgeResult.object.oneLiner,
      aspectCallouts: judgeResult.object.aspectCallouts ?? [],
      commonThread: judgeResult.object.commonThread,
      weaving: judgeResult.object.weaving,
      quote: judgeResult.object.quote,
      chimers: [],
      chimerCandidates: [],
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
    console.log(JSON.stringify({ event: "oracle_fail", endpoint: "daily", err: err instanceof Error ? err.message : String(err) }));
    oracle = {
      summary: "The oracle was unable to synthesize today's reading.",
      oneLiner: "Py fell silent — please try again.",
      aspectCallouts: [],
      chimers: [],
      chimerCandidates: [],
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
    const { error: dbError } = await dbClient
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
        { onConflict: "user_id,kind,reading_date" }
      );
    if (dbError) {
      console.error("[daily] Supabase upsert error:", dbError.message);
    }
    await bumpStreak(user.id, date);
  }

  return Response.json(reading);
}
