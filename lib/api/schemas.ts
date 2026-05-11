import { z } from "zod";

// ─── Inputs ──────────────────────────────────────────────────────────────────

export const BirthDataSchema = z.object({
  name: z.string().nullish(),
  date: z.string().optional(),
  time: z.string().nullish(),
  latitude: z.number().nullish(),
  longitude: z.number().nullish(),
  location: z.string().nullish(),
});

// Forward-declared loosely-typed shapes for prerequisite passthrough.
// We avoid full reuse of ChartDataSchema / DailyReadingResponseSchema here
// to prevent circular references (those schemas reference ContextInputSchema below).
// id/generatedAt are optional because mobile sends chart_facts from Supabase
// (shaped { birthDataHash, traditions }) which lacks those metadata fields.
const ChartPassthroughSchema = z.object({
  id: z.string().optional(),
  generatedAt: z.string().optional(),
  traditions: z.record(z.string(), z.unknown()),
}).passthrough();

const DailyReadingPassthroughSchema = z.object({
  id: z.string().optional(),
  generatedAt: z.string().optional(),
  experts: z.array(z.unknown()),
  oracle: z.object({
    summary: z.string(),
    oneLiner: z.string(),
  }).passthrough(),
}).passthrough();

export const ContextInputSchema = z.object({
  birthData: BirthDataSchema.nullable().default(null),
  date: z.string().default(() => new Date().toLocaleDateString("en-CA")),
  chart: ChartPassthroughSchema.optional(),
  userId: z.string().optional(),
});

export const QuestionInputSchema = ContextInputSchema.extend({
  question: z.string().min(1, "question is required"),
  dailyDigest: z.boolean().optional(),
  dailyReading: DailyReadingPassthroughSchema.optional(),
});

// ─── Shared enums ────────────────────────────────────────────────────────────

export const TraditionIdSchema = z.enum([
  "western",
  "chinese",
  "vedic",
  "tarot",
  "numerology",
]);

// ─── Aspect signals ───────────────────────────────────────────────────────────

export const AspectKeySchema = z.enum(["health", "work", "finances", "relations", "family"]);

export const AspectSignalSchema = z.object({
  aspect: AspectKeySchema,
  strength: z.enum(["strong", "notable"]),
  note: z.string(),
});

export const AspectCalloutSchema = z.object({
  aspect: AspectKeySchema,
  keyAction: z.string(),
  summary: z.string(),
  excerpts: z.array(z.object({
    traditionId: z.string(),
    expertName: z.string(),
    text: z.string(),
  })),
});

export const JudgeDailySchema = z.object({
  summary: z.string(),
  oneLiner: z.string(),
  aspectCallouts: z.array(AspectCalloutSchema).default([]),
});

// ─── Expert output ────────────────────────────────────────────────────────────

export const ExpertContentSchema = z.object({
  facts: z.string(),
  analysis: z.string(),
  summary: z.string(),
  oneLiner: z.string(),
  aspectSignals: z.array(AspectSignalSchema).optional().default([]),
});

export const TokenUsageSchema = z.object({
  promptTokens: z.number(),
  completionTokens: z.number(),
  totalTokens: z.number(),
});

export const ExpertReadingSchema = z.object({
  traditionId: TraditionIdSchema,
  expertId: z.string(),
  expertName: z.string(),
  expertEmoji: z.string(),
  color: z.string(),
  textColor: z.string(),
  content: ExpertContentSchema,
  durationMs: z.number().optional(),
  usage: TokenUsageSchema.optional(),
  error: z.string().optional(),
  rawText: z.string().optional(),
  systemPrompt: z.string().optional(),
  model: z.string().optional(),
  userMessage: z.string().optional(),
});

// ─── Oracle ───────────────────────────────────────────────────────────────────

export const OracleSchema = z.object({
  summary: z.string(),
  oneLiner: z.string(),
  aspectCallouts: z.array(AspectCalloutSchema).optional().default([]),
  durationMs: z.number().optional(),
  usage: TokenUsageSchema.optional(),
  error: z.string().optional(),
  systemPrompt: z.string().optional(),
  model: z.string().optional(),
  userMessage: z.string().optional(),
});

// ─── Daily digest (optional council add-on) ───────────────────────────────────

export const ExpertExcerptsSchema = z.object({
  western: z.string().optional(),
  chinese: z.string().optional(),
  vedic: z.string().optional(),
  tarot: z.string().optional(),
  numerology: z.string().optional(),
});

export const DigestSchema = z.object({
  oneLiner: z.string().describe("One sentence daily reading"),
  summary: z.string().describe("2-3 sentence daily overview"),
  expertExcerpts: ExpertExcerptsSchema,
  durationMs: z.number().optional(),
  usage: TokenUsageSchema.optional(),
});

// ─── Response envelopes ───────────────────────────────────────────────────────

export const CouncilReadingSchema = z.object({
  id: z.string(),
  generatedAt: z.string(),
  input: QuestionInputSchema,
  experts: z.array(ExpertReadingSchema),
  oracle: OracleSchema,
  digest: DigestSchema.optional(),
  totalDurationMs: z.number().optional(),
});

export const DailyReadingResponseSchema = z.object({
  id: z.string(),
  generatedAt: z.string(),
  input: ContextInputSchema,
  experts: z.array(ExpertReadingSchema),
  oracle: OracleSchema,
  totalDurationMs: z.number().optional(),
});

export const ExpertOnlySchema = z.object({
  id: z.string(),
  generatedAt: z.string(),
  input: z.union([QuestionInputSchema, ContextInputSchema]),
  expert: ExpertReadingSchema,
  totalDurationMs: z.number().optional(),
});

export const ChartDataSchema = z.object({
  id: z.string(),
  generatedAt: z.string(),
  input: ContextInputSchema,
  traditions: z.object({
    western: z.unknown().optional(),
    chinese: z.unknown().optional(),
    vedic: z.unknown().optional(),
    numerology: z.unknown().optional(),
    tarot: z.unknown().optional(),
  }),
  totalDurationMs: z.number().optional(),
});

// ─── Inferred types ───────────────────────────────────────────────────────────

export type AspectKey = z.infer<typeof AspectKeySchema>;
export type AspectSignal = z.infer<typeof AspectSignalSchema>;
export type AspectCallout = z.infer<typeof AspectCalloutSchema>;
export type JudgeDaily = z.infer<typeof JudgeDailySchema>;

export type TraditionId = z.infer<typeof TraditionIdSchema>;
export type TokenUsage = z.infer<typeof TokenUsageSchema>;
export type ExpertExcerpts = z.infer<typeof ExpertExcerptsSchema>;
export type Digest = z.infer<typeof DigestSchema>;
export type BirthData = z.infer<typeof BirthDataSchema>;
export type ContextInput = z.infer<typeof ContextInputSchema>;
export type QuestionInput = z.infer<typeof QuestionInputSchema>;
export type ExpertContent = z.infer<typeof ExpertContentSchema>;
export type ExpertReading = z.infer<typeof ExpertReadingSchema>;
export type Oracle = z.infer<typeof OracleSchema>;
export type CouncilReading = z.infer<typeof CouncilReadingSchema>;
export type DailyReadingResponse = z.infer<typeof DailyReadingResponseSchema>;
export type ExpertOnly = z.infer<typeof ExpertOnlySchema>;
export type ChartData = z.infer<typeof ChartDataSchema>;
