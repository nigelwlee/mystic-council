"use client";

import { useState, useCallback } from "react";
import type { TraditionId } from "@/lib/constants/traditions";

const STORAGE_KEY = "mystic-council:readings";
const MAX_READINGS = 100;

export interface SavedReading {
  id: string;
  question: string;
  expertResponses: Array<{
    traditionId: TraditionId;
    expertName: string;
    content: string;
  }>;
  oracleContent: string;
  timestamp: string;
  traditionsConsulted: string[];
}

function isLocalStorageAvailable(): boolean {
  return typeof window !== "undefined";
}

function loadReadings(): SavedReading[] {
  if (!isLocalStorageAvailable()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as SavedReading[];
  } catch {
    return [];
  }
}

function persistReadings(readings: SavedReading[]): void {
  if (!isLocalStorageAvailable()) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(readings));
  } catch {
    // ignore — storage may be full or unavailable
  }
}

export function useReadings() {
  const [readings, setReadings] = useState<SavedReading[]>(() => loadReadings());

  const saveReading = useCallback(
    (input: Omit<SavedReading, "id" | "timestamp">): SavedReading => {
      const newReading: SavedReading = {
        ...input,
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
      };

      setReadings((prev) => {
        // Newest first; cap at MAX_READINGS
        const updated = [newReading, ...prev].slice(0, MAX_READINGS);
        persistReadings(updated);
        return updated;
      });

      return newReading;
    },
    []
  );

  const getReading = useCallback(
    (id: string): SavedReading | undefined => {
      return readings.find((r) => r.id === id);
    },
    [readings]
  );

  const clearReadings = useCallback((): void => {
    setReadings([]);
    if (isLocalStorageAvailable()) {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        // ignore
      }
    }
  }, []);

  return { readings, saveReading, getReading, clearReadings };
}
