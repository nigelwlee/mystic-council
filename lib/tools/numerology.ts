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

const personalNumbersSchema = z.object({
  birthdate: z.string().describe("Birth date in YYYY-MM-DD format"),
  date: z.string().describe("Reading date in YYYY-MM-DD format"),
});

const pinnacleSchema = z.object({
  birthdate: z.string().describe("Birth date in YYYY-MM-DD format"),
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

  calculatePersonalNumbers: tool({
    description:
      "Calculate Personal Year, Personal Month, Personal Day, and Universal Day numbers for a given reading date. These are the time-varying numerology numbers that govern current cycles.",
    parameters: personalNumbersSchema,
    execute: async ({ birthdate, date }: z.infer<typeof personalNumbersSchema>) => {
      const [, birthMonth, birthDay] = birthdate.split("-").map(Number);
      const [year, month, day] = date.split("-").map(Number);

      const personalYear = reduceToDigit(
        reduceToDigit(birthMonth) +
          reduceToDigit(birthDay) +
          reduceToDigit(String(year).split("").reduce((s, n) => s + parseInt(n), 0)),
      );
      const personalMonth = reduceToDigit(personalYear + reduceToDigit(month));
      const personalDay = reduceToDigit(personalMonth + reduceToDigit(day));
      const universalDay = reduceToDigit(
        reduceToDigit(month) +
          reduceToDigit(day) +
          reduceToDigit(String(year).split("").reduce((s, n) => s + parseInt(n), 0)),
      );

      return {
        date,
        personalYear,
        personalMonth,
        personalDay,
        universalDay,
        personalYearIsMaster: MASTER_NUMBERS.has(personalYear),
        personalMonthIsMaster: MASTER_NUMBERS.has(personalMonth),
        personalDayIsMaster: MASTER_NUMBERS.has(personalDay),
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

  calculatePinnaclesAndChallenges: tool({
    description:
      "Calculate the four Pinnacle and four Challenge numbers — the long-term cycles governing life chapters. Also identifies karmic debt numbers (13, 14, 16, 19) before reduction.",
    parameters: pinnacleSchema,
    execute: async ({ birthdate }: z.infer<typeof pinnacleSchema>) => {
      const [birthYear, birthMonth, birthDay] = birthdate.split("-").map(Number);
      const M = reduceToDigit(birthMonth!);
      const D = reduceToDigit(birthDay!);
      const Y = reduceToDigit(String(birthYear!).split("").reduce((s, n) => s + parseInt(n), 0));

      // Pinnacle numbers (using sums before reduction to catch karmic debt)
      const p1Raw = birthMonth! + birthDay!;
      const p2Raw = birthDay! + birthYear!;
      const p1 = reduceToDigit(M + D);
      const p2 = reduceToDigit(D + Y);
      const p3 = reduceToDigit(p1 + p2);
      const p4 = reduceToDigit(M + Y);

      // Challenge numbers (absolute differences — no master numbers, 0 is valid)
      const c1 = Math.abs(M - D);
      const c2 = Math.abs(D - Y);
      const c3 = Math.abs(c1 - c2);
      const c4 = Math.abs(M - Y);

      // Life path for pinnacle age ranges
      const lifePath = reduceToDigit(M + D + Y);

      // Pinnacle age windows
      const p1End = 36 - lifePath;
      const p2End = p1End + 9;
      const p3End = p2End + 9;

      // Karmic debt detection
      const karmicDebtNumbers = new Set([13, 14, 16, 19]);
      const karmicDebts: number[] = [];
      if (karmicDebtNumbers.has(p1Raw)) karmicDebts.push(p1Raw);
      if (karmicDebtNumbers.has(p2Raw)) karmicDebts.push(p2Raw);

      return {
        lifePath,
        pinnacles: [
          { number: p1, ages: `0–${p1End}`, isMaster: MASTER_NUMBERS.has(p1) },
          { number: p2, ages: `${p1End}–${p2End}`, isMaster: MASTER_NUMBERS.has(p2) },
          { number: p3, ages: `${p2End}–${p3End}`, isMaster: MASTER_NUMBERS.has(p3) },
          { number: p4, ages: `${p3End}+`, isMaster: MASTER_NUMBERS.has(p4) },
        ],
        challenges: [
          { number: c1, ages: `0–${p1End}` },
          { number: c2, ages: `${p1End}–${p2End}` },
          { number: c3, ages: `${p2End}–${p3End}` },
          { number: c4, ages: "lifelong" },
        ],
        karmicDebts,
      };
    },
  }),
};
