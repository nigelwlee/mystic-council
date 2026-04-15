"use client";

import { TRADITION_COLORS, TRADITION_NAMES, TRADITION_SYMBOLS, type TraditionId } from "@/lib/constants/traditions";
import { BreathingDots } from "./BreathingDots";

const TEXT = "#F5F0E8";

export function ExpertCard({
  tradition,
  text,
  pending = false,
}: {
  tradition: TraditionId;
  text?: string;
  pending?: boolean;
}) {
  const color = TRADITION_COLORS[tradition];
  const symbol = TRADITION_SYMBOLS[tradition];
  const name = TRADITION_NAMES[tradition];

  return (
    <div
      style={{
        borderTop: "1px solid rgba(245,240,232,0.08)",
        borderRight: "1px solid rgba(245,240,232,0.08)",
        borderBottom: "1px solid rgba(245,240,232,0.08)",
        borderLeft: `2px solid ${color}`,
        padding: "20px 22px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: pending ? 0 : 12,
        }}
      >
        <span style={{ fontSize: 12, color, opacity: 0.85 }}>{symbol}</span>
        <span
          style={{
            fontFamily: "var(--font-geist-sans)",
            fontSize: 8,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: TEXT,
            opacity: 0.45,
          }}
        >
          {name}
        </span>
        {pending && (
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 5 }}>
            <BreathingDots color={color} />
          </div>
        )}
      </div>

      {!pending && text && (
        <p
          style={{
            fontFamily: "var(--font-cormorant)",
            fontSize: 17,
            lineHeight: 1.7,
            color: TEXT,
            opacity: 0.88,
            margin: 0,
            whiteSpace: "pre-wrap",
          }}
        >
          {text}
        </p>
      )}
    </div>
  );
}
