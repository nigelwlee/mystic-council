import { describe, expect, test, vi, beforeEach } from "vitest";

// In-memory store simulating the daily_streaks table
type StreakRow = { current_streak: number; longest_streak: number; last_completed_date: string };
let store: Map<string, StreakRow>;

vi.mock("@/lib/supabase/admin", () => ({
  adminClient: {
    from: (_table: string) => ({
      select: () => ({
        eq: (_col: string, _val: string) => ({
          eq: (_col2: string, _val2: string) => ({
            maybeSingle: async () => ({ data: store.get("user1") ?? null }),
          }),
          maybeSingle: async () => ({ data: store.get("user1") ?? null }),
        }),
      }),
      upsert: async (row: { current_streak: number; longest_streak: number; last_completed_date: string }) => {
        store.set("user1", { current_streak: row.current_streak, longest_streak: row.longest_streak, last_completed_date: row.last_completed_date });
        return { error: null };
      },
    }),
  },
}));

// Import after mock is set up
const { bumpStreak } = await import("./streak");

beforeEach(() => {
  store = new Map();
});

describe("bumpStreak", () => {
  test("first ever bump sets streak to 1", async () => {
    await bumpStreak("user1", "2026-05-12");
    expect(store.get("user1")).toMatchObject({ current_streak: 1, longest_streak: 1, last_completed_date: "2026-05-12" });
  });

  test("consecutive day increments streak", async () => {
    store.set("user1", { current_streak: 3, longest_streak: 5, last_completed_date: "2026-05-11" });
    await bumpStreak("user1", "2026-05-12");
    expect(store.get("user1")).toMatchObject({ current_streak: 4, longest_streak: 5, last_completed_date: "2026-05-12" });
  });

  test("gap of more than one day resets streak to 1", async () => {
    store.set("user1", { current_streak: 7, longest_streak: 7, last_completed_date: "2026-05-09" });
    await bumpStreak("user1", "2026-05-12");
    expect(store.get("user1")).toMatchObject({ current_streak: 1, longest_streak: 7, last_completed_date: "2026-05-12" });
  });

  test("same-day re-bump is idempotent (no write)", async () => {
    store.set("user1", { current_streak: 2, longest_streak: 2, last_completed_date: "2026-05-12" });
    await bumpStreak("user1", "2026-05-12");
    // Still 2 — no upsert fired
    expect(store.get("user1")?.current_streak).toBe(2);
  });

  test("year boundary (2025-12-31 → 2026-01-01) increments correctly", async () => {
    store.set("user1", { current_streak: 10, longest_streak: 10, last_completed_date: "2025-12-31" });
    await bumpStreak("user1", "2026-01-01");
    expect(store.get("user1")).toMatchObject({ current_streak: 11, longest_streak: 11, last_completed_date: "2026-01-01" });
  });
});
