"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

const STORE_KEY = "mc:proto:v1";

export interface ProtoExpertReading {
  expertId: string;
  expertName: string;
  expertEmoji: string;
  color: string;
  content: { oneLiner: string; summary: string; analysis: string; facts: string };
  error?: string;
}

export interface ProtoOracle {
  oneLiner: string;
  summary: string;
  chimers?: string[];
}

export interface ProtoChatEntry {
  id: string;
  ts: number;
  durationMs: number;
  q: string;
  oracle: ProtoOracle | null;
  experts: ProtoExpertReading[];
  error?: string;
}

export interface ProtoDailyCache {
  chart: Record<string, unknown>;
  daily: {
    oracle: ProtoOracle;
    experts: ProtoExpertReading[];
    full: Record<string, unknown>;
  };
}

export interface ProtoBirthData {
  name: string;
  date: string;
  time: string;
  location: string;
  latitude: number;
  longitude: number;
}

export interface ProtoStore {
  userId: string;
  birthData: ProtoBirthData | null;
  cache: Record<string, ProtoDailyCache>;
  chatHistory: ProtoChatEntry[];
}

function genId(): string {
  return crypto.randomUUID();
}

function load(): ProtoStore {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<ProtoStore>;
      return {
        userId: parsed.userId ?? genId(),
        birthData: parsed.birthData ?? null,
        cache: parsed.cache ?? {},
        chatHistory: parsed.chatHistory ?? [],
      };
    }
  } catch {
    // ignore
  }
  return { userId: genId(), birthData: null, cache: {}, chatHistory: [] };
}

function save(store: ProtoStore) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(store));
  } catch {
    // ignore quota errors
  }
}

function todayStr(): string {
  return new Date().toLocaleDateString("en-CA");
}

export function useProtoStore() {
  const [store, setStoreState] = useState<ProtoStore>(() => ({
    userId: "",
    birthData: null,
    cache: {},
    chatHistory: [],
  }));
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const loaded = load();
    setStoreState(loaded);

    // Supabase hydration: if authenticated, fetch birth_data and today's reading
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) {
        setReady(true);
        return;
      }
      const userId = session.user.id;

      Promise.all([
        // Fetch birth data from Supabase
        supabase
          .from("birth_data")
          .select("name, birthdate, birthtime, birthplace, latitude, longitude")
          .eq("user_id", userId)
          .maybeSingle(),
        // Fetch today's reading from Supabase
        supabase
          .from("readings")
          .select("output")
          .eq("user_id", userId)
          .eq("kind", "daily")
          .eq("reading_date", todayStr())
          .maybeSingle(),
      ]).then(([bdResult, readingResult]) => {
        setStoreState((prev) => {
          let next = { ...prev };

          // Override birth data from Supabase if present
          if (bdResult.data) {
            const row = bdResult.data;
            const bd: ProtoBirthData = {
              name: row.name ?? "",
              date: row.birthdate ?? "",
              time: row.birthtime ?? "",
              location: row.birthplace ?? "",
              latitude: typeof row.latitude === "number" ? row.latitude : 0,
              longitude: typeof row.longitude === "number" ? row.longitude : 0,
            };
            next = { ...next, birthData: bd };
          }

          // Override today's cache from Supabase if present
          if (readingResult.data?.output) {
            const output = readingResult.data.output as ProtoDailyCache;
            next = { ...next, cache: { ...next.cache, [todayStr()]: output } };
          }

          save(next);
          return next;
        });
        setReady(true);
      }).catch(() => {
        setReady(true);
      });
    }).catch(() => {
      setReady(true);
    });
  }, []);

  const setStore = useCallback((updater: (s: ProtoStore) => ProtoStore) => {
    setStoreState((prev) => {
      const next = updater(prev);
      save(next);
      return next;
    });
  }, []);

  const saveBirthData = useCallback(
    (bd: ProtoBirthData) => {
      setStore((s) => ({ ...s, birthData: bd }));

      // Upsert to Supabase if authenticated
      const supabase = createClient();
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session?.user) return;
        supabase
          .from("birth_data")
          .upsert(
            {
              user_id: session.user.id,
              name: bd.name,
              birthdate: bd.date,
              birthtime: bd.time,
              birthplace: bd.location,
              latitude: bd.latitude,
              longitude: bd.longitude,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "user_id" }
          )
          .then(({ error }) => {
            if (error) console.error("[ProtoStore] birth_data upsert error:", error.message);
          });
      }).catch(() => {});
    },
    [setStore],
  );

  const saveCache = useCallback(
    (date: string, data: ProtoDailyCache) => {
      setStore((s) => ({ ...s, cache: { ...s.cache, [date]: data } }));

      // Upsert to Supabase if authenticated
      const supabase = createClient();
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session?.user) return;
        // Get birth data from store for input field
        const storeRaw = localStorage.getItem(STORE_KEY);
        let birthData: ProtoBirthData | null = null;
        try {
          if (storeRaw) {
            const parsed = JSON.parse(storeRaw) as Partial<ProtoStore>;
            birthData = parsed.birthData ?? null;
          }
        } catch {
          // ignore
        }
        supabase
          .from("readings")
          .upsert(
            {
              user_id: session.user.id,
              kind: "daily",
              reading_date: date,
              input: { birthData, date },
              output: data,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "user_id,kind,reading_date" }
          )
          .then(({ error }) => {
            if (error) console.error("[ProtoStore] readings upsert error:", error.message);
          });
      }).catch(() => {});
    },
    [setStore],
  );

  const clearCache = useCallback(
    (date: string) =>
      setStore((s) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { [date]: _dropped, ...rest } = s.cache;
        return { ...s, cache: rest };
      }),
    [setStore],
  );

  const addChatEntry = useCallback(
    (entry: ProtoChatEntry) =>
      setStore((s) => ({ ...s, chatHistory: [entry, ...s.chatHistory].slice(0, 50) })),
    [setStore],
  );

  return { store, ready, saveBirthData, saveCache, clearCache, addChatEntry };
}
