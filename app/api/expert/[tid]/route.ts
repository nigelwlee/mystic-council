import { runSingleExpert } from "@/lib/api/run-expert";
import { experts } from "@/lib/experts/registry";
import { EXPERT_ID_TO_TRADITION } from "@/lib/constants/traditions";
import { mockExpertResponses } from "@/lib/mock-data";
import { ContextInputSchema, QuestionInputSchema } from "@/lib/api/schemas";
import type { ExpertOnly, ExpertReading } from "@/lib/api/schemas";

export const maxDuration = 30;

const TRADITION_TO_EXPERT_ID: Record<string, string> = Object.fromEntries(
  Object.entries(EXPERT_ID_TO_TRADITION).map(([expertId, tid]) => [tid, expertId])
);

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ tid: string }> }
) {
  const { tid } = await params;
  const expertId = TRADITION_TO_EXPERT_ID[tid];
  const expert = expertId ? experts.find((e) => e.id === expertId) : undefined;

  if (!expert) {
    return Response.json(
      { error: `Unknown tradition: ${tid}. Valid: western, chinese, vedic, tarot, numerology` },
      { status: 404 }
    );
  }

  const body = await req.json();
  // Accept either QuestionInput or ContextInput
  const questionParsed = QuestionInputSchema.safeParse(body);
  const contextParsed = questionParsed.success ? null : ContextInputSchema.safeParse(body);
  if (!questionParsed.success && !contextParsed!.success) {
    return Response.json(
      { error: "Invalid request body", details: contextParsed!.error.flatten() },
      { status: 400 }
    );
  }
  const parsed = questionParsed.success ? questionParsed.data : contextParsed!.data!;

  const { birthData, date } = parsed;
  const question = "question" in parsed ? parsed.question : undefined;
  const start = Date.now();

  if (process.env.MOCK_MODE === "true") {
    await sleep(300 + Math.random() * 300);
    const mock = mockExpertResponses.find((r) => EXPERT_ID_TO_TRADITION[r.expertId] === tid);
    if (mock) {
      const result: ExpertOnly = {
        id: crypto.randomUUID(),
        generatedAt: new Date().toISOString(),
        input: parsed,
        expert: {
          traditionId: tid as ExpertReading["traditionId"],
          expertId: mock.expertId,
          expertName: mock.expertName,
          expertEmoji: mock.expertEmoji,
          color: mock.color,
          textColor: mock.textColor,
          content: typeof mock.content === "string"
            ? { facts: "", analysis: "", summary: mock.content, oneLiner: mock.content }
            : mock.content,
          durationMs: 400,
        },
        totalDurationMs: Date.now() - start,
      };
      return Response.json(result);
    }
  }

  const userMessage = question
    ? `${question}\n\nToday's date: ${date}`
    : `Give me a reading for today, ${date}.`;

  const expertReading = await runSingleExpert(expert, userMessage, birthData);

  const result: ExpertOnly = {
    id: crypto.randomUUID(),
    generatedAt: new Date().toISOString(),
    input: parsed,
    expert: expertReading,
    totalDurationMs: Date.now() - start,
  };

  return Response.json(result);
}
