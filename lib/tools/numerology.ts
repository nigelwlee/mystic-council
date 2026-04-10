import { tool } from "ai";
import { z } from "zod";

const PYTHAGOREAN: Record<string, number> = {
  A: 1, J: 1, S: 1,
  B: 2, K: 2, T: 2,
  C: 3, L: 3, U: 3,
  D: 4, M: 4, V: 4,
  E: 5, N: 5, W: 5,
  F: 6, O: 6, X: 6,
  G: 7, P: 7, Y: 7,
  H: 8, Q: 8, Z: 8,
  I: 9, R: 9,
};

const MASTER_NUMBERS = new Set([11, 22, 33]);

function reduceToDigit(n: number): number {
  while (n > 9 && !MASTER_NUMBERS.has(n)) {
    n = String(n).split("").reduce((sum, d) => sum + parseInt(d), 0);
  }
  return n;
}

function sumName(name: string, vowelsOnly = false, consonantsOnly = false): number {
  const letters = name.toUpperCase().replace(/[^A-Z]/g, "").split("");
  const vowels = new Set(["A", "E", "I", "O", "U"]);
  const filtered = letters.filter((c) => {
    if (vowelsOnly) return vowels.has(c);
    if (consonantsOnly) return !vowels.has(c);
    return true;
  });
  const total = filtered.reduce((sum, c) => sum + (PYTHAGOREAN[c] ?? 0), 0);
  return reduceToDigit(total);
}

const lifePathSchema = z.object({
  birthdate: z.string().describe("Birth date in YYYY-MM-DD format"),
});

const nameSchema = z.object({
  fullName: z.string().describe("Full birth name (as on birth certificate)"),
});

export const numerologyTools = {
  calculateLifePath: tool({
    description:
      "Calculate the Life Path number from a birth date. This is the most important number in numerology.",
    parameters: lifePathSchema,
    execute: async ({ birthdate }: z.infer<typeof lifePathSchema>) => {
      const [year, month, day] = birthdate.split("-").map(Number);
      const m = reduceToDigit(month);
      const d = reduceToDigit(day);
      const y = reduceToDigit(
        String(year).split("").reduce((s, n) => s + parseInt(n), 0)
      );
      const lifePath = reduceToDigit(m + d + y);
      return {
        lifePath,
        isMasterNumber: MASTER_NUMBERS.has(lifePath),
        breakdown: { month: m, day: d, year: y },
      };
    },
  }),

  calculateNameNumbers: tool({
    description:
      "Calculate Expression (Destiny), Soul Urge, and Personality numbers from a full name.",
    parameters: nameSchema,
    execute: async ({ fullName }: z.infer<typeof nameSchema>) => {
      const expression = sumName(fullName);
      const soulUrge = sumName(fullName, true, false);
      const personality = sumName(fullName, false, true);
      return {
        expression,
        soulUrge,
        personality,
        expressionIsMaster: MASTER_NUMBERS.has(expression),
        soulUrgeIsMaster: MASTER_NUMBERS.has(soulUrge),
        personalityIsMaster: MASTER_NUMBERS.has(personality),
      };
    },
  }),
};
