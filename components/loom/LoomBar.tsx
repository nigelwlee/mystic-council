"use client";

import { WARP_THREADS } from "@/lib/constants/threads";

export interface WeftThread {
  id: string;
  color: string;
  progress: number; // 0–1
  isOracle?: boolean;
}

const TEXT = "#F5F0E8";

export function LoomBar({
  weftThreads,
  width = 600,
  height = 80,
}: {
  weftThreads: WeftThread[];
  width?: number;
  height?: number;
}) {
  const paddingX = 20;
  const paddingY = 14;
  const innerWidth = width - paddingX * 2;
  const innerHeight = height - paddingY * 2;
  const labelAreaHeight = 18;
  const weftAreaHeight = innerHeight - labelAreaHeight;
  const warpCount = WARP_THREADS.length;
  const warpSpacing = innerWidth / (warpCount - 1);
  const maxWefts = 6;
  const weftSpacing = weftAreaHeight / (maxWefts + 1);

  return (
    <svg
      width="100%"
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ display: "block", overflow: "visible" }}
      aria-label="Loom — warp and weft threads"
    >
      {/* Warp threads */}
      {WARP_THREADS.map((warp, i) => {
        const x = paddingX + i * warpSpacing;
        return (
          <g key={warp.id}>
            <line
              x1={x} y1={paddingY}
              x2={x} y2={paddingY + weftAreaHeight}
              stroke={warp.color}
              strokeWidth={1}
            />
            <text
              x={x}
              y={height - 4}
              textAnchor="middle"
              style={{
                fontFamily: "var(--font-geist-sans)",
                fontSize: "6.5px",
                fill: TEXT,
                fillOpacity: 0.28,
                letterSpacing: "0.06em",
              }}
            >
              {warp.label}
            </text>
          </g>
        );
      })}

      {/* Weft threads */}
      {weftThreads.map((weft, weftIndex) => {
        const y = paddingY + weftSpacing * (weftIndex + 1);
        const strokeW = weft.isOracle ? 2 : 1;
        const weftEndX = paddingX + weft.progress * innerWidth;
        const segments: React.ReactNode[] = [];
        let currentX = paddingX;

        for (let i = 0; i < warpCount; i++) {
          const warpX = paddingX + i * warpSpacing;
          const isOver = (i + weftIndex) % 2 === 0;
          const gapHalf = 3;

          if (weftEndX < warpX) break;

          if (isOver) {
            const segEnd = Math.min(weftEndX, warpX + gapHalf);
            segments.push(
              <line
                key={`seg-${weftIndex}-${i}-over`}
                x1={currentX} y1={y} x2={segEnd} y2={y}
                stroke={weft.color} strokeWidth={strokeW} strokeOpacity={0.65}
              />
            );
            currentX = segEnd;
          } else {
            const gapStart = Math.max(currentX, warpX - gapHalf);
            const gapEnd = warpX + gapHalf;
            if (gapStart > currentX) {
              segments.push(
                <line
                  key={`seg-${weftIndex}-${i}-pre`}
                  x1={currentX} y1={y} x2={gapStart} y2={y}
                  stroke={weft.color} strokeWidth={strokeW} strokeOpacity={0.65}
                />
              );
            }
            currentX = Math.min(weftEndX, gapEnd);
          }
        }

        if (currentX < weftEndX) {
          segments.push(
            <line
              key={`seg-${weftIndex}-tail`}
              x1={currentX} y1={y} x2={weftEndX} y2={y}
              stroke={weft.color} strokeWidth={strokeW} strokeOpacity={0.65}
            />
          );
        }

        return <g key={weft.id}>{segments}</g>;
      })}

      {/* Progress tips */}
      {weftThreads
        .filter((w) => w.progress > 0 && w.progress < 1)
        .map((weft) => {
          const idx = weftThreads.findIndex((w) => w.id === weft.id);
          const y = paddingY + weftSpacing * (idx + 1);
          const tipX = paddingX + weft.progress * innerWidth;
          return (
            <circle
              key={`tip-${weft.id}`}
              cx={tipX} cy={y} r={2}
              fill={weft.color} opacity={0.9}
            />
          );
        })}
    </svg>
  );
}
