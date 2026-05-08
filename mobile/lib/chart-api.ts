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
  const lagna = d.lagna as string | undefined;
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
