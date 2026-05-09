const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL!;

export interface ChartTraditions {
  western?: Record<string, unknown>;
  chinese?: Record<string, unknown>;
  vedic?: Record<string, unknown>;
  numerology?: Record<string, unknown>;
  tarot?: Record<string, unknown>;
}

export interface MobileChartData {
  traditions: ChartTraditions;
}

interface FetchChartParams {
  birthData: {
    name?: string | null;
    date?: string | null;
    time?: string | null;
    location?: string | null;
    latitude?: number | null;
    longitude?: number | null;
  };
  date: string;
  accessToken: string;
}

export async function fetchChart(params: FetchChartParams): Promise<MobileChartData> {
  const { birthData, date, accessToken } = params;
  const res = await fetch(`${API_BASE}/api/chart`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ birthData, date }),
  });
  if (!res.ok) throw new Error(`Chart API error ${res.status}`);
  return res.json() as Promise<MobileChartData>;
}

// Headline extractors — pull the key facts shown in collapsed rows

export function westernHeadline(d: Record<string, unknown>): string | null {
  const sun = d.sunSign as string | undefined;
  const moon = d.moonSign as string | undefined;
  const asc = d.ascendant as string | undefined;
  if (!sun && !moon) return null;
  const parts: string[] = [];
  if (sun) parts.push(`Sun ${sun}`);
  if (moon) parts.push(`Moon ${moon}`);
  if (asc) parts.push(`${asc} Rising`);
  return parts.join(' · ');
}

export function vedicHeadline(d: Record<string, unknown>): string | null {
  const lagnaObj = d.lagna as { sign?: string } | null | undefined;
  const lagna = lagnaObj?.sign;
  const nakObj = d.nakshatra as Record<string, unknown> | undefined;
  const nak = nakObj?.name as string | undefined;
  if (!lagna && !nak) return null;
  const parts: string[] = [];
  if (lagna) parts.push(`Lagna ${lagna}`);
  if (nak) parts.push(`Moon in ${nak}`);
  return parts.join(' · ');
}

export function chineseHeadline(d: Record<string, unknown>): string | null {
  const animal = d.zodiacAnimal as string | undefined;
  const el = d.element as string | undefined;
  const pol = d.polarity as string | undefined;
  if (!animal) return null;
  const parts: string[] = [animal];
  if (el) parts.push(pol ? `${el} (${pol})` : el);
  return parts.join(' · ');
}

export function numerologyHeadline(d: Record<string, unknown>): string | null {
  const lpObj = d.lifePath as Record<string, unknown> | undefined;
  const lp = lpObj?.lifePath as number | undefined;
  const nnObj = d.nameNumbers as Record<string, unknown> | undefined;
  const expr = nnObj?.expression as number | undefined;
  if (lp == null && expr == null) return null;
  const parts: string[] = [];
  if (lp != null) parts.push(`Life Path ${lp}`);
  if (expr != null) parts.push(`Expression ${expr}`);
  return parts.join(' · ');
}

// Profile readings — per-expert at-a-glance birth interpretations

export interface ProfileTradition {
  atGlance: string;
  status?: 'ready' | 'failed';
}

export interface ProfileReading {
  traditions: {
    western?: ProfileTradition;
    vedic?: ProfileTradition;
    chinese?: ProfileTradition;
    numerology?: ProfileTradition;
    tarot?: ProfileTradition;
  };
  birthDataHash: string;
  generatedAt: string;
}

interface ProfileParams {
  birthData: {
    name?: string | null;
    date?: string | null;
    time?: string | null;
    location?: string | null;
    latitude?: number | null;
    longitude?: number | null;
  };
  accessToken: string;
  force?: boolean;
}

export async function fetchProfile(params: ProfileParams): Promise<ProfileReading> {
  const { birthData, accessToken, force } = params;
  const url = force ? `${API_BASE}/api/profile?force=1` : `${API_BASE}/api/profile`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ birthData }),
  });
  if (!res.ok) throw new Error(`Profile API error ${res.status}`);
  return res.json() as Promise<ProfileReading>;
}

// Fire-and-forget — triggers generation without blocking the caller
export function triggerProfileGeneration(params: ProfileParams): void {
  fetchProfile(params).catch(() => {/* non-fatal */});
}

// Tarot birth cards — Soul + Personality from birthdate (Angeles Arrien method)

const MAJOR_ARCANA = [
  'The Fool', 'The Magician', 'The High Priestess', 'The Empress', 'The Emperor',
  'The Hierophant', 'The Lovers', 'The Chariot', 'Strength', 'The Hermit',
  'Wheel of Fortune', 'Justice', 'The Hanged Man', 'Death', 'Temperance',
  'The Devil', 'The Tower', 'The Star', 'The Moon', 'The Sun', 'Judgement', 'The World',
];

export interface TarotBirthCards {
  personality: { number: number; name: string };
  soul: { number: number; name: string };
}

export function computeTarotBirthCards(birthdate: string): TarotBirthCards | null {
  const digits = birthdate.replace(/-/g, '').split('').map(Number);
  if (digits.length !== 8 || digits.some(isNaN)) return null;
  const total = digits.reduce((a, b) => a + b, 0);
  const personality = total > 22 ? total - 22 : total;
  let soul = personality;
  while (soul > 9 && soul !== 22) {
    soul = String(soul).split('').map(Number).reduce((a, b) => a + b, 0);
  }
  const arcana = (n: number) => MAJOR_ARCANA[n % 22]!;
  return {
    personality: { number: personality, name: arcana(personality) },
    soul: { number: soul, name: arcana(soul) },
  };
}

export function tarotHeadline(c: TarotBirthCards): string {
  return c.soul.number === c.personality.number
    ? c.soul.name
    : `${c.soul.name} · ${c.personality.name}`;
}
