import type { DailyReadingResponse } from "@/lib/api/schemas";

// ─── Profile ──────────────────────────────────────────────────────────────────

export type MockProfile = {
  name: string;
  email: string;
  birthdate: string;
  birthtime: string;
  birthplace: string;
  latitude: number;
  longitude: number;
  streak: { current: number; longest: number };
};

export const mockProfile: MockProfile = {
  name: "Nigel Lee",
  email: "lee.nigel.t@gmail.com",
  birthdate: "1991-06-01",
  birthtime: "11:44",
  birthplace: "Manila, Philippines",
  latitude: 14.5995,
  longitude: 120.9842,
  streak: { current: 7, longest: 14 },
};

// ─── Chat messages ────────────────────────────────────────────────────────────

export type MockChatMessage = {
  role: "user" | "assistant";
  content: string;
  chimers?: Array<{ name: string; emoji: string; initial: string; tradition: string; oneLiner: string }>;
};

export const mockMessages: MockChatMessage[] = [
  { role: "user", content: "What should I focus on this week at work?" },
  {
    role: "assistant",
    content:
      "The Mercury–Mars conjunction in your 10th house makes this a rare week for decisive professional communication. State your terms clearly before Thursday — you have more authority than you realize. The numerology confirms: this is a clearing week, not a building week. Release one commitment before adding a new one.",
    chimers: [
      { name: "Stella", emoji: "⭐", initial: "S", tradition: "Western Astrology", oneLiner: "Mercury–Mars in your 10th — your words carry executive weight this week." },
      { name: "Pythia", emoji: "◈", initial: "Y", tradition: "Numerology", oneLiner: "Personal Day 9 in a 4 year: release before you build." },
    ],
  },
  { role: "user", content: "Should I bring up the promotion conversation now?" },
  {
    role: "assistant",
    content:
      "Yes — but frame it as what you're committing to, not what you're asking for. Priya sees Lagna lord Mercury in exaltation: unusual authority in your own words right now. You know what you've earned. Say it plainly.",
    chimers: [
      { name: "Priya", emoji: "🔱", initial: "P", tradition: "Vedic Jyotish", oneLiner: "Mercury in exaltation — speak with the authority of what you know." },
    ],
  },
];

// ─── Read screen (wireframe-shaped, separate from the API response shape) ────

export type LuckLevel = "Weak" | "Fair" | "Strong" | "Excellent";
export type ExpertStatus = "Good" | "Fair" | "Caution";
export type AspectKey = "health" | "relations" | "finances" | "family" | "work";

export type MockReadData = {
  date: string;
  streak: { current: number; longest: number };
  commonThread: {
    headline: string;
    summary: string;
    luck: LuckLevel;
    charms: string[];
    watchouts: string[];
  };
  weaving: {
    subtitle: string;
    headline: string;
    checklist: Array<{ type: "positive" | "warning"; text: string }>;
    experts: Array<{
      id: string;
      emoji: string;
      initial: string;
      name: string;
      status: ExpertStatus;
      oneLiner: string;
      action: string;
    }>;
  };
  aspects: Record<AspectKey, {
    headline: string;
    summary: string;
    sources: Array<{ tradition: string; text: string }>;
  }>;
  quote: string;
};

export const mockRead: MockReadData = {
  date: "Thursday, 22 May",
  streak: { current: 7, longest: 14 },
  commonThread: {
    headline: "Be bold and lock in",
    summary: "Today is a great day to get things done. Most of the council show signs of positive energy and timing. But beware of new encounters.",
    luck: "Strong",
    charms: ["Number 7", "Red", "Old ideas"],
    watchouts: ["Shiny objects", "Distractions", "Strangers"],
  },
  weaving: {
    subtitle: "Most of the council agrees",
    headline: "It is an auspicious day",
    checklist: [
      { type: "positive", text: "The planets are aligned" },
      { type: "positive", text: "It's a good number day" },
      { type: "positive", text: "Your zodiac complements the day" },
      { type: "warning", text: "but the Tower card was drawn — caution" },
    ],
    experts: [
      { id: "pythia", emoji: "◈", initial: "Y", name: "Numerology", status: "Good", oneLiner: "Today is a 9", action: "Release before you build" },
      { id: "stella", emoji: "⭐", initial: "S", name: "Astrology", status: "Good", oneLiner: "Think twice, speak once", action: "State your terms before noon" },
      { id: "priya", emoji: "🔱", initial: "P", name: "Vedic", status: "Good", oneLiner: "Love thyself first", action: "Trust your authority today" },
      { id: "master-wei", emoji: "🐉", initial: "W", name: "Chinese", status: "Good", oneLiner: "Go for it", action: "Careful work yields outsized results" },
      { id: "madame-crow", emoji: "🃏", initial: "C", name: "Tarot", status: "Caution", oneLiner: "Mind the Tower", action: "Avoid new entanglements" },
    ],
  },
  aspects: {
    health: {
      headline: "It's a good day for leg day",
      summary: "Change up your routine. There are some muscles that need more attention today. 2 disciplines have a strong signal for health.",
      sources: [
        { tradition: "NUMEROLOGY", text: "Personal Day 9 favors movement and completion rituals." },
        { tradition: "TAROT", text: "Seven of Pentacles reversed: review what effort has gone into the body." },
      ],
    },
    relations: {
      headline: "Say the thing you've been holding",
      summary: "Mercury–Mars conjunction gives your words weight today. The Three of Swords marks a completion, not a wound — release what you've been carrying silently.",
      sources: [
        { tradition: "WESTERN ASTROLOGY", text: "Mercury–Mars in your 10th: decisive communication is favored." },
        { tradition: "TAROT", text: "Three of Swords: old grief exits through honest expression." },
      ],
    },
    finances: {
      headline: "Patience before action",
      summary: "The Metal Goat rewards refined effort over bold moves. A decision in the offing benefits from one more day of review before committing.",
      sources: [
        { tradition: "CHINESE ASTROLOGY", text: "Fire Dog day: wealth star active, but reserved for careful hands." },
        { tradition: "NUMEROLOGY", text: "4 Personal Year asks you to build slowly, deliberately." },
      ],
    },
    family: {
      headline: "Complete the conversation",
      summary: "The 9 Personal Day is about endings and releases. A family dynamic that has been quietly unresolved is ready for closure — not drama, just naming.",
      sources: [
        { tradition: "NUMEROLOGY", text: "9 energy: family karmas reach natural completion." },
        { tradition: "VEDIC JYOTISH", text: "6th house Ketu easing: old obligations lighten today." },
      ],
    },
    work: {
      headline: "State your terms before noon",
      summary: "Mercury–Mars in your 10th and Lagna lord in exaltation align for unusually effective professional communication. Frame it as commitment, not request.",
      sources: [
        { tradition: "WESTERN ASTROLOGY", text: "Mercury–Mars in 10th house: your voice carries executive authority." },
        { tradition: "VEDIC JYOTISH", text: "Lagna lord Mercury in exaltation — speak from what you know." },
      ],
    },
  },
  quote: "You build a successful life one day at a time.",
};

// ─── Tapestry calendar ────────────────────────────────────────────────────────

export type TapestryMonth = {
  year: number;
  month: number;
  monthName: string;
  startDayOfWeek: number; // 0=Sun … 6=Sat
  daysInMonth: number;
  today: number | null;
  engagement: Record<number, 0 | 1 | 2>; // day number → 0 none / 1 reading / 2 reading+chat
};

// May 2026 starts on Friday (5), today = 22
// April 2026 starts on Wednesday (3)
export const mockTapestry: TapestryMonth[] = [
  {
    year: 2026,
    month: 5,
    monthName: "May",
    startDayOfWeek: 5,
    daysInMonth: 31,
    today: 22,
    engagement: {
      3: 1, 5: 1, 7: 1,
      9: 1, 10: 2, 11: 1, 13: 1, 14: 2,
      15: 1, 16: 2, 17: 1, 18: 2, 19: 1,
      20: 2, 21: 2, 22: 2,
    },
  },
  {
    year: 2026,
    month: 4,
    monthName: "April",
    startDayOfWeek: 3,
    daysInMonth: 30,
    today: null,
    engagement: {
      1: 1, 3: 1, 5: 2, 7: 1,
      8: 1, 10: 2, 12: 1, 14: 2,
      15: 1, 17: 1, 19: 2, 21: 1,
      22: 2, 24: 1, 26: 2, 28: 1, 30: 1,
    },
  },
];

// ─── Daily API response (kept for type accuracy; ReadScreen uses mockRead) ───

export const mockReading: DailyReadingResponse = {
  id: "mock-daily-001",
  generatedAt: "2026-05-22T09:00:00.000Z",
  input: {
    birthData: {
      name: "Nigel Lee",
      date: "1991-06-01",
      time: "11:44",
      latitude: 14.5995,
      longitude: 120.9842,
      location: "Manila, Philippines",
    },
    date: "2026-05-22",
  },
  experts: [
    {
      traditionId: "western", expertId: "stella", expertName: "Stella", expertEmoji: "⭐",
      color: "#8B7EC8", textColor: "text-indigo-400",
      content: {
        facts: "Sun Gemini 1°, Moon Scorpio 14°. Asc Virgo 14°. Mercury conjunct Mars in Gemini, 10th house.",
        analysis: "Mercury and Mars conjunct in the 10th give communications executive force today.",
        summary: "Mercury–Mars conjunction in your 10th house creates a rare window for decisive professional communication.",
        oneLiner: "Your voice carries extra weight today — choose your words like you mean them.",
        status: "Good" as const,
        action: "Send that proposal before Mercury moves out of Gemini.",
        aspectSignals: [
          { aspect: "work", strength: "strong", note: "10th house Mercury–Mars activated" },
          { aspect: "relations", strength: "notable", note: "Venus trine Jupiter softens edges" },
        ],
      },
    },
    {
      traditionId: "vedic", expertId: "priya", expertName: "Priya", expertEmoji: "🔱",
      color: "#C8A96E", textColor: "text-amber-500",
      content: {
        facts: "Moon in Jyeshtha (Scorpio). Lagna: Kanya. Mercury (Lagna lord) in exaltation.",
        analysis: "Jyeshtha governs seniority. Moon here plus Lagna lord in exaltation = unusual personal authority.",
        summary: "Jyeshtha's elder energy asks you to lead, not follow. A karmic knot in your 6th house loosens today.",
        oneLiner: "The weight you've been carrying quietly begins to lift.",
        status: "Good" as const,
        action: "Take the lead in one conversation you have been deferring.",
        aspectSignals: [
          { aspect: "health", strength: "notable", note: "6th house Ketu transit easing" },
          { aspect: "work", strength: "strong", note: "Lagna lord Mercury in exaltation" },
        ],
      },
    },
    {
      traditionId: "chinese", expertId: "master-wei", expertName: "Master Wei", expertEmoji: "🐉",
      color: "#C8846E", textColor: "text-red-400",
      content: {
        facts: "Year of the Metal Goat. Day: Bing Xu (Fire Dog). Day branch harmonizes with year branch.",
        analysis: "Fire Dog day harmonizes with Metal Goat year, favoring artistry and measured effort.",
        summary: "Metal Goat meets Fire Dog: a day of refined outcomes. Careful work yields disproportionate results.",
        oneLiner: "Careful work yields disproportionate results — the cosmos is grading on effort.",
        status: "Good" as const,
        action: "Finish one craft task completely — no half-measures today.",
        aspectSignals: [{ aspect: "finances", strength: "notable", note: "Wealth star active in hour pillar" }],
      },
    },
    {
      traditionId: "tarot", expertId: "madame-crow", expertName: "Madame Crow", expertEmoji: "🃏",
      color: "#6E8BC8", textColor: "text-blue-400",
      content: {
        facts: "Cards: The Hermit (IX) · Three of Swords · Seven of Pentacles (reversed).",
        analysis: "The Hermit's cycle of inner knowing is completing. Three of Swords marks exit, not re-entry.",
        summary: "The Hermit's lantern has guided you long enough. Today the path is visible without it.",
        oneLiner: "You know the way now. Time to walk it without the lantern.",
        status: "Fair" as const,
        action: "Name the thing you have been avoiding — just name it, nothing more.",
        aspectSignals: [{ aspect: "relations", strength: "strong", note: "Three of Swords: old grief completing" }],
      },
    },
    {
      traditionId: "numerology", expertId: "pythia", expertName: "Pythia", expertEmoji: "◈",
      color: "#7EC89A", textColor: "text-emerald-400",
      content: {
        facts: "Life Path: 9. Personal Year: 4. Universal Day: 5. Personal Day: 9.",
        analysis: "Personal Day 9 on a Universal 5 day: dissolution meets movement.",
        summary: "Personal Day 9 in a 4 year: the builder who finally clears the lot.",
        oneLiner: "Clear the lot before you pour the foundation — that's what today asks.",
        status: "Fair" as const,
        action: "Release one commitment that no longer serves the structure you are building.",
        aspectSignals: [
          { aspect: "family", strength: "notable", note: "Personal Day 9: completion energy active" },
          { aspect: "work", strength: "strong", note: "4-year structure meets 9-day release" },
        ],
      },
    },
  ],
  oracle: {
    summary: "Three traditions agree: something that has required quiet effort is finally reaching its natural completion. Release it deliberately rather than waiting for it to fall away.",
    oneLiner: "The quiet work is finishing itself — let it.",
    aspectCallouts: [],
    chimers: [],
    chimerCandidates: [],
    durationMs: 3200,
  },
  totalDurationMs: 12400,
};
