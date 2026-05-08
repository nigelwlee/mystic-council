// Source of truth: app/chat/page.tsx:25 — copy kept here to avoid cross-package imports.
// Update both when the list changes.
export const SUGGESTED_PROMPTS = [
  // Decisions
  "Should I take the new job?",
  "Is now the right time to move?",
  "Should I reach out to them?",
  "Do I say yes to this opportunity?",
  "Should I end this relationship?",
  "Is this the right time to start my business?",
  "Should I speak up or stay quiet?",
  "Do I push forward or step back right now?",
  "Should I make the investment?",
  "Is it time to quit?",
  // Timing
  "When will things settle down?",
  "Is this week good for big moves?",
  "Am I moving too fast?",
  "How long until I see results?",
  "Is this the right season for change?",
  "Should I wait or act now?",
  "When is the right time to have that conversation?",
  "Are things about to shift for me?",
  // Love & relationships
  "Are we right for each other?",
  "Should I tell them how I feel?",
  "Why do I keep attracting the same kind of person?",
  "Will this relationship get better?",
  "Am I holding on too long?",
  "Is this the love I deserve?",
  "Why does it feel so hard right now?",
  "Should I give them another chance?",
  // Work & money
  "Will this project pay off?",
  "Should I push for the raise?",
  "Am I in the right career?",
  "Is this financial risk worth it?",
  "Why is work feeling so draining lately?",
  "Am I being overlooked or undervalued?",
  "Should I take the partnership deal?",
  "What does this week look like for business?",
  // Self & direction
  "What am I avoiding right now?",
  "What am I missing about this week?",
  "What is the real lesson this month?",
  "What is blocking me?",
  "Am I on the right path?",
  "What do I need to let go of?",
  "What is my energy like today?",
  "What should I focus on this week?",
  "Why do I keep sabotaging myself?",
  "What does the universe want me to notice right now?",
  // Family & friends
  "How do I handle this conversation with my mom?",
  "Should I set this boundary with my friend?",
  "Why is this family dynamic so hard?",
  "Am I being a good friend right now?",
  "How do I navigate this conflict at home?",
  "Is it time to reconnect with someone from my past?",
];

export function pickThree(exclude: string[] = []): string[] {
  const pool = SUGGESTED_PROMPTS.filter((p) => !exclude.includes(p));
  const source = pool.length >= 3 ? pool : SUGGESTED_PROMPTS;
  const shuffled = [...source].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 3);
}
