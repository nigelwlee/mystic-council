import { tool } from "ai";
import { z } from "zod";
import { Body, EclipticLongitude } from "astronomy-engine";

const SIGNS = [
  "Mesha (Aries)", "Vrishabha (Taurus)", "Mithuna (Gemini)", "Karka (Cancer)",
  "Simha (Leo)", "Kanya (Virgo)", "Tula (Libra)", "Vrishchika (Scorpio)",
  "Dhanu (Sagittarius)", "Makara (Capricorn)", "Kumbha (Aquarius)", "Meena (Pisces)",
];

const NAKSHATRAS = [
  { name: "Ashwini", ruler: "Ketu", deity: "Ashvins" },
  { name: "Bharani", ruler: "Venus", deity: "Yama" },
  { name: "Krittika", ruler: "Sun", deity: "Agni" },
  { name: "Rohini", ruler: "Moon", deity: "Brahma" },
  { name: "Mrigashira", ruler: "Mars", deity: "Soma" },
  { name: "Ardra", ruler: "Rahu", deity: "Rudra" },
  { name: "Punarvasu", ruler: "Jupiter", deity: "Aditi" },
  { name: "Pushya", ruler: "Saturn", deity: "Brihaspati" },
  { name: "Ashlesha", ruler: "Mercury", deity: "Nagas" },
  { name: "Magha", ruler: "Ketu", deity: "Pitris" },
  { name: "Purva Phalguni", ruler: "Venus", deity: "Bhaga" },
  { name: "Uttara Phalguni", ruler: "Sun", deity: "Aryaman" },
  { name: "Hasta", ruler: "Moon", deity: "Savitar" },
  { name: "Chitra", ruler: "Mars", deity: "Vishvakarma" },
  { name: "Swati", ruler: "Rahu", deity: "Vayu" },
  { name: "Vishakha", ruler: "Jupiter", deity: "Indra-Agni" },
  { name: "Anuradha", ruler: "Saturn", deity: "Mitra" },
  { name: "Jyeshtha", ruler: "Mercury", deity: "Indra" },
  { name: "Mula", ruler: "Ketu", deity: "Nirriti" },
  { name: "Purva Ashadha", ruler: "Venus", deity: "Apas" },
  { name: "Uttara Ashadha", ruler: "Sun", deity: "Vishvadevas" },
  { name: "Shravana", ruler: "Moon", deity: "Vishnu" },
  { name: "Dhanishtha", ruler: "Mars", deity: "Vasus" },
  { name: "Shatabhisha", ruler: "Rahu", deity: "Varuna" },
  { name: "Purva Bhadrapada", ruler: "Jupiter", deity: "Aja Ekapad" },
  { name: "Uttara Bhadrapada", ruler: "Saturn", deity: "Ahir Budhnya" },
  { name: "Revati", ruler: "Mercury", deity: "Pushan" },
];

const DASHA_YEARS: Record<string, number> = {
  Ketu: 7, Venus: 20, Sun: 6, Moon: 10, Mars: 7,
  Rahu: 18, Jupiter: 16, Saturn: 19, Mercury: 17,
};

const DASHA_ORDER = ["Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury"];

function getLahiriAyanamsa(year: number): number {
  return 23.85 + 0.01396 * (year - 2000);
}

function siderealLon(tropical: number, year: number): number {
  return ((tropical - getLahiriAyanamsa(year) + 360) % 360 + 360) % 360;
}

const vedicChartSchema = z.object({
  date: z.string().describe("Birth date in YYYY-MM-DD format"),
  time: z.string().optional().describe("Birth time in HH:mm (24h) format"),
});

export const vedicAstrologyTools = {
  calculateVedicChart: tool({
    description:
      "Calculate Vedic (Jyotish) sidereal planetary positions using the Lahiri ayanamsa. Determines rashi (sign), nakshatra, and current Vimshottari dasha.",
    parameters: vedicChartSchema,
    execute: async ({ date, time }: z.infer<typeof vedicChartSchema>) => {
      const [year, month, day] = date.split("-").map(Number);
      const [hour, minute] = time ? time.split(":").map(Number) : [12, 0];
      const dateObj = new Date(Date.UTC(year!, month! - 1, day!, hour, minute));
      const ayanamsa = getLahiriAyanamsa(year!);

      const bodies = [Body.Sun, Body.Moon, Body.Mercury, Body.Venus, Body.Mars, Body.Jupiter, Body.Saturn];
      const chart: Record<string, { rashi: string; degree: number; siderealLon: number }> = {};

      for (const body of bodies) {
        try {
          const tropical = EclipticLongitude(body, dateObj);
          const sidereal = siderealLon(tropical, year!);
          const signIndex = Math.floor(sidereal / 30);
          chart[String(body)] = {
            rashi: SIGNS[signIndex] ?? "Unknown",
            degree: Math.round((sidereal % 30) * 10) / 10,
            siderealLon: Math.round(sidereal * 100) / 100,
          };
        } catch {
          // skip
        }
      }

      const moonSidereal = chart["Moon"]?.siderealLon ?? 0;
      const nakshatraSpan = 360 / 27;
      const nakIdx = Math.floor(moonSidereal / nakshatraSpan);
      const nakshatra = NAKSHATRAS[nakIdx] ?? NAKSHATRAS[0];
      const degreeInNak = moonSidereal % nakshatraSpan;
      const fractionElapsed = degreeInNak / nakshatraSpan;
      const ruler = nakshatra!.ruler;
      const totalDasha = DASHA_YEARS[ruler] ?? 7;
      const yearsRemaining = totalDasha - fractionElapsed * totalDasha;

      const birthYear = year! + (month! - 1) / 12;
      const dashaSequence: { planet: string; start: number; end: number }[] = [];
      const startIdx = DASHA_ORDER.indexOf(ruler);
      let currentYear = birthYear - fractionElapsed * totalDasha;
      for (let i = 0; i < 9; i++) {
        const planet = DASHA_ORDER[(startIdx + i) % 9]!;
        const duration = DASHA_YEARS[planet] ?? 7;
        dashaSequence.push({
          planet,
          start: Math.round(currentYear * 10) / 10,
          end: Math.round((currentYear + duration) * 10) / 10,
        });
        currentYear += duration;
      }

      return {
        planets: chart,
        nakshatra: {
          name: nakshatra!.name,
          ruler: nakshatra!.ruler,
          deity: nakshatra!.deity,
          degreeInNakshatra: Math.round(degreeInNak * 10) / 10,
        },
        ayanamsa: Math.round(ayanamsa * 100) / 100,
        currentDasha: { planet: ruler, yearsRemaining: Math.round(yearsRemaining * 10) / 10 },
        dashaSequence: dashaSequence.slice(0, 4),
      };
    },
  }),
};
