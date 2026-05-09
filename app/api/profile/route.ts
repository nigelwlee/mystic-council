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

export async function POST(req: Request) {
  const body = await req.json() as unknown;
  const parsed = ContextInputSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { birthData } = parsed.data;

  // Auth — cookie + Bearer fallback
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!birthData?.date) {
    return Response.json({ error: "Birth date required" }, { status: 400 });
  }

  const hash = await birthDataHash(birthData);
  const readingDate = birthData.date; // sentinel: use birthdate as the reading_date

  // Cache check
  const { data: cached } = await adminClient
    .from("readings")
    .select("output")
    .eq("user_id", user.id)
    .eq("kind", "profile")
    .eq("reading_date", readingDate)
    .maybeSingle();

  if (cached?.output) {
    const out = cached.output as { birthDataHash?: string };
    if (out.birthDataHash === hash) {
      return Response.json(cached.output);
    }
  }

  // Compute chart traditions (reuse same tool calls as /api/chart)
  const bd = birthData;
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
      { date: bd.date!, time: bd.time, readingDate: today },
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

  const chart = {
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

  // Run all 5 experts in parallel with chart context
  const settled = await Promise.allSettled(
    experts.map((e) => {
      const tid = EXPERT_ID_TO_TRADITION[e.id];
      const ctx = tid ? chartContextForTradition(chart, tid) : null;
      return runProfileExpert(e, birthData, ctx);
    })
  );

  const traditions: Record<string, { atGlance: string }> = {};
  settled.forEach((r, i) => {
    const e = experts[i]!;
    const tid = EXPERT_ID_TO_TRADITION[e.id] ?? e.id;
    if (r.status === "fulfilled" && !r.value.error) {
      traditions[tid] = { atGlance: r.value.atGlance };
    } else {
      const msg = r.status === "rejected"
        ? (r.reason instanceof Error ? r.reason.message : String(r.reason))
        : r.value.error ?? "Failed";
      traditions[tid] = { atGlance: msg };
    }
  });

  const output = {
    traditions,
    birthDataHash: hash,
    generatedAt: new Date().toISOString(),
  };

  const { error: dbError } = await adminClient
    .from("readings")
    .upsert(
      {
        user_id: user.id,
        kind: "profile",
        reading_date: readingDate,
        input: { birthData },
        output,
        total_duration_ms: null,
      },
      { onConflict: "user_id,kind,reading_date" }
    );

  if (dbError) {
    console.error("[profile] upsert error:", dbError.message);
  }

  return Response.json(output);
}
