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
  return { sign: SIGNS[index]!, degree };
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
      const p1 = positions[planets[i]!] ?? 0;
      const p2 = positions[planets[j]!] ?? 0;
      const diff = Math.abs(p1 - p2);
      const angle = diff > 180 ? 360 - diff : diff;
      for (const def of aspectDefs) {
        const orb = Math.abs(angle - def.angle);
        if (orb <= def.orb) {
          aspects.push({ planet1: planets[i]!, planet2: planets[j]!, aspect: def.name, orb: Math.round(orb * 10) / 10 });
        }
      }
    }
  }
  return aspects;
}

function degToRad(d: number): number { return d * Math.PI / 180; }
function radToDeg(r: number): number { return r * 180 / Math.PI; }

// Whole-sign house cusps from ASC longitude.
// House 1 = the whole sign containing the ASC; each subsequent house is the next sign.
function computeWholeSigns(ascLongitude: number): Array<{ house: number; sign: string; longitude: number }> {
  const house1Start = Math.floor(ascLongitude / 30) * 30;
  return Array.from({ length: 12 }, (_, i) => {
    const cuspLon = (house1Start + i * 30) % 360;
    return {
      house: i + 1,
      sign: SIGNS[Math.floor(cuspLon / 30)]!,
      longitude: Math.round(cuspLon * 100) / 100,
    };
  });
}

// Return which whole-sign house (1–12) a planet at planetLon falls in, given the ASC.
function wholeSignHouse(planetLon: number, ascLongitude: number): number {
  const house1Start = Math.floor(ascLongitude / 30) * 30;
  return Math.floor(((planetLon - house1Start + 360) % 360) / 30) + 1;
}

function computeAngles(year: number, month: number, day: number, hour: number, minute: number, lat: number, lon: number) {
  // Julian Day Number
  const JD = 367 * year
    - Math.floor(7 * (year + Math.floor((month + 9) / 12)) / 4)
    + Math.floor(275 * month / 9) + day + 1721013.5
    + (hour + minute / 60) / 24;

  const T = (JD - 2451545.0) / 36525.0;

  // Greenwich Mean Sidereal Time (degrees)
  const GMST = ((280.46061837
    + 360.98564736629 * (JD - 2451545.0)
    + 0.000387933 * T * T
    - T * T * T / 38710000) % 360 + 360) % 360;

  // Local Sidereal Time
  const LST = ((GMST + lon) % 360 + 360) % 360;

  // Obliquity of ecliptic
  const E = 23.4397 - 0.0000004 * (JD - 2451545.0);

  const latR = degToRad(lat);
  const lstR = degToRad(LST);
  const eR = degToRad(E);

  // Ascendant ecliptic longitude
  const y = Math.cos(lstR);
  const x = -Math.sin(lstR) * Math.cos(eR) - Math.tan(latR) * Math.sin(eR);
  const ascDeg = ((radToDeg(Math.atan2(y, x)) % 360) + 360) % 360;

  // Midheaven ecliptic longitude
  const mcRaw = radToDeg(Math.atan2(Math.sin(lstR), Math.cos(lstR) * Math.cos(eR)));
  const mcDeg = ((mcRaw % 360) + 360) % 360;

  return {
    ascendant: { ...longitudeToSign(ascDeg), longitude: Math.round(ascDeg * 100) / 100 },
    mc: { ...longitudeToSign(mcDeg), longitude: Math.round(mcDeg * 100) / 100 },
    descendant: { ...longitudeToSign((ascDeg + 180) % 360), longitude: Math.round((ascDeg + 180) % 360 * 100) / 100 },
    ic: { ...longitudeToSign((mcDeg + 180) % 360), longitude: Math.round((mcDeg + 180) % 360 * 100) / 100 },
  };
}

type BirthChartResult = Awaited<ReturnType<typeof _computeBirthChart>>;
const birthChartCache = new Map<string, BirthChartResult>();

function _evictIfFull(cache: Map<string, unknown>) {
  if (cache.size >= 100) {
    cache.delete(cache.keys().next().value as string);
  }
}

async function _computeBirthChart(date: string, time: string | undefined, latitude: number | undefined, longitude: number | undefined) {
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

  const angles = (latitude !== undefined && longitude !== undefined && time)
    ? computeAngles(year!, month!, day!, hour!, minute!, latitude, longitude)
    : null;

  const ascLon = angles?.ascendant.longitude;
  const houses = ascLon !== undefined
    ? computeWholeSigns(ascLon)
    : null;

  const planetsWithHouses = ascLon !== undefined
    ? Object.fromEntries(
        Object.entries(chart).map(([name, p]) => [
          name,
          { ...p, house: wholeSignHouse(p.longitude, ascLon) },
        ])
      )
    : chart;

  return {
    planets: planetsWithHouses,
    aspects: aspects.slice(0, 15),
    angles,
    houses,
    sunSign: chart["Sun"]?.sign,
    moonSign: chart["Moon"]?.sign,
    ascendant: angles?.ascendant.sign ?? null,
    note: time
      ? (angles ? "Chart calculated with birth time and location — angles and whole-sign houses accurate." : "Chart calculated with birth time.")
      : "Birth time unknown — angles, rising sign, and house placements not calculated.",
  };
}

const birthChartSchema = z.object({
  date: z.string().describe("Birth date in YYYY-MM-DD format"),
  time: z.string().optional().describe("Birth time in HH:mm format (24h). Leave empty if unknown."),
  latitude: z.number().optional().describe("Birth location latitude (for house angles)"),
  longitude: z.number().optional().describe("Birth location longitude (for house angles)"),
});

const transitsForDateSchema = z.object({
  date: z.string().describe("Date in YYYY-MM-DD format to compute transiting positions"),
});

export const westernAstrologyTools = {
  calculateBirthChart: tool({
    description:
      "Calculate planetary positions (sign + degree) for a given birth date and time. Use this whenever birth data is available.",
    parameters: birthChartSchema,
    execute: async ({ date, time, latitude, longitude }: z.infer<typeof birthChartSchema>) => {
      const cacheKey = `${date}|${time ?? ""}|${latitude ?? ""}|${longitude ?? ""}`;
      const cached = birthChartCache.get(cacheKey);
      if (cached) return cached;

      const result = await _computeBirthChart(date, time, latitude, longitude);
      _evictIfFull(birthChartCache);
      birthChartCache.set(cacheKey, result);
      return result;
    },
  }),

  calculateTransitsForDate: tool({
    description: "Calculate current transiting planetary positions for a specific date. Use this to find how today's sky compares to the natal chart.",
    parameters: transitsForDateSchema,
    execute: async ({ date }: z.infer<typeof transitsForDateSchema>) => {
      const [year, month, day] = date.split("-").map(Number);
      const dateObj = new Date(Date.UTC(year!, month! - 1, day!, 12, 0));
      const transitBodies = [Body.Sun, Body.Moon, Body.Mercury, Body.Venus, Body.Mars, Body.Jupiter, Body.Saturn];
      const transits: Record<string, { sign: string; degree: number; longitude: number }> = {};
      for (const body of transitBodies) {
        try {
          const lon = EclipticLongitude(body, dateObj);
          const { sign, degree } = longitudeToSign(lon);
          transits[String(body)] = { sign, degree, longitude: Math.round(lon * 100) / 100 };
        } catch {
          // skip
        }
      }
      return { date, transits };
    },
  }),
};
