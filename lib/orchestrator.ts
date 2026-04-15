import { generateText, convertToCoreMessages } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { z } from "zod";
import { experts } from "./experts/registry";
import { judgeConfig } from "./experts/judge";
import { loadKnowledge } from "./knowledge/loader";
import type { BirthData, ExpertResponse, StructuredExpertContent, ToolCallRecord, TokenUsage } from "./experts/types";
import type { CoreTool, DataStreamWriter, Message } from "ai";

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

// Wraps every tool in a set to:
// 1. Make all parameters optional (so model sending {} still passes Zod validation)
// 2. Inject known birth data for any missing birth-data fields before calling execute
function patchToolsWithBirthData(
  tools: Record<string, CoreTool<z.ZodTypeAny, unknown>>,
  birthData: BirthData | null
): Record<string, CoreTool<z.ZodTypeAny, unknown>> {
  if (!birthData) return tools;

  const patched: Record<string, CoreTool<z.ZodTypeAny, unknown>> = {};

  for (const [name, tool] of Object.entries(tools)) {
    // Make every field in the schema optional so {} passes validation
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const origShape = (tool.parameters as any).shape as Record<string, z.ZodTypeAny> | undefined;
    const looseParams = origShape
      ? z.object(Object.fromEntries(Object.entries(origShape).map(([k, v]) => [k, v.optional()])))
      : tool.parameters;

    patched[name] = {
      description: tool.description,
      parameters: looseParams,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      execute: async (args: any, opts) => {
        // Fill in missing birth-data values from known birth data
        const filled: Record<string, unknown> = { ...args };
        if (!filled.date && birthData.date) filled.date = birthData.date;
        if (!filled.birthdate && birthData.date) filled.birthdate = birthData.date;
        if (!filled.time && birthData.time) filled.time = birthData.time;
        if (!filled.fullName && birthData.name) filled.fullName = birthData.name;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return tool.execute!(filled as any, opts as any);
      },
    };
  }

  return patched;
}

function parseStructuredExpert(text: string): StructuredExpertContent {
  // Try direct JSON parse
  try {
    const parsed = JSON.parse(text) as Record<string, unknown>;
    if (parsed.facts && parsed.analysis && parsed.summary && parsed.oneLiner) {
      return {
        facts: String(parsed.facts),
        analysis: String(parsed.analysis),
        summary: String(parsed.summary),
        oneLiner: String(parsed.oneLiner),
      };
    }
  } catch {
    // fall through
  }

  // Try extracting from markdown code fences
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    try {
      const parsed = JSON.parse(fenceMatch[1]) as Record<string, unknown>;
      if (parsed.facts && parsed.analysis && parsed.summary && parsed.oneLiner) {
        return {
          facts: String(parsed.facts),
          analysis: String(parsed.analysis),
          summary: String(parsed.summary),
          oneLiner: String(parsed.oneLiner),
        };
      }
    } catch {
      // fall through
    }
  }

  // Fallback
  return { facts: "", analysis: "", summary: text, oneLiner: text };
}

function parseJudgeOutput(text: string): { summary: string; oneLiner: string } {
  // Try direct JSON parse
  try {
    const parsed = JSON.parse(text) as Record<string, unknown>;
    if (parsed.summary && parsed.oneLiner) {
      return { summary: String(parsed.summary), oneLiner: String(parsed.oneLiner) };
    }
  } catch {
    // fall through
  }

  // Try extracting from markdown code fences
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    try {
      const parsed = JSON.parse(fenceMatch[1]) as Record<string, unknown>;
      if (parsed.summary && parsed.oneLiner) {
        return { summary: String(parsed.summary), oneLiner: String(parsed.oneLiner) };
      }
    } catch {
      // fall through
    }
  }

  // Fallback
  return { summary: text, oneLiner: text };
}

export async function runCouncil(
  messages: Message[],
  birthData: BirthData | null,
  selectedExpertIds: string[],
  dataStream: DataStreamWriter,
  modelOverride?: string,
  modelRunId?: string,
) {
  const tag = modelRunId ? { modelRunId } : {};
  const activeExperts = experts.filter((e) =>
    selectedExpertIds.length === 0 || selectedExpertIds.includes(e.id)
  );

  const birthDataStr = formatBirthData(birthData);
  const coreMessages = convertToCoreMessages(messages);

  // Run all experts in parallel
  const responses: ExpertResponse[] = await Promise.all(
    activeExperts.map(async (expert) => {
      const knowledge = await loadKnowledge(expert.knowledgePath);
      const systemPrompt = expert.systemPromptTemplate
        .replace("{knowledge}", knowledge)
        .replace("{birthData}", birthDataStr)
        + `\n\nOUTPUT FORMAT — RESPOND WITH VALID JSON ONLY:
{
  "facts": "Raw observations from your tradition. Name specific positions, cards, numbers, pillars. Data only, no interpretation.",
  "analysis": "What these facts mean for this specific person and question. 3-5 sentences of interpretation.",
  "summary": "2-3 sentence reading capturing the essence.",
  "oneLiner": "One sentence: the key insight and its implication for the user."
}`;

      const effectiveModel = modelOverride ?? expert.model;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      dataStream.writeData({ type: "expert-start", expertId: expert.id, expertName: expert.name, expertEmoji: expert.emoji, model: effectiveModel, resolvedSystemPrompt: systemPrompt, ...tag } as any);

      const startTime = Date.now();
      try {
        const result = await generateWithRetry({
          model: openrouter(effectiveModel),
          system: systemPrompt,
          messages: coreMessages,
          tools: patchToolsWithBirthData(expert.tools, birthData),
          maxSteps: 2,
        });

        const toolCalls: ToolCallRecord[] = [];
        for (const step of result.steps ?? []) {
          for (const tc of step.toolCalls ?? []) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const results = (step as any).toolResults ?? [];
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const matching = results.find((tr: any) => tr.toolCallId === tc.toolCallId);
            toolCalls.push({ toolName: tc.toolName, args: tc.args as Record<string, unknown>, result: matching?.result ?? null });
          }
        }

        const usage: TokenUsage = result.usage;
        const structuredContent = parseStructuredExpert(result.text);
        const response: ExpertResponse = {
          expertId: expert.id,
          expertName: expert.name,
          expertEmoji: expert.emoji,
          expertTitle: expert.title,
          color: expert.color,
          textColor: expert.textColor,
          content: structuredContent,
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        dataStream.writeData({ type: "expert-responses", responses: [response], ...tag } as any);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        dataStream.writeData({ type: "expert-complete", ...response, model: effectiveModel, resolvedSystemPrompt: systemPrompt, toolCalls, usage, durationMs: Date.now() - startTime, ...tag } as any);
        return response;
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        dataStream.writeData({ type: "expert-responses", responses: [response], ...tag } as any);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        dataStream.writeData({ type: "expert-complete", ...response, model: effectiveModel, resolvedSystemPrompt: systemPrompt, toolCalls: [], durationMs: Date.now() - startTime, error, ...tag } as any);
        return response;
      }
    })
  );

  // Build judge input from successful readings
  const successfulReadings = responses.filter((r) => !r.error && r.content);
  if (successfulReadings.length === 0) return;

  const expertOutputs = successfulReadings
    .map((r) => {
      const content = typeof r.content === "string" ? r.content : r.content.analysis;
      return `### ${r.expertName} (${r.expertTitle})\n${content}`;
    })
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

  const effectiveJudgeModel = modelOverride ?? judgeConfig.model;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dataStream.writeData({ type: "judge-start", model: effectiveJudgeModel, resolvedSystemPrompt: judgeSystemPrompt, ...tag } as any);

  const judgeStartTime = Date.now();

  // Always use generateText so oracle emits structured judge-verdict event
  const judgeResult = await generateWithRetry({
    model: openrouter(effectiveJudgeModel),
    system: judgeSystemPrompt,
    messages: [{ role: "user", content: userContent }],
  });
  const judgeVerdict = parseJudgeOutput(judgeResult.text);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dataStream.writeData({ type: "judge-verdict", content: judgeVerdict, ...tag } as any);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dataStream.writeData({ type: "judge-complete", usage: judgeResult.usage, durationMs: Date.now() - judgeStartTime, ...tag } as any);
}
