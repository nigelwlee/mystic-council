"use client";

import { useState } from "react";
import type { ProtoExpertReading } from "@/lib/hooks/use-proto-store";
import { EXPERT_ID_TO_TRADITION, TRADITION_MAP } from "@/lib/constants/traditions";

const TEXT = "#F5F0E8";
const MUTED = "rgba(245,240,232,0.35)";
const BORDER = "rgba(245,240,232,0.08)";

interface ExpertCardProps {
  expert: ProtoExpertReading;
}

export function ExpertCard({ expert }: ExpertCardProps) {
  const [open, setOpen] = useState(false);

  const traditionId = EXPERT_ID_TO_TRADITION[expert.expertId];
  const tradition = traditionId ? TRADITION_MAP[traditionId] : null;
  const symbol = tradition?.symbol ?? expert.expertEmoji;
  const label = tradition?.label ?? expert.expertName;
  const accentColor = expert.color || tradition?.hex || "rgba(191,168,130,0.8)";

  const content =
    typeof expert.content === "object" && expert.content !== null
      ? expert.content
      : null;
  const oneLiner = content?.oneLiner ?? expert.error ?? "";
  const summary = content?.summary ?? "";
  const analysis = content?.analysis ?? "";
  const facts = content?.facts ?? "";

  return (
    <div
      style={{
        borderTop: `1px solid ${BORDER}`,
        paddingTop: 16,
        paddingBottom: 16,
        borderLeft: `2px solid ${accentColor}`,
        paddingLeft: 12,
      }}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 12,
          width: "100%",
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: 0,
          textAlign: "left",
        }}
      >
        <span
          style={{
            fontSize: 14,
            flexShrink: 0,
            marginTop: 2,
            color: accentColor,
            fontFamily: "var(--font-geist-mono), monospace",
            width: 16,
            textAlign: "center",
          }}
        >
          {symbol}
        </span>
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: 11,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: MUTED,
              fontFamily: "var(--font-geist-mono), monospace",
              marginBottom: 4,
            }}
          >
            {label}
          </div>
          <div style={{ fontSize: 15, color: TEXT, lineHeight: 1.5 }}>
            {oneLiner}
          </div>
        </div>
        {(summary || analysis) && (
          <span
            style={{
              fontSize: 12,
              color: MUTED,
              flexShrink: 0,
              marginTop: 4,
              fontFamily: "var(--font-geist-mono), monospace",
            }}
          >
            {open ? "▲" : "▼"}
          </span>
        )}
      </button>

      {open && (
        <div style={{ marginTop: 16, paddingLeft: 28 }}>
          {summary && (
            <p
              style={{
                fontSize: 15,
                color: TEXT,
                lineHeight: 1.7,
                margin: 0,
                marginBottom: analysis || facts ? 16 : 0,
              }}
            >
              {summary}
            </p>
          )}
          {analysis && (
            <p
              style={{
                fontSize: 14,
                color: MUTED,
                lineHeight: 1.7,
                margin: 0,
                marginBottom: facts ? 16 : 0,
              }}
            >
              {analysis}
            </p>
          )}
          {facts && (
            <p
              style={{
                fontSize: 12,
                color: "rgba(245,240,232,0.2)",
                lineHeight: 1.6,
                margin: 0,
                fontFamily: "var(--font-geist-mono), monospace",
              }}
            >
              {facts}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
