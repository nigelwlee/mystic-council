"use client";

import { experts } from "@/lib/experts/registry";

interface TypingIndicatorProps {
  selectedExpertIds: string[];
}

export function TypingIndicator({ selectedExpertIds }: TypingIndicatorProps) {
  const active = experts.filter(
    (e) => selectedExpertIds.length === 0 || selectedExpertIds.includes(e.id)
  );

  return (
    <div className="flex items-center gap-2 py-2">
      {active.map((expert, i) => (
        <span
          key={expert.id}
          className="text-base animate-pulse"
          style={{
            animationDelay: `${i * 150}ms`,
            color: expert.color,
          }}
          title={expert.name}
        >
          {expert.emoji}
        </span>
      ))}
      <span className="text-xs text-neutral-600 ml-1">consulting…</span>
    </div>
  );
}
