"use client";

import { use } from "react";
import Link from "next/link";
import { useReadings } from "@/lib/hooks/use-readings";
import { ExpertCard } from "@/components/council/ExpertCard";
import { OracleSection } from "@/components/council/OracleSection";
import { ContentColumn } from "@/components/shared/ContentColumn";
import { GhostButton } from "@/components/shared/GhostButton";

const BG = "#0A0B14";
const TEXT = "#F5F0E8";

function formatReadingDate(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default function ReadingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { readings, getReading } = useReadings();

  const reading = getReading(id);

  // Find the 1-based index of this reading in chronological order (oldest = 1)
  const readingNumber =
    reading !== undefined
      ? readings.length - readings.findIndex((r) => r.id === id)
      : null;

  return (
    <div
      style={{
        background: BG,
        color: TEXT,
        minHeight: "100vh",
        fontFamily: "var(--font-geist-sans)",
      }}
    >
      {/* Nav */}
      <ContentColumn maxWidth={600}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "20px 0",
            borderBottom: "1px solid rgba(245,240,232,0.06)",
          }}
        >
          <Link
            href="/tapestry"
            style={{
              fontFamily: "var(--font-geist-sans)",
              fontSize: 12,
              color: "rgba(245,240,232,0.40)",
              textDecoration: "none",
              letterSpacing: "0.04em",
            }}
          >
            ← Tapestry
          </Link>
          {reading && readingNumber !== null && (
            <span
              style={{
                fontFamily: "var(--font-geist-sans)",
                fontSize: 11,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: TEXT,
                opacity: 0.35,
              }}
            >
              Reading {readingNumber}
            </span>
          )}
        </div>
      </ContentColumn>

      {/* Body */}
      <ContentColumn maxWidth={600} style={{ paddingTop: 40, paddingBottom: 80 }}>
        {reading ? (
          <>
            {/* Meta: date + reading number */}
            <p
              style={{
                fontFamily: "var(--font-geist-mono, monospace)",
                fontSize: 11,
                color: "rgba(245,240,232,0.35)",
                letterSpacing: "0.06em",
                margin: "0 0 16px",
              }}
            >
              {formatReadingDate(reading.timestamp)}
              {readingNumber !== null ? ` · Reading ${readingNumber}` : ""}
            </p>

            {/* Question */}
            <p
              style={{
                fontFamily: "var(--font-cormorant)",
                fontStyle: "italic",
                fontWeight: 300,
                fontSize: 28,
                lineHeight: 1.45,
                color: TEXT,
                margin: "0 0 36px",
              }}
            >
              &ldquo;{reading.question}&rdquo;
            </p>

            {/* Divider */}
            <div
              style={{
                height: 1,
                background: "rgba(245,240,232,0.08)",
                marginBottom: 36,
              }}
            />

            {/* Expert response cards */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 40 }}>
              {reading.expertResponses.map((response) => (
                <ExpertCard
                  key={response.traditionId}
                  tradition={response.traditionId}
                  text={response.content}
                  pending={false}
                />
              ))}
            </div>

            {/* Oracle synthesis */}
            <OracleSection
              content={reading.oracleContent}
              isStreaming={false}
            />

            {/* Footer actions */}
            <div
              style={{
                marginTop: 48,
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                gap: 20,
              }}
            >
              <Link href="/chat" style={{ textDecoration: "none" }}>
                <GhostButton>Ask another question</GhostButton>
              </Link>
              <Link
                href="/tapestry"
                style={{
                  fontFamily: "var(--font-geist-sans)",
                  fontSize: 11,
                  letterSpacing: "0.08em",
                  color: "rgba(245,240,232,0.35)",
                  textDecoration: "none",
                  borderBottom: "1px solid rgba(245,240,232,0.12)",
                  paddingBottom: 1,
                }}
              >
                Return to tapestry
              </Link>
            </div>
          </>
        ) : (
          /* Not-found state */
          <div
            style={{
              paddingTop: 80,
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              gap: 32,
            }}
          >
            <p
              style={{
                fontFamily: "var(--font-cormorant)",
                fontStyle: "italic",
                fontWeight: 300,
                fontSize: 26,
                color: "rgba(245,240,232,0.60)",
                margin: 0,
              }}
            >
              This reading has passed beyond recall.
            </p>
            <Link href="/tapestry" style={{ textDecoration: "none" }}>
              <GhostButton>Return to tapestry</GhostButton>
            </Link>
          </div>
        )}
      </ContentColumn>
    </div>
  );
}
