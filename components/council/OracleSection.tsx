"use client";

import { TRADITION_COLORS } from "@/lib/constants/traditions";

const TEXT = "#F5F0E8";

function OracleCrossSymbol() {
  const color = TRADITION_COLORS.oracle;
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" aria-hidden="true">
      <line x1="16" y1="2"  x2="16" y2="30" stroke={color} strokeWidth="1" strokeOpacity="0.45" />
      <line x1="2"  y1="16" x2="12" y2="16" stroke={color} strokeWidth="1" strokeOpacity="0.45" />
      <line x1="20" y1="16" x2="30" y2="16" stroke={color} strokeWidth="1" strokeOpacity="0.45" />
      <line x1="11" y1="2"  x2="21" y2="2"  stroke={color} strokeWidth="0.5" strokeOpacity="0.2" />
      <line x1="11" y1="30" x2="21" y2="30" stroke={color} strokeWidth="0.5" strokeOpacity="0.2" />
      <line x1="2"  y1="11" x2="2"  y2="21" stroke={color} strokeWidth="0.5" strokeOpacity="0.2" />
      <line x1="30" y1="11" x2="30" y2="21" stroke={color} strokeWidth="0.5" strokeOpacity="0.2" />
    </svg>
  );
}

export function OracleSection({
  content,
  isStreaming = false,
  onTapestryClick,
}: {
  content: string;
  isStreaming?: boolean;
  onTapestryClick?: () => void;
}) {
  const paragraphs = content.split(/\n\n+/).filter(Boolean);

  return (
    <div
      style={{
        borderTop: "1px solid rgba(245,240,232,0.08)",
        paddingTop: 40,
        animation: "oracle-reveal 0.5s ease-out both",
      }}
    >
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <span
          style={{
            fontFamily: "var(--font-geist-sans)",
            fontSize: 8,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: TEXT,
            opacity: 0.4,
            display: "block",
          }}
        >
          ◎&nbsp;&nbsp;The Oracle
        </span>
      </div>

      <div style={{ height: 1, backgroundColor: TEXT, opacity: 0.1, width: "100%" }} />

      {/* Oracle paragraphs */}
      <div style={{ marginTop: 32, marginBottom: 44, display: "flex", flexDirection: "column", gap: 28 }}>
        {paragraphs.length > 0 ? (
          paragraphs.map((para, i) => (
            <p
              key={i}
              style={{
                fontFamily: "var(--font-cormorant)",
                fontSize: 21,
                lineHeight: 1.85,
                color: TEXT,
                opacity: 0.92 - i * 0.1,
                margin: 0,
                animation: `oracle-reveal 0.5s ease-out ${i * 200}ms both`,
              }}
            >
              {para}
            </p>
          ))
        ) : (
          <p
            style={{
              fontFamily: "var(--font-cormorant)",
              fontSize: 21,
              lineHeight: 1.85,
              color: TEXT,
              opacity: 0.92,
              margin: 0,
            }}
          >
            {content}
            {isStreaming && (
              <span style={{ opacity: 0.5, animation: "breathe 1.4s ease-in-out infinite" }}>▌</span>
            )}
          </p>
        )}
      </div>

      {/* Symbol */}
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 40 }}>
        <OracleCrossSymbol />
      </div>

      <div style={{ height: 1, backgroundColor: TEXT, opacity: 0.07, width: "100%" }} />

      {/* Post-oracle link */}
      <div style={{ marginTop: 20, marginBottom: 40 }}>
        <button
          onClick={onTapestryClick}
          style={{
            fontFamily: "var(--font-geist-sans)",
            fontSize: 9,
            letterSpacing: "0.12em",
            color: TEXT,
            opacity: 0.3,
            cursor: "pointer",
            borderBottom: "1px solid rgba(245,240,232,0.12)",
            paddingBottom: 1,
            background: "none",
            border: "none",
            borderBottomWidth: 1,
            borderBottomStyle: "solid",
            borderBottomColor: "rgba(245,240,232,0.12)",
            padding: "0 0 1px",
          }}
        >
          This reading has been woven into your tapestry. →
        </button>
      </div>
    </div>
  );
}
