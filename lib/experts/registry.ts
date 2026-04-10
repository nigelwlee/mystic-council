import { westernAstrologer } from "./western-astrologer";
import { chineseAstrologer } from "./chinese-astrologer";
import { vedicAstrologer } from "./vedic-astrologer";
import { tarotReader } from "./tarot-reader";
import { numerologist } from "./numerologist";
import type { ExpertConfig } from "./types";

export const experts: ExpertConfig[] = [
  westernAstrologer,
  chineseAstrologer,
  vedicAstrologer,
  tarotReader,
  numerologist,
];

export const expertMap = Object.fromEntries(experts.map((e) => [e.id, e]));
