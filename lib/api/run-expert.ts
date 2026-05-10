import { generateText, generateObject } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { z } from "zod";
import { loadKnowledge, loadSystemPrompt } from "@/lib/knowledge/loader";
import { EXPERT_ID_TO_TRADITION } from "@/lib/constants/traditions";
import { VOICE_RULES, voiceRulesForTradition } from "@/lib/voice";
import { FORMAT_RULES, sanitizeField } from "@/lib/format";
import { ExpertContentSchema, FacetExpertOutputSchema } from "@/lib/api/schemas";
import type { BirthData, ExpertConfig } from "@/lib/experts/types";
import type { ExpertReading, Oracle, FacetExpertResult } from "@/lib/api/schemas";
import type { CoreTool } from "ai";

const openrouter = createOpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
});

export const EXPERT_OUTPUT_RULES = `

OUTPUT FORMAT — STRICT JSON ONLY. All four values MUST be plain text strings — never nested objects or arrays.
{
  "facts": "Write a prose paragraph of specific raw observations: positions, degrees, card names, pillar elements, life path number, etc. Example: 'Your Moon is in Sagittarius at 10.6°. Mercury is in Pisces at 26.1°. Saturn is in Aquarius.' Do NOT use nested objects.",
  "analysis": "3-5 sentences interpreting what these facts mean for this specific person and question.",
  "summary": "2-3 sentence reading capturing the essence.",
  "oneLiner": "START with the exact artifact from your tradition — the card name, the transit name, the dasha name, the pillar, the number. Then 4-8 words on what it means right now. Max 15 words total. No intro, no formula. Examples: Tarot → 'Tower reversed. A crisis dissolves before it lands.' Western → 'Mars trines your natal Jupiter. Effort pays off today.' Vedic → 'Mercury antardasha in Saturn mahadasha. Write it down, commit nothing yet.' Chinese → 'Bing Wu day clashes your Geng Metal. Tension at midday, resolve by evening.' Numerology → 'Personal Day 8. Money or power moves are in play.'"
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

export async function runSingleExpert(
  expert: ExpertConfig,
  userMessage: string,
  birthData: BirthData | null,
  chartContext?: string | null,
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
  // 25s per attempt × 2 attempts = 50s max, fits within /api/daily maxDuration=60
  const EXPERT_TIMEOUT_MS = 25_000;

  try {
    const content = await runWithRetry(async (attempt) => {
      const attemptStart = Date.now();
      try {
        const result = await Promise.race([
          generateText({
            model: openrouter(expert.model),
            system: systemPrompt,
            messages: [{ role: "user", content: finalUserMessage }],
            tools: patchToolsWithBirthData(expert.tools, birthData),
            maxSteps: 4,
          }),
          new Promise<never>((_, reject) =>
            setTimeout(
              () => reject(new Error(`Expert ${expert.id} timed out after ${EXPERT_TIMEOUT_MS}ms`)),
              EXPERT_TIMEOUT_MS,
            ),
          ),
        ]);
        const parsed = parseExpertJson(result.text, expert.id);
        console.log(JSON.stringify({ tag: "[expert]", expertId: expert.id, traditionId, model: expert.model, attempt, ok: true, durationMs: Date.now() - attemptStart }));
        return { parsed, result };
      } catch (err) {
        console.log(JSON.stringify({ tag: "[expert]", expertId: expert.id, traditionId, model: expert.model, attempt, ok: false, durationMs: Date.now() - attemptStart, error: err instanceof Error ? err.message : String(err) }));
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
      content: { facts: "", analysis: "", summary: "", oneLiner: "" },
      durationMs: Date.now() - start,
      error: err instanceof Error ? err.message : String(err),
      systemPrompt,
      model: expert.model,
      userMessage: finalUserMessage,
    };
  }
}

// ─── Facet expert runner ──────────────────────────────────────────────────────

/**
 * Parse a facet JSON response from raw LLM text.
 * Strips markdown fences, finds the JSON object, and validates against FacetExpertOutputSchema.
 */
function parseFacetJson(text: string, expertId: string): typeof FacetExpertOutputSchema._type {
  const stripped = text.replace(/```(?:json)?\s*/g, "").replace(/```/g, "");
  const jsonMatch = stripped.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error(`Facet expert ${expertId}: no JSON object in response`);
  let raw: unknown;
  try {
    raw = JSON.parse(jsonMatch[0]);
  } catch {
    throw new Error(`Facet expert ${expertId}: response is not valid JSON`);
  }
  return FacetExpertOutputSchema.parse(raw);
}

/**
 * Run a single expert using the facet system prompt variant.
 * Each expert returns all 5 facets (health/work/finances/relations/family) in one call.
 * Uses generateText + JSON parse (same pattern as runSingleExpert) to support tool-using experts like tarot.
 */
export async function runFacetExpert(
  expert: ExpertConfig,
  userMessage: string,
  birthData: BirthData | null,
  chartContext?: string | null,
): Promise<FacetExpertResult> {
  const [knowledge, promptTemplate] = await Promise.all([
    loadKnowledge(expert.knowledgePath),
    loadSystemPrompt(expert.knowledgePath, "facets"),
  ]);
  const birthDataStr = formatBirthData(birthData);

  const traditionId = EXPERT_ID_TO_TRADITION[expert.id];
  if (!traditionId) throw new Error(`Unknown expertId: ${expert.id}`);

  const systemPrompt =
    promptTemplate
      .replace("{knowledge}", knowledge)
      .replace("{birthData}", birthDataStr) +
    "\n\n" + voiceRulesForTradition(traditionId) +
    "\n\n" + FORMAT_RULES;

  const finalUserMessage = chartContext ? `${chartContext}${userMessage}` : userMessage;

  const start = Date.now();
  const EXPERT_TIMEOUT_MS = 35_000; // facet calls are bigger — allow more time

  try {
    const content = await runWithRetry(async (attempt) => {
      const attemptStart = Date.now();
      try {
        const result = await Promise.race([
          generateText({
            model: openrouter(expert.model),
            system: systemPrompt,
            messages: [{ role: "user", content: finalUserMessage }],
            tools: patchToolsWithBirthData(expert.tools, birthData),
            maxSteps: 4,
          }),
          new Promise<never>((_, reject) =>
            setTimeout(
              () => reject(new Error(`Facet expert ${expert.id} timed out after ${EXPERT_TIMEOUT_MS}ms`)),
              EXPERT_TIMEOUT_MS,
            ),
          ),
        ]);
        const parsed = parseFacetJson(result.text, expert.id);
        console.log(JSON.stringify({ tag: "[facet-expert]", expertId: expert.id, traditionId, model: expert.model, attempt, ok: true, durationMs: Date.now() - attemptStart }));
        return { parsed, result };
      } catch (err) {
        console.log(JSON.stringify({ tag: "[facet-expert]", expertId: expert.id, traditionId, model: expert.model, attempt, ok: false, durationMs: Date.now() - attemptStart, error: err instanceof Error ? err.message : String(err) }));
        throw err;
      }
    });

    const facets = content.parsed.facets;

    return {
      traditionId: traditionId as FacetExpertResult["traditionId"],
      expertId: expert.id,
      expertName: expert.name,
      color: expert.color,
      facets: {
        health: {
          oneLiner: sanitizeField(facets.health.oneLiner),
          summary: sanitizeField(facets.health.summary),
          analysis: sanitizeField(facets.health.analysis),
          facts: facets.health.facts ? sanitizeField(facets.health.facts) : undefined,
        },
        work: {
          oneLiner: sanitizeField(facets.work.oneLiner),
          summary: sanitizeField(facets.work.summary),
          analysis: sanitizeField(facets.work.analysis),
          facts: facets.work.facts ? sanitizeField(facets.work.facts) : undefined,
        },
        finances: {
          oneLiner: sanitizeField(facets.finances.oneLiner),
          summary: sanitizeField(facets.finances.summary),
          analysis: sanitizeField(facets.finances.analysis),
          facts: facets.finances.facts ? sanitizeField(facets.finances.facts) : undefined,
        },
        relations: {
          oneLiner: sanitizeField(facets.relations.oneLiner),
          summary: sanitizeField(facets.relations.summary),
          analysis: sanitizeField(facets.relations.analysis),
          facts: facets.relations.facts ? sanitizeField(facets.relations.facts) : undefined,
        },
        family: {
          oneLiner: sanitizeField(facets.family.oneLiner),
          summary: sanitizeField(facets.family.summary),
          analysis: sanitizeField(facets.family.analysis),
          facts: facets.family.facts ? sanitizeField(facets.family.facts) : undefined,
        },
      },
      durationMs: Date.now() - start,
      usage: content.result.usage
        ? {
            promptTokens: content.result.usage.promptTokens,
            completionTokens: content.result.usage.completionTokens,
            totalTokens: content.result.usage.totalTokens,
          }
        : undefined,
      model: expert.model,
    };
  } catch (err) {
    return {
      traditionId: traditionId as FacetExpertResult["traditionId"],
      expertId: expert.id,
      expertName: expert.name,
      color: expert.color,
      facets: {
        health:    { oneLiner: "", summary: "", analysis: "" },
        work:      { oneLiner: "", summary: "", analysis: "" },
        finances:  { oneLiner: "", summary: "", analysis: "" },
        relations: { oneLiner: "", summary: "", analysis: "" },
        family:    { oneLiner: "", summary: "", analysis: "" },
      },
      durationMs: Date.now() - start,
      error: err instanceof Error ? err.message : String(err),
      model: expert.model,
    };
  }
}

// ─── Shared judge schema ──────────────────────────────────────────────────────

const JudgeOutputSchema = z.object({
  summary: z.string(),
  oneLiner: z.string(),
});

export interface SynthesizeOpts {
  judgeConfig: { model: string };
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

  try {
    const judgeResult = await generateObject({
      model: openrouter(opts.judgeConfig.model),
      system: judgeSystemPrompt,
      messages: [{ role: "user", content: opts.userMessage }],
      schema: JudgeOutputSchema,
    });

    return {
      summary: judgeResult.object.summary,
      oneLiner: judgeResult.object.oneLiner,
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
    return {
      summary: "The council was unable to synthesize a verdict.",
      oneLiner: err instanceof Error ? err.message : String(err),
      durationMs: Date.now() - judgeStart,
      systemPrompt: judgeSystemPrompt,
      model: opts.judgeConfig.model,
      userMessage: opts.userMessage,
    };
  }
}
