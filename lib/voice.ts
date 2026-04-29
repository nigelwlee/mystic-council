import { readFileSync } from "fs";
import { join } from "path";

export const VOICE_RULES = readFileSync(join(process.cwd(), "lib/voice.md"), "utf-8");
