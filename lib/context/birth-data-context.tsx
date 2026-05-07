"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import type { BirthData } from "@/lib/experts/types";
import { createClient } from "@/lib/supabase/client";

interface BirthDataContextValue {
  birthData: BirthData | null;
  setBirthData: (data: BirthData) => void;
  clearBirthData: () => void;
}

const BirthDataContext = createContext<BirthDataContextValue>({
  birthData: null,
  setBirthData: () => {},
  clearBirthData: () => {},
});

const STORAGE_KEY = "mystic-council-birth-data";

// Map BirthData fields to DB columns and back
function toDbRow(userId: string, data: BirthData) {
  return {
    user_id: userId,
    name: data.name ?? "",
    birthdate: data.date ?? "",
    birthtime: data.time ?? null,
    birthplace: data.location ?? "",
    updated_at: new Date().toISOString(),
  };
}

function fromDbRow(row: {
  name: string;
  birthdate: string;
  birthtime: string | null;
  birthplace: string;
}): BirthData {
  return {
    name: row.name,
    date: row.birthdate,
    time: row.birthtime ?? undefined,
    location: row.birthplace,
  };
}

export function BirthDataProvider({ children }: { children: ReactNode }) {
  const [birthData, setBirthDataState] = useState<BirthData | null>(null);

  // Load from localStorage first (fast, works offline), then sync from Supabase
  useEffect(() => {
    // 1. Load from localStorage immediately
    try {
      // Migrate from sessionStorage if needed
      const session = sessionStorage.getItem(STORAGE_KEY);
      const local = localStorage.getItem(STORAGE_KEY);
      if (session && !local) {
        localStorage.setItem(STORAGE_KEY, session);
        sessionStorage.removeItem(STORAGE_KEY);
      }
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setBirthDataState(JSON.parse(stored) as BirthData);
    } catch {
      // ignore
    }

    // 2. Fetch from Supabase if authenticated (Supabase wins)
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase
        .from("birth_data")
        .select("name, birthdate, birthtime, birthplace")
        .eq("user_id", user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (data) {
            const merged = fromDbRow(data);
            setBirthDataState(merged);
            try {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
            } catch {
              // ignore
            }
          }
        });
    });
  }, []);

  const setBirthData = useCallback((data: BirthData) => {
    setBirthDataState(data);

    // Write to localStorage
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // ignore
    }

    // Upsert to Supabase if authenticated
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase
        .from("birth_data")
        .upsert(toDbRow(user.id, data), { onConflict: "user_id" })
        .then(({ error }) => {
          if (error) console.error("[BirthData] Supabase upsert error:", error.message);
        });
    });
  }, []);

  const clearBirthData = useCallback(() => {
    setBirthDataState(null);

    // Clear localStorage
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }

    // Delete from Supabase if authenticated
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase
        .from("birth_data")
        .delete()
        .eq("user_id", user.id)
        .then(({ error }) => {
          if (error) console.error("[BirthData] Supabase delete error:", error.message);
        });
    });
  }, []);

  return (
    <BirthDataContext.Provider value={{ birthData, setBirthData, clearBirthData }}>
      {children}
    </BirthDataContext.Provider>
  );
}

export const useBirthData = () => useContext(BirthDataContext);
