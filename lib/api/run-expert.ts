import { generateText, generateObject } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { z } from "zod";
import { loadKnowledge, loadSystemPrompt } from "@/lib/knowledge/loader";
import { EXPERT_ID_TO_TRADITION } from "@/lib/constants/traditions";
import { VOICE_RULES, voiceRulesForTradition } from "@/lib/voice";
import { FORMAT_RULES, sanitizeField } from "@/lib/format";
import { ExpertContentSchema, TraditionIdSchema } from "@/lib/api/schemas";
import { logRun } from "@/lib/api/telemetry";
import type { BirthData, ExpertConfig } from "@/lib/experts/types";
import type { ExpertReading, Oracle } from "@/lib/api/schemas";
import type { CoreTool } from "ai";

const openrouter = createOpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
});

export const EXPERT_OUTPUT_RULES = `

OUTPUT FORMAT — STRICT JSON ONLY. All string values MUST be plain text strings — never nested objects or arrays, EXCEPT for aspectSignals which is an array.
{
  "facts": "Write a prose paragraph of specific raw observations: positions, degrees, card names, pillar elements, life path number, etc. Example: 'Your Moon is in Sagittarius at 10.6°. Mercury is in Pisces at 26.1°. Saturn is in Aquarius.' Do NOT use nested objects.",
  "analysis": "3-5 sentences interpreting what these facts mean for this specific person and question.",
  "summary": "2-3 sentence reading capturing the essence.",
  "oneLiner": "START with the exact artifact from your tradition — the card name, the transit name, the dasha name, the pillar, the number. Then 4-8 words on what it means right now. Max 15 words total. No intro, no formula. Examples: Tarot → 'Tower reversed. A crisis dissolves before it lands.' Western → 'Mars trines your natal Jupiter. Effort pays off today.' Vedic → 'Mercury antardasha in Saturn mahadasha. Write it down, commit nothing yet.' Chinese → 'Bing Wu day clashes your Geng Metal. Tension at midday, resolve by evening.' Numerology → 'Personal Day 8. Money or power moves are in play.'",
  "status": "Good" | "Fair" | "Caution" — one word. Good = today is broadly favorable from your tradition's view. Fair = mixed signals, proceed with awareness. Caution = a clear warning or challenging configuration today.",
  "action": "One concrete action this tradition recommends for today. Start with a verb. Max 15 words. E.g. 'Write the proposal before Mercury goes retrograde.' or 'Avoid signing contracts — Venus is afflicted.'",
  "aspectSignals": [] // sparse array — only include aspects where your chart shows a strong signal. Each entry: { "aspect": "health"|"work"|"finances"|"relations"|"family", "strength": "strong"|"notable", "note": "1-2 sentences: factual observation then actionable guidance" }
}`;

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

export function patchToolsWithBirthData(
  tools: Record<string, CoreTool<z.ZodTypeAny, unknown>>,
  birthData: BirthData | null,
): Record<string, CoreTool<z.ZodTypeAny, unknown>> {
  if (!birthData) return tools;

  const patched: Record<string, CoreTool<z.ZodTypeAny, unknown>> = {};

  for (const [name, tool] of Object.entries(tools)) {
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

function parseExpertJson(text: string, expertId: string): typeof ExpertContentSchema._type {
  // Strip markdown code fences before matching
  const stripped = text.replace(/```(?:json)?\s*/g, "").replace(/```/g, "");
  const jsonMatch = stripped.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error(`Expert ${expertId}: no JSON object in response`);
  let raw: unknown;
  try {
    raw = JSON.parse(jsonMatch[0]);
  } catch {
    throw new Error(`Expert ${expertId}: response is not valid JSON`);
  }
  return ExpertContentSchema.parse(raw);
}

/** Run fn up to `attempts` times, returning on first success or throwing the last error. */
export async function runWithRetry<T>(
  fn: (attempt: number) => Promise<T>,
  attempts = 2,
): Promise<T> {
  let lastErr: unknown;
  for (let i = 1; i <= attempts; i++) {
    try {
      return await fn(i);
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr;
}

/** Try each model in order, returning on first success or throwing the last error. */
export async function runWithFallback<T>(
  models: string[],
  fn: (model: string, attempt: number) => Promise<T>,
): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < models.length; i++) {
    try {
      return await fn(models[i]!, i + 1);
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr;
}

export async function runSingleExpert(
  expert: ExpertConfig,
  userMessage: string,
  birthData: BirthData | null,
  chartContext?: string | null,
  userId?: string | null,
  deadlineMs?: number,
): Promise<ExpertReading & { durationMs: number }> {
  const [knowledge, promptTemplate] = await Promise.all([
    loadKnowledge(expert.knowledgePath),
    loadSystemPrompt(expert.knowledgePath),
  ]);
  const birthDataStr = formatBirthData(birthData);

  const traditionId = EXPERT_ID_TO_TRADITION[expert.id];
  if (!traditionId) throw new Error(`Unknown expertId: ${expert.id}`);

  const systemPrompt =
    promptTemplate
      .replace("{knowledge}", knowledge)
      .replace("{birthData}", birthDataStr) +
    "\n\n" + voiceRulesForTradition(traditionId) +
    "\n\n" + FORMAT_RULES +
    EXPERT_OUTPUT_RULES;

  const finalUserMessage = chartContext ? `${chartContext}${userMessage}` : userMessage;

  const start = Date.now();
  // 14s per attempt; caller may pass deadlineMs to stop fallback chain early
  const EXPERT_TIMEOUT_MS = 14_000;
  const expertModels = [expert.model, ...(expert.fallbackModels ?? [])];

  try {
    const content = await runWithFallback(expertModels, async (model, attempt) => {
      const attemptStart = Date.now();
      if (deadlineMs && Date.now() >= deadlineMs) {
        throw new Error(`Expert ${expert.id} skipped — past global deadline`);
      }
      try {
        // When chart facts are already injected as context, skip tool calls entirely
        const toolsArg = chartContext
          ? {}
          : patchToolsWithBirthData(expert.tools, birthData);
        const maxStepsArg = chartContext ? 1 : 4;
        const attemptTimeout = deadlineMs
          ? Math.max(1_000, Math.min(EXPERT_TIMEOUT_MS, deadlineMs - Date.now()))
          : EXPERT_TIMEOUT_MS;
        const result = await Promise.race([
          generateText({
            model: openrouter(model),
            system: systemPrompt,
            messages: [{ role: "user", content: finalUserMessage }],
            tools: toolsArg,
            maxSteps: maxStepsArg,
          }),
          new Promise<never>((_, reject) =>
            setTimeout(
              () => reject(new Error(`Expert ${expert.id} timed out after ${attemptTimeout}ms`)),
              attemptTimeout,
            ),
          ),
        ]);
        const parsed = parseExpertJson(result.text, expert.id);
        const dm = Date.now() - attemptStart;
        logRun({ userId, route: "daily", phase: "expert", expertId: expert.id, traditionId, model, attempt, ok: true, durationMs: dm });
        return { parsed, result };
      } catch (err) {
        const dm = Date.now() - attemptStart;
        logRun({ userId, route: "daily", phase: "expert", expertId: expert.id, traditionId, model, attempt, ok: false, durationMs: dm, error: err instanceof Error ? err.message : String(err) });
        throw err;
      }
    });

    return {
      traditionId: traditionId as ExpertReading["traditionId"],
      expertId: expert.id,
      expertName: expert.name,
      expertEmoji: expert.emoji,
      color: expert.color,
      textColor: expert.textColor,
      content: {
        facts: sanitizeField(content.parsed.facts),
        analysis: sanitizeField(content.parsed.analysis),
        summary: sanitizeField(content.parsed.summary),
        oneLiner: sanitizeField(content.parsed.oneLiner),
        aspectSignals: content.parsed.aspectSignals ?? [],
        status: content.parsed.status ?? "Fair",
        action: content.parsed.action ?? "",
      },
      durationMs: Date.now() - start,
      usage: content.result.usage
        ? {
            promptTokens: content.result.usage.promptTokens,
            completionTokens: content.result.usage.completionTokens,
            totalTokens: content.result.usage.totalTokens,
          }
        : undefined,
      rawText: content.result.text,
      systemPrompt,
      model: expert.model,
      userMessage: finalUserMessage,
    };
  } catch (err) {
    return {
      traditionId: traditionId as ExpertReading["traditionId"],
      expertId: expert.id,
      expertName: expert.name,
      expertEmoji: expert.emoji,
      color: expert.color,
      textColor: expert.textColor,
      content: { facts: "", analysis: "", summary: "", oneLiner: "", aspectSignals: [], status: "Fair" as const, action: "" },
      durationMs: Date.now() - start,
      error: err instanceof Error ? err.message : String(err),
      systemPrompt,
      model: expert.model,
      userMessage: finalUserMessage,
    };
  }
}

// ─── Shared judge schema ──────────────────────────────────────────────────────

const JudgeOutputSchema = z.object({
  summary: z.string(),
  oneLiner: z.string(),
  chimerCandidates: z.array(TraditionIdSchema).optional().default([]),
});

export interface SynthesizeOpts {
  judgeConfig: { model: string; fallbackModels?: string[] };
  /** Resolved system prompt template string with {expertOutputs} placeholder. */
  systemPromptTemplate: string;
  /**
   * The user-facing message to pass to the judge (e.g. the question or a
   * standard daily synthesis prompt).
   */
  userMessage: string;
  /**
   * Optional framing paragraph to append after the expert outputs block
   * (used by the chat route to inject the prior daily reading context).
   */
  priorFrame?: string | null;
  userId?: string | null;
  route?: "daily" | "profile" | "council" | "chart";
}

/**
 * Synthesize expert readings into an Oracle verdict.
 *
 * Extracts the judge synthesis logic that was previously inlined in every API
 * route. Returns a fully-typed `Oracle` object so callers do not need to repeat
 * the `generateObject` boilerplate.
 *
 * Falls back gracefully — if the LLM call fails the returned `Oracle` still has
 * `summary` and `oneLiner` fields populated with a human-readable error.
 */
export async function synthesize(
  expertReadings: ExpertReading[],
  opts: SynthesizeOpts,
): Promise<Oracle> {
  const successful = expertReadings.filter((r) => !r.error);

  const expertOutputs = successful
    .map((r) => {
      const parts = [`### ${r.expertName}`];
      if (r.content.facts) parts.push(`**Facts:** ${r.content.facts}`);
      parts.push(r.content.analysis);
      return parts.join("\n");
    })
    .join("\n\n---\n\n");

  const judgeSystemPrompt =
    opts.systemPromptTemplate.replace("{expertOutputs}", expertOutputs) +
    (opts.priorFrame ?? "") +
    "\n\n" + VOICE_RULES +
    "\n\n" + FORMAT_RULES;

  const judgeStart = Date.now();
  const judgeModels = [opts.judgeConfig.model, ...(opts.judgeConfig.fallbackModels ?? [])];

  try {
    const JUDGE_TIMEOUT_MS = 12_000;
    const judgeResult = await runWithFallback(judgeModels, async (model, attempt) => {
      const attemptStart = Date.now();
      try {
        const result = await Promise.race([
          generateObject({
            model: openrouter(model),
            system: judgeSystemPrompt,
            messages: [{ role: "user", content: opts.userMessage }],
            schema: JudgeOutputSchema,
            mode: "json",
          }),
          new Promise<never>((_, reject) =>
            setTimeout(
              () => reject(new Error(`Judge timed out after ${JUDGE_TIMEOUT_MS}ms`)),
              JUDGE_TIMEOUT_MS,
            ),
          ),
        ]);
        const dm = Date.now() - attemptStart;
        logRun({ userId: opts.userId, route: opts.route ?? "council", phase: "judge", model, attempt, ok: true, durationMs: dm });
        return result;
      } catch (err) {
        const dm = Date.now() - attemptStart;
        logRun({ userId: opts.userId, route: opts.route ?? "council", phase: "judge", model, attempt, ok: false, durationMs: dm, error: err instanceof Error ? err.message : String(err) });
        throw err;
      }
    });

    return {
      summary: judgeResult.object.summary,
      oneLiner: judgeResult.object.oneLiner,
      aspectCallouts: [],
      chimers: [],
      chimerCandidates: judgeResult.object.chimerCandidates ?? [],
      durationMs: Date.now() - judgeStart,
      usage: judgeResult.usage
        ? {
            promptTokens: judgeResult.usage.promptTokens,
            completionTokens: judgeResult.usage.completionTokens,
            totalTokens: judgeResult.usage.totalTokens,
          }
        : undefined,
      systemPrompt: judgeSystemPrompt,
      model: opts.judgeConfig.model,
      userMessage: opts.userMessage,
    };
  } catch (err) {
    logRun({ userId: opts.userId, route: opts.route ?? "council", phase: "judge", model: opts.judgeConfig.model, ok: false, error: err instanceof Error ? err.message : String(err), meta: { event: "judge_synthesis_failed", modelsAttempted: judgeModels.length } });
    return {
      summary: "The assembly was unable to synthesize a verdict.",
      oneLiner: "Py fell silent — please try again.",
      aspectCallouts: [],
      chimers: [],
      chimerCandidates: [],
      error: err instanceof Error ? err.message : String(err),
      durationMs: Date.now() - judgeStart,
      systemPrompt: judgeSystemPrompt,
      model: opts.judgeConfig.model,
      userMessage: opts.userMessage,
    };
  }
}
