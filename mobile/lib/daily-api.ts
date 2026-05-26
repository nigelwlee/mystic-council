import { supabase } from './supabase';
import { recovery } from './recovery';

const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL!;

export type AspectKey = 'health' | 'work' | 'finances' | 'relations' | 'family';

export interface AspectSignal {
  aspect: AspectKey;
  strength: 'strong' | 'notable';
  note: string;
}

export interface AspectCallout {
  aspect: AspectKey;
  keyAction: string;
  summary: string;
  excerpts: Array<{ traditionId: string; expertName: string; text: string }>;
}

export interface ExpertContent {
  facts: string;
  analysis: string;
  summary: string;
  oneLiner: string;
  aspectSignals?: AspectSignal[];
  status?: 'Good' | 'Fair' | 'Caution';
  action?: string;
}

export interface ExpertReading {
  traditionId: string;
  expertId: string;
  expertName: string;
  expertEmoji: string;
  color: string;
  textColor: string;
  content: ExpertContent;
  durationMs?: number;
  error?: string;
}

export interface CommonThread {
  luck?: 'Excellent' | 'Strong' | 'Fair' | 'Weak';
  charms?: string[];
  watchouts?: string[];
}

export interface ChecklistItem {
  type: 'positive' | 'warning';
  text: string;
}

export interface Weaving {
  subtitle?: string;
  headline?: string;
  checklist?: ChecklistItem[];
}

export interface OracleReading {
  summary: string;
  oneLiner: string;
  aspectCallouts: AspectCallout[];
  commonThread?: CommonThread;
  weaving?: Weaving;
  quote?: string;
  durationMs?: number;
  error?: string;
}

export interface DailyReadingResponse {
  id: string;
  generatedAt: string;
  experts: ExpertReading[];
  oracle: OracleReading;
  totalDurationMs?: number;
}

// ── Fetch + singleton ──────────────────────────────────────────────────────────

export interface BirthDataParams {
  name?: string | null;
  date?: string | null;
  time?: string | null;
  location?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

interface FetchDailyParams {
  accessToken: string;
  birthData: BirthDataParams;
  date: string;
  force?: boolean;
}

export async function fetchDaily(params: FetchDailyParams): Promise<DailyReadingResponse> {
  const { accessToken, birthData, date, force } = params;
  const url = force ? `${API_BASE}/api/daily?force=1` : `${API_BASE}/api/daily`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 65_000);
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ birthData, date }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json() as Promise<DailyReadingResponse>;
}

// Module-level singleton so the login prewarm and the Read tab share one pipeline run.
let inflight: { date: string; promise: Promise<DailyReadingResponse> } | null = null;

export function getDaily(params: FetchDailyParams): Promise<DailyReadingResponse> {
  const { date, force } = params;

  if (!force && inflight && inflight.date === date) {
    return inflight.promise;
  }

  const p = fetchDaily(params);
  inflight = { date, promise: p };

  // Clear once settled so the next forced refresh can replace it.
  p.then(
    () => { if (inflight?.promise === p) inflight = null; },
    () => { if (inflight?.promise === p) inflight = null; },
  );

  return p;
}

export function clearDailyCache(): void {
  inflight = null;
}

// Fire-and-forget prewarm — does its own session + birth_data lookup.
export function triggerDailyGeneration(): void {
  (async () => {
    if (recovery.active) return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data: birthData } = await supabase
      .from('birth_data')
      .select('*')
      .maybeSingle();
    if (!birthData) return;

    const date = new Date().toLocaleDateString('en-CA');
    getDaily({
      accessToken: session.access_token,
      birthData: {
        name: birthData.name,
        date: birthData.birthdate,
        time: birthData.birthtime,
        location: birthData.birthplace,
        latitude: birthData.latitude,
        longitude: birthData.longitude,
      },
      date,
    }).catch(() => {/* non-fatal */});
  })().catch(() => {/* non-fatal */});
}
