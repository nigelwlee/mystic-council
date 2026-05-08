import { westernAstrologyTools } from "@/lib/tools/astrology";
import { chineseAstrologyTools } from "@/lib/tools/chinese";
import { vedicAstrologyTools } from "@/lib/tools/vedic";
import { numerologyTools } from "@/lib/tools/numerology";
import { makeSeededRng, makeDrawCardsTool } from "@/lib/tools/tarot";
import { ContextInputSchema, ChartDataSchema } from "@/lib/api/schemas";
import type { ChartData } from "@/lib/api/schemas";

export const maxDuration = 15;

// In-process chart cache: key = (birthData + date), TTL = 24h.
// Reset on cold start. Drop-in replaceable with a DB cache layer when ready.
const chartCache = new Map<string, { data: ChartData; expiresAt: number }>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

// Concurrency-safe seeded daily tarot draw — uses makeSeededRng, not Math.random
async function drawDailyCards(date: string, userId?: string) {
  const seed = userId ? `${userId}:daily:${date}` : `daily:${date}`;
  const rng = makeSeededRng(seed);
  const drawTool = makeDrawCardsTool(rng);
  return drawTool.execute!({ spread: "three-card", question: `Daily reading for ${date}` }, {} as never);
}

export async function POST(req: Request) {
  const body = await req.json() as unknown;
  const parsed = ContextInputSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { birthData, date, userId } = parsed.data;

  // Cache check — same birth data + date within 24h returns instantly
  const cacheKey = JSON.stringify({ birthData, date });
  const cached = chartCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return Response.json(cached.data);
  }

  const bd = birthData ?? {};
  const start = Date.now();

  const [western, chinese, vedic, lifePathResult, nameResult, personalNumbersResult, pinnaclesResult, westernTransits, tarot] = await Promise.all([
    bd.date
      ? westernAstrologyTools.calculateBirthChart.execute!(

          { date: bd.date, time: bd.time ?? undefined, latitude: bd.latitude ?? undefined, longitude: bd.longitude ?? undefined },

          { date: bd.date, time: bd.time ?? undefined, latitude: bd.latitude ?? undefined, longitude: bd.longitude ?? undefined },

          {} as never
        )
      : Promise.resolve(null),

    bd.date
      ? chineseAstrologyTools.calculateChineseChart.execute!(
          { date: bd.date, time: bd.time, readingDate: date },
          {} as never
        )
      : Promise.resolve(null),

    bd.date
      ? vedicAstrologyTools.calculateVedicChart.execute!(

          { date: bd.date, time: bd.time ?? undefined, latitude: bd.latitude ?? undefined, longitude: bd.longitude ?? undefined },

          { date: bd.date, time: bd.time ?? undefined, latitude: bd.latitude ?? undefined, longitude: bd.longitude ?? undefined },

          {} as never
        )
      : Promise.resolve(null),

    bd.date
      ? numerologyTools.calculateLifePath.execute!({ birthdate: bd.date }, {} as never)
      : Promise.resolve(null),

    bd.name
      ? numerologyTools.calculateNameNumbers.execute!({ fullName: bd.name }, {} as never)
      : Promise.resolve(null),

    bd.date
      ? numerologyTools.calculatePersonalNumbers.execute!({ birthdate: bd.date, date }, {} as never)
      : Promise.resolve(null),

    bd.date
      ? numerologyTools.calculatePinnaclesAndChallenges.execute!({ birthdate: bd.date }, {} as never)
      : Promise.resolve(null),

    westernAstrologyTools.calculateTransitsForDate.execute!({ date }, {} as never),

    drawDailyCards(date, userId),
  ]);

  const result: ChartData = {
    id: crypto.randomUUID(),
    generatedAt: new Date().toISOString(),
    input: { birthData, date },
    traditions: {
      western: western
        ? { ...western, transits: westernTransits }
        : { note: "No birth date provided", transits: westernTransits },
      chinese: chinese ?? { note: "No birth date provided" },
      vedic: vedic ?? { note: "No birth date provided" },
      numerology: lifePathResult || nameResult || personalNumbersResult
        ? {
            lifePath: lifePathResult,
            nameNumbers: nameResult,
            personalNumbers: personalNumbersResult,
            pinnaclesAndChallenges: pinnaclesResult,
          }
        : { note: "No birth data provided" },
      tarot,
    },
    totalDurationMs: Date.now() - start,
  };

  const validated = ChartDataSchema.safeParse(result);
  if (!validated.success) {
    console.error("[chart] Response schema mismatch:", JSON.stringify(validated.error.flatten()));
  }

  chartCache.set(cacheKey, { data: result, expiresAt: Date.now() + CACHE_TTL_MS });
  return Response.json(result);
}
