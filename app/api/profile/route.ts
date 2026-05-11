import { experts } from "@/lib/experts/registry";
import { EXPERT_ID_TO_TRADITION } from "@/lib/constants/traditions";
import { chartContextForTradition } from "@/lib/api/chart-context";
import { runProfileExpert } from "@/lib/api/run-profile-expert";
import { ContextInputSchema } from "@/lib/api/schemas";
import { westernAstrologyTools } from "@/lib/tools/astrology";
import { chineseAstrologyTools } from "@/lib/tools/chinese";
import { vedicAstrologyTools } from "@/lib/tools/vedic";
import { numerologyTools } from "@/lib/tools/numerology";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";

export const maxDuration = 120;

const EXPECTED_TRADITIONS = ["western", "vedic", "chinese", "numerology", "tarot"] as const;
type TraditionId = (typeof EXPECTED_TRADITIONS)[number];

async function birthDataHash(bd: {
  date?: string | null;
  time?: string | null;
  location?: string | null;
  latitude?: number | null;
  longitude?: number | null;
} | null): Promise<string> {
  const str = `${bd?.date ?? ""}|${bd?.time ?? ""}|${bd?.location ?? ""}|${bd?.latitude ?? ""}|${bd?.longitude ?? ""}`;
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function computeChart(bd: {
  date?: string | null;
  time?: string | null;
  location?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  name?: string | null;
}) {
  const today = new Date().toLocaleDateString("en-CA");
  const [western, chinese, vedic, lifePathResult, nameResult] = await Promise.all([
    westernAstrologyTools.calculateBirthChart.execute!(
      {
        date: bd.date!,
        time: bd.time ?? undefined,
        latitude: bd.latitude ?? undefined,
        longitude: bd.longitude ?? undefined,
      },
      {} as never
    ),
    chineseAstrologyTools.calculateChineseChart.execute!(
      { date: bd.date!, time: bd.time ?? undefined, readingDate: today },
      {} as never
    ),
    vedicAstrologyTools.calculateVedicChart.execute!(
      {
        date: bd.date!,
        time: bd.time ?? undefined,
        latitude: bd.latitude ?? undefined,
        longitude: bd.longitude ?? undefined,
      },
      {} as never
    ),
    numerologyTools.calculateLifePath.execute!({ birthdate: bd.date! }, {} as never),
    bd.name
      ? numerologyTools.calculateNameNumbers.execute!({ fullName: bd.name }, {} as never)
      : Promise.resolve(null),
  ]);

  return {
    traditions: {
      western: western ? { ...western } : null,
      chinese: chinese ?? null,
      vedic: vedic ?? null,
      numerology: lifePathResult || nameResult
        ? { lifePath: lifePathResult, nameNumbers: nameResult }
        : null,
      tarot: null,
    },
  };
}

export async function POST(req: Request) {
  const body = await req.json() as unknown;
  const parsed = ContextInputSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { birthData } = parsed.data;
  const force = new URL(req.url).searchParams.get("force") === "1";

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!birthData?.date) {
    return Response.json({ error: "Birth date required" }, { status: 400 });
  }

  const hash = await birthDataHash(birthData);

  // ── Per-tradition cache lookup ───────────────────────────────────────────────
  const { data: existingRows } = await adminClient
    .from("profile_summaries")
    .select("tradition_id, at_glance, birth_data_hash")
    .eq("user_id", user.id);

  const cachedMap = new Map<string, string>();
  for (const row of (existingRows ?? []) as Array<{ tradition_id: string; at_glance: string; birth_data_hash: string }>) {
    if (row.birth_data_hash === hash && row.at_glance) {
      cachedMap.set(row.tradition_id, row.at_glance);
    }
  }

  const missingTraditions: TraditionId[] = force
    ? [...EXPECTED_TRADITIONS]
    : EXPECTED_TRADITIONS.filter((t) => !cachedMap.has(t));

  // Cache hit — all traditions present for this birth data hash
  if (missingTraditions.length === 0) {
    const traditions: Record<string, { atGlance: string; status: "ready" }> = {};
    for (const t of EXPECTED_TRADITIONS) {
      traditions[t] = { atGlance: cachedMap.get(t)!, status: "ready" };
    }
    console.log(JSON.stringify({ tag: "[profile]", userId: user.id, cache: "hit" }));
    return Response.json({ traditions, birthDataHash: hash, generatedAt: new Date().toISOString() });
  }

  // ── Hydrate chart facts ─────────────────────────────────────────────────────
  const { data: bdRow } = await adminClient
    .from("birth_data")
    .select("chart_facts")
    .eq("user_id", user.id)
    .maybeSingle();

  const storedChartFacts = (bdRow as { chart_facts?: { birthDataHash?: string; traditions?: Record<string, unknown> } } | null)?.chart_facts;
  let chart: { traditions: Record<string, unknown> };

  if (storedChartFacts?.birthDataHash === hash && storedChartFacts.traditions) {
    chart = { traditions: storedChartFacts.traditions };
    console.log(JSON.stringify({ tag: "[profile]", userId: user.id, chartCache: "hit" }));
  } else {
    chart = await computeChart(birthData);
    // Persist chart facts for subsequent profile + chat calls
    const { error: chartUpsertError } = await adminClient
      .from("birth_data")
      .update({ chart_facts: { birthDataHash: hash, traditions: chart.traditions } })
      .eq("user_id", user.id);
    if (chartUpsertError) {
      console.error("[profile] chart_facts upsert error:", chartUpsertError.message);
    }
    console.log(JSON.stringify({ tag: "[profile]", userId: user.id, chartCache: "miss" }));
  }

  // ── Run only the missing/stale traditions ───────────────────────────────────
  const missingExperts = experts.filter((e) => {
    const tid = EXPERT_ID_TO_TRADITION[e.id];
    return tid && (missingTraditions as string[]).includes(tid);
  });

  const settled = await Promise.allSettled(
    missingExperts.map((e) => {
      const tid = EXPERT_ID_TO_TRADITION[e.id]!;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ctx = chartContextForTradition(chart as any, tid);
      return runProfileExpert(e, birthData, ctx);
    })
  );

  // ── Per-tradition upsert — failures don't poison cached successes ───────────
  const newTraditions: Record<string, { atGlance: string; status: "ready" | "failed" }> = {};
  await Promise.allSettled(
    settled.map(async (r, i) => {
      const expert = missingExperts[i]!;
      const tid = EXPERT_ID_TO_TRADITION[expert.id]!;
      if (r.status === "fulfilled" && !r.value.error && r.value.atGlance) {
        newTraditions[tid] = { atGlance: r.value.atGlance, status: "ready" };
        const { error: summaryError } = await adminClient
          .from("profile_summaries")
          .upsert(
            {
              user_id: user.id,
              tradition_id: tid,
              at_glance: r.value.atGlance,
              birth_data_hash: hash,
              generated_at: new Date().toISOString(),
            },
            { onConflict: "user_id,tradition_id" }
          );
        if (summaryError) {
          console.error(`[profile] summary upsert error (${tid}):`, summaryError.message);
        }
      } else {
        const errMsg =
          r.status === "rejected"
            ? r.reason instanceof Error ? r.reason.message : String(r.reason)
            : r.value.error ?? "Failed";
        console.warn(`[profile] expert ${expert.id} failed: ${errMsg}`);
        newTraditions[tid] = { atGlance: "", status: "failed" };
      }
    })
  );

  // ── Merge cached + newly computed ───────────────────────────────────────────
  const traditions: Record<string, { atGlance: string; status: "ready" | "failed" }> = {};
  for (const t of EXPECTED_TRADITIONS) {
    if ((missingTraditions as string[]).includes(t)) {
      traditions[t] = newTraditions[t] ?? { atGlance: "", status: "failed" };
    } else {
      traditions[t] = { atGlance: cachedMap.get(t)!, status: "ready" };
    }
  }

  const successCount = Object.values(traditions).filter((v) => v.status === "ready").length;
  console.log(JSON.stringify({
    tag: "[profile]",
    userId: user.id,
    cache: "miss",
    computed: missingTraditions,
    successCount,
    failedTraditions: Object.entries(traditions)
      .filter(([, v]) => v.status === "failed")
      .map(([k]) => k),
  }));

  return Response.json({ traditions, birthDataHash: hash, generatedAt: new Date().toISOString() });
}
