import { createDataStreamResponse } from "ai";
import { runCouncil } from "@/lib/orchestrator";
import { mockExpertResponses, mockJudgeVerdict } from "@/lib/mock-data";
import type { BirthData } from "@/lib/experts/types";
import type { Message } from "ai";

export const maxDuration = 120;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function POST(req: Request) {
  const { messages, birthData, selectedExperts } = (await req.json()) as {
    messages: Message[];
    birthData: BirthData | null;
    selectedExperts: string[];
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

        // Stream each expert with a stagger to simulate sequential loading
        for (const response of active) {
          await sleep(600);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          dataStream.writeData({ type: "expert-responses", responses: [response] } as any);
        }

        // Write judge verdict as a data item — client handles rendering
        await sleep(500);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        dataStream.writeData({ type: "judge-verdict", content: mockJudgeVerdict } as any);
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
