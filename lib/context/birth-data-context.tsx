"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import type { BirthData } from "@/lib/experts/types";

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

export function BirthDataProvider({ children }: { children: ReactNode }) {
  const [birthData, setBirthDataState] = useState<BirthData | null>(null);

  useEffect(() => {
    try {
      // Migrate from sessionStorage if needed
      const session = sessionStorage.getItem(STORAGE_KEY);
      const local = localStorage.getItem(STORAGE_KEY);
      if (session && !local) {
        localStorage.setItem(STORAGE_KEY, session);
        sessionStorage.removeItem(STORAGE_KEY);
      }
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setBirthDataState(JSON.parse(stored));
    } catch {
      // ignore
    }
  }, []);

  const setBirthData = (data: BirthData) => {
    setBirthDataState(data);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // ignore
    }
  };

  const clearBirthData = () => {
    setBirthDataState(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  };

  return (
    <BirthDataContext.Provider value={{ birthData, setBirthData, clearBirthData }}>
      {children}
    </BirthDataContext.Provider>
  );
}

export const useBirthData = () => useContext(BirthDataContext);
