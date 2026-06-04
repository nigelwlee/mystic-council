// Client-side name moderation — synchronous, no deps.
// Crisis screening is intentionally server-only; this file is for name inputs only.

const BAD_WORDS =
  /\b(fuck(?:ing|er|s|ed)?|shit(?:ty|head|s)?|cunt|bitch(?:es)?|asshole?s?|bastard|nazi|hitler|nigger|faggot|dyke|tranny|kike|spic|chink|wetback|retard(?:ed)?|whore|slut)\b/i;

export function containsBadWord(text: string): boolean {
  return BAD_WORDS.test(text);
}
