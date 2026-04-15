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

function drawRandom(count: number): Array<TarotCard & { reversed: boolean }> {
  const deck = [...(tarotDeck as TarotCard[])];
  const drawn: Array<TarotCard & { reversed: boolean }> = [];
  const used = new Set<number>();

  while (drawn.length < count) {
    const idx = Math.floor(Math.random() * deck.length);
    if (!used.has(idx)) {
      used.add(idx);
      const arr = new Uint8Array(1);
      crypto.getRandomValues(arr);
      drawn.push({ ...deck[idx]!, reversed: arr[0]! < 128 });
    }
  }
  return drawn;
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

export const tarotTools = {
  drawCards: tool({
    description:
      "Draw tarot cards for a reading. Supports single card, three-card spread (past/present/future), or five-card spread.",
    parameters: spreadSchema,
    execute: async ({ spread, question }: z.infer<typeof spreadSchema>) => {
      const safeSpread = spread ?? "three-card";
      const counts: Record<string, number> = { single: 1, "three-card": 3, "five-card": 5 };
      const cards = drawRandom(counts[safeSpread] ?? 3);

      const positions: Record<string, string[]> = {
        single: ["Present situation / Core message"],
        "three-card": ["Past", "Present", "Future"],
        "five-card": ["Present situation", "Challenge", "Past influence", "Future outcome", "Advice"],
      };

      return {
        spread: safeSpread,
        question: question ?? "General reading",
        cards: cards.map((card, i) => ({
          position: (positions[safeSpread] ?? [])[i] ?? `Card ${i + 1}`,
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
  }),

  lookupCard: tool({
    description: "Look up detailed information about a specific tarot card by name.",
    parameters: lookupSchema,
    execute: async ({ cardName }: z.infer<typeof lookupSchema>) => {
      if (!cardName) return { error: "No card name provided" };
      const deck = tarotDeck as TarotCard[];
      const card = deck.find((c) =>
        c.name.toLowerCase().includes(cardName.toLowerCase())
      );
      if (!card) return { error: `Card "${cardName}" not found in deck` };
      return card;
    },
  }),
};
