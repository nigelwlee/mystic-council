import { mockExpertResponses, mockJudgeVerdict } from "@/lib/mock-data";
import { EXPERT_ID_TO_TRADITION } from "@/lib/constants/traditions";
import type { DailyReadingResponse, ExpertReading } from "@/lib/api/schemas";

export const IS_MOCK_MODE = process.env.MOCK_MODE === "true";

export function mockDelay(min = 300, max = 800): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, min + Math.random() * (max - min)));
}

export function mockDailyReading(date: string): DailyReadingResponse {
  const start = Date.now();
  const experts: ExpertReading[] = mockExpertResponses.map((r) => {
    const tid = EXPERT_ID_TO_TRADITION[r.expertId];
    return {
      traditionId: (tid ?? "western") as ExpertReading["traditionId"],
      expertId: r.expertId,
      expertName: r.expertName,
      expertEmoji: r.expertEmoji,
      color: r.color,
      textColor: r.textColor,
      content:
        typeof r.content === "string"
          ? { facts: "", analysis: "", summary: r.content, oneLiner: r.content, aspectSignals: [] }
          : r.content,
      durationMs: 400 + Math.floor(Math.random() * 300),
    };
  });

  return {
    id: crypto.randomUUID(),
    generatedAt: new Date().toISOString(),
    input: { birthData: null, date },
    experts,
    oracle: {
      summary: mockJudgeVerdict.summary,
      oneLiner: mockJudgeVerdict.oneLiner,
      aspectCallouts: [],
      chimers: [],
      chimerCandidates: [],
      durationMs: 300,
    },
    totalDurationMs: Date.now() - start,
  };
}
