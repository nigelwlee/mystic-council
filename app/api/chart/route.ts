import { ContextInputSchema } from "@/lib/api/schemas";
import type { ChartData } from "@/lib/api/schemas";
import { buildChart } from "@/lib/api/build-chart";

export const maxDuration = 15;

// In-process chart cache: key = (birthData + date), TTL = 24h.
// Reset on cold start. Drop-in replaceable with a DB cache layer when ready.
const chartCache = new Map<string, { data: ChartData; expiresAt: number }>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

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

  const result = await buildChart(birthData, date, userId ?? undefined);

  chartCache.set(cacheKey, { data: result, expiresAt: Date.now() + CACHE_TTL_MS });
  return Response.json(result);
}
