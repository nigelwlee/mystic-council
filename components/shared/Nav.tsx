"use client";

import Link from "next/link";

const TEXT = "#F5F0E8";

export function Nav({
  showTapestryLink = true,
  showBackLink = false,
}: {
  showTapestryLink?: boolean;
  showBackLink?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "20px 0",
        borderBottom: "1px solid rgba(245,240,232,0.06)",
      }}
    >
      {showBackLink ? (
        <Link
          href="/chat"
          style={{
            fontFamily: "var(--font-geist-sans)",
            fontSize: 12,
            color: "rgba(245,240,232,0.40)",
            textDecoration: "none",
            letterSpacing: "0.04em",
          }}
        >
          ← Council
        </Link>
      ) : (
        <span
          style={{
            fontFamily: "var(--font-geist-sans)",
            fontSize: 11,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: TEXT,
            opacity: 0.55,
          }}
        >
          Mystic Council
        </span>
      )}

      {showTapestryLink && !showBackLink && (
        <Link
          href="/tapestry"
          style={{
            fontFamily: "var(--font-geist-sans)",
            fontSize: 9,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: TEXT,
            opacity: 0.3,
            textDecoration: "none",
            borderBottom: "1px solid rgba(245,240,232,0.15)",
            paddingBottom: 1,
          }}
        >
          Your Tapestry →
        </Link>
      )}
    </div>
  );
}
