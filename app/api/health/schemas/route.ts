import { QuestionInputSchema, ContextInputSchema } from "@/lib/api/schemas";

export const dynamic = "force-dynamic";

const MOBILE_BIRTH_DATA = {
  name: "Test User",
  date: "1991-06-01",
  time: null,
  location: "Manila, Philippines",
  latitude: 14.5904,
  longitude: 120.9804,
};

const MOBILE_CHART_FACTS = {
  birthDataHash: "healthcheck",
  traditions: { western: {}, vedic: {}, chinese: {}, numerology: {}, tarot: null },
};

const CHECKS = [
  {
    name: "council — chat payload with chart_facts (no id/generatedAt)",
    schema: QuestionInputSchema,
    input: { question: "health check", birthData: MOBILE_BIRTH_DATA, date: "2026-01-01", chart: MOBILE_CHART_FACTS },
  },
  {
    name: "council — null time and name from Supabase",
    schema: QuestionInputSchema,
    input: { question: "health check", birthData: { ...MOBILE_BIRTH_DATA, time: null, name: null }, date: "2026-01-01" },
  },
  {
    name: "daily — mobile payload",
    schema: ContextInputSchema,
    input: { birthData: MOBILE_BIRTH_DATA, date: "2026-01-01", chart: MOBILE_CHART_FACTS },
  },
  {
    name: "daily — null birthData",
    schema: ContextInputSchema,
    input: { birthData: null, date: "2026-01-01" },
  },
];

export async function GET() {
  const results = CHECKS.map(({ name, schema, input }) => {
    const r = schema.safeParse(input);
    return { name, ok: r.success, errors: r.success ? undefined : r.error.flatten() };
  });

  const allOk = results.every((r) => r.ok);
  return Response.json(
    { ok: allOk, checks: results },
    { status: allOk ? 200 : 500 }
  );
}
