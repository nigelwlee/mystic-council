import { generateText, generateObject, convertToCoreMessages } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { z } from "zod";
import { experts } from "./experts/registry";
import { judgeConfig } from "./experts/judge";
import { loadKnowledge } from "./knowledge/loader";
import { VOICE_RULES } from "./voice";
import { FORMAT_RULES, sanitizeField } from "./format";
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

export function formatBirthData(birthData: BirthData | null): string {
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
export function patchToolsWithBirthData(
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

function coerceToString(val: unknown): string {
  if (typeof val === "string") return val;
  if (val && typeof val === "object") return JSON.stringify(val, null, 2);
  return "";
}

function extractJson(text: string): Record<string, unknown> | null {
  const attempts: string[] = [
    text,
    // Strip code fences then strip leading "json" language tag (LLM sometimes puts it on own line)
    text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").replace(/^json\s*/i, ""),
    // Find first { ... } block anywhere in the text
    (text.match(/\{[\s\S]*\}/) ?? [])[0] ?? "",
  ];
  for (const candidate of attempts) {
    if (!candidate) continue;
    try {
      const parsed = JSON.parse(candidate) as Record<string, unknown>;
      if (parsed && typeof parsed === "object") return parsed;
    } catch { /* try next */ }
  }
  return null;
}

// Map a normalized section heading to one of our 4 canonical keys.
// Returns null if the heading doesn't match any.
function canonicalSectionKey(heading: string): keyof StructuredExpertContent | null {
  const norm = heading.toLowerCase().replace(/[*_`:]/g, "").replace(/[\s-]+/g, "");
  if (norm === "facts" || norm === "rawobservations" || norm === "observations") return "facts";
  if (norm === "analysis" || norm === "interpretation") return "analysis";
  if (norm === "summary" || norm === "reading") return "summary";
  if (norm === "oneliner" || norm === "keyinsight" || norm === "tldr") return "oneLiner";
  return null;
}

// Split markdown by section headings (#, ##, ###, ####) and bold-only "labels".
// Returns sections keyed by canonical name + leftover text outside any matched section.
function extractMarkdownSections(text: string): { sections: Partial<StructuredExpertContent>; leftover: string } {
  const sections: Partial<StructuredExpertContent> = {};
  // Match either a heading (### Heading) or a bold-only label line (**Label**:)
  const headingRe = /^(?:#{1,6}\s*(.+?)\s*$|\*\*(.+?)\*\*\s*:?\s*$)/gm;
  const matches: { key: keyof StructuredExpertContent; start: number; end: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = headingRe.exec(text)) !== null) {
    const heading = (m[1] ?? m[2] ?? "").trim();
    const key = canonicalSectionKey(heading);
    if (key) matches.push({ key, start: m.index, end: m.index + m[0].length });
  }
  // Also catch inline "**One-Liner**: text" on a single line
  const inlineRe = /\*\*(one[\s-]?liner|tl;?dr|key insight)\*\*\s*:?\s*([^\n]+)/i;
  const inline = text.match(inlineRe);
  if (inline && !matches.some((mm) => mm.key === "oneLiner")) {
    sections.oneLiner = inline[2].trim().replace(/^["']|["']$/g, "");
  }
  // Slice content between consecutive matched section starts
  for (let i = 0; i < matches.length; i++) {
    const cur = matches[i];
    const next = matches[i + 1];
    const body = text.slice(cur.end, next ? next.start : text.length).trim();
    sections[cur.key] = body;
  }
  // Leftover = anything before the first match
  const leftover = matches.length > 0 ? text.slice(0, matches[0].start).trim() : "";
  return { sections, leftover };
}

// Pull a "one-liner" out of free-form text: the last non-trivial sentence,
// or the first sentence after a ":" terminator.
function deriveOneLiner(text: string): string {
  if (!text) return "";
  const cleaned = text.replace(/^["']|["']$/g, "").trim();
  // Last sentence
  const sentences = cleaned.split(/(?<=[.!?])\s+/).filter((s) => s.trim().length > 10);
  if (sentences.length === 0) return cleaned.slice(0, 200);
  return sentences[sentences.length - 1].trim().replace(/^["']|["']$/g, "");
}

export function parseStructuredExpert(text: string): StructuredExpertContent {
  // 1. Try JSON
  const parsed = extractJson(text);
  if (parsed && ("facts" in parsed || "analysis" in parsed || "summary" in parsed)) {
    const summary = sanitizeField(coerceToString(parsed.summary));
    return {
      facts: sanitizeField(coerceToString(parsed.facts)),
      analysis: sanitizeField(coerceToString(parsed.analysis)),
      summary,
      oneLiner: sanitizeField(coerceToString(parsed.oneLiner)) || deriveOneLiner(summary),
    };
  }

  // 2. Try markdown section extraction
  const { sections } = extractMarkdownSections(text);
  if (Object.keys(sections).length > 0) {
    const summary = sanitizeField(sections.summary ?? "");
    const oneLiner = sanitizeField(sections.oneLiner ?? "");
    return {
      facts: sanitizeField(sections.facts ?? ""),
      analysis: sanitizeField(sections.analysis ?? ""),
      summary,
      oneLiner: oneLiner || deriveOneLiner(summary || sections.analysis || text),
    };
  }

  // 3. Last resort: dump full text into summary, derive a oneLiner
  const fallbackSummary = sanitizeField(text);
  return { facts: "", analysis: "", summary: fallbackSummary, oneLiner: deriveOneLiner(fallbackSummary) };
}

export function parseJudgeOutput(text: string): { summary: string; oneLiner: string } {
  const parsed = extractJson(text);
  if (parsed && (parsed.summary || parsed.oneLiner)) {
    return {
      summary: sanitizeField(coerceToString(parsed.summary)),
      oneLiner: sanitizeField(coerceToString(parsed.oneLiner)),
    };
  }
  return { summary: sanitizeField(text), oneLiner: "" };
}

const EXPERT_OUTPUT_FORMAT = `

OUTPUT FORMAT — STRICT JSON ONLY. All four values MUST be plain text strings — never nested objects or arrays.
{
  "facts": "Write a prose paragraph of specific raw observations: positions, degrees, card names, pillar elements, life path number, etc. Example: 'Your Moon is in Sagittarius at 10.6°. Mercury is in Pisces at 26.1°. Saturn is in Aquarius.' Do NOT use nested objects.",
  "analysis": "3-5 sentences interpreting what these facts mean for this specific person and question.",
  "summary": "2-3 sentence reading capturing the essence.",
  "oneLiner": "FORMULA: '{punchy fact}. {short interpretation}. {recommended action}.' — three short sentences, each under 12 words. Modern and direct, like a smart friend texting. No flowery language, no 'the universe', no 'embrace your truth'. Lead with the most concrete fact from your tradition: tarot → the lead card drawn; western → the dominant transit or natal aspect; vedic → current dasha or moon nakshatra; chinese → the day pillar or active element; numerology → life path or current personal year/day number. Then one plain sentence on what it means right now. Then one concrete action for today. Examples — Tarot: 'You drew the High Priestess. Your gut already knows the answer. Stop polling everyone else.' Western: 'Mars squares your natal Saturn this week. Effort feels uphill. Pick one task and finish it before starting another.' Numerology: 'You're in a Personal Year 1. Reset energy is everywhere. Start the thing you've been postponing — today.'"
}`;

const JUDGE_OUTPUT_SCHEMA = z.object({
  summary: z.string().describe("3-5 sentence synthesized reading across all traditions, in plain everyday language"),
  oneLiner: z.string().describe("One sentence: the unified insight from all traditions"),
});

export async function runCouncil(
  messages: Message[],
  birthData: BirthData | null,
  selectedExpertIds: string[],
  dataStream: DataStreamWriter,
  modelOverride?: string,
  modelRunId?: string,
  date?: string,
) {
  const todayStr = date ?? new Date().toLocaleDateString("en-CA");
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
        + `\n\nToday's date: ${todayStr}`
        + "\n\n" + VOICE_RULES
        + "\n\n" + FORMAT_RULES
        + EXPERT_OUTPUT_FORMAT;

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
  ) + "\n\n" + VOICE_RULES + "\n\n" + FORMAT_RULES;

  const lastMessage = messages[messages.length - 1];
  const userContent =
    lastMessage && typeof lastMessage.content === "string"
      ? lastMessage.content
      : "Please synthesize the above readings.";

  const effectiveJudgeModel = modelOverride ?? judgeConfig.model;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dataStream.writeData({ type: "judge-start", model: effectiveJudgeModel, resolvedSystemPrompt: judgeSystemPrompt, ...tag } as any);

  const judgeStartTime = Date.now();

  const judgeResult = await generateObject({
    model: openrouter(effectiveJudgeModel),
    system: judgeSystemPrompt,
    messages: [{ role: "user", content: userContent }],
    schema: JUDGE_OUTPUT_SCHEMA,
  });
  const judgeVerdict = judgeResult.object as z.infer<typeof JUDGE_OUTPUT_SCHEMA>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dataStream.writeData({ type: "judge-verdict", content: judgeVerdict, ...tag } as any);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dataStream.writeData({ type: "judge-complete", usage: judgeResult.usage, durationMs: Date.now() - judgeStartTime, ...tag } as any);
}
