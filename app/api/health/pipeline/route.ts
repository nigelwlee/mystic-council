import { experts } from "@/lib/experts/registry";
import { judgeConfig, loadJudgePrompt } from "@/lib/experts/judge";
import { mockExpertResponses } from "@/lib/mock-data";
import { synthesize } from "@/lib/api/run-expert";
import type { ExpertReading } from "@/lib/api/schemas";
import { EXPERT_ID_TO_TRADITION } from "@/lib/constants/traditions";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const TEST_BIRTH_DATA = {
  name: "Health Check",
  date: "1991-06-01",
  time: "11:44",
  location: "Manila, Philippines",
  latitude: 14.5904,
  longitude: 120.9804,
};

export async function GET(req: Request) {
  const mock = new URL(req.url).searchParams.get("mock") === "1";

  if (mock) {
    // Validate that the mock pipeline wiring works: registry, prompt loader, schema shapes.
    const start = Date.now();
    const expertChecks = experts.map((e) => ({
      id: e.id,
      hasModel: typeof e.model === "string" && e.model.length > 0,
      hasFallbacks: Array.isArray(e.fallbackModels),
      hasTools: typeof e.tools === "object",
    }));
    const expertReadings: ExpertReading[] = mockExpertResponses.map((r) => {
      const tid = EXPERT_ID_TO_TRADITION[r.expertId] ?? "western";
      return {
        traditionId: tid as ExpertReading["traditionId"],
        expertId: r.expertId,
        expertName: r.expertName,
        expertEmoji: r.expertEmoji,
        color: r.color,
        textColor: r.textColor,
        content: {
          facts: "",
          analysis: "",
          summary: typeof r.content === "string" ? r.content : r.content.summary ?? "",
          oneLiner: typeof r.content === "string" ? r.content : r.content.oneLiner ?? "",
          aspectSignals: [],
          status: "Fair" as const,
          action: "",
        },
      };
    });

    let judgePromptOk = false;
    try {
      await loadJudgePrompt();
      judgePromptOk = true;
    } catch { /* falls through */ }

    return Response.json({
      ok: expertChecks.every((e) => e.hasModel) && judgePromptOk,
      mode: "mock",
      durationMs: Date.now() - start,
      experts: expertChecks,
      judgeModel: judgeConfig.model,
      judgePromptLoaded: judgePromptOk,
      expertReadingsShape: { count: expertReadings.length, hasContent: expertReadings.every((r) => r.content.summary !== undefined) },
    });
  }

  // Live mode — fires real LLM calls. Only hit from /engine inspector, not CI.
  const start = Date.now();
  const judgePrompt = await loadJudgePrompt();
  const expertReadings: ExpertReading[] = mockExpertResponses.map((r) => {
    const tid = EXPERT_ID_TO_TRADITION[r.expertId] ?? "western";
    return {
      traditionId: tid as ExpertReading["traditionId"],
      expertId: r.expertId,
      expertName: r.expertName,
      expertEmoji: r.expertEmoji,
      color: r.color,
      textColor: r.textColor,
      content: {
        facts: "",
        analysis: "",
        summary: typeof r.content === "string" ? r.content : r.content.summary ?? "",
        oneLiner: typeof r.content === "string" ? r.content : r.content.oneLiner ?? "",
        aspectSignals: [],
        status: "Fair" as const,
        action: "",
      },
    };
  });

  try {
    const oracle = await synthesize(expertReadings, {
      judgeConfig,
      systemPromptTemplate: judgePrompt,
      userMessage: "Synthesize a brief health-check reading.",
      route: "council",
    });
    return Response.json({
      ok: !oracle.error,
      mode: "live",
      durationMs: Date.now() - start,
      oracle: { oneLiner: oracle.oneLiner, error: oracle.error },
      birthData: TEST_BIRTH_DATA,
    });
  } catch (err) {
    return Response.json(
      { ok: false, mode: "live", durationMs: Date.now() - start, error: err instanceof Error ? err.message : String(err) },
      { status: 502 }
    );
  }
}
