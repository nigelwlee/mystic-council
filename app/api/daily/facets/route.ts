import { generateObject } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { experts } from "@/lib/experts/registry";
import { judgeConfig, loadJudgeFacetsPrompt } from "@/lib/experts/judge";
import { runFacetExpert, runWithRetry } from "@/lib/api/run-expert";
import { EXPERT_ID_TO_TRADITION } from "@/lib/constants/traditions";
import { ContextInputSchema, FacetJudgeOutputSchema } from "@/lib/api/schemas";
import { chartContextForTradition } from "@/lib/api/chart-context";
import { VOICE_RULES } from "@/lib/voice";
import { FORMAT_RULES } from "@/lib/format";
import type { DailyFacetsResponse, FacetExpertResult } from "@/lib/api/schemas";
import { createClient } from "@/lib/supabase/server";
import { makeSeededTarotTools } from "@/lib/tools/tarot";

export const maxDuration = 60;

const FACETS = ["health", "work", "finances", "relations", "family"] as const;

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

  // Resolve authenticated user (if any) via Supabase session cookie
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Geocode birth location if lat/lng missing
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
        if (user) {
          void supabase
            .from("birth_data")
            .update({ latitude: birthData.latitude, longitude: birthData.longitude })
            .eq("user_id", user.id);
        }
      }
    } catch { /* non-fatal */ }
  }

  const force = new URL(req.url).searchParams.get("force") === "1";

  // Cache check
  if (user && !force) {
    const { data: cached } = await supabase
      .from("readings")
      .select("output")
      .eq("user_id", user.id)
      .eq("reading_date", date)
      .eq("kind", "daily-facets")
      .maybeSingle();

    if (cached?.output) {
      return Response.json(cached.output as DailyFacetsResponse);
    }
  }

  const facetMessage = `Give me detailed facet readings for ${date} across health, work, finances, relations, and family. What do your tradition's energies say about each of these life areas today?`;

  const settled = await Promise.allSettled(
    experts.map((e) => {
      const tid = EXPERT_ID_TO_TRADITION[e.id];
      const ctx = tid ? chartContextForTradition(chart, tid) : null;
      const expertWithSeed =
        e.id === "madame-crow"
          ? { ...e, tools: makeSeededTarotTools(date) }
          : e;
      return runFacetExpert(expertWithSeed, facetMessage, birthData, ctx);
    })
  );

  const expertResults: FacetExpertResult[] = settled.map((r, i) => {
    if (r.status === "fulfilled") return r.value;
    const e = experts[i]!;
    const tid = EXPERT_ID_TO_TRADITION[e.id];
    return {
      traditionId: (tid ?? "western") as FacetExpertResult["traditionId"],
      expertId: e.id,
      expertName: e.name,
      color: e.color,
      facets: {
        health:    { oneLiner: "", summary: "", analysis: "" },
        work:      { oneLiner: "", summary: "", analysis: "" },
        finances:  { oneLiner: "", summary: "", analysis: "" },
        relations: { oneLiner: "", summary: "", analysis: "" },
        family:    { oneLiner: "", summary: "", analysis: "" },
      },
      error: r.reason instanceof Error ? r.reason.message : String(r.reason),
    };
  });

  const successful = expertResults.filter((r) => !r.error);
  console.log(JSON.stringify({
    tag: "[daily-facets]",
    date,
    successCount: successful.length,
    failedExperts: expertResults.filter((r) => r.error).map((r) => r.expertId),
  }));
  if (successful.length === 0) {
    return Response.json({ error: "All experts failed" }, { status: 502 });
  }

  // Build expert outputs for judge — one section per expert, one block per facet
  const expertOutputs = successful.map((r) => {
    const facetSections = FACETS.map((f) => {
      const fc = r.facets[f];
      return `#### ${f.charAt(0).toUpperCase() + f.slice(1)}\n${fc.analysis || fc.summary}`;
    }).join("\n\n");
    return `### ${r.expertName}\n${facetSections}`;
  }).join("\n\n---\n\n");

  const judgePromptTemplate = await loadJudgeFacetsPrompt();
  const judgeSystemPrompt =
    judgePromptTemplate.replace("{expertOutputs}", expertOutputs) +
    "\n\n" + VOICE_RULES +
    "\n\n" + FORMAT_RULES;

  const judgeUserMessage = `Synthesize the five-facet readings for ${date}. Produce keyAction, summary, and oneLiner for each of health, work, finances, relations, and family.`;

  let oracleFacets: DailyFacetsResponse["oracle"]["facets"];
  try {
    const judgeResult = await runWithRetry(async (attempt) => {
      const attemptStart = Date.now();
      try {
        const result = await generateObject({
          model: openrouter(judgeConfig.model),
          system: judgeSystemPrompt,
          messages: [{ role: "user", content: judgeUserMessage }],
          schema: FacetJudgeOutputSchema,
        });
        console.log(JSON.stringify({ tag: "[facet-judge]", model: judgeConfig.model, attempt, ok: true, durationMs: Date.now() - attemptStart }));
        return result;
      } catch (err) {
        console.log(JSON.stringify({ tag: "[facet-judge]", model: judgeConfig.model, attempt, ok: false, durationMs: Date.now() - attemptStart, error: err instanceof Error ? err.message : String(err) }));
        throw err;
      }
    }, 3);
    oracleFacets = judgeResult.object.facets;
  } catch (err) {
    console.log(JSON.stringify({ tag: "[facet-judge]", event: "judge_failed", error: err instanceof Error ? err.message : String(err) }));
    // Fallback: extract first-expert one-liners and a placeholder key action
    const fallback = (facetKey: typeof FACETS[number]) => ({
      keyAction: "Consult your own judgment today.",
      summary: successful[0]?.facets[facetKey]?.summary ?? "No synthesis available.",
      oneLiner: successful[0]?.facets[facetKey]?.oneLiner ?? "The Oracle fell silent.",
    });
    oracleFacets = {
      health:    fallback("health"),
      work:      fallback("work"),
      finances:  fallback("finances"),
      relations: fallback("relations"),
      family:    fallback("family"),
    };
  }

  const response: DailyFacetsResponse = {
    generatedAt: new Date().toISOString(),
    totalDurationMs: Date.now() - start,
    input: { birthData, date },
    oracle: { facets: oracleFacets },
    experts: expertResults,
  };

  // Persist to Supabase if user is authenticated
  if (user) {
    const { error: dbError } = await supabase
      .from("readings")
      .upsert(
        {
          user_id: user.id,
          kind: "daily-facets",
          reading_date: date,
          input: { birthData, date },
          output: response as unknown as Record<string, unknown>,
          total_duration_ms: response.totalDurationMs,
        },
        { onConflict: "user_id,kind,reading_date" }
      );
    if (dbError) {
      console.error("[daily-facets] Supabase upsert error:", dbError.message);
    }
  }

  return Response.json(response);
}
