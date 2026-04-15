import type { ExpertResponse } from "./experts/types";

export const mockExpertResponses: ExpertResponse[] = [
  {
    expertId: "stella",
    expertName: "Stella",
    expertEmoji: "✦",
    expertTitle: "Western Astrologer",
    color: "#6366f1",
    textColor: "text-indigo-400",
    content: {
      facts: "Sun in Scorpio at 14°, conjunct Pluto within 3 degrees. Moon in Aquarius in the 6th house. Ascendant in Pisces with Neptune ruling from the 12th house. Saturn is currently squaring natal Venus.",
      analysis: "Your Sun-Pluto conjunction marks you as someone built for transformation — you don't operate at surface level. The Moon in Aquarius in the 6th house shows you process emotions through analysis and find meaning through structured service. Your Pisces ascendant makes you deeply empathic, but Neptune in the 12th house means boundaries are your recurring life lesson. Saturn squaring Venus has been testing relationships and finances since last autumn, but this pressure lifts by mid-year and what survives will be genuinely solid.",
      summary: "You are built for depth, not breadth. The people and projects you choose carefully will reward you enormously. Scattered effort dissipates the very power that makes you formidable.",
      oneLiner: "Your Sun-Pluto intensity is your greatest strength — channel it into one thing at a time and watch it compound.",
    },
  },
  {
    expertId: "master-wei",
    expertName: "Master Wei",
    expertEmoji: "☯",
    expertTitle: "Chinese Astrologer",
    color: "#dc2626",
    textColor: "text-red-400",
    content: {
      facts: "Wood Horse year pillar, Water Dog day master. Five Elements: deficient in Metal (金). Current Luck Pillar: Fire Rabbit (entered 3 years ago). Day branch Dog is the peach blossom star.",
      analysis: "Your chart carries considerable creative force but an inherent tension between the Horse's urge to run freely and the Dog's need for loyal, stable roots. Metal deficiency explains why you generate brilliant ideas easily yet struggle to follow through without external structure. The Fire Rabbit luck pillar feeds your Wood day master — this is a period of natural growth, visibility, and expanded influence. Partnerships formed during Rabbit and Dog years tend to become significant.",
      summary: "Do not mistake motion for progress. The Horse wants to gallop; the Water master knows when to wait for the right current. This year calls for selective, deep investment over scattered momentum.",
      oneLiner: "Your Fire Rabbit period opens doors to influence — pick one door and walk all the way through it.",
    },
  },
  {
    expertId: "priya",
    expertName: "Priya",
    expertEmoji: "🪬",
    expertTitle: "Vedic Astrologer",
    color: "#d97706",
    textColor: "text-amber-400",
    content: {
      facts: "Natal Moon in Shravana nakshatra (sidereal, Lahiri ayanamsa). Lagna Aquarius (Kumbha) with Saturn as lagna lord in 10th house. Current Vimshottari Dasha: Jupiter Mahadasha, Saturn sub-period. Rahu in 11th house natal.",
      analysis: "Shravana nakshatra gives you the instinct to absorb before acting — this is genuine strength, not hesitation. Saturn as lagna lord in the 10th creates a strong yoga for career prominence, though recognition tends to come in the second half of life. Jupiter-Saturn dasha combination rewards expansion through disciplined effort: every consistent action now compounds into outsized future returns. Rahu in the 11th brings unusual paths to income through unconventional networks or technology.",
      summary: "You build slowly and lastingly. This is not a time of windfalls — it is a time of compounding. The dharma of your chart is karma yoga: right action without attachment to immediate fruit.",
      oneLiner: "Jupiter-Saturn dasha means every disciplined action now is an investment that pays double in five years.",
    },
  },
  {
    expertId: "madame-crow",
    expertName: "Madame Crow",
    expertEmoji: "🃏",
    expertTitle: "Tarot Reader",
    color: "#7c3aed",
    textColor: "text-violet-400",
    content: {
      facts: "Three-card spread (Past / Present / Future): The Tower (XVI) reversed in Past position, Eight of Pentacles (upright) in Present position, Ace of Cups (upright) in Future position.",
      analysis: "The Tower reversed indicates a collapse you saw coming and partially cushioned — a structure that needed to fall, but whose rubble may still be tidied into corners rather than fully processed. The Eight of Pentacles in the present is the craftsman card: head down, honing the work, one disc at a time, rewarding attention in direct proportion to its quality. The Ace of Cups as future suggests a new emotional beginning arrives — pure, overflowing, offered rather than forced. Something you've been doing quietly and skillfully creates conditions for genuine nourishment.",
      summary: "Something collapsed. You've been rebuilding through patient craft. An unexpected cup is being offered — and this time, you'll have the grounded capacity to receive it.",
      oneLiner: "The Eight of Pentacles is preparing you for the Ace of Cups — keep doing the work and the opening will find you.",
    },
  },
  {
    expertId: "pythia",
    expertName: "Pythia",
    expertEmoji: "∞",
    expertTitle: "Numerologist",
    color: "#059669",
    textColor: "text-emerald-400",
    content: {
      facts: "Life Path 7 (derived from birth date). Expression Number 11 (Master Number, from full name). Soul Urge Number 9 (vowels of full name). Current Personal Year Cycle: 5.",
      analysis: "Life Path 7 marks you as a Seeker — not built for surface engagement, wired for depth, research, and the synthesis of hidden patterns. Expression Number 11 is the Master Number of illumination: high sensitivity that becomes anxiety when ungrounded, or profound insight when aligned. Soul Urge 9 carries a deep longing to contribute something that outlasts you. The core tension is 7 wanting solitude and knowing, while 9 wants to give everything away — with 11 as the translator between them. Personal Year 5 brings change and course correction before a 6 year of home and belonging.",
      summary: "Your work is to develop the knowledge deeply (7), then find the courage to share it (11), in service of something larger (9). This Personal Year 5 is clearing the way.",
      oneLiner: "You are in a year of necessary recalibration — what shifts now opens the door to deep belonging in your next cycle.",
    },
  },
];

export const mockJudgeVerdict: { summary: string; oneLiner: string } = {
  summary: "The council speaks with unusual coherence. Every tradition — the Eight of Pentacles, Saturn in the 10th, the Water Dog building steadily, Life Path 7 — describes the same person doing careful, patient work that compounds over time. The Tower reversed and Sun-Pluto conjunction both point to a necessary clearing that created space for what's now being built. An opening is coming: the Ace of Cups, Jupiter Mahadasha, the 5 year making way for the 6 — and it will require you to be both skilled enough to receive it and open enough not to deflect it.",
  oneLiner: "You are in a builder's season — do the work, prepare the cup, and the opening will find you ready.",
};
