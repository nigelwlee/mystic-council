import { tool } from "ai";
import { z } from "zod";
import tarotDeck from "@/data/tarot-deck.json";

export interface TarotCard {
  name: string;
  arcana: "major" | "minor";
  suit?: string;
  number?: number;
  uprightKeywords: string[];
  reversedKeywords: string[];
  uprightMeaning: string;
  reversedMeaning: string;
  element?: string;
  astrology?: string;
}

function drawRandom(
  count: number,
  rng: () => number = Math.random,
): Array<TarotCard & { reversed: boolean }> {
  const deck = [...(tarotDeck as TarotCard[])];
  const drawn: Array<TarotCard & { reversed: boolean }> = [];
  const used = new Set<number>();

  while (drawn.length < count) {
    const idx = Math.floor(rng() * deck.length);
    if (!used.has(idx)) {
      used.add(idx);
      drawn.push({ ...deck[idx]!, reversed: rng() < 0.5 });
    }
  }
  return drawn;
}

// Concurrency-safe seeded PRNG — does NOT mutate Math.random.
export function makeSeededRng(seed: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  }
  let state = h >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let z = state;
    z = Math.imul(z ^ (z >>> 15), z | 1);
    z ^= z + Math.imul(z ^ (z >>> 7), z | 61);
    return ((z ^ (z >>> 14)) >>> 0) / 4294967296;
  };
}

const spreadSchema = z.object({
  spread: z
    .enum(["single", "three-card", "five-card"])
    .describe("Type of spread to draw"),
  question: z.string().optional().describe("The question or focus for the reading"),
});

const lookupSchema = z.object({
  cardName: z.string().describe("The name of the tarot card to look up"),
});

const POSITIONS: Record<string, string[]> = {
  single: ["Present situation / Core message"],
  "three-card": ["Past", "Present", "Future"],
  "five-card": ["Present situation", "Challenge", "Past influence", "Future outcome", "Advice"],
};

export function makeDrawCardsTool(rng?: () => number) {
  return tool({
    description:
      "Draw tarot cards for a reading. Supports single card, three-card spread (past/present/future), or five-card spread.",
    parameters: spreadSchema,
    execute: async ({ spread, question }: z.infer<typeof spreadSchema>) => {
      const counts: Record<string, number> = { single: 1, "three-card": 3, "five-card": 5 };
      const cards = drawRandom(counts[spread] ?? 1, rng);

      return {
        spread,
        question: question ?? "General reading",
        cards: cards.map((card, i) => ({
          position: (POSITIONS[spread] ?? [])[i] ?? `Card ${i + 1}`,
          name: card.name,
          reversed: card.reversed,
          arcana: card.arcana,
          suit: card.suit,
          keywords: card.reversed ? card.reversedKeywords : card.uprightKeywords,
          meaning: card.reversed ? card.reversedMeaning : card.uprightMeaning,
          element: card.element,
          astrology: card.astrology,
        })),
      };
    },
  });
}

export const tarotTools = {
  drawCards: makeDrawCardsTool(),

  lookupCard: tool({
    description: "Look up detailed information about a specific tarot card by name.",
    parameters: lookupSchema,
    execute: async ({ cardName }: z.infer<typeof lookupSchema>) => {
      const deck = tarotDeck as TarotCard[];
      const card = deck.find((c) =>
        c.name.toLowerCase().includes(cardName.toLowerCase())
      );
      if (!card) return { error: `Card "${cardName}" not found in deck` };
      return card;
    },
  }),
};
