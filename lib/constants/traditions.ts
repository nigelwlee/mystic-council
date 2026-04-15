export const TRADITION_COLORS = {
  western:    "#8B7EC8",
  chinese:    "#C8846E",
  vedic:      "#C8A96E",
  tarot:      "#6E8BC8",
  numerology: "#7EC89A",
  oracle:     "#BFA882",
} as const;

export const TRADITION_NAMES = {
  western:    "Western Astrology",
  chinese:    "Chinese Astrology",
  vedic:      "Vedic Jyotish",
  tarot:      "Tarot",
  numerology: "Numerology",
  oracle:     "Oracle",
} as const;

export const TRADITION_SYMBOLS = {
  western:    "✦",
  chinese:    "☯",
  vedic:      "ॐ",
  tarot:      "🜂",
  numerology: "∞",
  oracle:     "◎",
} as const;

export const TRADITIONS = [
  { id: "western"    as const, label: "Western Astrology", hex: "#8B7EC8", symbol: "✦", shortLabel: "Western"    },
  { id: "chinese"    as const, label: "Chinese Astrology", hex: "#C8846E", symbol: "☯", shortLabel: "Chinese"    },
  { id: "vedic"      as const, label: "Vedic Jyotish",     hex: "#C8A96E", symbol: "ॐ", shortLabel: "Vedic"      },
  { id: "tarot"      as const, label: "Tarot",             hex: "#6E8BC8", symbol: "🜂", shortLabel: "Tarot"      },
  { id: "numerology" as const, label: "Numerology",        hex: "#7EC89A", symbol: "∞", shortLabel: "Numerology" },
  { id: "oracle"     as const, label: "Oracle",            hex: "#BFA882", symbol: "◎", shortLabel: "Oracle"     },
];

export type TraditionId = (typeof TRADITIONS)[number]["id"];

export const TRADITION_MAP = Object.fromEntries(
  TRADITIONS.map((t) => [t.id, t])
) as Record<TraditionId, (typeof TRADITIONS)[number]>;

/** Maps legacy expertId values (from AI backend) → TraditionId */
export const EXPERT_ID_TO_TRADITION: Record<string, TraditionId> = {
  "stella":       "western",
  "master-wei":   "chinese",
  "priya":        "vedic",
  "madame-crow":  "tarot",
  "pythia":       "numerology",
};
