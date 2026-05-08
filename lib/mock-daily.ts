import type { ProtoExpertReading, ProtoOracle } from "@/lib/hooks/use-proto-store";

export const mockDailyExperts: ProtoExpertReading[] = [
  {
    expertId: "stella",
    expertName: "Stella",
    expertEmoji: "✦",
    color: "#8B7EC8",
    content: {
      facts: "Sun in Scorpio at 14°, conjunct Pluto within 3 degrees. Moon in Aquarius in the 6th house.",
      analysis:
        "Your Sun-Pluto conjunction marks you as someone built for transformation — you don't operate at surface level. The Moon in Aquarius in the 6th house shows you process emotions through analysis and find meaning through structured service.",
      summary:
        "You are built for depth, not breadth. The people and projects you choose carefully will reward you enormously. Scattered effort dissipates the very power that makes you formidable.",
      oneLiner:
        "Your Sun-Pluto intensity is your greatest strength — channel it into one thing at a time and watch it compound.",
    },
  },
  {
    expertId: "master-wei",
    expertName: "Master Wei",
    expertEmoji: "☯",
    color: "#C8846E",
    content: {
      facts: "Wood Horse year pillar, Water Dog day master. Five Elements: deficient in Metal (金).",
      analysis:
        "Your chart carries considerable creative force but an inherent tension between the Horse's urge to run freely and the Dog's need for loyal, stable roots. Metal deficiency explains why you generate brilliant ideas easily yet struggle to follow through without external structure.",
      summary:
        "Do not mistake motion for progress. The Horse wants to gallop; the Water master knows when to wait for the right current. This year calls for selective, deep investment over scattered momentum.",
      oneLiner:
        "Your Fire Rabbit period opens doors to influence — pick one door and walk all the way through it.",
    },
  },
  {
    expertId: "priya",
    expertName: "Priya",
    expertEmoji: "ॐ",
    color: "#C8A96E",
    content: {
      facts: "Natal Moon in Shravana nakshatra. Lagna Aquarius with Saturn as lagna lord in 10th house.",
      analysis:
        "Shravana nakshatra gives you the instinct to absorb before acting — this is genuine strength, not hesitation. Saturn as lagna lord in the 10th creates a strong yoga for career prominence, though recognition tends to come in the second half of life.",
      summary:
        "You build slowly and lastingly. This is not a time of windfalls — it is a time of compounding. The dharma of your chart is karma yoga: right action without attachment to immediate fruit.",
      oneLiner:
        "Jupiter-Saturn dasha means every disciplined action now is an investment that pays double in five years.",
    },
  },
  {
    expertId: "madame-crow",
    expertName: "Madame Crow",
    expertEmoji: "🜂",
    color: "#6E8BC8",
    content: {
      facts:
        "Three-card spread: The Tower (XVI) reversed · Past. Eight of Pentacles · Present. Ace of Cups · Future.",
      analysis:
        "The Tower reversed indicates a collapse you saw coming and partially cushioned. The Eight of Pentacles in the present is the craftsman card — head down, honing the work, one disc at a time. The Ace of Cups as future suggests a new emotional beginning arrives, pure and offered rather than forced.",
      summary:
        "Something collapsed. You've been rebuilding through patient craft. An unexpected cup is being offered — and this time, you'll have the grounded capacity to receive it.",
      oneLiner:
        "The Eight of Pentacles is preparing you for the Ace of Cups — keep doing the work and the opening will find you.",
    },
  },
  {
    expertId: "pythia",
    expertName: "Pythia",
    expertEmoji: "∞",
    color: "#7EC89A",
    content: {
      facts: "Life Path 7. Expression Number 11 (Master). Soul Urge 9. Personal Year Cycle: 5.",
      analysis:
        "Life Path 7 marks you as a Seeker — not built for surface engagement, wired for depth, research, and synthesis of hidden patterns. Expression Number 11 is the Master Number of illumination. Personal Year 5 brings change and course correction before a 6 year of home and belonging.",
      summary:
        "Your work is to develop the knowledge deeply (7), then find the courage to share it (11), in service of something larger (9). This Personal Year 5 is clearing the way.",
      oneLiner:
        "You are in a year of necessary recalibration — what shifts now opens the door to deep belonging in your next cycle.",
    },
  },
];

export const mockDailyOracle: ProtoOracle = {
  oneLiner: "You are in a builder's season — do the work, prepare the cup, and the opening will find you ready.",
  summary:
    "The council speaks with unusual coherence. Every tradition — the Eight of Pentacles, Saturn in the 10th, the Water Dog building steadily, Life Path 7 — describes the same person doing careful, patient work that compounds over time. An opening is coming: the Ace of Cups, Jupiter Mahadasha, the 5 year making way for the 6 — and it will require you to be both skilled enough to receive it and open enough not to deflect it.",
};
