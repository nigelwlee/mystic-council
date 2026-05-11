import { describe, expect, test } from "vitest";
import { QuestionInputSchema, ContextInputSchema } from "./schemas";

// Representative mobile birth data — mirrors what Supabase returns to the
// mobile client (nulls for optional fields, not undefined).
const MOBILE_BIRTH_DATA = {
  name: "Nigel Lee",
  date: "1991-06-01",
  time: "11:44",
  location: "Manila, Philippines",
  latitude: 14.5904,
  longitude: 120.9804,
};

// chart_facts shape as persisted by /api/profile — no id or generatedAt.
const MOBILE_CHART_FACTS = {
  birthDataHash: "abc123def456",
  traditions: { western: {}, vedic: {}, chinese: {}, numerology: {}, tarot: null },
};

describe("QuestionInputSchema — council / chat", () => {
  test("accepts a full mobile chat payload", () => {
    const result = QuestionInputSchema.safeParse({
      question: "Should I take the new job?",
      birthData: MOBILE_BIRTH_DATA,
      date: "2026-05-11",
      chart: MOBILE_CHART_FACTS,
    });
    expect(result.success, JSON.stringify(result)).toBe(true);
  });

  test("accepts chart_facts without id/generatedAt (mobile sends chart_facts directly)", () => {
    const result = QuestionInputSchema.safeParse({
      question: "Am I on the right path?",
      birthData: MOBILE_BIRTH_DATA,
      date: "2026-05-11",
      chart: { traditions: { western: {} } },
    });
    expect(result.success, JSON.stringify(result)).toBe(true);
  });

  test("accepts null birthData.time (Supabase returns null for unset fields)", () => {
    const result = QuestionInputSchema.safeParse({
      question: "What should I focus on?",
      birthData: { ...MOBILE_BIRTH_DATA, time: null, name: null, location: null },
      date: "2026-05-11",
    });
    expect(result.success, JSON.stringify(result)).toBe(true);
  });

  test("rejects empty question", () => {
    const result = QuestionInputSchema.safeParse({
      question: "",
      birthData: MOBILE_BIRTH_DATA,
      date: "2026-05-11",
    });
    expect(result.success).toBe(false);
  });

  test("accepts missing chart (chart is optional)", () => {
    const result = QuestionInputSchema.safeParse({
      question: "What lies ahead?",
      birthData: MOBILE_BIRTH_DATA,
      date: "2026-05-11",
    });
    expect(result.success, JSON.stringify(result)).toBe(true);
  });
});

describe("ContextInputSchema — daily / profile", () => {
  test("accepts a full mobile daily payload", () => {
    const result = ContextInputSchema.safeParse({
      birthData: MOBILE_BIRTH_DATA,
      date: "2026-05-11",
      chart: MOBILE_CHART_FACTS,
    });
    expect(result.success, JSON.stringify(result)).toBe(true);
  });

  test("accepts null time from Supabase", () => {
    const result = ContextInputSchema.safeParse({
      birthData: { ...MOBILE_BIRTH_DATA, time: null },
      date: "2026-05-11",
    });
    expect(result.success, JSON.stringify(result)).toBe(true);
  });

  test("defaults date when omitted", () => {
    const result = ContextInputSchema.safeParse({ birthData: MOBILE_BIRTH_DATA });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
