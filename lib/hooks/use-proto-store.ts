"use client";

import { useState, useEffect, useCallback } from "react";

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

export interface ProtoStreak {
  current: number;
  longest: number;
}

export interface ProtoStore {
  userId: string;
  birthData: ProtoBirthData | null;
  cache: Record<string, ProtoDailyCache>;
  chatHistory: ProtoChatEntry[];
  streak: ProtoStreak | null;
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
        streak: parsed.streak ?? null,
      };
    }
  } catch {
    // ignore
  }
  return { userId: genId(), birthData: null, cache: {}, chatHistory: [], streak: null };
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
    streak: null,
  }));
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const loaded = load();
    setStoreState(loaded);

    // Hydrate from server — uses cookie-based session, avoids browser client auth issues
    fetch("/api/user/hydrate")
      .then((r) => r.json())
      .then((data: {
        user: { id: string } | null;
        birthData: Record<string, unknown> | null;
        todayReading: unknown;
        streak: ProtoStreak | null;
        chatHistory?: Array<{ role: "user" | "assistant"; content: string; createdAt: string }>;
      }) => {
        if (!data.user) {
          setReady(true);
          return;
        }
        setStoreState((prev) => {
          let next = { ...prev };

          if (data.birthData) {
            const row = data.birthData;
            const bd: ProtoBirthData = {
              name: (row.name as string) ?? "",
              date: (row.birthdate as string) ?? "",
              time: (row.birthtime as string) ?? "",
              location: (row.birthplace as string) ?? "",
              latitude: typeof row.latitude === "number" ? row.latitude : 0,
              longitude: typeof row.longitude === "number" ? row.longitude : 0,
            };
            next = { ...next, birthData: bd };
          }

          if (data.todayReading) {
            next = { ...next, cache: { ...next.cache, [todayStr()]: data.todayReading as ProtoDailyCache } };
          }

          if (data.streak) {
            next = { ...next, streak: data.streak };
          }

          if (data.chatHistory && data.chatHistory.length > 0) {
            // Reconstruct ProtoChatEntry[] from flat role/content pairs.
            // Messages are ordered oldest-first; pair consecutive user+assistant rows into entries.
            const hydratedEntries: ProtoChatEntry[] = [];
            const msgs = data.chatHistory;
            let i = 0;
            while (i < msgs.length) {
              const msg = msgs[i]!;
              if (msg.role === "user") {
                const assistantMsg = msgs[i + 1]?.role === "assistant" ? msgs[i + 1]! : null;
                const ts = new Date(msg.createdAt).getTime();
                hydratedEntries.push({
                  id: crypto.randomUUID(),
                  ts,
                  durationMs: 0,
                  q: msg.content,
                  oracle: assistantMsg
                    ? { oneLiner: assistantMsg.content, summary: assistantMsg.content }
                    : null,
                  experts: [],
                });
                i += assistantMsg ? 2 : 1;
              } else {
                i += 1;
              }
            }
            // Store newest-first to match existing convention
            next = { ...next, chatHistory: hydratedEntries.reverse() };
          }

          save(next);
          return next;
        });
        setReady(true);
      })
      .catch(() => setReady(true));
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

      // Write via server route — avoids browser client auth issues
      fetch("/api/user/birth-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bd),
      }).catch((err) => console.error("[ProtoStore] birth-data write error:", err));
    },
    [setStore],
  );

  const saveCache = useCallback(
    (date: string, data: ProtoDailyCache) => {
      setStore((s) => ({ ...s, cache: { ...s.cache, [date]: data } }));

      // Write via server route — avoids browser client auth issues
      const storeRaw = localStorage.getItem(STORE_KEY);
      let birthData: ProtoBirthData | null = null;
      try {
        if (storeRaw) birthData = (JSON.parse(storeRaw) as Partial<ProtoStore>).birthData ?? null;
      } catch { /* ignore */ }

      fetch("/api/user/daily-reading", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, input: { birthData, date }, output: data }),
      }).catch((err) => console.error("[ProtoStore] daily-reading write error:", err));
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
    (entry: ProtoChatEntry) => {
      setStore((s) => ({ ...s, chatHistory: [entry, ...s.chatHistory].slice(0, 50) }));

      // Persist to Supabase best-effort — fire and forget, no user-visible error on failure
      const persistMessage = (role: "user" | "assistant", content: string) => {
        fetch("/api/user/chat-message", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role, content }),
        }).catch((err) => console.error("[ProtoStore] chat-message write error:", err));
      };

      persistMessage("user", entry.q);
      const assistantContent = entry.oracle?.summary || entry.oracle?.oneLiner || entry.error || "";
      if (assistantContent) {
        persistMessage("assistant", assistantContent);
      }
    },
    [setStore],
  );

  return { store, ready, saveBirthData, saveCache, clearCache, addChatEntry };
}
