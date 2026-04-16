import type { TraditionId } from "@/lib/constants/traditions";
import type { SavedReading } from "@/lib/hooks/use-readings";

export interface DailyReading {
  id: string;
  oracleSummary: string;
  expertHighlights: Array<{
    traditionId: TraditionId;
    highlight: string;
  }>;
  fullReading?: SavedReading;
  generatedAt: string;
}

export interface DailyChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  inputType?: "text" | "audio";
}

export interface DailyChat {
  messages: DailyChatMessage[];
}

export interface DailyPhoto {
  id: string;
  dataUrl: string;
  caption?: string;
  addedAt: string;
}

export interface DailyVoiceMemo {
  id: string;
  dataUrl: string;
  duration: number;
  addedAt: string;
}

export interface DailyTapestry {
  journalNotes: string;
  moodTags: string[];
  photos: DailyPhoto[];
  voiceMemos: DailyVoiceMemo[];
}

export interface DailyEntry {
  date: string; // "YYYY-MM-DD" local timezone
  reading?: DailyReading;
  chat?: DailyChat;
  tapestry?: DailyTapestry;
}
