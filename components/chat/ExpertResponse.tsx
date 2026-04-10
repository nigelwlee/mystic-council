"use client";

import { useState } from "react";
import type { ExpertResponse } from "@/lib/experts/types";

interface ExpertResponseCardProps {
  response: ExpertResponse;
}

export function ExpertResponseCard({ response }: ExpertResponseCardProps) {
  const [collapsed, setCollapsed] = useState(false);

  if (response.error) {
    return (
      <div className="pl-3 border-l border-neutral-800">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm">{response.expertEmoji}</span>
          <span className="text-xs text-neutral-600">{response.expertName}</span>
        </div>
        <p className="text-xs text-neutral-700 italic">Unable to read at this time.</p>
      </div>
    );
  }

  return (
    <div
      className="pl-3 border-l-2"
      style={{ borderColor: response.color }}
    >
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="flex items-center gap-2 mb-2 w-full text-left"
      >
        <span className="text-sm">{response.expertEmoji}</span>
        <span className="text-xs font-medium" style={{ color: response.color }}>
          {response.expertName}
        </span>
        <span className="text-xs text-neutral-600">{response.expertTitle}</span>
        <span className="ml-auto text-neutral-700 text-xs">{collapsed ? "+" : "−"}</span>
      </button>

      {!collapsed && (
        <div className="text-sm text-neutral-300 leading-relaxed whitespace-pre-wrap">
          {response.content}
        </div>
      )}
    </div>
  );
}
