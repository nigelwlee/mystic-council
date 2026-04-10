"use client";

import { experts } from "@/lib/experts/registry";

interface ExpertSelectorProps {
  selected: string[];
  onChange: (ids: string[]) => void;
}

export function ExpertSelector({ selected, onChange }: ExpertSelectorProps) {
  const allSelected = selected.length === 0;

  const toggle = (id: string) => {
    if (allSelected) {
      // Currently all — deselect everyone else
      onChange(experts.filter((e) => e.id !== id).map((e) => e.id));
    } else if (selected.includes(id)) {
      const next = selected.filter((s) => s !== id);
      onChange(next.length === 0 ? [] : next); // empty = all
    } else {
      const next = [...selected, id];
      onChange(next.length === experts.length ? [] : next); // all selected = empty
    }
  };

  const isActive = (id: string) => allSelected || selected.includes(id);

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {experts.map((expert) => (
        <button
          key={expert.id}
          onClick={() => toggle(expert.id)}
          title={expert.name}
          className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs transition-colors ${
            isActive(expert.id)
              ? "bg-neutral-800 text-neutral-300"
              : "bg-transparent text-neutral-700 hover:text-neutral-500"
          }`}
        >
          <span style={{ color: isActive(expert.id) ? expert.color : undefined }}>
            {expert.emoji}
          </span>
          <span className="hidden sm:inline">{expert.name}</span>
        </button>
      ))}
    </div>
  );
}
