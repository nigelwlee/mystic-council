import { supabase } from './supabase';

export type EngagementLevel = 0 | 1 | 2;

/** Returns engagement per calendar date: 0=none, 1=reading, 2=reading+chat */
export async function fetchTapestry(
  userId: string,
  fromDate: string,
  toDate: string,
): Promise<Record<string, EngagementLevel>> {
  const [{ data: entries }, { data: chats }] = await Promise.all([
    supabase
      .from('readings')
      .select('reading_date')
      .eq('user_id', userId)
      .eq('kind', 'daily')
      .gte('reading_date', fromDate)
      .lte('reading_date', toDate),
    supabase
      .from('chat_messages')
      .select('chat_date')
      .eq('user_id', userId)
      .eq('role', 'user')
      .gte('chat_date', fromDate)
      .lte('chat_date', toDate),
  ]);

  const result: Record<string, EngagementLevel> = {};

  for (const row of entries ?? []) {
    result[row.reading_date] = 1;
  }

  // Bump to 2 for any date that also has a chat message
  for (const row of chats ?? []) {
    const date = row.chat_date as string;
    if (result[date]) {
      result[date] = 2;
    }
  }

  return result;
}

/** ISO date helpers */
export function isoDate(d: Date): string {
  return d.toLocaleDateString('en-CA'); // YYYY-MM-DD
}

export function monthBounds(d: Date): { fromDate: string; toDate: string } {
  const y = d.getFullYear();
  const m = d.getMonth();
  const from = new Date(y, m, 1);
  const to = new Date(y, m + 1, 0);
  return { fromDate: isoDate(from), toDate: isoDate(to) };
}
