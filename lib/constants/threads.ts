export const THREAD_COLORS = {
  birth:    "rgba(245,240,232,0.9)",
  calendar: "rgba(139,126,200,0.7)",
  journal:  "rgba(200,169,110,0.7)",
  health:   "rgba(126,200,154,0.7)",
  social:   "rgba(110,139,200,0.5)",
} as const;

export type ThreadId = keyof typeof THREAD_COLORS;

/** Natural, slightly uneven x offsets for organic loom feel */
export const THREAD_X_OFFSETS: Record<ThreadId, number> = {
  birth:    0,
  calendar: -28,
  journal:  29,
  health:   -14,
  social:   18,
};

/** Warp thread definitions for the LoomBar */
export const WARP_THREADS = [
  { id: "birth"    as const, label: "Birth",    color: "rgba(245,240,232,0.8)" },
  { id: "calendar" as const, label: "Calendar", color: "rgba(139,126,200,0.7)" },
  { id: "journal"  as const, label: "Journal",  color: "rgba(200,169,110,0.7)" },
  { id: "health"   as const, label: "Health",   color: "rgba(126,200,154,0.7)" },
];
