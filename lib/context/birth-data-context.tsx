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

const SESSION_KEY = "mystic-council-birth-data";

export function BirthDataProvider({ children }: { children: ReactNode }) {
  const [birthData, setBirthDataState] = useState<BirthData | null>(null);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(SESSION_KEY);
      if (stored) setBirthDataState(JSON.parse(stored));
    } catch {
      // ignore
    }
  }, []);

  const setBirthData = (data: BirthData) => {
    setBirthDataState(data);
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(data));
    } catch {
      // ignore
    }
  };

  const clearBirthData = () => {
    setBirthDataState(null);
    try {
      sessionStorage.removeItem(SESSION_KEY);
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
