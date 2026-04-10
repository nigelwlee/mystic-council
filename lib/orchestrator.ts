import { generateText, streamText, convertToCoreMessages } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { experts } from "./experts/registry";
import { judgeConfig } from "./experts/judge";
import { loadKnowledge } from "./knowledge/loader";
import type { BirthData, ExpertResponse } from "./experts/types";
import type { DataStreamWriter, Message } from "ai";

const openrouter = createOpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
});

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function generateWithRetry(
  params: Parameters<typeof generateText>[0],
  maxAttempts = 3
) {
  let lastError: unknown;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (attempt > 0) await sleep(attempt * 8000); // 8s, 16s between retries
    try {
      return await generateText(params);
    } catch (err) {
      lastError = err;
      const msg = err instanceof Error ? err.message : String(err);
      // Only retry on rate limit / provider errors
      if (!msg.includes("429") && !msg.includes("rate") && !msg.includes("Provider returned error")) {
        throw err;
      }
    }
  }
  throw lastError;
}

function formatBirthData(birthData: BirthData | null): string {
  if (!birthData || (!birthData.date && !birthData.name)) {
    return "No birth data provided.";
  }
  const parts: string[] = [];
  if (birthData.name) parts.push(`Name: ${birthData.name}`);
  if (birthData.date) parts.push(`Birth date: ${birthData.date}`);
  if (birthData.time) parts.push(`Birth time: ${birthData.time}`);
  if (birthData.location) parts.push(`Location: ${birthData.location}`);
  return parts.join(" | ");
}

export async function runCouncil(
  messages: Message[],
  birthData: BirthData | null,
  selectedExpertIds: string[],
  dataStream: DataStreamWriter
) {
  const activeExperts = experts.filter((e) =>
    selectedExpertIds.length === 0 || selectedExpertIds.includes(e.id)
  );

  const birthDataStr = formatBirthData(birthData);
  const coreMessages = convertToCoreMessages(messages);

  // Run experts sequentially with a stagger to avoid upstream rate limits
  const responses: ExpertResponse[] = [];
  for (let i = 0; i < activeExperts.length; i++) {
    const expert = activeExperts[i];
    if (i > 0) await sleep(2000); // 2s between expert calls
    try {
      const knowledge = await loadKnowledge(expert.knowledgePath);
      const systemPrompt = expert.systemPromptTemplate
        .replace("{knowledge}", knowledge)
        .replace("{birthData}", birthDataStr);

      const result = await generateWithRetry({
        model: openrouter(expert.model),
        system: systemPrompt,
        messages: coreMessages,
        tools: expert.tools,
        maxSteps: 4,
      });

      const response: ExpertResponse = {
        expertId: expert.id,
        expertName: expert.name,
        expertEmoji: expert.emoji,
        expertTitle: expert.title,
        color: expert.color,
        textColor: expert.textColor,
        content: result.text,
      };
      responses.push(response);
      // Stream each expert result as it arrives so UI updates incrementally
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      dataStream.writeData({ type: "expert-responses", responses: [response] } as any);
    } catch (err) {
      const error = err instanceof Error ? err.message : "Unknown error";
      const response: ExpertResponse = {
        expertId: expert.id,
        expertName: expert.name,
        expertEmoji: expert.emoji,
        expertTitle: expert.title,
        color: expert.color,
        textColor: expert.textColor,
        content: "",
        error,
      };
      responses.push(response);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      dataStream.writeData({ type: "expert-responses", responses: [response] } as any);
    }
  }

  // Build judge input from successful readings
  const successfulReadings = responses.filter((r) => !r.error && r.content);
  if (successfulReadings.length === 0) return;

  const expertOutputs = successfulReadings
    .map((r) => `### ${r.expertName} (${r.expertTitle})\n${r.content}`)
    .join("\n\n---\n\n");

  const judgeSystemPrompt = judgeConfig.systemPromptTemplate.replace(
    "{expertOutputs}",
    expertOutputs
  );

  const lastMessage = messages[messages.length - 1];
  const userContent =
    lastMessage && typeof lastMessage.content === "string"
      ? lastMessage.content
      : "Please synthesize the above readings.";

  // Stream judge synthesis into the data stream
  const judgeResult = streamText({
    model: openrouter(judgeConfig.model),
    system: judgeSystemPrompt,
    messages: [{ role: "user", content: userContent }],
  });

  judgeResult.mergeIntoDataStream(dataStream);
}
