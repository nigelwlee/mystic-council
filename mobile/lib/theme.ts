// Design tokens — mirrors the web redesign prototype's C and F constants.

export const C = {
  bg: '#0A0B14',
  surface: '#13141F',
  border: '#2D2F3E',
  borderSubtle: '#1E2030',
  text: '#F5F0E8',
  muted: '#9CA3AF',
  dim: '#6B7280',
  dimmer: '#4B5563',
  accent: 'rgba(191,168,130,1)',
  accentFaint: 'rgba(191,168,130,0.08)',
  accentDim: 'rgba(191,168,130,0.45)',
  assistantBubble: '#18181D',
} as const;

// Font-family keys — match the useFonts keys in app/_layout.tsx.
export const F = {
  display: 'CormorantGaramond-Regular',
  displayItalic: 'CormorantGaramond-Italic',
  ui: 'Geist-Regular',
  uiMedium: 'Geist-Medium',
  mono: 'GeistMono-Regular',
} as const;

// Tradition color accents — single source of truth.
export const TRADITION_COLOR: Record<string, string> = {
  stella:       '#8B7EC8',
  priya:        '#C8A96E',
  'master-wei': '#C8846E',
  'madame-crow':'#6E8BC8',
  pythia:       '#7EC89A',
};

// Luck level colors
export const LUCK_COLOR: Record<string, string> = {
  Excellent: '#7EC89A',
  Strong:    '#7EC89A',
  Fair:      '#C8A96E',
  Weak:      '#C8846E',
};

// Expert status colors
export const STATUS_STYLE: Record<string, { color: string; bg: string }> = {
  Good:    { color: '#7EC89A', bg: 'rgba(126,200,154,0.12)' },
  Fair:    { color: '#C8A96E', bg: 'rgba(200,169,110,0.12)' },
  Caution: { color: '#C8846E', bg: 'rgba(200,132,110,0.12)' },
};
