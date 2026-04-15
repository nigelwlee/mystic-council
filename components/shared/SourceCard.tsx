"use client";

import { THREAD_COLORS, type ThreadId } from "@/lib/constants/threads";

export function SourceCard({
  id,
  name,
  typeLabel,
  caption,
  connected,
  disabled,
  onToggle,
}: {
  id: ThreadId;
  name: string;
  typeLabel: string;
  caption: string;
  connected: boolean;
  disabled?: boolean;
  onToggle: () => void;
}) {
  const color = THREAD_COLORS[id];

  return (
    <div
      style={{
        border: "1px solid rgba(245,240,232,0.1)",
        padding: "20px 20px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        opacity: disabled ? 0.38 : 1,
        background: "transparent",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div
          style={{
            width: 4,
            height: 20,
            background: color,
            flexShrink: 0,
            marginTop: 2,
          }}
        />
        <div style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1 }}>
          <span
            style={{
              fontFamily: "var(--font-geist-sans)",
              fontSize: 9,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "rgba(245,240,232,0.3)",
            }}
          >
            {typeLabel}
          </span>
          <span
            style={{
              fontFamily: "var(--font-cormorant)",
              fontWeight: 400,
              fontSize: 18,
              color: "#F5F0E8",
              lineHeight: 1.1,
            }}
          >
            {name}
          </span>
        </div>
      </div>

      <span
        style={{
          fontFamily: "var(--font-cormorant)",
          fontSize: 14,
          fontStyle: "italic",
          color: "rgba(245,240,232,0.45)",
          lineHeight: 1.4,
        }}
      >
        {caption}
      </span>

      {!disabled ? (
        <button
          onClick={onToggle}
          style={{
            fontFamily: "var(--font-geist-sans)",
            fontSize: 9,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: connected ? "rgba(245,240,232,0.5)" : "rgba(245,240,232,0.9)",
            background: "transparent",
            border: "1px solid",
            borderColor: connected ? "rgba(245,240,232,0.15)" : "rgba(245,240,232,0.35)",
            borderRadius: 0,
            padding: "8px 14px",
            cursor: "pointer",
            alignSelf: "flex-start",
            transition: "all 0.2s ease",
          }}
        >
          {connected ? "Connected ✓" : "Connect"}
        </button>
      ) : (
        <span
          style={{
            fontFamily: "var(--font-geist-sans)",
            fontSize: 9,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: "rgba(245,240,232,0.2)",
          }}
        >
          Coming soon
        </span>
      )}
    </div>
  );
}
