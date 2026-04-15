"use client";

import { useState, useCallback } from "react";
import type { TraditionId } from "@/lib/constants/traditions";
import type { StructuredExpertContent } from "@/lib/experts/types";

const STORAGE_KEY = "mystic-council:readings";
const MAX_READINGS = 100;

export interface SavedReading {
  id: string;
  question: string;
  expertResponses: Array<{
    traditionId: TraditionId;
    expertName: string;
    content: StructuredExpertContent;
  }>;
  oracleContent: { summary: string; oneLiner: string };
  timestamp: string;
  traditionsConsulted: string[];
}

function isLocalStorageAvailable(): boolean {
  return typeof window !== "undefined";
}

function normalizeReading(r: Record<string, unknown>): SavedReading {
  // Backward compat: upgrade old string content to StructuredExpertContent
  const expertResponses = (r.expertResponses as Array<Record<string, unknown>> ?? []).map((er) => {
    const content = er.content;
    const normalizedContent: StructuredExpertContent =
      typeof content === "string"
        ? { facts: "", analysis: content, summary: content, oneLiner: content }
        : (content as StructuredExpertContent);
    return {
      traditionId: er.traditionId as TraditionId,
      expertName: er.expertName as string,
      content: normalizedContent,
    };
  });

  // Backward compat: upgrade old string oracleContent
  const rawOracle = r.oracleContent;
  const oracleContent: { summary: string; oneLiner: string } =
    typeof rawOracle === "string"
      ? { summary: rawOracle, oneLiner: rawOracle }
      : (rawOracle as { summary: string; oneLiner: string });

  return {
    id: r.id as string,
    question: r.question as string,
    expertResponses,
    oracleContent,
    timestamp: r.timestamp as string,
    traditionsConsulted: r.traditionsConsulted as string[],
  };
}

function loadReadings(): SavedReading[] {
  if (!isLocalStorageAvailable()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return (parsed as Array<Record<string, unknown>>).map(normalizeReading);
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
