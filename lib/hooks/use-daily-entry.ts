"use client";

import { useState, useCallback } from "react";
import type { DailyEntry, DailyReading, DailyChatMessage, DailyTapestry } from "@/lib/types/daily";

const KEY_PREFIX = "mystic-council:daily:";
const INDEX_KEY = "mystic-council:daily:index";
const MAX_DAYS = 90;

/** Returns today's date as YYYY-MM-DD in local timezone */
export function todayLocalDate(): string {
  return new Date().toLocaleDateString("en-CA");
}

function isAvailable(): boolean {
  return typeof window !== "undefined";
}

function loadEntry(date: string): DailyEntry | null {
  if (!isAvailable()) return null;
  try {
    const raw = localStorage.getItem(KEY_PREFIX + date);
    if (!raw) return null;
    return JSON.parse(raw) as DailyEntry;
  } catch {
    return null;
  }
}

function persistEntry(entry: DailyEntry): void {
  if (!isAvailable()) return;
  try {
    localStorage.setItem(KEY_PREFIX + entry.date, JSON.stringify(entry));
    updateIndex(entry.date);
  } catch {
    // ignore — storage may be full
  }
}

function loadIndex(): string[] {
  if (!isAvailable()) return [];
  try {
    const raw = localStorage.getItem(INDEX_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function updateIndex(date: string): void {
  if (!isAvailable()) return;
  try {
    const index = loadIndex();
    if (!index.includes(date)) {
      // Newest first; cap at MAX_DAYS
      const updated = [date, ...index.filter((d) => d !== date)].slice(0, MAX_DAYS);
      // Prune entries beyond cap
      if (index.length >= MAX_DAYS) {
        const pruned = index.slice(MAX_DAYS - 1);
        for (const old of pruned) {
          localStorage.removeItem(KEY_PREFIX + old);
        }
      }
      localStorage.setItem(INDEX_KEY, JSON.stringify(updated));
    }
  } catch {
    // ignore
  }
}

export function useDailyEntry(date?: string) {
  const targetDate = date ?? todayLocalDate();
  const [entry, setEntry] = useState<DailyEntry | null>(() => loadEntry(targetDate));

  const updateReading = useCallback(
    (reading: DailyReading) => {
      setEntry((prev) => {
        const next: DailyEntry = { ...(prev ?? { date: targetDate }), reading };
        persistEntry(next);
        return next;
      });
    },
    [targetDate]
  );

  const addChatMessage = useCallback(
    (message: Omit<DailyChatMessage, "id" | "timestamp">) => {
      const newMessage: DailyChatMessage = {
        ...message,
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
      };
      setEntry((prev) => {
        const existing = prev ?? { date: targetDate };
        const next: DailyEntry = {
          ...existing,
          chat: {
            messages: [...(existing.chat?.messages ?? []), newMessage],
          },
        };
        persistEntry(next);
        return next;
      });
      return newMessage;
    },
    [targetDate]
  );

  const updateTapestry = useCallback(
    (patch: Partial<DailyTapestry>) => {
      setEntry((prev) => {
        const existing = prev ?? { date: targetDate };
        const next: DailyEntry = {
          ...existing,
          tapestry: {
            journalNotes: "",
            moodTags: [],
            photos: [],
            voiceMemos: [],
            ...(existing.tapestry ?? {}),
            ...patch,
          },
        };
        persistEntry(next);
        return next;
      });
    },
    [targetDate]
  );

  return { entry, updateReading, addChatMessage, updateTapestry };
}

/** Returns all stored dates, newest first */
export function useDailyIndex(): string[] {
  const [index] = useState<string[]>(() => loadIndex());
  return index;
}

/** Load a single entry by date (non-reactive, for history views) */
export function getDailyEntry(date: string): DailyEntry | null {
  return loadEntry(date);
}
