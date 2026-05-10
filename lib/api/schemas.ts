import { z } from "zod";

// ─── Inputs ──────────────────────────────────────────────────────────────────

export const BirthDataSchema = z.object({
  name: z.string().optional(),
  date: z.string().optional(),
  time: z.string().optional(),
  latitude: z.number().nullish(),
  longitude: z.number().nullish(),
  location: z.string().optional(),
});

// Forward-declared loosely-typed shapes for prerequisite passthrough.
// We avoid full reuse of ChartDataSchema / DailyReadingResponseSchema here
// to prevent circular references (those schemas reference ContextInputSchema below).
const ChartPassthroughSchema = z.object({
  id: z.string(),
  generatedAt: z.string(),
  traditions: z.record(z.string(), z.unknown()),
}).passthrough();

const DailyReadingPassthroughSchema = z.object({
  id: z.string(),
  generatedAt: z.string(),
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

// ─── Expert output ────────────────────────────────────────────────────────────

export const ExpertContentSchema = z.object({
  facts: z.string(),
  analysis: z.string(),
  summary: z.string(),
  oneLiner: z.string(),
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
  durationMs: z.number().optional(),
  usage: TokenUsageSchema.optional(),
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

// ─── Facet schemas ────────────────────────────────────────────────────────────

export const FacetContentSchema = z.object({
  oneLiner: z.string(),
  summary: z.string(),
  analysis: z.string(),
  facts: z.string().optional(),
});

const FacetSetSchema = z.object({
  health: FacetContentSchema,
  work: FacetContentSchema,
  finances: FacetContentSchema,
  relations: FacetContentSchema,
  family: FacetContentSchema,
});

export const FacetExpertOutputSchema = z.object({
  facets: FacetSetSchema,
});

export const FacetSynthesisSchema = z.object({
  keyAction: z.string(),
  summary: z.string(),
  oneLiner: z.string(),
});

const FacetSynthesisSetSchema = z.object({
  health: FacetSynthesisSchema,
  work: FacetSynthesisSchema,
  finances: FacetSynthesisSchema,
  relations: FacetSynthesisSchema,
  family: FacetSynthesisSchema,
});

export const FacetJudgeOutputSchema = z.object({
  facets: FacetSynthesisSetSchema,
});

export const FacetExpertResultSchema = z.object({
  traditionId: TraditionIdSchema,
  expertId: z.string(),
  expertName: z.string(),
  color: z.string(),
  facets: FacetSetSchema,
  durationMs: z.number().optional(),
  usage: TokenUsageSchema.optional(),
  error: z.string().optional(),
  model: z.string().optional(),
});

export const DailyFacetsResponseSchema = z.object({
  generatedAt: z.string(),
  totalDurationMs: z.number(),
  input: ContextInputSchema,
  oracle: z.object({ facets: FacetSynthesisSetSchema }),
  experts: z.array(FacetExpertResultSchema),
});

// ─── Inferred types ───────────────────────────────────────────────────────────

export type FacetContent = z.infer<typeof FacetContentSchema>;
export type FacetExpertOutput = z.infer<typeof FacetExpertOutputSchema>;
export type FacetSynthesis = z.infer<typeof FacetSynthesisSchema>;
export type FacetJudgeOutput = z.infer<typeof FacetJudgeOutputSchema>;
export type FacetExpertResult = z.infer<typeof FacetExpertResultSchema>;
export type DailyFacetsResponse = z.infer<typeof DailyFacetsResponseSchema>;

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
