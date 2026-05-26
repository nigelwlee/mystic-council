// Per-expert hero zone hatch pattern variants.
// Used by HatchBg to select the SVG pattern type for each expert card.

export type PatternVariant =
  | 'cross'         // double 45° / -45° — Stella (Western)
  | 'diagonal-up'   // single 45° — Pythia (Numerology)
  | 'horizontal'    // horizontal stripes — Priya (Vedic)
  | 'vertical'      // vertical stripes — Master Wei (Chinese)
  | 'triple';       // 60° + 120° + horizontal — Madame Crow (Tarot)

export const EXPERT_PATTERN: Record<string, PatternVariant> = {
  stella:       'cross',
  pythia:       'diagonal-up',
  priya:        'horizontal',
  'master-wei': 'vertical',
  'madame-crow':'triple',
};

export const TRADITION_ORDER = ['stella', 'priya', 'master-wei', 'madame-crow', 'pythia'];

export const TRADITION_LABEL: Record<string, string> = {
  stella:       'WESTERN ASTROLOGY',
  priya:        'VEDIC JYOTISH',
  'master-wei': 'CHINESE ASTROLOGY',
  'madame-crow':'TAROT',
  pythia:       'NUMEROLOGY',
};
