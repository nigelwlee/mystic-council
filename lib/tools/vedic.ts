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

function degToRad(d: number): number { return d * Math.PI / 180; }
function radToDeg(r: number): number { return r * 180 / Math.PI; }

function computeLagna(year: number, month: number, day: number, hour: number, minute: number, lat: number, lon: number, ayanamsa: number): { sign: string; degree: number; longitude: number } {
  const JD = 367 * year
    - Math.floor(7 * (year + Math.floor((month + 9) / 12)) / 4)
    + Math.floor(275 * month / 9) + day + 1721013.5
    + (hour + minute / 60) / 24;
  const T = (JD - 2451545.0) / 36525.0;
  const GMST = ((280.46061837 + 360.98564736629 * (JD - 2451545.0) + 0.000387933 * T * T - T * T * T / 38710000) % 360 + 360) % 360;
  const LST = ((GMST + lon) % 360 + 360) % 360;
  const E = 23.4397 - 0.0000004 * (JD - 2451545.0);
  const latR = degToRad(lat);
  const lstR = degToRad(LST);
  const eR = degToRad(E);
  const y = Math.cos(lstR);
  const x = -Math.sin(lstR) * Math.cos(eR) - Math.tan(latR) * Math.sin(eR);
  const tropicalAsc = ((radToDeg(Math.atan2(y, x)) % 360) + 360) % 360;
  const siderealAsc = ((tropicalAsc - ayanamsa + 360) % 360 + 360) % 360;
  const signIndex = Math.floor(siderealAsc / 30);
  const degree = Math.round((siderealAsc % 30) * 10) / 10;
  return { sign: SIGNS[signIndex] ?? "Unknown", degree, longitude: Math.round(siderealAsc * 100) / 100 };
}

function buildAntardasha(mahadasha: string, mahaStart: number, mahaEnd: number): { planet: string; start: number; end: number }[] {
  const mahaDuration = mahaEnd - mahaStart;
  const startIdx = DASHA_ORDER.indexOf(mahadasha);
  const result: { planet: string; start: number; end: number }[] = [];
  let cursor = mahaStart;
  for (let i = 0; i < 9; i++) {
    const planet = DASHA_ORDER[(startIdx + i) % 9]!;
    const planetYears = DASHA_YEARS[planet] ?? 7;
    const duration = mahaDuration * planetYears / 120;
    result.push({ planet, start: Math.round(cursor * 10) / 10, end: Math.round((cursor + duration) * 10) / 10 });
    cursor += duration;
  }
  return result;
}

const vedicChartSchema = z.object({
  date: z.string().describe("Birth date in YYYY-MM-DD format"),
  time: z.string().optional().describe("Birth time in HH:mm (24h) format"),
  latitude: z.number().optional().describe("Birth location latitude (for lagna/rising sign)"),
  longitude: z.number().optional().describe("Birth location longitude (for lagna/rising sign)"),
});

export const vedicAstrologyTools = {
  calculateVedicChart: tool({
    description:
      "Calculate Vedic (Jyotish) sidereal planetary positions using the Lahiri ayanamsa. Determines rashi (sign), nakshatra, lagna, and current Vimshottari dasha with antardasha.",
    parameters: vedicChartSchema,
    execute: async ({ date, time, latitude, longitude }: z.infer<typeof vedicChartSchema>) => {
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
      const nakshatra = NAKSHATRAS[nakIdx] ?? NAKSHATRAS[0]!;
      const degreeInNak = moonSidereal % nakshatraSpan;
      const fractionElapsed = degreeInNak / nakshatraSpan;
      const ruler = nakshatra.ruler;
      const totalDasha = DASHA_YEARS[ruler] ?? 7;
      const yearsRemaining = totalDasha - fractionElapsed * totalDasha;

      const birthYear = year! + (month! - 1) / 12;
      const dashaSequence: { planet: string; start: number; end: number }[] = [];
      const startIdx = DASHA_ORDER.indexOf(ruler);
      let currentYear = birthYear - fractionElapsed * totalDasha;
      for (let i = 0; i < 9; i++) {
        const planet = DASHA_ORDER[(startIdx + i) % 9]!;
        const duration = DASHA_YEARS[planet] ?? 7;
        dashaSequence.push({ planet, start: Math.round(currentYear * 10) / 10, end: Math.round((currentYear + duration) * 10) / 10 });
        currentYear += duration;
      }

      // Current mahadasha antardasha
      const now = new Date();
      const currentYearDecimal = now.getFullYear() + now.getMonth() / 12;
      const currentMaha = dashaSequence.find(d => d.start <= currentYearDecimal && d.end > currentYearDecimal) ?? dashaSequence[0]!;
      const antardasha = buildAntardasha(currentMaha.planet, currentMaha.start, currentMaha.end);
      const currentAntar = antardasha.find(d => d.start <= currentYearDecimal && d.end > currentYearDecimal) ?? antardasha[0]!;

      // Lagna (sidereal ASC)
      const lagna = (latitude !== undefined && longitude !== undefined && time)
        ? computeLagna(year!, month!, day!, hour!, minute!, latitude, longitude, ayanamsa)
        : null;

      return {
        planets: chart,
        nakshatra: {
          name: nakshatra.name,
          ruler: nakshatra.ruler,
          deity: nakshatra.deity,
          degreeInNakshatra: Math.round(degreeInNak * 10) / 10,
        },
        ayanamsa: Math.round(ayanamsa * 100) / 100,
        lagna,
        currentDasha: { planet: ruler, yearsRemaining: Math.round(yearsRemaining * 10) / 10 },
        currentAntardasha: { mahadasha: currentMaha.planet, antardasha: currentAntar.planet, endsYear: currentAntar.end },
        dashaSequence: dashaSequence.slice(0, 4),
        antardasha: antardasha.slice(0, 5),
      };
    },
  }),
};
