import { westernAstrologyTools } from "@/lib/tools/astrology";
import { chineseAstrologyTools } from "@/lib/tools/chinese";
import { vedicAstrologyTools } from "@/lib/tools/vedic";
import { numerologyTools } from "@/lib/tools/numerology";
import { makeSeededRng, makeDrawCardsTool } from "@/lib/tools/tarot";
import { ChartDataSchema } from "@/lib/api/schemas";
import type { ChartData } from "@/lib/api/schemas";

type BirthDataInput = {
  date?: string | null;
  time?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  name?: string | null;
  [key: string]: unknown;
};

function drawDailyCards(date: string, userId?: string) {
  const seed = userId ? `${userId}:daily:${date}` : `daily:${date}`;
  const rng = makeSeededRng(seed);
  const drawTool = makeDrawCardsTool(rng);
  return drawTool.execute!({ spread: "three-card", question: `Daily reading for ${date}` }, {} as never);
}

export async function buildChart(
  birthData: BirthDataInput | null,
  date: string,
  userId?: string,
): Promise<ChartData> {
  const bd = birthData ?? {};
  const start = Date.now();

  const [western, chinese, vedic, lifePathResult, nameResult, personalNumbersResult, pinnaclesResult, westernTransits, tarot] = await Promise.all([
    bd.date
      ? westernAstrologyTools.calculateBirthChart.execute!(
          { date: bd.date, time: bd.time ?? undefined, latitude: bd.latitude ?? undefined, longitude: bd.longitude ?? undefined },
          {} as never
        )
      : Promise.resolve(null),

    bd.date
      ? chineseAstrologyTools.calculateChineseChart.execute!(
          { date: bd.date, time: bd.time ?? undefined, readingDate: date },
          {} as never
        )
      : Promise.resolve(null),

    bd.date
      ? vedicAstrologyTools.calculateVedicChart.execute!(
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result: ChartData = {
    id: crypto.randomUUID(),
    generatedAt: new Date().toISOString(),
    input: { birthData: birthData as any, date },
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
    console.error("[build-chart] Response schema mismatch:", JSON.stringify(validated.error.flatten()));
  }

  return result;
}
