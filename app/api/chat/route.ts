import { createDataStreamResponse } from "ai";
import { runCouncil } from "@/lib/orchestrator";
import { mockExpertResponses, mockJudgeVerdict } from "@/lib/mock-data";
import type { BirthData } from "@/lib/experts/types";
import type { Message } from "ai";

export const maxDuration = 300;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function POST(req: Request) {
  const { messages, birthData, selectedExperts, benchmarkModels } = (await req.json()) as {
    messages: Message[];
    birthData: BirthData | null;
    selectedExperts: string[];
    benchmarkModels?: string[];
  };

  if (process.env.MOCK_MODE === "true") {
    return createDataStreamResponse({
      execute: async (dataStream) => {
        // Filter to selected experts, or use all if none selected
        const active =
          selectedExperts.length === 0
            ? mockExpertResponses
            : mockExpertResponses.filter((r) =>
                selectedExperts.includes(r.expertId)
              );

        // Stream each expert with dashboard events
        for (const response of active) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          dataStream.writeData({ type: "expert-start", expertId: response.expertId, expertName: response.expertName, expertEmoji: response.expertEmoji, model: "mock/model", resolvedSystemPrompt: "[mock system prompt]" } as any);
          await sleep(600);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          dataStream.writeData({ type: "expert-responses", responses: [response] } as any);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          dataStream.writeData({ type: "expert-complete", ...response, model: "mock/model", resolvedSystemPrompt: "[mock system prompt]", toolCalls: [], durationMs: 600 } as any);
        }

        // Judge
        await sleep(500);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        dataStream.writeData({ type: "judge-start", model: "mock/judge-model", resolvedSystemPrompt: "[mock judge prompt with expert outputs]" } as any);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        dataStream.writeData({ type: "judge-verdict", content: { summary: mockJudgeVerdict.summary, oneLiner: mockJudgeVerdict.oneLiner } } as any);
      },
    });
  }

  // Benchmark mode: run N model pipelines in parallel
  if (benchmarkModels && benchmarkModels.length > 0) {
    return createDataStreamResponse({
      execute: async (dataStream) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        dataStream.writeData({ type: "benchmark-start", models: benchmarkModels } as any);
        await Promise.all(
          benchmarkModels.map((modelId: string) =>
            runCouncil(messages, birthData, selectedExperts ?? [], dataStream, modelId, modelId)
          )
        );
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        dataStream.writeData({ type: "benchmark-complete" } as any);
      },
      onError: (error) => {
        console.error("Benchmark error:", error);
        return "Benchmark encountered an error. Please try again.";
      },
    });
  }

  return createDataStreamResponse({
    execute: async (dataStream) => {
      await runCouncil(messages, birthData, selectedExperts ?? [], dataStream);
    },
    onError: (error) => {
      console.error("Council error:", error);
      return "The council encountered an error. Please try again.";
    },
  });
}
