import type { DailyEntry } from "@/lib/types/daily";

/** Returns a date string N days ago (local timezone) */
function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toLocaleDateString("en-CA");
}

export const MOCK_DAILY_READING = {
  id: "mock-daily-reading-today",
  oracleSummary:
    "The threads converge on a threshold moment — the old pattern is loosening, and something quieter is asking to be heard. Saturn's steadying hand meets the Wood Dragon's forward momentum, creating a productive tension between what you have built and what you are becoming. Today, the numbers confirm: this is a day for intentional action, not reaction.",
  expertHighlights: [
    {
      traditionId: "western" as const,
      highlight:
        "Mars in your 10th house activates ambition — a door is opening professionally, but requires you to step forward.",
    },
    {
      traditionId: "chinese" as const,
      highlight:
        "The Wood Dragon year amplifies creative vision; your inner fire is well-supported by today's earthly branch.",
    },
    {
      traditionId: "vedic" as const,
      highlight:
        "Ketu transiting your 4th house brings ancestral patterns to the surface — old roots, new understanding.",
    },
    {
      traditionId: "tarot" as const,
      highlight:
        "The Eight of Pentacles: mastery through dedication. Craft, not speed, is your medicine today.",
    },
    {
      traditionId: "numerology" as const,
      highlight:
        "A 7 personal day — contemplation precedes clarity. Withdraw slightly before committing.",
    },
  ],
  generatedAt: new Date().toISOString(),
};

export const MOCK_CHAT_RESPONSES = [
  "The council hears you. What you're feeling is a natural rhythm — the ebb before the creative surge. The stars confirm that this restlessness isn't stagnation; it's the quiet before a significant weave. Allow it.",
  "There is wisdom in naming what weighs on you. The Oracle sees this tension between obligation and desire as the central thread of your current chapter. Neither side is wrong — they are two warp threads of the same cloth.",
  "Your instinct to pull back is being validated on multiple levels. The numerological current today favors introspection over output. Trust the pause. What is settling will become clear by tomorrow's thread.",
  "The council notes the pattern you've described — it has appeared before, in different seasons. This repetition is not failure; it is the loom's way of showing you where strength is needed. You are being strengthened.",
];

export const MOCK_DAILY_ENTRIES: DailyEntry[] = [
  {
    date: daysAgo(1),
    reading: {
      id: "mock-1",
      oracleSummary:
        "A day of resolution and quiet forward motion. The planetary alignments supported release — letting go of what no longer serves the larger pattern.",
      expertHighlights: [
        { traditionId: "western", highlight: "Venus trine Jupiter: ease in relationships, grace in giving." },
        { traditionId: "chinese", highlight: "Metal day supports precision and completing unfinished business." },
        { traditionId: "vedic", highlight: "Rahu in the 11th brings unexpected connection through community." },
        { traditionId: "tarot", highlight: "The Star: hope restored after difficulty. Trust the renewal." },
        { traditionId: "numerology", highlight: "An 8 personal day — power, structure, and material completion." },
      ],
      generatedAt: new Date(Date.now() - 86400000).toISOString(),
    },
    chat: {
      messages: [
        {
          id: "m1",
          role: "user",
          content: "Feeling a strange mix of tired and oddly hopeful today.",
          timestamp: new Date(Date.now() - 86400000 + 3600000).toISOString(),
          inputType: "text",
        },
        {
          id: "m2",
          role: "assistant",
          content:
            "The council recognizes this tension as the signature of a Venus-Jupiter transit — hope rising through fatigue. You are not tired because you have lost direction; you are tired because you have been carrying more than acknowledged. The Star card confirms: relief is not far.",
          timestamp: new Date(Date.now() - 86400000 + 3660000).toISOString(),
        },
      ],
    },
    tapestry: {
      journalNotes:
        "Finished the project proposal I've been putting off for three weeks. Didn't feel triumphant — more like setting down a stone I'd been carrying. Called my sister in the evening. The conversation wandered into childhood things we haven't spoken about in years. Something softened.",
      moodTags: ["grateful", "reflective"],
      photos: [],
      voiceMemos: [],
    },
  },
  {
    date: daysAgo(2),
    reading: {
      id: "mock-2",
      oracleSummary:
        "Friction in the outer world mirrors an internal reckoning. The council sees this as necessary — the pattern is being stress-tested so that what remains will be true.",
      expertHighlights: [
        { traditionId: "western", highlight: "Mars square Saturn: resistance is real, but so is the muscle being built." },
        { traditionId: "chinese", highlight: "Fire day — intensity amplified, temper watched." },
        { traditionId: "vedic", highlight: "Moon in Scorpio deepens emotional undercurrents." },
        { traditionId: "tarot", highlight: "Five of Wands: scattered energy, competing impulses. Prioritize." },
        { traditionId: "numerology", highlight: "A 5 personal day — change, disruption, and unexpected pivots." },
      ],
      generatedAt: new Date(Date.now() - 172800000).toISOString(),
    },
    tapestry: {
      journalNotes:
        "The meeting went sideways. I held it together but was irritable the whole way home. Made soup from scratch which helped more than I expected. Some days the cooking is the meditation.",
      moodTags: ["anxious", "heavy"],
      photos: [],
      voiceMemos: [],
    },
  },
  {
    date: daysAgo(3),
    reading: {
      id: "mock-3",
      oracleSummary:
        "A gentle day — the kind that doesn't announce itself. The wisdom here is in the ordinary moments, held with full attention.",
      expertHighlights: [
        { traditionId: "western", highlight: "Moon in Taurus: groundedness, pleasure in simple things." },
        { traditionId: "chinese", highlight: "Earth day favors slow, steady accumulation." },
        { traditionId: "vedic", highlight: "Jupiter's gaze blesses domestic life today." },
        { traditionId: "tarot", highlight: "Four of Cups: contentment, perhaps tinged with mild restlessness." },
        { traditionId: "numerology", highlight: "A 4 personal day — foundation, routine, and home." },
      ],
      generatedAt: new Date(Date.now() - 259200000).toISOString(),
    },
    tapestry: {
      journalNotes: "Nothing remarkable happened and somehow that was the point. Read for two hours. Walked the long way.",
      moodTags: ["calm", "reflective"],
      photos: [],
      voiceMemos: [],
    },
  },
  {
    date: daysAgo(5),
    reading: {
      id: "mock-5",
      oracleSummary:
        "Creative momentum peaks — a window for expression that will not remain open indefinitely. The council urges action over preparation.",
      expertHighlights: [
        { traditionId: "western", highlight: "Sun conjunct Mercury: thoughts become words become action." },
        { traditionId: "chinese", highlight: "Wood day supports growth, initiation, new projects." },
        { traditionId: "vedic", highlight: "Venus in the 5th: creative expression favored, art and love." },
        { traditionId: "tarot", highlight: "The Magician: full command of available tools. Act now." },
        { traditionId: "numerology", highlight: "A 3 personal day — expression, communication, creative output." },
      ],
      generatedAt: new Date(Date.now() - 432000000).toISOString(),
    },
    tapestry: {
      journalNotes:
        "Wrote six pages in the morning. Didn't edit. Just let it pour. Shared a rough sketch with someone I trust and they said something that cracked a window open. Energized in a way I haven't been in a while.",
      moodTags: ["energized", "joyful"],
      photos: [],
      voiceMemos: [],
    },
  },
  {
    date: daysAgo(7),
    reading: {
      id: "mock-7",
      oracleSummary:
        "The thread loops back — something from the past returns, not as burden, but as material. You have more wisdom now than you did then.",
      expertHighlights: [
        { traditionId: "western", highlight: "Saturn sextile natal Moon: emotional maturity on offer." },
        { traditionId: "chinese", highlight: "Water day — depth, memory, and the unconscious." },
        { traditionId: "vedic", highlight: "Ketu's influence surfaces buried wisdom." },
        { traditionId: "tarot", highlight: "The Hermit: solitude as teacher, not punishment." },
        { traditionId: "numerology", highlight: "A 7 personal day — inner knowing over outer noise." },
      ],
      generatedAt: new Date(Date.now() - 604800000).toISOString(),
    },
    tapestry: {
      journalNotes:
        "Found an old journal from seven years ago. Read it for an hour. Strange to see the same questions, but from a person who couldn't yet see the way through. I can see the way now. That feels like something.",
      moodTags: ["reflective", "curious"],
      photos: [],
      voiceMemos: [],
    },
  },
  {
    date: daysAgo(10),
    reading: {
      id: "mock-10",
      oracleSummary:
        "Abundance arrives in unexpected form — not as acquisition, but as recognition. You already have what you have been seeking.",
      expertHighlights: [
        { traditionId: "western", highlight: "Jupiter trine natal Sun: expansion, confidence, good fortune." },
        { traditionId: "chinese", highlight: "Metal day — harvest, clarity, the value of what's been built." },
        { traditionId: "vedic", highlight: "Benefic planets support prosperity in the 2nd house." },
        { traditionId: "tarot", highlight: "Ten of Pentacles: fullness, legacy, the reward of sustained effort." },
        { traditionId: "numerology", highlight: "A 9 personal day — completion, gratitude, the end of a cycle." },
      ],
      generatedAt: new Date(Date.now() - 864000000).toISOString(),
    },
    tapestry: {
      journalNotes:
        "Got unexpected news that the thing I'd been quietly hoping for came through. Sat with it before telling anyone. Just wanted to feel it without commentary for a moment.",
      moodTags: ["grateful", "joyful", "calm"],
      photos: [],
      voiceMemos: [],
    },
  },
  {
    date: daysAgo(14),
    reading: {
      id: "mock-14",
      oracleSummary:
        "A liminal day — standing between two chapters. The council advises against forcing resolution; let the transition breathe.",
      expertHighlights: [
        { traditionId: "western", highlight: "New Moon in Taurus: setting intentions for what wants to grow." },
        { traditionId: "chinese", highlight: "Fire day at month's beginning — new cycle ignites." },
        { traditionId: "vedic", highlight: "Amavasya energy: release what is complete." },
        { traditionId: "tarot", highlight: "The High Priestess: trust what is not yet visible." },
        { traditionId: "numerology", highlight: "A 1 personal day — the first stroke of a new canvas." },
      ],
      generatedAt: new Date(Date.now() - 1209600000).toISOString(),
    },
    tapestry: {
      journalNotes: "Quiet day. Didn't want to fill it with anything.",
      moodTags: ["calm"],
      photos: [],
      voiceMemos: [],
    },
  },
];
