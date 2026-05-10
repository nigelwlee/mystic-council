const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL!;

export interface ChatOracle {
  summary: string;
  oneLiner: string;
  chimers?: string[];
  error?: string;
}

export interface ChatExpertContent {
  facts?: string;
  analysis?: string;
  summary?: string;
  oneLiner?: string;
}

export interface ChatExpertReading {
  expertId: string;
  expertName: string;
  expertEmoji: string;
  color: string;
  content?: ChatExpertContent;
  error?: string;
}

export interface ChatCouncilResponse {
  oracle: ChatOracle;
  experts: ChatExpertReading[];
}

interface AskCouncilParams {
  question: string;
  birthData: {
    name?: string | null;
    date?: string | null;
    time?: string | null;
    location?: string | null;
    latitude?: number | null;
    longitude?: number | null;
  } | null;
  date: string;
  accessToken: string;
}

export async function askCouncil(params: AskCouncilParams): Promise<ChatCouncilResponse> {
  const { question, birthData, date, accessToken } = params;
  const res = await fetch(`${API_BASE}/api/council`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ question, birthData, date }),
  });
  if (!res.ok) throw new Error(`Council API error ${res.status}`);
  return res.json() as Promise<ChatCouncilResponse>;
}
