import { readFileSync } from "fs";
import { join } from "path";

export const VOICE_RULES = readFileSync(join(process.cwd(), "lib/voice.md"), "utf-8");

const CORE_RULES = readFileSync(join(process.cwd(), "lib/voice-core.md"), "utf-8");

const TRADITION_VOICE: Record<string, string> = {
  western:    readFileSync(join(process.cwd(), "lib/voice-western.md"), "utf-8"),
  vedic:      readFileSync(join(process.cwd(), "lib/voice-vedic.md"), "utf-8"),
  chinese:    readFileSync(join(process.cwd(), "lib/voice-chinese.md"), "utf-8"),
  tarot:      readFileSync(join(process.cwd(), "lib/voice-tarot.md"), "utf-8"),
  numerology: readFileSync(join(process.cwd(), "lib/voice-numerology.md"), "utf-8"),
};

export function voiceRulesForTradition(traditionId: string): string {
  const traditionVoice = TRADITION_VOICE[traditionId];
  if (!traditionVoice) return CORE_RULES;
  return `${CORE_RULES}\n\n${traditionVoice}`;
}
