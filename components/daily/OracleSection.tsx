"use client";

import type { ProtoOracle } from "@/lib/hooks/use-proto-store";

const ACCENT_DIM = "rgba(191,168,130,0.75)";
const TEXT = "#F5F0E8";

interface OracleSectionProps {
  oracle: ProtoOracle;
}

export function OracleSection({ oracle }: OracleSectionProps) {
  return (
    <div style={{ paddingBottom: 32 }}>
      <p
        style={{
          fontFamily: "var(--font-cormorant), Georgia, serif",
          fontSize: 26,
          fontStyle: "italic",
          fontWeight: 400,
          color: ACCENT_DIM,
          lineHeight: 1.4,
          margin: 0,
          marginBottom: 16,
        }}
      >
        {oracle.oneLiner}
      </p>
      <p
        style={{
          fontSize: 16,
          color: TEXT,
          lineHeight: 1.7,
          margin: 0,
        }}
      >
        {oracle.summary}
      </p>
    </div>
  );
}
