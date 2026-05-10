const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL!;

export type FacetKey = 'health' | 'work' | 'finances' | 'relations' | 'family';

export interface FacetContent {
  oneLiner: string;
  summary: string;
  analysis: string;
  facts?: string;
}

export interface FacetSynthesis {
  keyAction: string;
  summary: string;
  oneLiner: string;
}

export interface FacetExpertResult {
  traditionId: string;
  expertId: string;
  expertName: string;
  color: string;
  facets: Record<FacetKey, FacetContent>;
  durationMs?: number;
  error?: string;
}

export interface DailyFacetsResponse {
  generatedAt: string;
  totalDurationMs: number;
  oracle: {
    facets: Record<FacetKey, FacetSynthesis>;
  };
  experts: FacetExpertResult[];
}

interface FetchDailyFacetsParams {
  birthData: {
    name?: string | null;
    date?: string | null;
    time?: string | null;
    location?: string | null;
    latitude?: number | null;
    longitude?: number | null;
  } | null;
  date: string;
  accessToken: string;
}

export async function fetchDailyFacets(params: FetchDailyFacetsParams): Promise<DailyFacetsResponse> {
  const { birthData, date, accessToken } = params;
  const res = await fetch(`${API_BASE}/api/daily/facets`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ birthData, date }),
  });
  if (!res.ok) throw new Error(`Facets API error ${res.status}`);
  return res.json() as Promise<DailyFacetsResponse>;
}
