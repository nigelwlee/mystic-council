"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { TapestryGrid, generateReadings } from "@/components/loom/TapestryGrid";
import { WovenTile } from "@/components/loom/WovenTile";
import { ShareableCard } from "@/components/shared/ShareableCard";
import { TRADITION_MAP, TRADITIONS } from "@/lib/constants/traditions";
import type { TraditionId } from "@/lib/constants/traditions";
import { useBirthData } from "@/lib/context/birth-data-context";

const BG = "#0A0B14";
const FG = "#F5F0E8";

const THREADS: { id: TraditionId; label: string; lastWoven: string; active: boolean }[] = [
  { id: "western",    label: "Western Astrology", lastWoven: "4 days ago",  active: true  },
  { id: "vedic",      label: "Vedic Jyotish",     lastWoven: "12 days ago", active: true  },
  { id: "tarot",      label: "Tarot",             lastWoven: "1 day ago",   active: true  },
  { id: "numerology", label: "Numerology",        lastWoven: "3 weeks ago", active: true  },
  { id: "chinese",    label: "Chinese Astrology", lastWoven: "–",           active: false },
];

const rule: React.CSSProperties = {
  borderTop: "1px solid rgba(245,240,232,0.08)",
  margin: "40px 0",
};

const sectionLabel: React.CSSProperties = {
  fontFamily: "var(--font-geist-sans)",
  fontSize: 9,
  letterSpacing: "0.2em",
  color: "rgba(245,240,232,0.30)",
  textTransform: "uppercase",
  marginBottom: 16,
};

export default function TapestryPage() {
  const { birthData } = useBirthData();
  const readings = useMemo(() => generateReadings(), []);
  const [shareHovered, setShareHovered] = useState(false);
  const [connectHovered, setConnectHovered] = useState(false);
  const [viewAllHovered, setViewAllHovered] = useState(false);
  const [cardShareHovered, setCardShareHovered] = useState(false);

  const recentReadings = useMemo(
    () => [...readings].sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 3),
    [readings]
  );

  const name = birthData?.name ?? "Nigel Lee";
  const readingCount = readings.length;

  return (
    <div style={{ background: BG, color: FG, minHeight: "100vh", fontFamily: "var(--font-geist-sans)" }}>
      <div
        style={{
          position: "relative",
          left: "50%",
          marginLeft: "-50vw",
          marginRight: "-50vw",
          width: "100vw",
        }}
      >
        <div style={{ maxWidth: 680, margin: "0 auto", padding: "0 24px" }}>

          {/* ── A. Header ─────────────────────────────────────── */}
          <div style={{ paddingTop: 40, paddingBottom: 36 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
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
              <button
                onMouseEnter={() => setShareHovered(true)}
                onMouseLeave={() => setShareHovered(false)}
                style={{
                  fontFamily: "var(--font-geist-sans)",
                  fontSize: 11,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: shareHovered ? FG : "rgba(245,240,232,0.55)",
                  background: "none",
                  border: `1px solid ${shareHovered ? "rgba(245,240,232,0.35)" : "rgba(245,240,232,0.18)"}`,
                  borderRadius: 0,
                  padding: "7px 16px",
                  cursor: "pointer",
                  transition: "color 0.15s, border-color 0.15s",
                }}
              >
                Share
              </button>
            </div>

            <div
              style={{
                fontFamily: "var(--font-cormorant)",
                fontSize: 52,
                fontWeight: 700,
                letterSpacing: "0.01em",
                lineHeight: 1,
                color: FG,
                marginBottom: 6,
              }}
            >
              Your Tapestry
            </div>

            <div
              style={{
                fontFamily: "var(--font-cormorant)",
                fontStyle: "italic",
                fontSize: 22,
                color: "rgba(245,240,232,0.55)",
                marginBottom: 8,
                fontWeight: 300,
              }}
            >
              {name}
            </div>

            <div
              style={{
                fontFamily: "var(--font-geist-sans)",
                fontSize: 11,
                color: "rgba(245,240,232,0.40)",
                letterSpacing: "0.02em",
              }}
            >
              Member since March 2, 2025 · {readingCount} readings woven
            </div>
          </div>

          <div style={rule} />

          {/* ── B. Tapestry Grid ──────────────────────────────── */}
          <div style={{ marginBottom: 48 }}>
            <TapestryGrid readings={readings} />
          </div>

          <div style={rule} />

          {/* ── C. Stats ──────────────────────────────────────── */}
          <div style={{ marginBottom: 40 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 0 }}>
              {[
                { number: String(readingCount), sub: "Readings woven" },
                { number: "12",        sub: "Week streak" },
                { number: "4 / 5",    sub: "Threads connected" },
                { number: "Western",  sub: "Most consulted", isText: true },
              ].map((stat, i) => (
                <div
                  key={i}
                  style={{
                    padding: "0 20px 0 0",
                    borderRight: i < 3 ? "1px solid rgba(245,240,232,0.07)" : "none",
                    paddingRight: i < 3 ? 20 : 0,
                  }}
                >
                  <div
                    style={{
                      fontFamily: "var(--font-cormorant)",
                      fontSize: stat.isText ? 30 : 44,
                      fontWeight: 700,
                      color: FG,
                      lineHeight: 1.05,
                      marginBottom: 6,
                    }}
                  >
                    {stat.number}
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-geist-sans)",
                      fontSize: 10,
                      color: "rgba(245,240,232,0.30)",
                      letterSpacing: "0.04em",
                      lineHeight: 1.3,
                    }}
                  >
                    {stat.sub}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={rule} />

          {/* ── D. Thread Inventory ───────────────────────────── */}
          <div style={{ marginBottom: 48 }}>
            <div style={sectionLabel}>Your Threads</div>

            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {THREADS.map((thread, i) => {
                const trad = TRADITION_MAP[thread.id];
                return (
                  <div
                    key={thread.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 16,
                      padding: "13px 0",
                      borderBottom: i < THREADS.length - 1 ? "1px solid rgba(245,240,232,0.05)" : "none",
                      opacity: thread.active ? 1 : 0.38,
                    }}
                  >
                    <div
                      style={{
                        width: 4,
                        height: 22,
                        background: trad.hex,
                        flexShrink: 0,
                        opacity: thread.active ? 0.9 : 0.35,
                      }}
                    />
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontFamily: "var(--font-geist-sans)",
                          fontSize: 13,
                          color: thread.active ? "rgba(245,240,232,0.82)" : "rgba(245,240,232,0.38)",
                          letterSpacing: "0.01em",
                        }}
                      >
                        {thread.label}
                      </div>
                    </div>
                    <div
                      style={{
                        fontFamily: "var(--font-geist-sans)",
                        fontSize: 10,
                        color: "rgba(245,240,232,0.28)",
                        letterSpacing: "0.04em",
                      }}
                    >
                      {thread.active ? `Last woven ${thread.lastWoven}` : "Not connected"}
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              onMouseEnter={() => setConnectHovered(true)}
              onMouseLeave={() => setConnectHovered(false)}
              style={{
                marginTop: 20,
                fontFamily: "var(--font-geist-sans)",
                fontSize: 11,
                letterSpacing: "0.06em",
                color: connectHovered ? "rgba(245,240,232,0.70)" : "rgba(245,240,232,0.35)",
                background: "none",
                border: "none",
                padding: 0,
                cursor: "pointer",
                transition: "color 0.15s",
              }}
            >
              + Connect a new thread
            </button>
          </div>

          <div style={rule} />

          {/* ── E. Recent Readings ────────────────────────────── */}
          <div style={{ marginBottom: 48 }}>
            <div style={sectionLabel}>Recent Readings</div>

            <div style={{ display: "flex", flexDirection: "column" }}>
              {recentReadings.map((reading, i) => {
                const dateStr = reading.date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                return (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 16,
                      padding: "16px 0",
                      borderBottom: i < recentReadings.length - 1 ? "1px solid rgba(245,240,232,0.06)" : "none",
                    }}
                  >
                    <div
                      style={{
                        fontFamily: "var(--font-geist-sans)",
                        fontSize: 11,
                        color: "rgba(245,240,232,0.28)",
                        letterSpacing: "0.05em",
                        flexShrink: 0,
                        paddingTop: 2,
                        minWidth: 44,
                      }}
                    >
                      {dateStr}
                    </div>
                    <div
                      style={{
                        flex: 1,
                        fontFamily: "var(--font-cormorant)",
                        fontStyle: "italic",
                        fontSize: 16,
                        color: "rgba(245,240,232,0.82)",
                        lineHeight: 1.35,
                        fontWeight: 300,
                      }}
                    >
                      {reading.question}
                    </div>
                    <div style={{ display: "flex", gap: 4, alignItems: "center", paddingTop: 4, flexShrink: 0 }}>
                      {reading.traditions.map((tid) => (
                        <div
                          key={tid}
                          style={{
                            width: 6, height: 6,
                            borderRadius: "50%",
                            background: TRADITION_MAP[tid].hex,
                            opacity: 0.85,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              onMouseEnter={() => setViewAllHovered(true)}
              onMouseLeave={() => setViewAllHovered(false)}
              style={{
                marginTop: 18,
                fontFamily: "var(--font-geist-sans)",
                fontSize: 11,
                letterSpacing: "0.04em",
                color: viewAllHovered ? "rgba(245,240,232,0.65)" : "rgba(245,240,232,0.32)",
                background: "none",
                border: "none",
                padding: 0,
                cursor: "pointer",
                transition: "color 0.15s",
              }}
            >
              View all {readingCount} readings →
            </button>
          </div>

          <div style={rule} />

          {/* ── F. Shareable Card ─────────────────────────────── */}
          <div style={{ paddingBottom: 80 }}>
            <div style={sectionLabel}>Your Tapestry Card</div>

            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 20 }}>
              <ShareableCard
                readings={readings}
                name={name}
                readingCount={readingCount}
                streakWeeks={12}
              />

              <button
                onMouseEnter={() => setCardShareHovered(true)}
                onMouseLeave={() => setCardShareHovered(false)}
                style={{
                  fontFamily: "var(--font-geist-sans)",
                  fontSize: 11,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: cardShareHovered ? FG : "rgba(245,240,232,0.55)",
                  background: "none",
                  border: `1px solid ${cardShareHovered ? "rgba(245,240,232,0.35)" : "rgba(245,240,232,0.18)"}`,
                  borderRadius: 0,
                  padding: "9px 24px",
                  cursor: "pointer",
                  transition: "color 0.15s, border-color 0.15s",
                }}
              >
                Share your tapestry
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
