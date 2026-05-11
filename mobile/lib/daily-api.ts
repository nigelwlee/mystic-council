export type AspectKey = 'health' | 'work' | 'finances' | 'relations' | 'family';

export interface AspectSignal {
  aspect: AspectKey;
  strength: 'strong' | 'notable';
  note: string;
}

export interface AspectCallout {
  aspect: AspectKey;
  keyAction: string;
  summary: string;
  excerpts: Array<{ traditionId: string; expertName: string; text: string }>;
}

export interface ExpertContent {
  facts: string;
  analysis: string;
  summary: string;
  oneLiner: string;
  aspectSignals?: AspectSignal[];
}

export interface ExpertReading {
  traditionId: string;
  expertId: string;
  expertName: string;
  expertEmoji: string;
  color: string;
  textColor: string;
  content: ExpertContent;
  durationMs?: number;
  error?: string;
}

export interface OracleReading {
  summary: string;
  oneLiner: string;
  aspectCallouts: AspectCallout[];
  durationMs?: number;
  error?: string;
}

export interface DailyReadingResponse {
  id: string;
  generatedAt: string;
  experts: ExpertReading[];
  oracle: OracleReading;
  totalDurationMs?: number;
}
