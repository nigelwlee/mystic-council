"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useReadings } from "@/lib/hooks/use-readings";
import { GhostButton } from "@/components/shared/GhostButton";
import { TRADITION_MAP } from "@/lib/constants/traditions";
import type { TraditionId } from "@/lib/constants/traditions";

const BG = "#0A0B14";
const TEXT = "#F5F0E8";

export default function ReadingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { readings } = useReadings();

  const id = typeof params.id === "string" ? params.id : Array.isArray(params.id) ? params.id[0] : "";
  const reading = readings.find((r) => r.id === id);

  if (!reading) {
    return (
      <div
        style={{
          background: BG,
          color: TEXT,
          minHeight: "100vh",
          fontFamily: "var(--font-geist-sans)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ textAlign: "center", maxWidth: 400, padding: "0 24px" }}>
          <div
            style={{
              fontFamily: "var(--font-cormorant)",
              fontSize: 32,
              fontWeight: 300,
              color: TEXT,
              opacity: 0.6,
              marginBottom: 24,
            }}
          >
            This reading was not found.
          </div>
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
            ← Return to tapestry
          </Link>
        </div>
      </div>
    );
  }

  const date = new Date(reading.timestamp);
  const dateStr = date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const paragraphs = reading.oracleContent.split(/\n\n+/).filter(Boolean);

  return (
    <div style={{ background: BG, color: TEXT, minHeight: "100vh", fontFamily: "var(--font-geist-sans)" }}>
      <div
        style={{
          maxWidth: 680,
          margin: "0 auto",
          padding: "0 24px",
        }}
      >
        {/* Header */}
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
          <span
            style={{
              fontFamily: "var(--font-geist-sans)",
              fontSize: 10,
              color: "rgba(245,240,232,0.28)",
              letterSpacing: "0.08em",
            }}
          >
            {dateStr}
          </span>
        </div>

        {/* Content */}
        <div style={{ paddingTop: 48, paddingBottom: 120 }}>
          {/* Question */}
          <p
            style={{
              fontFamily: "var(--font-cormorant)",
              fontStyle: "italic",
              fontSize: 26,
              lineHeight: 1.5,
              color: TEXT,
              opacity: 0.55,
              margin: "0 0 40px",
              fontWeight: 300,
            }}
          >
            &ldquo;{reading.question}&rdquo;
          </p>

          <div style={{ height: 1, backgroundColor: TEXT, opacity: 0.07, marginBottom: 40 }} />

          {/* Expert responses */}
          {reading.expertResponses.length > 0 && (
            <div style={{ marginBottom: 48 }}>
              <span
                style={{
                  fontFamily: "var(--font-geist-sans)",
                  fontSize: 9,
                  letterSpacing: "0.2em",
                  color: "rgba(245,240,232,0.30)",
                  textTransform: "uppercase",
                  display: "block",
                  marginBottom: 20,
                }}
              >
                The Council
              </span>
              <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                {reading.expertResponses.map((resp, i) => {
                  const trad = TRADITION_MAP[resp.traditionId as TraditionId];
                  return (
                    <div
                      key={i}
                      style={{
                        padding: "20px 0",
                        borderBottom: "1px solid rgba(245,240,232,0.05)",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          marginBottom: 12,
                        }}
                      >
                        {trad && (
                          <div
                            style={{
                              width: 3,
                              height: 16,
                              background: trad.hex,
                              opacity: 0.8,
                              flexShrink: 0,
                            }}
                          />
                        )}
                        <span
                          style={{
                            fontFamily: "var(--font-geist-sans)",
                            fontSize: 10,
                            letterSpacing: "0.12em",
                            textTransform: "uppercase",
                            color: trad ? trad.hex : "rgba(245,240,232,0.5)",
                            opacity: 0.85,
                          }}
                        >
                          {resp.expertName}
                        </span>
                      </div>
                      <p
                        style={{
                          fontFamily: "var(--font-cormorant)",
                          fontSize: 17,
                          lineHeight: 1.75,
                          color: TEXT,
                          opacity: 0.78,
                          margin: 0,
                        }}
                      >
                        {resp.content}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Oracle section */}
          <div
            style={{
              borderTop: "1px solid rgba(245,240,232,0.08)",
              paddingTop: 40,
            }}
          >
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

            <div style={{ marginTop: 32, marginBottom: 44, display: "flex", flexDirection: "column", gap: 28 }}>
              {paragraphs.map((para, i) => (
                <p
                  key={i}
                  style={{
                    fontFamily: "var(--font-cormorant)",
                    fontSize: 21,
                    lineHeight: 1.85,
                    color: TEXT,
                    opacity: 0.92 - i * 0.1,
                    margin: 0,
                  }}
                >
                  {para}
                </p>
              ))}
            </div>

            <div style={{ height: 1, backgroundColor: TEXT, opacity: 0.07, width: "100%" }} />
          </div>

          {/* CTAs */}
          <div
            style={{
              marginTop: 48,
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              gap: 20,
            }}
          >
            <GhostButton onClick={() => router.push("/chat")}>
              Ask another question
            </GhostButton>

            <Link
              href="/tapestry"
              style={{
                fontFamily: "var(--font-geist-sans)",
                fontSize: 11,
                color: "rgba(245,240,232,0.35)",
                textDecoration: "none",
                letterSpacing: "0.06em",
              }}
            >
              Return to tapestry →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
