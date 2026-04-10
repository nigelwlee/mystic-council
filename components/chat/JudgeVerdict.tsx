"use client";

interface JudgeVerdictProps {
  content: string;
  isStreaming?: boolean;
}

export function JudgeVerdict({ content, isStreaming }: JudgeVerdictProps) {
  return (
    <div className="pl-3 border-l-2 border-yellow-700/60">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm">◈</span>
        <span className="text-xs font-medium text-yellow-600/80">The Oracle</span>
        <span className="text-xs text-neutral-600">Synthesis</span>
        {isStreaming && (
          <span className="ml-1 inline-block w-1 h-3 bg-yellow-700 animate-pulse" />
        )}
      </div>
      <div className="text-sm text-neutral-300 leading-relaxed whitespace-pre-wrap">
        {content}
      </div>
    </div>
  );
}
