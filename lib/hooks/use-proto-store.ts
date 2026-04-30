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
    setReady(true);
  }, []);

  const setStore = useCallback((updater: (s: ProtoStore) => ProtoStore) => {
    setStoreState((prev) => {
      const next = updater(prev);
      save(next);
      return next;
    });
  }, []);

  const saveBirthData = useCallback(
    (bd: ProtoBirthData) => setStore((s) => ({ ...s, birthData: bd })),
    [setStore],
  );

  const saveCache = useCallback(
    (date: string, data: ProtoDailyCache) =>
      setStore((s) => ({ ...s, cache: { ...s.cache, [date]: data } })),
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
