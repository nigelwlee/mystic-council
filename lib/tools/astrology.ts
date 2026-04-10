import { tool } from "ai";
import { z } from "zod";
import { Body, EclipticLongitude } from "astronomy-engine";

const SIGNS = [
  "Aries", "Taurus", "Gemini", "Cancer",
  "Leo", "Virgo", "Libra", "Scorpio",
  "Sagittarius", "Capricorn", "Aquarius", "Pisces",
];

const BODIES: Body[] = [
  Body.Sun, Body.Moon, Body.Mercury, Body.Venus, Body.Mars,
  Body.Jupiter, Body.Saturn, Body.Uranus, Body.Neptune, Body.Pluto,
];

function longitudeToSign(lon: number): { sign: string; degree: number } {
  const normalized = ((lon % 360) + 360) % 360;
  const index = Math.floor(normalized / 30);
  const degree = Math.round((normalized % 30) * 10) / 10;
  return { sign: SIGNS[index], degree };
}

function getAspects(positions: Record<string, number>) {
  const aspectDefs = [
    { name: "Conjunction", angle: 0, orb: 8 },
    { name: "Sextile", angle: 60, orb: 6 },
    { name: "Square", angle: 90, orb: 8 },
    { name: "Trine", angle: 120, orb: 8 },
    { name: "Opposition", angle: 180, orb: 8 },
  ];

  const planets = Object.keys(positions);
  const aspects: { planet1: string; planet2: string; aspect: string; orb: number }[] = [];

  for (let i = 0; i < planets.length; i++) {
    for (let j = i + 1; j < planets.length; j++) {
      const p1 = positions[planets[i]] ?? 0;
      const p2 = positions[planets[j]] ?? 0;
      const diff = Math.abs(p1 - p2);
      const angle = diff > 180 ? 360 - diff : diff;
      for (const def of aspectDefs) {
        const orb = Math.abs(angle - def.angle);
        if (orb <= def.orb) {
          aspects.push({
            planet1: planets[i],
            planet2: planets[j],
            aspect: def.name,
            orb: Math.round(orb * 10) / 10,
          });
        }
      }
    }
  }
  return aspects;
}

const birthChartSchema = z.object({
  date: z.string().describe("Birth date in YYYY-MM-DD format"),
  time: z.string().optional().describe("Birth time in HH:mm format (24h). Leave empty if unknown."),
});

const transitsSchema = z.object({});

export const westernAstrologyTools = {
  calculateBirthChart: tool({
    description:
      "Calculate planetary positions (sign + degree) for a given birth date and time. Use this whenever birth data is available.",
    parameters: birthChartSchema,
    execute: async ({ date, time }: z.infer<typeof birthChartSchema>) => {
      const [year, month, day] = date.split("-").map(Number);
      const [hour, minute] = time ? time.split(":").map(Number) : [12, 0];
      const dateObj = new Date(Date.UTC(year!, month! - 1, day!, hour, minute));

      const chart: Record<string, { sign: string; degree: number; longitude: number }> = {};
      for (const body of BODIES) {
        try {
          const lon = EclipticLongitude(body, dateObj);
          const { sign, degree } = longitudeToSign(lon);
          chart[String(body)] = { sign, degree, longitude: Math.round(lon * 100) / 100 };
        } catch {
          // skip unsupported body
        }
      }

      const longitudes = Object.fromEntries(
        Object.entries(chart).map(([k, v]) => [k, v.longitude])
      );
      const aspects = getAspects(longitudes);

      return {
        planets: chart,
        aspects: aspects.slice(0, 15),
        sunSign: chart["Sun"]?.sign,
        moonSign: chart["Moon"]?.sign,
        note: time
          ? "Chart calculated with birth time."
          : "Birth time unknown — rising sign not calculated.",
      };
    },
  }),

  getCurrentTransits: tool({
    description: "Calculate current planetary positions (transits) for today.",
    parameters: transitsSchema,
    execute: async () => {
      const now = new Date();
      const transits: Record<string, { sign: string; degree: number }> = {};
      for (const body of [Body.Sun, Body.Moon, Body.Mercury, Body.Venus, Body.Mars, Body.Jupiter, Body.Saturn]) {
        try {
          const lon = EclipticLongitude(body, now);
          transits[String(body)] = longitudeToSign(lon);
        } catch {
          // skip
        }
      }
      return { transits, date: now.toISOString().split("T")[0] };
    },
  }),
};
