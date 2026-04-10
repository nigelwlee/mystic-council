import { createDataStreamResponse } from "ai";
import { runCouncil } from "@/lib/orchestrator";
import type { BirthData } from "@/lib/experts/types";
import type { Message } from "ai";

export const maxDuration = 120;

export async function POST(req: Request) {
  const { messages, birthData, selectedExperts } = (await req.json()) as {
    messages: Message[];
    birthData: BirthData | null;
    selectedExperts: string[];
  };

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
