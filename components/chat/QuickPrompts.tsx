"use client";

const PROMPTS = [
  "What does my birth chart reveal about my purpose?",
  "Draw me a tarot spread for what I need to know right now.",
  "What energies are dominant for me this year?",
  "What are my life path and destiny numbers?",
];

interface QuickPromptsProps {
  onSelect: (prompt: string) => void;
}

export function QuickPrompts({ onSelect }: QuickPromptsProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
      {PROMPTS.map((p) => (
        <button
          key={p}
          onClick={() => onSelect(p)}
          className="shrink-0 text-xs text-neutral-600 border border-neutral-800 rounded px-2.5 py-1.5 hover:border-neutral-700 hover:text-neutral-400 transition-colors whitespace-nowrap"
        >
          {p}
        </button>
      ))}
    </div>
  );
}
