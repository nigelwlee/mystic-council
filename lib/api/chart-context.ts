import type { TraditionId } from "@/lib/constants/traditions";

type ChartPassthrough = {
  traditions?: Record<string, unknown>;
};

/**
 * Build a per-tradition pre-computed chart preamble that gets prepended to the
 * expert's user message. The intent is for the expert to read off these facts
 * rather than recomputing them via tools — making outputs stable across
 * council/daily/expert calls within the same day.
 *
 * Returns null if there's nothing to inject for this tradition.
 */
export function chartContextForTradition(
  chart: ChartPassthrough | undefined,
  traditionId: TraditionId,
): string | null {
  if (!chart?.traditions) return null;
  const facts = chart.traditions[traditionId];
  if (!facts || typeof facts !== "object") return null;

  const json = JSON.stringify(facts, null, 2);
  return `Pre-computed ${traditionId} chart facts (use these directly — do not recompute):\n\`\`\`json\n${json}\n\`\`\`\n\n`;
}

type DailyPassthrough = {
  oracle?: { summary?: string; oneLiner?: string };
  experts?: unknown[];
};

/**
 * Build a "prior frame" preamble describing what today's daily reading already
 * concluded. Appended to the council judge's system prompt so its synthesis
 * stays consistent with the morning's narrative.
 */
export function dailyPriorFrame(daily: DailyPassthrough | undefined): string | null {
  if (!daily?.oracle) return null;
  const { oneLiner, summary } = daily.oracle;
  const lines: string[] = [];
  if (oneLiner) lines.push(`Daily one-liner: "${oneLiner}"`);
  if (summary) lines.push(`Daily summary: ${summary}`);

  if (Array.isArray(daily.experts)) {
    const expertOneLiners = daily.experts
      .map((e) => {
        if (!e || typeof e !== "object") return null;
        const r = e as { expertName?: string; content?: { oneLiner?: string } };
        if (r.expertName && r.content?.oneLiner) {
          return `- ${r.expertName}: ${r.content.oneLiner}`;
        }
        return null;
      })
      .filter((s): s is string => s !== null);
    if (expertOneLiners.length > 0) {
      lines.push("\nDaily expert one-liners:");
      lines.push(...expertOneLiners);
    }
  }

  if (lines.length === 0) return null;
  return `\n\nPRIOR FRAME — TODAY'S DAILY READING:\n${lines.join("\n")}\n\nThe user is now asking a follow-up question. Stay consistent with this morning's frame unless the question reveals genuinely new information that warrants reframing.`;
}
