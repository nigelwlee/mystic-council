// Server-side content safety: crisis keyword screen + name moderation.
// No external dependencies — all checks are synchronous.

const CRISIS_PATTERNS: RegExp[] = [
  /\bkill(?:ing)?\s+my\s*self\b/i,
  /\bend(?:ing)?\s+(?:my\s+life|it\s+all)\b/i,
  /\btak(?:e|ing)\s+my\s+(?:own\s+)?life\b/i,
  /\b(?:hurt|harm|cut)(?:ting)?\s+my\s*self\b/i,
  /\bcut(?:ting)?\s+my\s+(?:wrists?|arms?)\b/i,
  /\bself[\s-]?(?:harm|injur(?:e|y|ing))\b/i,
  /\bsuicid(?:e|al)\b/i,
  /\bwan(?:t|na)\s+to\s+(?:die|be\s+dead)\b/i,
  /\bdon[''']?t\s+wan(?:t|na)\s+to\s+(?:live|exist|be\s+here)\b/i,
  /\bno\s+(?:reason|point)\s+(?:to|in)\s+liv(?:e|ing)\b/i,
  /\bnothing\s+to\s+live\s+for\b/i,
  /\bbetter\s+off\s+dead\b/i,
  /\bcan[''']?t\s+(?:go\s+on|do\s+this\s+anymore)\b/i,
  /\b(?:plan(?:ning)?|thinking\s+about)\s+(?:suicide|to\s+end\s+(?:my\s+life|it))\b/i,
  /\b(?:going\s+to|gonna)\s+(?:kill|end)\s+(?:myself|it)\b/i,
];

export function screenForCrisis(text: string): boolean {
  return CRISIS_PATTERNS.some((p) => p.test(text));
}

// Whole-word match to avoid false positives (Cox, Dickens, Scarlett, etc.)
const BAD_WORDS =
  /\b(fuck(?:ing|er|s|ed)?|shit(?:ty|head|s)?|cunt|bitch(?:es)?|asshole?s?|bastard|nazi|hitler|nigger|faggot|dyke|tranny|kike|spic|chink|wetback|retard(?:ed)?|whore|slut)\b/i;

export function containsBadWord(text: string): boolean {
  return BAD_WORDS.test(text);
}

export const CRISIS_RESPONSE_TEXT =
  `This is something a reading can't help with — please reach out to someone who can.\n\n` +
  `US: Call or text 988 (Suicide & Crisis Lifeline), free and confidential, 24/7.\n` +
  `Outside the US: findahelpline.com lists crisis lines worldwide.\n` +
  `If you're in immediate danger, call your local emergency number now.\n\n` +
  `You don't have to handle this alone.`;
