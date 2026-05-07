"use client";

import type { ProtoExpertReading, ProtoOracle } from "@/lib/hooks/use-proto-store";
import { EXPERT_ID_TO_TRADITION, TRADITION_MAP } from "@/lib/constants/traditions";

const TEXT = "#F5F0E8";
const MUTED = "rgba(245,240,232,0.35)";
const ACCENT_DIM = "rgba(191,168,130,0.75)";
const BORDER = "rgba(245,240,232,0.08)";

interface ReadingPreviewProps {
  oracle: ProtoOracle;
  experts: ProtoExpertReading[];
  onExpand: () => void;
}

export function ReadingPreview({ oracle, experts, onExpand }: ReadingPreviewProps) {
  return (
    <button
      onClick={onExpand}
      style={{
        display: "block",
        width: "100%",
        background: "none",
        border: `1px solid ${BORDER}`,
        cursor: "pointer",
        padding: "24px 20px",
        textAlign: "left",
      }}
    >
      {/* Oracle summary */}
      <p
        style={{
          fontFamily: "var(--font-cormorant), Georgia, serif",
          fontSize: 22,
          fontStyle: "italic",
          fontWeight: 400,
          color: ACCENT_DIM,
          lineHeight: 1.45,
          margin: 0,
          marginBottom: 20,
        }}
      >
        {oracle.oneLiner}
      </p>

      {/* Summary text — first sentence or two */}
      {oracle.summary && (
        <p
          style={{
            fontSize: 15,
            color: TEXT,
            lineHeight: 1.7,
            margin: 0,
            marginBottom: 24,
            // Clamp to 3 lines
            display: "-webkit-box",
            WebkitLineClamp: 3,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {oracle.summary}
        </p>
      )}

      {/* Tradition chips */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
        {experts.map((expert) => {
          const traditionId = EXPERT_ID_TO_TRADITION[expert.expertId];
          const tradition = traditionId ? TRADITION_MAP[traditionId] : null;
          const label = tradition?.shortLabel ?? expert.expertName;
          const symbol = tradition?.symbol ?? expert.expertEmoji;
          const color = expert.color || tradition?.hex || "rgba(191,168,130,0.8)";
          const oneLiner = expert.content?.oneLiner ?? "";

          return (
            <div
              key={expert.expertId}
              style={{
                borderLeft: `2px solid ${color}`,
                paddingLeft: 8,
                paddingRight: 10,
                paddingTop: 6,
                paddingBottom: 6,
                background: "rgba(245,240,232,0.04)",
                minWidth: 0,
                flex: "1 1 calc(50% - 4px)",
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: MUTED,
                  fontFamily: "var(--font-geist-mono), monospace",
                  marginBottom: 3,
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <span style={{ color }}>{symbol}</span>
                {label}
              </div>
              {oneLiner && (
                <div
                  style={{
                    fontSize: 12,
                    color: TEXT,
                    lineHeight: 1.45,
                    // Clamp to 2 lines
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {oneLiner}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Expand hint */}
      <div
        style={{
          fontSize: 11,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: MUTED,
          fontFamily: "var(--font-geist-mono), monospace",
          textAlign: "right",
        }}
      >
        Full reading ▼
      </div>
    </button>
  );
}
