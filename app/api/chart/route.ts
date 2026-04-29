import { westernAstrologyTools } from "@/lib/tools/astrology";
import { chineseAstrologyTools } from "@/lib/tools/chinese";
import { vedicAstrologyTools } from "@/lib/tools/vedic";
import { numerologyTools } from "@/lib/tools/numerology";
import { tarotTools } from "@/lib/tools/tarot";
import { ContextInputSchema } from "@/lib/api/schemas";
import type { ChartData } from "@/lib/api/schemas";

export const maxDuration = 15;

// Seeded PRNG (mulberry32) — produces stable tarot draws for a given date string
function seededRng(seed: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  }
  let state = h >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let z = state;
    z = Math.imul(z ^ (z >>> 15), z | 1);
    z ^= z + Math.imul(z ^ (z >>> 7), z | 61);
    return ((z ^ (z >>> 14)) >>> 0) / 4294967296;
  };
}

// Temporarily patch Math.random with a seeded version during tarot draw
async function drawSeededCards(seed: string, spread: "three-card") {
  const rng = seededRng(seed);
  const original = Math.random;
  Math.random = rng;
  try {
    return await tarotTools.drawCards.execute!({ spread, question: `Daily reading for ${seed}` }, {} as never);
  } finally {
    Math.random = original;
  }
}

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = ContextInputSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { birthData, date } = parsed.data;
  const bd = birthData ?? {};
  const start = Date.now();

  const [western, chinese, vedic, lifePathResult, nameResult, personalNumbersResult, pinnaclesResult, westernTransits, tarot] = await Promise.all([
    bd.date
      ? westernAstrologyTools.calculateBirthChart.execute!(
          { date: bd.date, time: bd.time, latitude: bd.latitude, longitude: bd.longitude },
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
          { date: bd.date, time: bd.time, latitude: bd.latitude, longitude: bd.longitude },
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

    drawSeededCards(date, "three-card"),
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

  return Response.json(result);
}
