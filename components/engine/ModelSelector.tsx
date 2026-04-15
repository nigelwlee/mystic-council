"use client";

import { availableModels } from "@/lib/models";

export function ModelSelector({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const toggle = (id: string) => {
    if (selected.includes(id)) {
      onChange(selected.filter((x) => x !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  return (
    <div className="flex flex-wrap gap-1.5">
      {availableModels.map((m) => {
        const active = selected.includes(m.id);
        return (
          <button
            key={m.id}
            onClick={() => toggle(m.id)}
            className={`px-2 py-1 rounded text-[10px] font-mono transition-colors flex flex-col items-start gap-0.5 ${
              active
                ? "bg-neutral-700 text-neutral-200"
                : "bg-neutral-900/50 text-neutral-600 hover:text-neutral-400"
            }`}
          >
            <span>{m.name}</span>
            <span className={active ? "text-neutral-500" : "text-neutral-700"}>
              ${m.outputPricePerM}/M out
            </span>
          </button>
        );
      })}
    </div>
  );
}
