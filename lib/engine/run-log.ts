export interface RunTotals {
  durationMs?: number;
  tokens: number;
  cost: number;
}

export interface RunLog {
  id: string;
  ts: number;
  endpoint: string;
  input: Record<string, unknown>;
  result: Record<string, unknown>;
  totals: RunTotals;
}

const KEY = "engine:runs:v1";
const MAX = 50;

export function appendRun(run: RunLog): void {
  const runs = listRuns();
  runs.unshift(run);
  if (runs.length > MAX) runs.splice(MAX);
  try {
    localStorage.setItem(KEY, JSON.stringify(runs));
  } catch {
    // storage quota — evict half and retry
    runs.splice(Math.floor(MAX / 2));
    try { localStorage.setItem(KEY, JSON.stringify(runs)); } catch { /* ignore */ }
  }
}

export function listRuns(): RunLog[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as RunLog[]) : [];
  } catch {
    return [];
  }
}

export function getRun(id: string): RunLog | undefined {
  return listRuns().find((r) => r.id === id);
}

export function clearRuns(): void {
  localStorage.removeItem(KEY);
}
