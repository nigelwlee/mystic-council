"use client";

import { THREAD_COLORS, THREAD_X_OFFSETS } from "@/lib/constants/threads";

const THREAD_IDS = ["birth", "calendar", "journal", "health", "social"] as const;

export function LoomSVG({
  height = 120,
  activeThreads,
  showWeft = false,
  showFrame = true,
}: {
  height?: number;
  activeThreads: string[];
  showWeft?: boolean;
  showFrame?: boolean;
}) {
  const width = 220;
  const cx = width / 2;
  const topY = 8;
  const bottomY = height - 8;
  const weftY = bottomY - 4;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ overflow: "visible" }}
      aria-hidden="true"
    >
      {/* Frame rails */}
      {showFrame && (
        <>
          <line
            x1={cx - 70} y1={topY}
            x2={cx + 70} y2={topY}
            stroke="rgba(245,240,232,0.15)"
            strokeWidth={1}
          />
          <line
            x1={cx - 70} y1={bottomY}
            x2={cx + 70} y2={bottomY}
            stroke="rgba(245,240,232,0.15)"
            strokeWidth={1}
          />
        </>
      )}

      {/* Warp threads */}
      {THREAD_IDS.map((id) => {
        const isActive = activeThreads.includes(id);
        const x = cx + THREAD_X_OFFSETS[id];
        const color = THREAD_COLORS[id];
        const midX = x + (id === "calendar" ? 0.8 : id === "health" ? -0.5 : 0.3);
        return (
          <path
            key={id}
            d={`M ${x} ${topY} C ${midX} ${topY + (bottomY - topY) * 0.35}, ${x - 0.4} ${topY + (bottomY - topY) * 0.65}, ${x} ${bottomY}`}
            stroke={color}
            strokeWidth={1.5}
            fill="none"
            opacity={isActive ? 1 : 0}
            style={{ transition: "opacity 0.8s ease" }}
          />
        );
      })}

      {/* Single weft preview line */}
      {showWeft && (
        <line
          x1={cx - 72} y1={weftY}
          x2={cx + 72} y2={weftY}
          stroke="rgba(245,240,232,0.25)"
          strokeWidth={1}
          strokeDasharray="2 3"
        />
      )}
    </svg>
  );
}
